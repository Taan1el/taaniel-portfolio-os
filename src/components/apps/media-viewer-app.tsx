import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getParentPath, isImageFile, listChildren, normalizePath } from "@/lib/filesystem";
import { openFileSystemPath } from "@/lib/launchers";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function MediaViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const setCustomWallpaperSource = useSystemStore((state) => state.setCustomWallpaperSource);
  const filePath = normalizePath(window.payload?.filePath ?? "/Media/Photography/Clouds.jpg");
  const file = nodes[filePath];
  const directoryPath = getParentPath(filePath);
  const siblings = useMemo(
    () =>
      listChildren(nodes, directoryPath).filter(
        (node): node is VirtualFile =>
          node.kind === "file" &&
          (window.appId === "video" ? node.mimeType.startsWith("video/") : isImageFile(node))
      ),
    [directoryPath, nodes, window.appId]
  );
  const currentIndex = siblings.findIndex((item) => item.path === filePath);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No media file selected.</div>;
  }

  const isVideo = window.appId === "video" || file.mimeType.startsWith("video/");

  return (
    <div className="app-screen media-viewer">
      <header className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>{file.name}</strong>
          <small>{isVideo ? "Video player" : "Image viewer"}</small>
        </div>
        <div className="app-toolbar__group">
          {!isVideo && file.source ? (
            <button
              type="button"
              className="pill-button"
              onClick={() => setCustomWallpaperSource(file.source ?? null)}
            >
              Set as wallpaper
            </button>
          ) : null}
          <button
            type="button"
            className="icon-button"
            disabled={!previous}
            onClick={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!next}
            onClick={() => next && openFileSystemPath(next.path, nodes, launchApp)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <div className="media-viewer__canvas">
        {isVideo ? <video controls src={file.source ?? demoVideo} /> : <img src={file.source} alt={file.name} />}
      </div>
    </div>
  );
}
