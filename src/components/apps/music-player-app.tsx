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
import { AppContent, AppFooter, AppScaffold, Button, EmptyState, IconButton, ScrollArea } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { getParentPath, listChildren } from "@/lib/filesystem";
import { openFileSystemPath } from "@/lib/launchers";
import { useMediaGallery } from "@/hooks/use-media-gallery";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

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

export function MusicPlayerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldResumePlaybackRef = useRef(false);
  const { filePath, siblings, previous, next } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Music/Black Star.mp3",
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
  const coverArt = useMemo(() => {
    if (!currentTrack) {
      return null;
    }

    const trackKey = normalizeMediaKey(currentTrack.name.replace(/\.[^.]+$/, ""));
    const imageFiles = listChildren(nodes, getParentPath(currentTrack.path)).filter(
      (node): node is VirtualFile => node.kind === "file" && isImageFile(node) && Boolean(node.source)
    );

    const directMatch = imageFiles.find((item) => normalizeMediaKey(item.name).includes(trackKey));

    if (directMatch) {
      return directMatch;
    }

    if (playlist.length === 1) {
      return imageFiles.find((item) => normalizeMediaKey(item.name).includes("cover")) ?? imageFiles[0] ?? null;
    }

    return null;
  }, [currentTrack, nodes, playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

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
      <AppScaffold>
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
            className="ghost-button"
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
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
      />

      <AppContent className="music-player__content" scrollable={false}>
        <ScrollArea className="music-player__scroll-area" padded>
          <div className="music-player__layout">
          <section className="glass-card music-player__hero">
            <div className="music-player__cover">
              {coverArt?.source ? (
                <img src={coverArt.source} alt={`${currentTrack.name} cover art`} />
              ) : (
                <AudioWaveform size={42} />
              )}
            </div>
            <div className="music-player__meta">
              <p className="eyebrow">Now playing</p>
              <h1>{currentTrack.name.replace(/\.[^.]+$/, "")}</h1>
              <p>{currentTrack.mimeType}</p>
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
                <button type="button" className="music-player__play" onClick={() => void togglePlayback()}>
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
                <Volume2 size={16} />
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

          <section className="glass-card music-player__playlist">
            <div className="section-row">
              <div>
                <p className="eyebrow">Playlist</p>
                <h2>Folder queue</h2>
              </div>
              <small>{playlist.length} available</small>
            </div>

            <div className="music-player__playlist-list">
              {playlist.map((track, index) => (
                <button
                  key={track.path}
                  type="button"
                  className={`music-player__track ${track.path === currentTrack.path ? "is-active" : ""}`}
                  onClick={() => jumpToTrack(track.path)}
                >
                  <span className="music-player__track-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="music-player__track-copy">
                    <strong>{track.name.replace(/\.[^.]+$/, "")}</strong>
                    <small title={track.path}>{track.path}</small>
                  </span>
                  {track.path === currentTrack.path ? <span className="music-player__track-status">Live</span> : null}
                </button>
              ))}
            </div>
          </section>
          </div>
        </ScrollArea>
      </AppContent>

      <AppFooter className="music-player__footer">
        <span title={currentTrack.path}>{currentTrack.path}</span>
        <span>{`${playlist.length} track${playlist.length === 1 ? "" : "s"} in folder`}</span>
      </AppFooter>
    </AppScaffold>
  );
}
