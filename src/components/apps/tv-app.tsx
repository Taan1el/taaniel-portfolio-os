import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { ExternalLink, Radio, RotateCcw, Star, Tv } from "lucide-react";
import { LIVE_CHANNELS, type LiveChannel } from "@/data/live-channels";
import { useMasterVolume } from "@/hooks/use-master-volume";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import { getIsNetworkBlocked } from "@/stores/device-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/tv-app.css";

const FAVOURITES_KEY = "taaniel-os-tv-favourites";

function readFavourites() {
  try {
    const saved: unknown = JSON.parse(readLocalStorage(FAVOURITES_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id) => LIVE_CHANNELS.some((channel) => channel.id === id)) as string[] : [];
  } catch {
    return [];
  }
}

function ChannelRow({
  channel,
  active,
  favourite,
  onPlay,
  onFavourite,
}: {
  channel: LiveChannel;
  active: boolean;
  favourite: boolean;
  onPlay: () => void;
  onFavourite: () => void;
}) {
  return (
    <div className={cn("tv-app__channel", active && "is-active")}>
      <button type="button" className="tv-app__channel-play" aria-current={active ? "true" : undefined} onClick={onPlay}>
        <span className="tv-app__channel-mark" aria-hidden="true">
          {channel.mark}
        </span>
        <span>
          <strong>{channel.name}</strong>
          <small>{channel.description}</small>
        </span>
      </button>
      <button
        type="button"
        className={cn("tv-app__star", favourite && "is-on")}
        aria-label={`Favourite ${channel.name}`}
        aria-pressed={favourite}
        onClick={onFavourite}
      >
        <Star size={14} fill={favourite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export function TvApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [channel, setChannel] = useState<LiveChannel | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);
  const [favourites, setFavourites] = useState(readFavourites);

  useMasterVolume(mediaRef, 1, channel?.id ?? null);

  useEffect(() => {
    const media = mediaRef.current;

    if (!media || !channel) {
      return undefined;
    }

    if (getIsNetworkBlocked()) {
      setStatus("failed");
      return undefined;
    }

    setStatus("loading");
    let hls: Hls | null = null;

    if (channel.kind === "tv" && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setStatus("failed");
      });
      hls.loadSource(channel.url);
      hls.attachMedia(media);
    } else {
      // Safari plays HLS by itself, and radio is a plain audio stream.
      media.src = channel.url;
    }

    void media.play().catch((error: unknown) => {
      // A newer channel interrupting this one is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus((current) => (current === "playing" ? current : "failed"));
    });

    return () => {
      hls?.destroy();
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  }, [attempt, channel]);

  const toggleFavourite = (id: string) => {
    const next = favourites.includes(id) ? favourites.filter((entry) => entry !== id) : [...favourites, id];
    setFavourites(next);
    writeLocalStorage(FAVOURITES_KEY, JSON.stringify(next));
  };

  const rank = (entry: LiveChannel) => (favourites.includes(entry.id) ? 0 : 1);
  const listOf = (kind: LiveChannel["kind"]) =>
    LIVE_CHANNELS.filter((entry) => entry.kind === kind).sort((a, b) => rank(a) - rank(b));
  const mediaEvents = {
    onPlaying: () => setStatus("playing"),
    onWaiting: () => setStatus((current) => (current === "failed" ? current : "loading")),
    onError: () => setStatus((current) => (channel ? "failed" : current)),
  };

  const renderList = (kind: LiveChannel["kind"], title: string, Icon: typeof Tv) => (
    <section aria-label={title}>
      <h2 className="tv-app__heading">
        <Icon size={14} aria-hidden="true" />
        {title}
      </h2>
      {listOf(kind).map((entry) => (
        <ChannelRow
          key={entry.id}
          channel={entry}
          active={channel?.id === entry.id}
          favourite={favourites.includes(entry.id)}
          onPlay={() => {
            setChannel(entry);
            setAttempt((value) => value + 1);
          }}
          onFavourite={() => toggleFavourite(entry.id)}
        />
      ))}
    </section>
  );

  return (
    <div className="tv-app">
      <aside className="tv-app__list">
        {renderList("tv", "Television", Tv)}
        {renderList("radio", "Radio", Radio)}
        <p className="tv-app__credit">Live streams from ERR and Riigikogu. Channel list found through iptv-org.</p>
      </aside>

      <main className="tv-app__stage">
        {channel?.kind === "tv" ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            className="tv-app__video"
            controls
            playsInline
            aria-label={`${channel.name} live`}
            {...mediaEvents}
          />
        ) : (
          <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} {...mediaEvents} />
        )}

        {channel?.kind === "radio" && status !== "failed" ? (
          <div className="tv-app__radio">
            <span className={cn("tv-app__dial", status === "playing" && "is-on")} aria-hidden="true">
              <Radio size={40} />
            </span>
            <strong>{channel.name}</strong>
            <small>{status === "playing" ? "On air" : "Tuning in"}</small>
            <button type="button" className="tv-app__action" onClick={() => setChannel(null)}>
              Stop
            </button>
          </div>
        ) : null}

        {!channel ? (
          <div className="tv-app__message">
            <Tv size={40} aria-hidden="true" />
            <strong>Pick a channel</strong>
            <small>Estonian television and radio, live.</small>
          </div>
        ) : null}

        {channel && status === "failed" ? (
          <div className="tv-app__message tv-app__message--over" role="alert">
            <strong>{`${channel.name} will not play right now`}</strong>
            <small>
              {getIsNetworkBlocked()
                ? "This device is offline. Turn off airplane mode or reconnect."
                : "The stream may be down, or the programme may only be licensed for viewers in Estonia."}
            </small>
            <span className="tv-app__actions">
              <button type="button" className="tv-app__action" onClick={() => setAttempt((value) => value + 1)}>
                <RotateCcw size={14} aria-hidden="true" />
                Try again
              </button>
              <a className="tv-app__action" href="https://jupiter.err.ee/" target="_blank" rel="noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                Open ERR Jupiter
              </a>
            </span>
          </div>
        ) : null}

        {channel?.kind === "tv" && status === "loading" ? <div className="tv-app__tuning">Tuning in</div> : null}
      </main>
    </div>
  );
}
