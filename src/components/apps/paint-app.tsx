import { useEffect, useMemo, useRef, useState } from "react";
import { Brush, Download, Eraser, PaintBucket, Save } from "lucide-react";
import { MediaToolbar } from "@/components/apps/media-toolbar";
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

export function PaintApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const updateBinaryFile = useFileSystemStore((state) => state.updateBinaryFile);
  const createBinaryFile = useFileSystemStore((state) => state.createBinaryFile);
  const file = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;
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

  const canvasName = useMemo(() => {
    if (activeFile) {
      return activeFile.name;
    }

    return "Untitled canvas";
  }, [activeFile]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const initializeBlankCanvas = () => {
      canvas.width = 960;
      canvas.height = 640;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    setLoadError(null);
    setStatusMessage("Ready");
    initializeBlankCanvas();

    if (!activeFile?.source) {
      return;
    }

    if (!isPaintEditable(activeFile)) {
      setLoadError("This image can be viewed in Paint later, but editing for this format is staged.");
      return;
    }

    void loadImage(activeFile.source)
      .then((image) => {
        canvas.width = image.naturalWidth || 960;
        canvas.height = image.naturalHeight || 640;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      })
      .catch((error: Error) => {
        setLoadError(error.message);
      });
  }, [activeFile]);

  const getCanvasCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const drawLine = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushSize;
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
    <div className="app-screen paint-app">
      <MediaToolbar
        title={canvasName}
        subtitle={
          activeFile
            ? `${activeFile.extension.toUpperCase()} edit workspace${activeFile.readonly ? " | read only source" : ""}`
            : "New canvas"
        }
        actions={
          <>
            <button
              type="button"
              className={`pill-button ${tool === "brush" ? "is-active" : ""}`}
              onClick={() => setTool("brush")}
            >
              <Brush size={15} />
              Brush
            </button>
            <button
              type="button"
              className={`pill-button ${tool === "eraser" ? "is-active" : ""}`}
              onClick={() => setTool("eraser")}
            >
              <Eraser size={15} />
              Eraser
            </button>
            <button
              type="button"
              className="pill-button"
              onClick={() => {
                const canvas = canvasRef.current;
                const context = canvas?.getContext("2d");

                if (!canvas || !context) {
                  return;
                }

                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                setStatusMessage("Canvas cleared");
              }}
            >
              <PaintBucket size={15} />
              Clear
            </button>
            <label className="paint-app__size">
              <span>Brush {brushSize}px</span>
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
            <button type="button" className="pill-button" disabled={!canSaveInPlace} onClick={() => void saveCanvas()}>
              <Save size={15} />
              Save
            </button>
            <button type="button" className="pill-button" onClick={() => void exportPng()}>
              <Download size={15} />
              Export PNG
            </button>
          </>
        }
      />

      {loadError ? (
        <div className="paint-app__fallback">
          <strong>Paint cannot edit this source yet</strong>
          <p>{loadError}</p>
          <p>Browser-native raster formats are fully editable. TIFF, HEIC, JPEG XL, and QOI stay staged for later decoders.</p>
        </div>
      ) : null}

      <div className="paint-app__status">
        <span>{statusMessage}</span>
        {activeFile?.readonly ? <span>Source is read only, so use Export PNG.</span> : null}
      </div>

      <div className="paint-app__stage">
        <canvas
          ref={canvasRef}
          className="paint-app__canvas"
          onPointerDown={(event) => {
            const point = getCanvasCoordinates(event);
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
            drawLine(pointerRef.current.x, pointerRef.current.y, point.x, point.y);
            pointerRef.current = {
              drawing: true,
              x: point.x,
              y: point.y,
            };
          }}
          onPointerUp={() => {
            pointerRef.current.drawing = false;
          }}
          onPointerLeave={() => {
            pointerRef.current.drawing = false;
          }}
        />
      </div>

      {!canEditCanvas && !loadError ? (
        <div className="paint-app__fallback">
          <strong>Open an editable image to start drawing</strong>
          <p>Paint supports PNG, JPG, JPEG, WebP, BMP, GIF, and ICO sources in this first implementation batch.</p>
        </div>
      ) : null}
    </div>
  );
}
