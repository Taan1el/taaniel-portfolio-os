import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Search, SearchX } from "lucide-react";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { getParentPath, listChildren, normalizePath } from "@/lib/filesystem";
import { openFileSystemPath } from "@/lib/launchers";
import { formatBytes } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

function isPhotoFile(node: VirtualFile) {
  return node.mimeType.startsWith("image/");
}

export function PhotoViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const setCustomWallpaperSource = useSystemStore((state) => state.setCustomWallpaperSource);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const filePath = normalizePath(window.payload?.filePath ?? "/Media/Photography/Clouds.jpg");
  const file = nodes[filePath];
  const directoryPath = getParentPath(filePath);
  const siblings = useMemo(
    () =>
      listChildren(nodes, directoryPath).filter(
        (node): node is VirtualFile => node.kind === "file" && isPhotoFile(node)
      ),
    [directoryPath, nodes]
  );
  const currentIndex = siblings.findIndex((item) => item.path === filePath);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  const [zoom, setZoom] = useState(1);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    setZoom(1);
    setRenderFailed(false);
  }, [filePath]);

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No image file selected.</div>;
  }

  const fileSize =
    file.size != null
      ? file.size
      : file.content != null
        ? new Blob([file.content]).size
        : undefined;
  const canRenderInline = isBrowserRenderableImageExtension(file.extension) || !renderFailed;

  return (
    <div className="app-screen photo-viewer">
      <header className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>{file.name}</strong>
          <small>
            {file.extension.toUpperCase()} image{fileSize != null ? ` • ${formatBytes(fileSize)}` : ""}
          </small>
        </div>
        <div className="app-toolbar__group">
          {file.source ? (
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
            aria-label="Zoom out"
            onClick={() => setZoom((currentZoom) => Math.max(0.4, currentZoom - 0.2))}
          >
            <SearchX size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom((currentZoom) => Math.min(3, currentZoom + 0.2))}
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Open fullscreen"
            onClick={() => containerRef.current?.requestFullscreen()}
          >
            <Expand size={15} />
          </button>
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

      <div ref={containerRef} className="photo-viewer__canvas">
        {file.source && canRenderInline ? (
          <img
            src={file.source}
            alt={file.name}
            style={{ transform: `scale(${zoom})` }}
            onError={() => setRenderFailed(true)}
          />
        ) : (
          <div className="photo-viewer__fallback">
            <strong>Inline preview unavailable</strong>
            <p>
              This image format is associated with the photo viewer, but the current browser cannot
              render it inline yet.
            </p>
            <p>Download the file or convert it to PNG, JPG, WebP, GIF, BMP, or ICO for browser preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}
