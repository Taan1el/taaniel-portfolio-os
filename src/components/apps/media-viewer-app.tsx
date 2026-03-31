import { useRef } from "react";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { openFileSystemPath } from "@/lib/launchers";
import { useMediaGallery } from "@/hooks/use-media-gallery";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function MediaViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const isVideoApp = window.appId === "video";
  const { filePath, next, previous } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Photography/Clouds.jpg",
    (node: VirtualFile) =>
      isVideoApp
        ? node.mimeType.startsWith("video/") || node.mimeType.startsWith("audio/")
        : node.mimeType.startsWith("image/")
  );
  const file = nodes[filePath];

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No media file selected.</div>;
  }

  return (
    <div className="app-screen media-viewer">
      <MediaToolbar
        title={file.name}
        subtitle={isVideoApp ? "Video and audio playback" : "Media viewer"}
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
      />

      <div className="media-viewer__canvas">
        {file.mimeType.startsWith("audio/") ? (
          <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} controls src={file.source ?? demoVideo} />
        ) : (
          <video ref={mediaRef as React.RefObject<HTMLVideoElement>} controls src={file.source ?? demoVideo} />
        )}
      </div>
    </div>
  );
}
