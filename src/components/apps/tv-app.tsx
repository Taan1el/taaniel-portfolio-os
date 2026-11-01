import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Hls from "hls.js";
import {
  ChevronDown,
  ChevronUp,
  Expand,
  ExternalLink,
  PanelLeft,
  Pause,
  PictureInPicture2,
  Play,
  Radio,
  RotateCcw,
  SkipForward,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ChannelLogo, ProgrammeBar, TvGuide } from "@/components/apps/tv/tv-guide";
import { CHANNEL_CATEGORIES, LIVE_CHANNELS, type LiveChannel } from "@/data/live-channels";
import { useMasterVolume } from "@/hooks/use-master-volume";
import { formatTime } from "@/lib/clock-format";
import { prefersStillMotion } from "@/lib/motion";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { programmeAt, useTvGuide } from "@/lib/tv-guide";
import { cn } from "@/lib/utils";
import { getIsNetworkBlocked } from "@/stores/device-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/tv-app.css";

const STATE_KEY = "taaniel-os-tv";
const LEGACY_FAVOURITES_KEY = "taaniel-os-tv-favourites";
const TABS = [
  { id: "ee", label: "Estonia" },
  { id: "uk", label: "UK" },
  { id: "us", label: "USA" },
  { id: "radio", label: "Radio" },
  { id: "saved", label: "Saved" },
];
const STALL_LIMIT_MS = 20000;
const CONTROLS_HIDE_MS = 3000;
const NUMBER_ENTRY_MS = 1100;
const AMBIENT_EVERY_MS = 450;

interface SavedState {
  tab: string;
  favourites: string[];
  volume: number;
  lastId?: string;
}

function readSaved(): SavedState {
  const fallback: SavedState = { tab: "ee", favourites: [], volume: 0.8 };

  try {
    const saved = JSON.parse(readLocalStorage(STATE_KEY) ?? "null") as Partial<SavedState> | null;
    const legacy = JSON.parse(readLocalStorage(LEGACY_FAVOURITES_KEY) ?? "[]") as unknown;
    const favourites = Array.isArray(saved?.favourites) ? saved.favourites : Array.isArray(legacy) ? legacy : [];
    const known = (id: unknown) => LIVE_CHANNELS.some((channel) => channel.id === id);

    return {
      tab: TABS.some((entry) => entry.id === saved?.tab) ? (saved?.tab as string) : fallback.tab,
      favourites: favourites.filter(known) as string[],
      volume: typeof saved?.volume === "number" ? Math.min(1, Math.max(0, saved.volume)) : fallback.volume,
      lastId: known(saved?.lastId) ? saved?.lastId : undefined,
    };
  } catch {
    return fallback;
  }
}

function lineUpOf(tab: string, favourites: string[]) {
  if (tab === "saved") return LIVE_CHANNELS.filter((channel) => favourites.includes(channel.id));
  if (tab === "radio") return LIVE_CHANNELS.filter((channel) => channel.kind === "radio");
  return LIVE_CHANNELS.filter((channel) => channel.kind === "tv" && channel.region === tab);
}

/** Lets the picture light the room: a tiny copy of the frame, blurred behind the screen. */
function useAmbientLight(mediaRef: React.RefObject<HTMLMediaElement | null>, canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || document.documentElement.hasAttribute("data-battery-saver")) return undefined;
    const context = canvasRef.current?.getContext("2d", { willReadFrequently: false });
    if (!context) return undefined;

    const timer = globalThis.setInterval(() => {
      const video = mediaRef.current;
      if (!(video instanceof HTMLVideoElement) || video.readyState < 2 || document.hidden) return;
      try {
        context.drawImage(video, 0, 0, 32, 18);
      } catch {
        // A stream without CORS cannot be read back. The room simply stays dark.
        globalThis.clearInterval(timer);
      }
    }, AMBIENT_EVERY_MS);

    return () => {
      globalThis.clearInterval(timer);
      context.clearRect(0, 0, 32, 18);
    };
  }, [active, canvasRef, mediaRef]);
}

export function TvApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [saved] = useState(readSaved);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLCanvasElement | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const numberTimer = useRef<number | undefined>(undefined);
  const keepPictureInPicture = useRef(false);
  const dialled = useRef("");

  const [tab, setTab] = useState(saved.tab);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [favourites, setFavourites] = useState(saved.favourites);
  const [volume, setVolume] = useState(saved.volume);
  const [lastId, setLastId] = useState(saved.lastId);
  const [channel, setChannel] = useState<LiveChannel | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(false);
  const [offAir, setOffAir] = useState<string[]>([]);
  const [theatre, setTheatre] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const { guide, now } = useTvGuide();

  const lineUp = useMemo(() => lineUpOf(tab, favourites), [favourites, tab]);
  const categories = useMemo(
    () => CHANNEL_CATEGORIES.filter((entry) => lineUp.some((item) => item.category === entry)),
    [lineUp]
  );
  const channels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) return LIVE_CHANNELS.filter((item) => item.name.toLowerCase().includes(needle));
    return category === "All" ? lineUp : lineUp.filter((item) => item.category === category);
  }, [category, lineUp, query]);
  const numberOf = useCallback(
    (item: LiveChannel) => {
      const position = lineUpOf(tab, favourites).indexOf(item);
      return (position >= 0 ? position : lineUpOf(item.kind === "radio" ? "radio" : item.region, favourites).indexOf(item)) + 1;
    },
    [favourites, tab]
  );

  useMasterVolume(mediaRef, muted ? 0 : volume, attempt);
  useAmbientLight(mediaRef, ambientRef, channel?.kind === "tv" && status === "playing");

  useEffect(() => {
    writeLocalStorage(STATE_KEY, JSON.stringify({ tab, favourites, volume, lastId }));
  }, [favourites, lastId, tab, volume]);

  const markOffAir = useCallback((id: string) => {
    setStatus("failed");
    setOffAir((list) => (list.includes(id) ? list : [...list, id]));
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !channel) return undefined;

    if (getIsNetworkBlocked()) {
      setStatus("failed");
      return undefined;
    }

    setStatus("loading");
    // Anything still running from this tuning after it ends must not touch the next channel.
    let tuned = true;
    let hls: Hls | null = null;
    let recovered = false;
    const fail = () => {
      if (tuned) markOffAir(channel.id);
    };

    if (channel.kind === "tv" && Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 20, capLevelToPlayerSize: true });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        // Live streams hiccup: one retry before calling the channel down.
        if (!recovered && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          recovered = true;
          hls?.recoverMediaError();
        } else if (!recovered && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          recovered = true;
          hls?.startLoad();
        } else {
          fail();
        }
      });
      hls.loadSource(channel.url);
      hls.attachMedia(media);
    } else {
      // Safari plays HLS by itself, and radio is a plain audio stream.
      media.src = channel.url;
    }

    void media.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      fail();
    });

    const watchdog = globalThis.setTimeout(() => {
      if (media.readyState < 3) fail();
    }, STALL_LIMIT_MS);

    // Picture in picture belongs to the old element, so the new one has to ask again.
    if (keepPictureInPicture.current && media instanceof HTMLVideoElement) {
      keepPictureInPicture.current = false;
      media.addEventListener("loadedmetadata", () => void media.requestPictureInPicture?.().catch(() => {}), { once: true });
    }

    return () => {
      tuned = false;
      globalThis.clearTimeout(watchdog);
      // Silence first, so the old channel cannot run on under the new one while this tears down.
      media.muted = true;
      media.pause();
      hls?.destroy();
      media.removeAttribute("src");
      media.load();
    };
  }, [attempt, channel, markOffAir]);

  const tune = useCallback((next: LiveChannel) => {
    keepPictureInPicture.current = Boolean(document.pictureInPictureElement);
    setChannel(next);
    setLastId(next.id);
    setAttempt((value) => value + 1);
    setOffAir((list) => list.filter((id) => id !== next.id));
  }, []);

  const step = useCallback(
    (direction: number) => {
      const list = channels.length > 0 ? channels : LIVE_CHANNELS;
      const index = channel ? list.indexOf(channel) : -1;
      tune(list[(index + direction + list.length) % list.length]);
    },
    [channel, channels, tune]
  );

  const showControls = useCallback(() => {
    setControlsShown(true);
    globalThis.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsShown(false), CONTROLS_HIDE_MS);
  }, []);

  useEffect(
    () => () => {
      globalThis.clearTimeout(hideTimer.current);
      globalThis.clearTimeout(numberTimer.current);
    },
    []
  );

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) void media.play().catch(() => {});
    else media.pause();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  const togglePictureInPicture = () => {
    const media = mediaRef.current;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else if (media instanceof HTMLVideoElement) void media.requestPictureInPicture?.();
  };

  const toggleFavourite = (id: string) => {
    setFavourites((list) => (list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]));
  };

  const dial = (digit: string) => {
    const number = (dialled.current + digit).slice(-3);
    dialled.current = number;
    globalThis.clearTimeout(numberTimer.current);
    numberTimer.current = window.setTimeout(() => {
      const target = lineUpOf(tab, favourites)[Number(number) - 1];
      if (target) tune(target);
      dialled.current = "";
    }, NUMBER_ENTRY_MS);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "arrowdown") step(key === "arrowup" ? -1 : 1);
    else if (key === "m") setMuted((value) => !value);
    else if (key === "f" && channel?.kind === "tv") toggleFullscreen();
    else if (key === "t") setTheatre((value) => !value);
    else if (key === " " && channel && event.target === event.currentTarget) togglePlay();
    else if (/^[0-9]$/.test(key)) dial(key);
    else return;
    event.preventDefault();
    if (channel) showControls();
  };

  // Changing channel: the picture snaps on from a line, as an old set does.
  useGSAP(
    () => {
      if (!channel) return;
      if (!prefersStillMotion() && channel.kind === "tv") {
        gsap
          .timeline()
          .fromTo(".tv__flash", { opacity: 1, scaleY: 1 }, { scaleY: 0.004, duration: 0.14, ease: "power3.in" })
          .to(".tv__flash", { scaleX: 0, opacity: 0, duration: 0.16, ease: "power2.in" });
      }

      showControls();
    },
    { scope: stageRef, dependencies: [attempt], revertOnUpdate: true }
  );

  const resume = lastId ? LIVE_CHANNELS.find((item) => item.id === lastId) : undefined;
  const suggestions = useMemo(() => {
    const pool = lineUpOf(tab === "saved" && favourites.length === 0 ? "ee" : tab, favourites);
    return pool.slice(0, 6);
  }, [favourites, tab]);
  const offline = getIsNetworkBlocked();
  const playing = status === "playing";
  const listing = channel ? programmeAt(guide[channel.id], now) : null;

  return (
    <div ref={rootRef} className="tv" tabIndex={-1} onKeyDown={handleKeyDown}>
      <div className={cn("tv__frame", theatre && "is-theatre")}>
        {theatre ? null : (
          <TvGuide
            tabs={TABS}
            tab={tab}
            onTab={(id) => {
              setTab(id);
              setCategory("All");
              setQuery("");
            }}
            query={query}
            onQuery={setQuery}
            categories={categories}
            category={category}
            onCategory={setCategory}
            channels={channels}
            numberOf={numberOf}
            currentId={channel?.id}
            playing={status === "playing"}
            favourites={favourites}
            offAir={offAir}
            guide={guide}
            now={now}
            onPlay={tune}
            onFavourite={toggleFavourite}
          />
        )}

        <div
          ref={stageRef}
          className={cn("tv__stage", channel && !controlsShown && playing && "is-quiet")}
          onPointerMove={channel ? showControls : undefined}
        >
          <canvas ref={ambientRef} className="tv__ambient" width={32} height={18} aria-hidden="true" />

          <div className="tv__screen">
            {channel?.kind === "tv" ? (
              // A new element for every tuning: nothing of the last channel's playback can carry over.
              <video
                key={attempt}
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                className="tv__video"
                crossOrigin="anonymous"
                playsInline
                aria-label={`${channel.name} live`}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onPlaying={() => setStatus("playing")}
                onPause={() => setStatus((current) => (current === "playing" ? "paused" : current))}
                onWaiting={() => setStatus((current) => (current === "failed" ? current : "loading"))}
              />
            ) : (
              <audio
                key={attempt}
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                onPlaying={() => setStatus("playing")}
                onPause={() => setStatus((current) => (current === "playing" ? "paused" : current))}
                onWaiting={() => setStatus((current) => (current === "failed" ? current : "loading"))}
                onError={() => channel && markOffAir(channel.id)}
              />
            )}

            {channel?.kind === "radio" && status !== "failed" ? (
              <div className="tv__radio">
                <span className={cn("tv__dial", playing && "is-on")} aria-hidden="true">
                  <Radio size={36} />
                </span>
                <strong>{channel.name}</strong>
                <small>{playing ? "On air" : "Tuning in"}</small>
                <span className={cn("tv__wave", playing && "is-on")} aria-hidden="true">
                  {Array.from({ length: 24 }, (_, index) => (
                    <i key={index} style={{ animationDelay: `${-(index * 137) % 900}ms` }} />
                  ))}
                </span>
              </div>
            ) : null}

            {!channel ? (
              <div className="tv__home">
                <p className="tv__eyebrow">{`On now · ${formatTime(new Date(now))}`}</p>
                <h1>What are we watching?</h1>
                {resume ? (
                  <button type="button" className="tv__resume" onClick={() => tune(resume)}>
                    <Play size={16} fill="currentColor" aria-hidden="true" />
                    Back to {resume.name}
                  </button>
                ) : null}
                <div className="tv__tiles">
                  {suggestions.map((item) => {
                    const onNow = programmeAt(guide[item.id], now)?.current;
                    return (
                      <button key={item.id} type="button" className="tv__tile" onClick={() => tune(item)}>
                        <ChannelLogo channel={item} />
                        <span className="tv__row-text">
                          <strong>{item.name}</strong>
                          <small>{onNow?.title ?? item.category}</small>
                          {onNow ? <ProgrammeBar programme={onNow} now={now} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="tv__keys">
                  <kbd>Up</kbd> <kbd>Down</kbd> change channel, a number tunes straight to it, <kbd>M</kbd> mutes, <kbd>F</kbd> fills the screen, <kbd>T</kbd> hides the guide
                </p>
              </div>
            ) : null}

            {channel && status === "failed" ? (
              <div className="tv__offair" role="alert">
                <span className="tv__offair-mark" aria-hidden="true">
                  Off air
                </span>
                <strong>{`${channel.name} will not play right now`}</strong>
                <small>
                  {offline
                    ? "This device is offline. Turn off airplane mode or reconnect."
                    : "The stream may be down, or it may only be open to viewers in its own country."}
                </small>
                <span className="tv__actions">
                  <button type="button" className="tv__action tv__action--primary" onClick={() => step(1)}>
                    <SkipForward size={14} aria-hidden="true" />
                    Next channel
                  </button>
                  <button type="button" className="tv__action" onClick={() => tune(channel)}>
                    <RotateCcw size={14} aria-hidden="true" />
                    Try again
                  </button>
                  {channel.region === "ee" ? (
                    <a className="tv__action" href="https://jupiter.err.ee/" target="_blank" rel="noreferrer">
                      <ExternalLink size={14} aria-hidden="true" />
                      ERR Jupiter
                    </a>
                  ) : null}
                </span>
              </div>
            ) : null}

            {channel?.kind === "tv" && status === "loading" ? (
              <div className="tv__tuning" role="status">
                <span aria-hidden="true" />
                Tuning in
              </div>
            ) : null}
            <div className="tv__flash" aria-hidden="true" />
          </div>

          {channel ? (
            <div className="tv__controls" role="group" aria-label="Player">
              <div className="tv__meta">
                <span className={cn("tv__live", playing && "is-on")}>Live</span>
                <strong>{channel.name}</strong>
                {listing ? (
                  <>
                    <span className="tv__title">{listing.current.title}</span>
                    <time>{`${formatTime(new Date(listing.current.start))} – ${formatTime(new Date(listing.current.stop))}`}</time>
                  </>
                ) : null}
              </div>
              {listing ? <ProgrammeBar programme={listing.current} now={now} /> : null}
              <div className="tv__buttons">
              <button type="button" aria-label="Previous channel" title="Previous channel (Up)" onClick={() => step(-1)}>
                <ChevronUp size={18} />
              </button>
              <button type="button" aria-label="Next channel" title="Next channel (Down)" onClick={() => step(1)}>
                <ChevronDown size={18} />
              </button>
              <button type="button" aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} onClick={togglePlay}>
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button type="button" aria-label={muted ? "Unmute" : "Mute"} title="Mute (M)" onClick={() => setMuted((value) => !value)}>
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                className="tv__volume"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(event) => {
                  setVolume(Number(event.target.value));
                  setMuted(false);
                }}
              />
              <span className="tv__next">{listing?.next ? `Next ${formatTime(new Date(listing.next.start))} ${listing.next.title}` : null}</span>
              <button
                type="button"
                className={cn(favourites.includes(channel.id) && "is-on")}
                aria-label={`Save ${channel.name}`}
                aria-pressed={favourites.includes(channel.id)}
                onClick={() => toggleFavourite(channel.id)}
              >
                <Star size={16} fill={favourites.includes(channel.id) ? "currentColor" : "none"} />
              </button>
              <button type="button" aria-label={theatre ? "Show guide" : "Hide guide"} title="Guide (T)" onClick={() => setTheatre((value) => !value)}>
                <PanelLeft size={18} />
              </button>
              {channel.kind === "tv" ? (
                <>
                  {document.pictureInPictureEnabled ? (
                    <button type="button" aria-label="Picture in picture" title="Picture in picture" onClick={togglePictureInPicture}>
                      <PictureInPicture2 size={18} />
                    </button>
                  ) : null}
                  <button type="button" aria-label="Fullscreen" title="Fullscreen (F)" onClick={toggleFullscreen}>
                    <Expand size={18} />
                  </button>
                </>
              ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
