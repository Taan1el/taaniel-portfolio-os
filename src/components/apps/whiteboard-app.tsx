import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { ArrowUpRight, Circle, Hand, ImageDown, Maximize, Minus, MousePointer2, Pen, Plus, Redo2, Save, Square, StickyNote, Trash2, Type, Undo2 } from "lucide-react";
import { useDocumentFile } from "@/hooks/use-document-file";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { UndoHistory, undoKey } from "@/lib/undo-history";
import { cn } from "@/lib/utils";
import {
  INKS,
  NOTE_PAPER,
  arrowHead,
  boardBounds,
  boundsOf,
  fitView,
  moveShape,
  newShapeId,
  parseBoard,
  serializeBoard,
  simplify,
  strokePath,
  wrapLines,
  zoomAt,
  type Point,
  type Shape,
  type ShapeKind,
  type View,
} from "@/lib/whiteboard";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/whiteboard.css";

type Tool = "select" | "hand" | ShapeKind;

const DRAFT_KEY = "taaniel-os-whiteboard-draft";
const NOTE_SIZE = { w: 190, h: 140 };
const TEXT_SIZE = { w: 240, h: 44 };
const NOTE_FONT = 16;
const TEXT_FONT = 20;
const NUDGE = 10;

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Pen }[] = [
  { id: "select", label: "Select", key: "v", icon: MousePointer2 },
  { id: "hand", label: "Pan", key: "h", icon: Hand },
  { id: "pen", label: "Pen", key: "p", icon: Pen },
  { id: "rect", label: "Rectangle", key: "r", icon: Square },
  { id: "ellipse", label: "Ellipse", key: "o", icon: Circle },
  { id: "arrow", label: "Arrow", key: "a", icon: ArrowUpRight },
  { id: "note", label: "Sticky note", key: "n", icon: StickyNote },
  { id: "text", label: "Text", key: "t", icon: Type },
];

type Gesture =
  | { type: "pan"; x: number; y: number; view: View }
  | { type: "move"; x: number; y: number; origin: Shape; moved: boolean }
  | { type: "resize"; origin: Shape; x: number; y: number }
  | { type: "draw"; shape: Shape }
  | { type: "place"; kind: "note" | "text"; x: number; y: number };

function TextLines({ shape, fontSize, x, y, width }: { shape: Shape; fontSize: number; x: number; y: number; width: number }) {
  const lines = wrapLines(shape.text ?? "", width, fontSize);

  return (
    <text x={x} y={y} fontSize={fontSize} fontFamily="Segoe UI, Arial, sans-serif" fill={INKS[0]}>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index ? fontSize * 1.3 : fontSize}>
          {line || " "}
        </tspan>
      ))}
    </text>
  );
}

function ShapeView({ shape }: { shape: Shape }) {
  const box = boundsOf(shape);
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const common = { stroke: shape.color, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (shape.kind) {
    case "pen": {
      const path = strokePath(shape.points ?? []);
      return (
        <g transform={`translate(${shape.x} ${shape.y})`}>
          <path d={path} fill="none" stroke="transparent" strokeWidth={16} />
          <path d={path} fill="none" {...common} />
        </g>
      );
    }
    case "rect":
      return <rect x={box.left} y={box.top} width={width} height={height} rx={4} fill="transparent" {...common} />;
    case "ellipse":
      return <ellipse cx={box.left + width / 2} cy={box.top + height / 2} rx={width / 2} ry={height / 2} fill="transparent" {...common} />;
    case "arrow": {
      const line = `M${shape.x} ${shape.y}L${shape.x + shape.w} ${shape.y + shape.h}`;
      return (
        <g>
          <path d={line} stroke="transparent" strokeWidth={16} />
          <path d={line} fill="none" {...common} />
          <path d={arrowHead(shape.x, shape.y, shape.x + shape.w, shape.y + shape.h)} fill="none" {...common} />
        </g>
      );
    }
    case "note":
      return (
        <g>
          <rect x={box.left} y={box.top} width={width} height={height} rx={3} fill={NOTE_PAPER[shape.color]} stroke="rgba(0,0,0,0.12)" />
          <TextLines shape={shape} fontSize={NOTE_FONT} x={box.left + 12} y={box.top + 10} width={width - 24} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={box.left} y={box.top} width={width} height={height} fill="transparent" />
          <TextLines shape={shape} fontSize={TEXT_FONT} x={box.left} y={box.top} width={width} />
        </g>
      );
  }
}

export function WhiteboardApp({ window: appWindow }: AppComponentProps) {
  const document_ = useDocumentFile(appWindow, { defaultName: "Board.board", extension: "board", mimeType: "application/json" });
  const createBinaryFile = useFileSystemStore((state) => state.createBinaryFile);
  const [shapes, setShapes] = useState<Shape[]>(() => parseBoard(document_.file ? document_.file.content : readLocalStorage(DRAFT_KEY) ?? undefined));
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(INKS[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [notice, setNotice] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const history = useRef(new UndoHistory<Shape[]>(100));
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const current = useMemo(() => shapes.find((shape) => shape.id === selected), [selected, shapes]);
  const editingShape = shapes.find((shape) => shape.id === editing);

  const syncHistory = () => {
    setCanUndo(history.current.canUndo);
    setCanRedo(history.current.canRedo);
  };

  const persist = useCallback(
    (next: Shape[]) => {
      const text = serializeBoard(next);
      if (document_.file) document_.change(text);
      else writeLocalStorage(DRAFT_KEY, text);
    },
    [document_]
  );

  /** A change that can be undone. `before` is given when the change was previewed during a drag. */
  const commit = useCallback(
    (next: Shape[], before = shapesRef.current) => {
      history.current.record(before);
      syncHistory();
      setShapes(next);
      persist(next);
    },
    [persist]
  );

  const step = (direction: "undo" | "redo") => {
    const restored = direction === "undo" ? history.current.undo(shapesRef.current) : history.current.redo(shapesRef.current);
    if (!restored) return;
    syncHistory();
    setShapes(restored);
    setSelected(null);
    persist(restored);
  };

  const toBoard = (clientX: number, clientY: number): Point => {
    const box = stageRef.current?.getBoundingClientRect();
    return [view.x + (clientX - (box?.left ?? 0)) / view.zoom, view.y + (clientY - (box?.top ?? 0)) / view.zoom];
  };

  const centre = (): Point => {
    const box = stageRef.current?.getBoundingClientRect();
    return [view.x + (box?.width ?? 600) / 2 / view.zoom, view.y + (box?.height ?? 400) / 2 / view.zoom];
  };

  const placeText = (kind: "note" | "text", x: number, y: number) => {
    const size = kind === "note" ? NOTE_SIZE : TEXT_SIZE;
    const shape: Shape = { id: newShapeId(), kind, x, y, ...size, color, text: "" };
    commit([...shapesRef.current, shape]);
    setSelected(shape.id);
    setEditing(shape.id);
    setTool("select");
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    stageRef.current?.focus({ preventScroll: true });
    if (editing) setEditing(null);
    const [x, y] = toBoard(event.clientX, event.clientY);
    const handle = (event.target as Element).closest("[data-resize]");
    const target = (event.target as Element).closest<SVGElement>("[data-shape]");

    if (handle && current) {
      gesture.current = { type: "resize", origin: current, x, y };
    } else if (tool === "hand" || event.button === 1) {
      gesture.current = { type: "pan", x: event.clientX, y: event.clientY, view };
    } else if (tool === "select") {
      const shape = shapes.find((entry) => entry.id === target?.dataset.shape);
      setSelected(shape?.id ?? null);
      gesture.current = shape ? { type: "move", x, y, origin: shape, moved: false } : { type: "pan", x: event.clientX, y: event.clientY, view };
    } else if (tool === "note" || tool === "text") {
      // On release: the browser moves focus to the board after the press, which would close the editor.
      gesture.current = { type: "place", kind: tool, x, y };
    } else {
      const shape: Shape = { id: newShapeId(), kind: tool, x, y, w: 0, h: 0, color, ...(tool === "pen" ? { points: [[0, 0] as Point] } : {}) };
      gesture.current = { type: "draw", shape };
      setShapes([...shapes, shape]);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    const active = gesture.current;
    if (!active) return;
    const [x, y] = toBoard(event.clientX, event.clientY);

    if (active.type === "place") {
      return;
    }

    if (active.type === "pan") {
      setView({ ...active.view, x: active.view.x - (event.clientX - active.x) / view.zoom, y: active.view.y - (event.clientY - active.y) / view.zoom });
    } else if (active.type === "move") {
      active.moved = true;
      setShapes(shapesRef.current.map((shape) => (shape.id === active.origin.id ? moveShape(active.origin, x - active.x, y - active.y) : shape)));
    } else if (active.type === "resize") {
      const min = active.origin.kind === "note" ? 90 : 12;
      setShapes(shapesRef.current.map((shape) => (shape.id === active.origin.id ? { ...shape, w: Math.max(min, active.origin.w + x - active.x), h: Math.max(min / 2, active.origin.h + y - active.y) } : shape)));
    } else {
      const shape = active.shape;
      const next: Shape =
        shape.kind === "pen"
          ? { ...shape, points: [...(shape.points ?? []), [x - shape.x, y - shape.y] as Point] }
          : { ...shape, w: x - shape.x, h: y - shape.y };
      active.shape = next;
      setShapes(shapesRef.current.map((entry) => (entry.id === next.id ? next : entry)));
    }
  };

  const handlePointerUp = () => {
    const active = gesture.current;
    gesture.current = null;
    if (!active) return;

    if (active.type === "place") {
      placeText(active.kind, active.x, active.y);
      return;
    }

    if (active.type === "move" && !active.moved) return;
    if (active.type === "move" || active.type === "resize") {
      const before = shapesRef.current.map((shape) => (shape.id === active.origin.id ? active.origin : shape));
      commit(shapesRef.current, before);
    } else if (active.type === "draw") {
      const without = shapesRef.current.filter((shape) => shape.id !== active.shape.id);
      const shape = active.shape;
      const finished: Shape = shape.kind === "pen" ? { ...shape, points: simplify(shape.points ?? []) } : shape;
      const points = finished.points ?? [];
      if (shape.kind === "pen") {
        finished.w = Math.max(...points.map((point) => point[0]), 0);
        finished.h = Math.max(...points.map((point) => point[1]), 0);
      }
      const tiny = shape.kind !== "pen" && Math.abs(shape.w) + Math.abs(shape.h) < 6;
      if (tiny) setShapes(without);
      else commit([...without, finished], without);
    }
  };

  const handleWheel = (event: WheelEvent) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    if (event.ctrlKey || event.metaKey) setView((value) => zoomAt(value, event.clientX - box.left, event.clientY - box.top, event.deltaY < 0 ? 1.1 : 1 / 1.1));
    else setView((value) => ({ ...value, x: value.x + event.deltaX / value.zoom, y: value.y + event.deltaY / value.zoom }));
  };

  const zoomBy = (factor: number) => {
    const box = stageRef.current?.getBoundingClientRect();
    setView((value) => zoomAt(value, (box?.width ?? 0) / 2, (box?.height ?? 0) / 2, factor));
  };

  const fit = () => {
    const box = stageRef.current?.getBoundingClientRect();
    setView(fitView(shapes, box?.width ?? 800, box?.height ?? 600));
  };

  useEffect(() => {
    if (document_.file && shapes.length) fit();
    // Only for the board the window opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeSelected = () => {
    if (!selected) return;
    commit(shapes.filter((shape) => shape.id !== selected));
    setSelected(null);
  };

  const recolour = (ink: string) => {
    setColor(ink);
    if (current) commit(shapes.map((shape) => (shape.id === current.id ? { ...shape, color: ink } : shape)));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement) return;
    const direction = undoKey(event);
    const key = event.key.toLowerCase();

    if (direction) {
      step(direction);
    } else if (event.ctrlKey || event.metaKey) {
      if (key === "s") void saveBoard();
      else if (key === "d" && current) {
        const copy = { ...moveShape(current, 24, 24), id: newShapeId() };
        commit([...shapes, copy]);
        setSelected(copy.id);
      } else return;
    } else if (event.key === "Delete" || event.key === "Backspace") removeSelected();
    else if (event.key === "Escape" && (selected || tool !== "select")) {
      event.stopPropagation();
      setSelected(null);
      setTool("select");
    } else if (event.key === "Enter" && current && (current.kind === "note" || current.kind === "text")) setEditing(current.id);
    else if (event.key.startsWith("Arrow") && current) {
      const dx = event.key === "ArrowLeft" ? -NUDGE : event.key === "ArrowRight" ? NUDGE : 0;
      const dy = event.key === "ArrowUp" ? -NUDGE : event.key === "ArrowDown" ? NUDGE : 0;
      commit(shapes.map((shape) => (shape.id === current.id ? moveShape(shape, dx, dy) : shape)));
    } else {
      const picked = TOOLS.find((entry) => entry.key === key);
      if (!picked) return;
      // Without a pointer, a note or text lands in the middle of the view.
      if (picked.id === "note" || picked.id === "text") placeText(picked.id, ...centre());
      else setTool(picked.id);
    }
    event.preventDefault();
  };

  const saveBoard = async () => {
    await document_.save(serializeBoard(shapes));
    setNotice("");
  };

  const exportPng = async () => {
    const svg = svgRef.current;
    const bounds = boardBounds(shapes);
    if (!svg || !bounds) return;

    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.querySelectorAll("[data-ui]").forEach((node) => node.remove());
    const width = Math.ceil(bounds.right - bounds.left);
    const height = Math.ceil(bounds.bottom - bounds.top);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("viewBox", `${bounds.left} ${bounds.top} ${width} ${height}`);
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(height));

    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    await createBinaryFile("/Documents", `${document_.name.replace(/\.[^.]+$/, "")}.png`, canvas.toDataURL("image/png"), "image/png", "png");
    setNotice("PNG saved to Documents");
  };

  const selectedBox = current ? boundsOf(current) : null;
  const stageSize = stageRef.current?.getBoundingClientRect();
  const viewBox = `${view.x} ${view.y} ${(stageSize?.width ?? 800) / view.zoom} ${(stageSize?.height ?? 600) / view.zoom}`;

  return (
    <div className="board">
      <div className="board__toolbar" role="toolbar" aria-label="Whiteboard tools">
        {TOOLS.map(({ id, label, key, icon: Icon }) => (
          <button key={id} type="button" aria-label={label} aria-pressed={tool === id} title={`${label} (${key.toUpperCase()})`} className={cn(tool === id && "is-on")} onClick={() => setTool(id)}>
            <Icon size={16} />
          </button>
        ))}
        <span className="board__rule" aria-hidden="true" />
        {INKS.map((ink) => (
          <button key={ink} type="button" className={cn("board__ink", color === ink && "is-on")} style={{ background: ink }} aria-label={`Colour ${INKS.indexOf(ink) + 1}`} aria-pressed={color === ink} onClick={() => recolour(ink)} />
        ))}
        <span className="board__rule" aria-hidden="true" />
        <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => step("undo")}>
          <Undo2 size={16} />
        </button>
        <button type="button" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={() => step("redo")}>
          <Redo2 size={16} />
        </button>
        <button type="button" aria-label="Delete" title="Delete" disabled={!selected} onClick={removeSelected}>
          <Trash2 size={16} />
        </button>
        <span className="board__spacer" />
        <button type="button" aria-label="Save" title="Save (Ctrl+S)" onClick={() => void saveBoard()}>
          <Save size={16} />
        </button>
        <button type="button" aria-label="Save as PNG" title="Save as PNG" disabled={shapes.length === 0} onClick={() => void exportPng()}>
          <ImageDown size={16} />
        </button>
      </div>

      <div
        ref={stageRef}
        className={cn("board__stage", `is-${tool}`)}
        tabIndex={0}
        role="application"
        aria-label="Whiteboard canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <svg ref={svgRef} className="board__svg" viewBox={viewBox} preserveAspectRatio="xMinYMin meet">
          <g data-ui="grid">
            <defs>
              <pattern id={`board-dots-${appWindow.id}`} width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="#d3d7de" />
              </pattern>
            </defs>
            <rect x={view.x} y={view.y} width="100%" height="100%" fill={`url(#board-dots-${appWindow.id})`} style={{ transform: `scale(${1 / view.zoom})`, transformBox: "fill-box", transformOrigin: "0 0" }} />
          </g>
          {shapes.map((shape) => (
            <g key={shape.id} data-shape={shape.id}>
              {editing === shape.id ? null : <ShapeView shape={shape} />}
            </g>
          ))}
          {selectedBox && !editing ? (
            <g data-ui="selection">
              <rect x={selectedBox.left - 6} y={selectedBox.top - 6} width={selectedBox.right - selectedBox.left + 12} height={selectedBox.bottom - selectedBox.top + 12} fill="none" stroke="#2563eb" strokeWidth={1.5 / view.zoom} strokeDasharray={`${6 / view.zoom}`} pointerEvents="none" />
              {current?.kind !== "pen" ? <rect data-resize="true" className="board__handle" x={selectedBox.right} y={selectedBox.bottom} width={12 / view.zoom} height={12 / view.zoom} /> : null}
            </g>
          ) : null}
        </svg>

        {editingShape ? (
          <textarea
            className="board__editor"
            autoFocus
            aria-label="Text"
            maxLength={2000}
            defaultValue={editingShape.text}
            style={{
              left: (boundsOf(editingShape).left - view.x) * view.zoom,
              top: (boundsOf(editingShape).top - view.y) * view.zoom,
              width: (boundsOf(editingShape).right - boundsOf(editingShape).left) * view.zoom,
              height: (boundsOf(editingShape).bottom - boundsOf(editingShape).top) * view.zoom,
              fontSize: (editingShape.kind === "note" ? NOTE_FONT : TEXT_FONT) * view.zoom,
              background: editingShape.kind === "note" ? NOTE_PAPER[editingShape.color] : "rgba(255,255,255,0.9)",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                event.currentTarget.blur();
              }
            }}
            onBlur={(event) => {
              const text = event.target.value;
              const next = shapesRef.current.map((shape) => (shape.id === editingShape.id ? { ...shape, text } : shape));
              setEditing(null);
              if (text !== editingShape.text) commit(next);
              stageRef.current?.focus({ preventScroll: true });
            }}
          />
        ) : null}

        <div className="board__zoom" role="group" aria-label="Zoom" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
            <Minus size={15} />
          </button>
          <span>{Math.round(view.zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
            <Plus size={15} />
          </button>
          <button type="button" aria-label="Fit to board" title="Fit to board" onClick={fit}>
            <Maximize size={15} />
          </button>
        </div>
      </div>

      <footer className="board__status">
        <span>
          {shapes.length} {shapes.length === 1 ? "item" : "items"}
          {notice ? ` · ${notice}` : ""}
        </span>
        <span>{document_.file ? `${document_.file.name} · ${document_.status === "unsaved" ? "Saving" : document_.readOnly ? "Read-only" : "Saved"}` : "Draft, kept in this browser"}</span>
      </footer>
    </div>
  );
}
