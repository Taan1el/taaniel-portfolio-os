import { useEffect, useRef, useState } from "react";
import { Expand, Search, SearchX, ZoomIn } from "lucide-react";
import {
  AppContent,
  AppFooter,
  AppScaffold,
  EmptyState,
  IconButton,
  ScrollArea,
} from "@/components/apps/app-layout";
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
  const readFile = useFileSystemStore((state) => state.readFile);
  const launchApp = useSystemStore((state) => state.launchApp);
  const setWallpaperImage = useSystemStore((state) => state.setWallpaperImage);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { filePath, next, previous, siblings } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Photography/Clouds.jpg",
    isPhotoFile
  );
  const file = readFile(filePath);
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

  if (!file || file.type !== "file") {
    return (
      <AppScaffold className="photo-viewer">
        <EmptyState
          title="No image selected"
          description="Open an image from the filesystem to preview it here."
        />
      </AppScaffold>
    );
  }

  const fileSize =
    file.size != null
      ? file.size
      : typeof file.content === "string"
        ? new Blob([file.content]).size
        : undefined;
  const canRenderInline = Boolean(file.extension && isBrowserRenderableImageExtension(file.extension) && !renderFailed);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <AppScaffold className="photo-viewer">
      <MediaToolbar
        title={file.name}
        subtitle={fileSize != null ? formatBytes(fileSize) : undefined}
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && openFileSystemPath(previous.path, nodes, launchApp)}
        onNext={() => next && openFileSystemPath(next.path, nodes, launchApp)}
        actions={
          <>
            {file.source ? (
              <button type="button" className="pill-button" onClick={() => file.source && setWallpaperImage(file.source)}>
                Set as wallpaper
              </button>
            ) : null}
            <IconButton
              type="button"
              variant="panel"
              aria-label="Zoom out"
              onClick={() => setZoom((currentZoom) => Math.max(0.4, currentZoom - 0.2))}
            >
              <SearchX size={15} />
            </IconButton>
            <button type="button" className="pill-button" aria-label="Reset zoom" onClick={() => setZoom(1)}>
              {zoomLabel}
            </button>
            <IconButton type="button" variant="panel" aria-label="Reset zoom" onClick={() => setZoom(1)}>
              <Search size={15} />
            </IconButton>
            <IconButton
              type="button"
              variant="panel"
              aria-label="Zoom in"
              onClick={() => setZoom((currentZoom) => Math.min(3, currentZoom + 0.2))}
            >
              <ZoomIn size={15} />
            </IconButton>
            <IconButton
              type="button"
              variant="panel"
              aria-label="Open fullscreen"
              onClick={() => containerRef.current?.requestFullscreen()}
            >
              <Expand size={15} />
            </IconButton>
          </>
        }
      />

      <AppContent className="photo-viewer__content" padded={false} scrollable={false}>
        <ScrollArea
          ref={containerRef}
          className="photo-viewer__canvas"
          tabIndex={0}
          onDoubleClick={() => containerRef.current?.requestFullscreen()}
          onWheel={(event) => {
            if (!event.ctrlKey) {
              return;
            }

            event.preventDefault();
            setZoom((currentZoom) =>
              Math.max(0.4, Math.min(3, currentZoom + (event.deltaY > 0 ? -0.1 : 0.1)))
            );
          }}
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
        </ScrollArea>
      </AppContent>

      {siblings.length > 1 ? (
        <AppFooter className="photo-viewer__footer">
          <span>{zoomLabel}</span>
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
          <span>{siblings.length} images</span>
        </AppFooter>
      ) : null}
    </AppScaffold>
  );
}
