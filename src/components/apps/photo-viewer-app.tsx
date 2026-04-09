import Panzoom from "@panzoom/panzoom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Search, SearchX, ZoomIn } from "lucide-react";
import {
  AppContent,
  AppFooter,
  AppScaffold,
  EmptyState,
  IconButton,
} from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { formatBytes, getBaseName } from "@/lib/utils";
import { useMediaGallery } from "@/hooks/use-media-gallery";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useSystemStore } from "@/stores/system-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

const PANZOOM_CONFIG = {
  cursor: "default",
  maxScale: 7,
  minScale: 1,
  panOnlyWhenZoomed: true,
  step: 0.1,
};

function isPhotoFile(node: VirtualFile) {
  return node.mimeType.startsWith("image/");
}

export function PhotoViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const readFile = useFileSystemStore((state) => state.readFile);
  const updateProcess = useProcessStore((state) => state.updateProcess);
  const setWindowTitle = useWindowStore((state) => state.setWindowTitle);
  const setWallpaperImage = useSystemStore((state) => state.setWallpaperImage);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const [zoom, setZoom] = useState(1);
  const [renderFailed, setRenderFailed] = useState(false);

  const { filePath, next, previous, siblings } = useMediaGallery(
    nodes,
    window.payload?.filePath ?? "/Media/Photography/Clouds.jpg",
    isPhotoFile
  );
  const file = readFile(filePath);

  const goToImagePath = (path: string) => {
    updateProcess(window.processId, {
      launchPayload: { ...window.payload, filePath: path },
    });
    setWindowTitle(window.id, getBaseName(path));
  };

  // DaedalOS pattern: create Panzoom once when img element exists; destroy on unmount only.
  useEffect(() => {
    const img = imageRef.current;
    if (!img || panzoomRef.current) return;

    const pz = Panzoom(img, PANZOOM_CONFIG);
    panzoomRef.current = pz;

    return () => {
      pz.destroy();
      panzoomRef.current = null;
    };
  }, []);

  // DaedalOS pattern: zoomUpdate callback — snap back if at min zoom but offset.
  const zoomUpdate = useCallback(
    (event: Event) => {
      const detail = (event as unknown as { detail?: { scale?: number; x?: number; y?: number } }).detail;
      const scale = detail?.scale ?? 0;
      const x = detail?.x ?? 0;
      const y = detail?.y ?? 0;

      if (scale) {
        const isMinScale = scale < PANZOOM_CONFIG.minScale + PANZOOM_CONFIG.step;

        if (isMinScale && (x || y)) {
          globalThis.setTimeout(() => panzoomRef.current?.reset(), 50);
        }

        setZoom(isMinScale ? 1 : scale);
      }
    },
    []
  );

  // DaedalOS pattern: wheel handler on container (native, not React synthetic).
  const zoomWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    panzoomRef.current?.zoomWithWheel?.(event, { step: 0.3 });
  }, []);

  // Attach panzoomchange + wheel listeners.
  useEffect(() => {
    const img = imageRef.current;
    const container = containerRef.current;

    if (img) img.addEventListener("panzoomchange", zoomUpdate);
    if (container) container.addEventListener("wheel", zoomWheel, { passive: false });

    return () => {
      img?.removeEventListener("panzoomchange", zoomUpdate);
      container?.removeEventListener("wheel", zoomWheel);
    };
  }, [zoomUpdate, zoomWheel]);

  // DaedalOS pattern: reset on container resize.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      panzoomRef.current?.reset();
      setZoom(1);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // On image change: reset zoom state and panzoom transform.
  useEffect(() => {
    setRenderFailed(false);
    panzoomRef.current?.reset();
    setZoom(1);
    containerRef.current?.focus();
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
  const canRenderInline = Boolean(
    file.extension && isBrowserRenderableImageExtension(file.extension) && !renderFailed
  );
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const resetZoom = () => {
    panzoomRef.current?.reset();
    setZoom(1);
  };

  return (
    <AppScaffold className="photo-viewer">
      <MediaToolbar
        title={file.name}
        subtitle={fileSize != null ? formatBytes(fileSize) : undefined}
        canGoPrevious={Boolean(previous)}
        canGoNext={Boolean(next)}
        onPrevious={() => previous && goToImagePath(previous.path)}
        onNext={() => next && goToImagePath(next.path)}
        actions={
          <>
            {file.source ? (
              <button
                type="button"
                className="pill-button"
                onClick={() => file.source && setWallpaperImage(file.source)}
              >
                Set as wallpaper
              </button>
            ) : null}
            <IconButton
              type="button"
              variant="panel"
              aria-label="Zoom out"
              onClick={() => panzoomRef.current?.zoomOut?.()}
            >
              <SearchX size={15} />
            </IconButton>
            <button type="button" className="pill-button" aria-label="Reset zoom" onClick={resetZoom}>
              {zoomLabel}
            </button>
            <IconButton type="button" variant="panel" aria-label="Reset zoom" onClick={resetZoom}>
              <Search size={15} />
            </IconButton>
            <IconButton
              type="button"
              variant="panel"
              aria-label="Zoom in"
              onClick={() => panzoomRef.current?.zoomIn?.()}
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
        <div
          ref={containerRef}
          className="photo-viewer__canvas"
          tabIndex={0}
          onDoubleClick={() => containerRef.current?.requestFullscreen()}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && previous) {
              event.preventDefault();
              goToImagePath(previous.path);
            }

            if (event.key === "ArrowRight" && next) {
              event.preventDefault();
              goToImagePath(next.path);
            }

            if (event.key === "+" || event.key === "=") {
              event.preventDefault();
              panzoomRef.current?.zoomIn?.();
            }

            if (event.key === "-") {
              event.preventDefault();
              panzoomRef.current?.zoomOut?.();
            }

            if (event.key.toLowerCase() === "f") {
              event.preventDefault();
              void containerRef.current?.requestFullscreen();
            }
          }}
        >
          {file.source && canRenderInline ? (
            <img
              ref={imageRef}
              src={file.source}
              alt={file.name}
              className="photo-viewer__image"
              onError={() => setRenderFailed(true)}
              onLoad={() => {
                panzoomRef.current?.reset();
                setZoom(1);
              }}
              draggable={false}
            />
          ) : (
            <div className="photo-viewer__fallback">
              <strong>Inline preview unavailable</strong>
              <p>
                This image format is routed through the photo viewer, but the browser cannot render it
                inline yet.
              </p>
              <p>Use Paint export, download the file, or convert it to PNG, JPG, WebP, GIF, BMP, or ICO.</p>
            </div>
          )}
        </div>
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
                onClick={() => goToImagePath(item.path)}
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
