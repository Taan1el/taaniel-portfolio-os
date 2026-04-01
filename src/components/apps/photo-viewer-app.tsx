import { useEffect, useRef, useState } from "react";
import { Expand, Search, SearchX } from "lucide-react";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { openFileSystemPath } from "@/lib/launchers";
import { formatBytes } from "@/lib/utils";
import { useMediaGallery } from "@/hooks/use-media-gallery";
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
  const { filePath, next, previous, siblings } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Photography/Clouds.jpg",
    isPhotoFile
  );
  const file = nodes[filePath];
  const [zoom, setZoom] = useState(1);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    setZoom(1);
    setRenderFailed(false);
  }, [filePath]);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    element.focus();
  }, [filePath]);

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No image file selected.</div>;
  }

  const fileSize =
    file.size != null ? file.size : file.content != null ? new Blob([file.content]).size : undefined;
  const canRenderInline = isBrowserRenderableImageExtension(file.extension) && !renderFailed;

  return (
    <div className="app-screen photo-viewer">
      <MediaToolbar
        title={file.name}
        subtitle={`${file.extension.toUpperCase()} image${fileSize != null ? ` | ${formatBytes(fileSize)}` : ""}`}
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
        actions={
          <>
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
            <button type="button" className="icon-button" aria-label="Reset zoom" onClick={() => setZoom(1)}>
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
          </>
        }
      />

      <div
        ref={containerRef}
        className="photo-viewer__canvas"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" && previous) {
            event.preventDefault();
            openFileSystemPath(previous.path, nodes, launchApp);
          }

          if (event.key === "ArrowRight" && next) {
            event.preventDefault();
            openFileSystemPath(next.path, nodes, launchApp);
          }

          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            setZoom((currentZoom) => Math.min(3, currentZoom + 0.2));
          }

          if (event.key === "-") {
            event.preventDefault();
            setZoom((currentZoom) => Math.max(0.4, currentZoom - 0.2));
          }

          if (event.key.toLowerCase() === "f") {
            event.preventDefault();
            void containerRef.current?.requestFullscreen();
          }
        }}
      >
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
              This image format is routed through the photo viewer, but the browser cannot render it inline yet.
            </p>
            <p>Use Paint export, download the file, or convert it to PNG, JPG, WebP, GIF, BMP, or ICO.</p>
          </div>
        )}
      </div>

      {siblings.length > 1 ? (
        <div className="photo-viewer__filmstrip" role="list" aria-label="Image strip">
          {siblings.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`photo-viewer__thumb ${item.path === file.path ? "is-active" : ""}`}
              onClick={() => openFileSystemPath(item.path, nodes, launchApp)}
            >
              {item.source ? <img src={item.source} alt={item.name} loading="lazy" /> : null}
              <span>{item.name.replace(/\.[^.]+$/, "")}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
