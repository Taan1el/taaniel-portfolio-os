import { useEffect, useMemo, useRef, useState } from "react";
import { Brush, Download, Eraser, PaintBucket, Save } from "lucide-react";
import {
  AppContent,
  AppFooter,
  AppScaffold,
  AppToolbar,
  Button,
  IconButton,
} from "@/components/apps/app-layout";
import { getNodeByPath, getParentPath } from "@/lib/filesystem";
import { getBaseName } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

const COLOR_SWATCHES = ["#111827", "#ffffff", "#ff8a5c", "#77c7ff", "#9dffb0", "#ffd166"];
const DIRECT_SAVE_TYPES: Record<string, { mimeType: string; extension: string }> = {
  png: { mimeType: "image/png", extension: "png" },
  jpg: { mimeType: "image/jpeg", extension: "jpg" },
  jpeg: { mimeType: "image/jpeg", extension: "jpeg" },
  webp: { mimeType: "image/webp", extension: "webp" },
};

function isPaintEditable(node: VirtualFile) {
  return ["bmp", "gif", "ico", "jpg", "jpeg", "png", "webp"].includes(node.extension);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the selected image into Paint."));
    image.src = source;
  });
}

function fillCanvasWhite(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function PaintApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const updateBinaryFile = useFileSystemStore((state) => state.updateBinaryFile);
  const createBinaryFile = useFileSystemStore((state) => state.createBinaryFile);
  const file = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ drawing: boolean; x: number; y: number }>({
    drawing: false,
    x: 0,
    y: 0,
  });
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeFile = file && file.kind === "file" ? file : null;
  const canEditCanvas = Boolean(activeFile && isPaintEditable(activeFile) && activeFile.source);
  const canSaveInPlace =
    Boolean(activeFile && !activeFile.readonly && activeFile.extension in DIRECT_SAVE_TYPES && activeFile.source);

  const canvasName = useMemo(() => activeFile?.name ?? "Untitled canvas", [activeFile]);

  const syncCanvasResolution = (preserveDrawing: boolean) => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;

    if (!canvas || !stage) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const dpr = Math.max(1, globalThis.window.devicePixelRatio || 1);
    const nextWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const nextHeight = Math.max(1, Math.floor(cssHeight * dpr));

    if (canvas.width === nextWidth && canvas.height === nextHeight) {
      return;
    }

    let snapshot: HTMLCanvasElement | null = null;

    if (preserveDrawing && canvas.width > 0 && canvas.height > 0) {
      snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
    }

    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    fillCanvasWhite(context, nextWidth, nextHeight);

    if (snapshot) {
      context.drawImage(snapshot, 0, 0, nextWidth, nextHeight);
    }
  };

  const clearCanvasSurface = (message = "Canvas cleared") => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    fillCanvasWhite(context, canvas.width, canvas.height);
    setStatusMessage(message);
  };

  const drawImageToCanvas = (image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const imageWidth = image.naturalWidth || image.width || canvas.width;
    const imageHeight = image.naturalHeight || image.height || canvas.height;
    const scale = Math.min(canvas.width / imageWidth, canvas.height / imageHeight);
    const drawWidth = Math.max(1, Math.floor(imageWidth * scale));
    const drawHeight = Math.max(1, Math.floor(imageHeight * scale));
    const offsetX = Math.floor((canvas.width - drawWidth) / 2);
    const offsetY = Math.floor((canvas.height - drawHeight) / 2);

    fillCanvasWhite(context, canvas.width, canvas.height);
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  };

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof ResizeObserver === "undefined") {
      syncCanvasResolution(true);
      return;
    }

    const observer = new ResizeObserver(() => {
      syncCanvasResolution(true);
    });

    observer.observe(stage);
    syncCanvasResolution(true);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    setLoadError(null);
    syncCanvasResolution(false);
    clearCanvasSurface("Ready");

    if (!activeFile?.source) {
      return;
    }

    if (!isPaintEditable(activeFile)) {
      setLoadError("This image format can be viewed here later, but editing support is still limited.");
      return;
    }

    void loadImage(activeFile.source)
      .then((image) => {
        syncCanvasResolution(false);
        drawImageToCanvas(image);
        setStatusMessage(`Loaded ${activeFile.name}`);
      })
      .catch((error: Error) => {
        clearCanvasSurface("Ready");
        setLoadError(error.message);
      });
  }, [activeFile]);

  const getCanvasCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0, scale: 1 };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      scale: (scaleX + scaleY) / 2,
    };
  };

  const drawLine = (fromX: number, fromY: number, toX: number, toY: number, scale = 1) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize * scale;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    context.restore();
  };

  const exportCanvas = (mimeType: string) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return "";
    }

    return canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
  };

  const saveCanvas = async () => {
    if (!activeFile || !canSaveInPlace) {
      return;
    }

    const saveTarget = DIRECT_SAVE_TYPES[activeFile.extension];
    const source = exportCanvas(saveTarget.mimeType);
    await updateBinaryFile(activeFile.path, source, saveTarget);
    setStatusMessage(`Saved ${activeFile.name}`);
  };

  const exportPng = async () => {
    const source = exportCanvas("image/png");
    const directoryPath = activeFile ? getParentPath(activeFile.path) : "/Desktop";
    const baseName = activeFile ? getBaseName(activeFile.path).replace(/\.[^.]+$/, "") : "Untitled";
    const createdPath = await createBinaryFile(
      directoryPath,
      `${baseName}-edited.png`,
      source,
      "image/png",
      "png"
    );
    setStatusMessage(`Exported ${getBaseName(createdPath)}`);
  };

  return (
    <AppScaffold className="paint-app">
      <AppToolbar className="paint-app__toolbar">
        <div className="app-toolbar__title">
          <strong>{canvasName}</strong>
          <small>
            {activeFile
              ? `${activeFile.extension.toUpperCase()} workspace${activeFile.readonly ? " | export to keep edits" : ""}`
              : "Blank canvas"}
          </small>
        </div>

        <div className="app-toolbar__group paint-app__toolbar-group">
          <IconButton
            type="button"
            className={tool === "brush" ? "is-active" : undefined}
            onClick={() => setTool("brush")}
            aria-label="Brush"
          >
            <Brush size={15} />
          </IconButton>
          <IconButton
            type="button"
            className={tool === "eraser" ? "is-active" : undefined}
            onClick={() => setTool("eraser")}
            aria-label="Eraser"
          >
            <Eraser size={15} />
          </IconButton>
          <Button type="button" variant="ghost" onClick={() => clearCanvasSurface()}>
            <PaintBucket size={15} />
            Clear
          </Button>
          <label className="paint-app__size" title={`Brush size ${brushSize}px`}>
            <span>{brushSize}px</span>
            <input
              type="range"
              min={2}
              max={28}
              step={1}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
          </label>
          <div className="paint-app__swatches">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`paint-app__swatch ${color === swatch ? "is-active" : ""}`}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
                aria-label={`Select ${swatch}`}
              />
            ))}
          </div>
          <Button type="button" variant="ghost" disabled={!canSaveInPlace} onClick={() => void saveCanvas()}>
            <Save size={15} />
            Save
          </Button>
          <Button type="button" variant="panel" onClick={() => void exportPng()}>
            <Download size={15} />
            Export PNG
          </Button>
        </div>
      </AppToolbar>

      <AppContent className="paint-app__content" padded={false} scrollable={false} stacked={false}>
        {loadError ? (
          <div className="paint-app__fallback">
            <strong>Paint cannot edit this source yet</strong>
            <p>{loadError}</p>
          </div>
        ) : null}

        <div ref={stageRef} className="paint-app__stage">
          <canvas
            ref={canvasRef}
            className="paint-app__canvas"
            onPointerDown={(event) => {
              const point = getCanvasCoordinates(event);
              event.currentTarget.setPointerCapture(event.pointerId);
              pointerRef.current = {
                drawing: true,
                x: point.x,
                y: point.y,
              };
            }}
            onPointerMove={(event) => {
              if (!pointerRef.current.drawing) {
                return;
              }

              const point = getCanvasCoordinates(event);
              drawLine(pointerRef.current.x, pointerRef.current.y, point.x, point.y, point.scale);
              pointerRef.current = {
                drawing: true,
                x: point.x,
                y: point.y,
              };
            }}
            onPointerUp={(event) => {
              pointerRef.current.drawing = false;
              setStatusMessage(`${tool === "eraser" ? "Erased" : "Drew"} on canvas`);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerLeave={(event) => {
              pointerRef.current.drawing = false;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
          />
        </div>
      </AppContent>

      <AppFooter className="paint-app__footer">
        <span>{statusMessage}</span>
        <span>{tool === "brush" ? "Brush" : "Eraser"} • {brushSize}px</span>
        {activeFile?.readonly ? <span>Read-only source • export to keep edits</span> : null}
      </AppFooter>
    </AppScaffold>
  );
}
