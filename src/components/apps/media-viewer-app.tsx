import { useRef } from "react";
import { AppContent, AppFooter, AppScaffold, EmptyState } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { openFileSystemPath } from "@/lib/launchers";
import { useMasterVolume } from "@/hooks/use-master-volume";
import { useMediaGallery } from "@/hooks/use-media-gallery";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

export function MediaViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const isVideoApp = window.appId === "video";
  const { filePath, next, previous } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "",
    (node: VirtualFile) =>
      isVideoApp ? node.mimeType.startsWith("video/") : node.mimeType.startsWith("audio/")
  );
  const file = nodes[filePath];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Native controls set each player's own level; the master volume from Quick Settings scales every one.
  // Keyed on which element exists, so moving to the next file keeps the level set on the controls.
  const playable = file?.kind === "file" && Boolean(file.source);
  const showsAudio = playable && file.mimeType.startsWith("audio/");
  useMasterVolume(audioRef, 1, showsAudio ? 1 : 0);
  useMasterVolume(videoRef, 1, playable && !showsAudio ? 1 : 0);

  if (!file || file.kind !== "file") {
    return (
      <AppScaffold className="media-viewer">
        <EmptyState
          title="No media file selected"
          description="Choose a video file from File Explorer to open it here."
        />
      </AppScaffold>
    );
  }

  if (!file.source) {
    return (
      <AppScaffold className="media-viewer">
        <EmptyState
          title="This media file is missing a playable source"
          description="Open the original file again from File Explorer or replace it in the filesystem."
        />
      </AppScaffold>
    );
  }

  return (
    <AppScaffold className="media-viewer">
      <MediaToolbar
        title={file.name}
        subtitle={isVideoApp ? "Video playback" : "Audio playback"}
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
      />

      <AppContent className="media-viewer__content" padded={false} scrollable={false}>
        <div className="media-viewer__canvas">
          {file.mimeType.startsWith("audio/") ? (
            <div className="media-viewer__audio-shell">
              <audio ref={audioRef} className="media-viewer__audio" controls preload="metadata" src={file.source} />
            </div>
          ) : (
            <video
              ref={videoRef}
              className="media-viewer__video"
              controls
              preload="metadata"
              playsInline
              src={file.source}
            />
          )}
        </div>
      </AppContent>

      <AppFooter className="media-viewer__footer">
        <span>{file.mimeType}</span>
        <span title={file.path}>{file.path}</span>
      </AppFooter>
    </AppScaffold>
  );
}
