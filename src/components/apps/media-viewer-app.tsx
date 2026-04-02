import { AppContent, AppFooter, AppScaffold, EmptyState } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { openFileSystemPath } from "@/lib/launchers";
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
              <audio className="media-viewer__audio" controls preload="metadata" src={file.source} />
            </div>
          ) : (
            <video
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
