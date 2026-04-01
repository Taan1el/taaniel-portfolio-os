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
import { MediaToolbar } from "@/components/apps/media-toolbar";
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

export function MusicPlayerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldResumePlaybackRef = useRef(false);
  const { filePath, siblings, previous, next } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Music/Studio Loop.mp3",
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
    return <div className="app-empty">No audio file selected for the music player.</div>;
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
    <div className="app-screen music-player">
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
          <button
            type="button"
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
          </button>
        }
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
      />

      <div className="music-player__layout">
        <section className="glass-card music-player__hero">
          <div className="music-player__cover">
            <AudioWaveform size={42} />
          </div>
          <div className="music-player__meta">
            <p className="eyebrow">Now playing</p>
            <h1>{currentTrack.name.replace(/\.[^.]+$/, "")}</h1>
            <p>{currentTrack.mimeType}</p>
          </div>

          <div className="music-player__controls">
            <div className="music-player__transport">
              <button type="button" className="icon-button" onClick={() => previous && jumpToTrack(previous.path)}>
                <SkipBack size={16} />
              </button>
              <button type="button" className="music-player__play" onClick={() => void togglePlayback()}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button type="button" className="icon-button" onClick={() => next && jumpToTrack(next.path)}>
                <SkipForward size={16} />
              </button>
            </div>

            <div className="music-player__timeline">
              <div className="music-player__progress">
                <span style={{ width: `${progress}%` }} />
              </div>
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
    </div>
  );
}
