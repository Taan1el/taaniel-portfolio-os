import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioWaveform,
  FolderOpen,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AppContent,
  AppScaffold,
  AppSidebar,
  Button,
  EmptyState,
  ScrollArea,
} from "@/components/apps/app-layout";
import { getParentPath, listChildren } from "@/lib/filesystem";
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
  const [muted, setMuted] = useState(false);

  const currentTrack = file && file.kind === "file" && isAudioFile(file) ? file : null;
  const playlist = useMemo(
    () => siblings.filter((item) => item.kind === "file" && isAudioFile(item)),
    [siblings]
  );
  const coverArt = useMemo(() => {
    if (!currentTrack) return null;
    const trackKey = normalizeMediaKey(currentTrack.name.replace(/\.[^.]+$/, ""));
    const imageFiles = listChildren(nodes, getParentPath(currentTrack.path)).filter(
      (node): node is VirtualFile => node.kind === "file" && isImageFile(node) && Boolean(node.source)
    );
    const directMatch = imageFiles.find((item) => normalizeMediaKey(item.name).includes(trackKey));
    if (directMatch) return directMatch;
    if (playlist.length === 1) {
      return imageFiles.find((item) => normalizeMediaKey(item.name).includes("cover")) ?? imageFiles[0] ?? null;
    }
    return null;
  }, [currentTrack, nodes, playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
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
              onClick={() => launchApp({ appId: "files", payload: { directoryPath: "/Media/Music" } })}
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
    if (!audio) return;
    if (audio.paused) {
      shouldResumePlaybackRef.current = true;
      await audio.play().catch(() => { shouldResumePlaybackRef.current = false; });
      return;
    }
    shouldResumePlaybackRef.current = false;
    audio.pause();
  };

  const jumpToTrack = (path: string) => {
    launchApp({ appId: "music", payload: { filePath: path } });
  };

  const trackIndex = playlist.findIndex((t) => t.path === currentTrack.path);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const displayName = currentTrack.name.replace(/\.[^.]+$/, "");

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
          if (next) { jumpToTrack(next.path); return; }
          shouldResumePlaybackRef.current = false;
          setIsPlaying(false);
        }}
      />

      {/* WMP-style header bar */}
      <div className="music-player__wmp-header">
        <AudioWaveform size={14} className="music-player__wmp-logo" />
        <span className="music-player__wmp-header-title">
          {isPlaying ? "▶ " : ""}{displayName}
        </span>
        <button
          type="button"
          className="music-player__wmp-folder-btn"
          aria-label="Open music folder"
          onClick={() => launchApp({ appId: "files", payload: { directoryPath: "/Media/Music" } })}
        >
          <FolderOpen size={13} />
        </button>
      </div>

      <AppContent className="music-player__content" padded={false} scrollable={false} stacked={false}>
        {/* Playlist sidebar */}
        <AppSidebar className="music-player__sidebar">
          <div className="music-player__playlist-header">
            <span>Playlist</span>
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
                <span className="music-player__track-copy">
                  <strong>{track.name.replace(/\.[^.]+$/, "")}</strong>
                </span>
                {track.path === currentTrack.path && isPlaying ? (
                  <span className="music-player__track-playing" aria-label="Now playing">▶</span>
                ) : null}
              </button>
            ))}
          </ScrollArea>
        </AppSidebar>

        {/* Main stage */}
        <section className="music-player__stage">
          {/* Cover art */}
          <div className="music-player__cover-wrap">
            <div className={`music-player__cover-art ${isPlaying ? "is-playing" : ""}`}>
              {coverArt?.source ? (
                <img src={coverArt.source} alt={`${displayName} cover art`} />
              ) : (
                <AudioWaveform size={52} />
              )}
            </div>
          </div>

          {/* Track info */}
          <div className="music-player__now-playing">
            <p className="music-player__now-playing-label">NOW PLAYING</p>
            <h2 className="music-player__now-playing-title">{displayName}</h2>
            {playlist.length > 1 && (
              <p className="music-player__now-playing-sub">
                Track {trackIndex + 1} of {playlist.length}
              </p>
            )}
          </div>

          {/* Seek / progress */}
          <div className="music-player__wmp-timeline">
            <span className="music-player__wmp-time">{formatTime(currentTime)}</span>
            <label className="music-player__seek">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0)}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  const nextTime = Number(event.target.value);
                  audio.currentTime = nextTime;
                  setCurrentTime(nextTime);
                }}
              />
              <span className="music-player__progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </span>
            </label>
            <span className="music-player__wmp-time">{formatTime(duration)}</span>
          </div>

          {/* Transport + volume */}
          <div className="music-player__wmp-transport">
            <div className="music-player__wmp-buttons">
              <button
                type="button"
                className="music-player__wmp-btn"
                aria-label="Previous track"
                disabled={!previous}
                onClick={() => previous && jumpToTrack(previous.path)}
              >
                <SkipBack size={18} />
              </button>
              <button
                type="button"
                className="music-player__wmp-play"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => void togglePlayback()}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <button
                type="button"
                className="music-player__wmp-btn"
                aria-label="Next track"
                disabled={!next}
                onClick={() => next && jumpToTrack(next.path)}
              >
                <SkipForward size={18} />
              </button>
            </div>

            <div className="music-player__wmp-volume">
              <button
                type="button"
                className="music-player__wmp-mute"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                className="music-player__volume-slider"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(event) => {
                  setVolume(Number(event.target.value));
                  setMuted(false);
                }}
              />
            </div>
          </div>
        </section>
      </AppContent>
    </AppScaffold>
  );
}
