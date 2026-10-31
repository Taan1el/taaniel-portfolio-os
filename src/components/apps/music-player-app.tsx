import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioWaveform,
  FolderOpen,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import {
  AppContent,
  AppFooter,
  AppScaffold,
  AppSidebar,
  Button,
  EmptyState,
  IconButton,
  ScrollArea,
} from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { getParentPath, listChildren } from "@/lib/filesystem";
import { useMasterVolume } from "@/hooks/use-master-volume";
import { useMediaGallery } from "@/hooks/use-media-gallery";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import { TRASH_PATH } from "@/lib/system-workspace";
import type { AppComponentProps, FileSystemRecord, VirtualFile } from "@/types/system";

const DEFAULT_TRACK = "/Media/Music/Black Star.mp3";

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function isAudioFile(node: VirtualFile) {
  return node.mimeType.startsWith("audio/");
}

function isImageFile(node: VirtualFile) {
  return node.mimeType.startsWith("image/");
}

function normalizeMediaKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findCover(nodes: FileSystemRecord, track: VirtualFile) {
  const trackKey = normalizeMediaKey(track.name.replace(/\.[^.]+$/, ""));

  return listChildren(nodes, getParentPath(track.path)).find(
    (node): node is VirtualFile =>
      node.kind === "file" && isImageFile(node) && Boolean(node.source) && normalizeMediaKey(node.name).includes(trackKey)
  );
}

/** A remembered or mistyped path must not leave the player empty while songs exist. */
function resolveStartTrack(nodes: FileSystemRecord, requested?: string) {
  const isTrack = (path?: string) => {
    const node = path ? nodes[path] : undefined;
    return node?.kind === "file" && isAudioFile(node);
  };

  if (isTrack(requested)) return requested as string;
  if (isTrack(DEFAULT_TRACK)) return DEFAULT_TRACK;
  const first = Object.values(nodes).find((node) => node.kind === "file" && isAudioFile(node) && !node.path.startsWith(TRASH_PATH));
  return first?.path ?? DEFAULT_TRACK;
}

export function MusicPlayerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldResumePlaybackRef = useRef(false);
  const { filePath, siblings, previous, next } = useMediaGallery(
    nodes,
    resolveStartTrack(nodes, window.payload?.filePath),
    isAudioFile
  );
  const file = nodes[filePath];
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);

  const currentTrack = file && file.kind === "file" && isAudioFile(file) ? file : null;
  const playlist = useMemo(
    () => siblings.filter((item) => item.kind === "file" && isAudioFile(item)),
    [siblings]
  );
  const coverArt = currentTrack ? findCover(nodes, currentTrack) : undefined;

  // The player's own slider, scaled by the master volume from Quick Settings.
  useMasterVolume(audioRef, volume, currentTrack ? 1 : 0);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentTrack) {
      return;
    }

    audio.pause();
    audio.load();
    setCurrentTime(0);
    setDuration(0);

    if (shouldResumePlaybackRef.current) {
      const playPromise = audio.play();
      void playPromise?.catch(() => {
        setIsPlaying(false);
        shouldResumePlaybackRef.current = false;
      });
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack?.path]);

  if (!currentTrack) {
    return (
      <AppScaffold className="music-player">
        <EmptyState
          className="music-player__empty"
          title="No tracks loaded yet"
          description="Import MP3 or WAV files into `/Media/Music`, then open one to launch the player."
          actions={
            <Button
              type="button"
              variant="panel"
              onClick={() =>
                launchApp({
                  appId: "files",
                  payload: { directoryPath: "/Media/Music" },
                })
              }
            >
              <FolderOpen size={15} />
              Open music folder
            </Button>
          }
        />
      </AppScaffold>
    );
  }

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      shouldResumePlaybackRef.current = true;
      await audio.play().catch(() => {
        shouldResumePlaybackRef.current = false;
      });
      return;
    }

    shouldResumePlaybackRef.current = false;
    audio.pause();
  };

  const jumpToTrack = (path: string) => {
    launchApp({
      appId: "music",
      payload: { filePath: path },
    });
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <AppScaffold className="music-player">
      <audio
        ref={audioRef}
        preload="metadata"
        src={currentTrack.source}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => {
          if (next) {
            jumpToTrack(next.path);
            return;
          }

          shouldResumePlaybackRef.current = false;
          setIsPlaying(false);
        }}
      />

      <MediaToolbar
        title={currentTrack.name}
        subtitle={`${playlist.length} track${playlist.length === 1 ? "" : "s"} in this folder`}
        actions={
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              launchApp({
                appId: "files",
                payload: { directoryPath: "/Media/Music" },
              })
            }
          >
            <FolderOpen size={15} />
            Open folder
          </Button>
        }
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && jumpToTrack(previous.path)}
        onNext={() => next && jumpToTrack(next.path)}
      />

      <AppContent className="music-player__content" padded={false} scrollable={false} stacked={false}>
        <AppSidebar className="music-player__sidebar">
          <div className="section-row">
            <div>
              <p className="eyebrow">Playlist</p>
              <h2>Songs</h2>
            </div>
            <small>{playlist.length}</small>
          </div>

          <ScrollArea className="music-player__playlist-list">
            {playlist.map((track, index) => (
              <button
                key={track.path}
                type="button"
                className={`music-player__track ${track.path === currentTrack.path ? "is-active" : ""}`}
                onClick={() => jumpToTrack(track.path)}
              >
                <span className="music-player__track-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="music-player__track-art">
                  {findCover(nodes, track)?.source ? <img src={findCover(nodes, track)?.source} alt="" /> : <AudioWaveform size={16} />}
                </span>
                <span className="music-player__track-copy">
                  <strong>{track.name.replace(/\.[^.]+$/, "")}</strong>
                </span>
                {track.path === currentTrack.path ? (
                  <span className="music-player__track-status">{isPlaying ? "Playing" : "Selected"}</span>
                ) : null}
              </button>
            ))}
          </ScrollArea>
        </AppSidebar>

        <section className="music-player__main">
          <div className="music-player__hero">
            <div className="music-player__cover">
              {coverArt?.source ? (
                <img src={coverArt.source} alt={`${currentTrack.name} cover art`} />
              ) : (
                <AudioWaveform size={34} />
              )}
            </div>

            <div className="music-player__meta">
              <p className="eyebrow">Now playing</p>
              <h1>{currentTrack.name.replace(/\.[^.]+$/, "")}</h1>
              <p>{currentTrack.mimeType}</p>
            </div>
          </div>

          <div className="music-player__controls">
            <div className="music-player__transport">
              <IconButton
                type="button"
                onClick={() => previous && jumpToTrack(previous.path)}
                aria-label="Previous track"
              >
                <SkipBack size={16} />
              </IconButton>
              <button
                type="button"
                className="music-player__play"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => void togglePlayback()}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <IconButton
                type="button"
                onClick={() => next && jumpToTrack(next.path)}
                aria-label="Next track"
              >
                <SkipForward size={16} />
              </IconButton>
            </div>

            <div className="music-player__timeline">
              <label className="music-player__seek">
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0)}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => {
                    const audio = audioRef.current;

                    if (!audio) {
                      return;
                    }

                    const nextTime = Number(event.target.value);
                    audio.currentTime = nextTime;
                    setCurrentTime(nextTime);
                  }}
                />
                <span className="music-player__progress" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </span>
              </label>
              <div className="music-player__time">
                <small>{formatTime(currentTime)}</small>
                <small>{formatTime(duration)}</small>
              </div>
            </div>

            <label className="music-player__volume">
              <Volume2 size={15} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
          </div>
        </section>
      </AppContent>

      <AppFooter className="music-player__footer">
        <span title={currentTrack.path}>{currentTrack.path}</span>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        <span>{`${playlist.length} track${playlist.length === 1 ? "" : "s"} in folder`}</span>
      </AppFooter>
    </AppScaffold>
  );
}
