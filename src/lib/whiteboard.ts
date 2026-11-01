export const SHAPE_KINDS = ["pen", "rect", "ellipse", "arrow", "note", "text"] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export const INKS = ["#1f2937", "#dc2626", "#2563eb", "#059669", "#d97706", "#7c3aed"];
/** Paper colours for notes, by ink. */
export const NOTE_PAPER: Record<string, string> = {
  "#1f2937": "#fef3a8",
  "#dc2626": "#fecaca",
  "#2563eb": "#bfdbfe",
  "#059669": "#bbf7d0",
  "#d97706": "#fed7aa",
  "#7c3aed": "#ddd6fe",
};

const MAX_SHAPES = 2000;
const MAX_POINTS = 4000;
const MAX_TEXT = 2000;
const MAX_COORDINATE = 1_000_000;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

export type Point = [number, number];

export interface Shape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** Pen strokes, relative to x and y. */
  points?: Point[];
  text?: string;
}

export interface View {
  x: number;
  y: number;
  zoom: number;
}

let nextId = 0;
export const newShapeId = () => `s${Date.now().toString(36)}-${(nextId += 1)}`;

/** Drops points that barely change the line, so long strokes stay light. */
export function simplify(points: Point[], tolerance = 0.8): Point[] {
  if (points.length < 3) return points;
  const kept: Point[] = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const [x, y] = points[index];
    const [lastX, lastY] = kept[kept.length - 1];
    if (Math.hypot(x - lastX, y - lastY) >= tolerance) kept.push(points[index]);
  }
  kept.push(points[points.length - 1]);
  return kept;
}

/** A pen stroke as a smooth SVG path, curving through the midpoints. */
export function strokePath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]}h0.01`;
  let path = `M${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [x, y] = points[index];
    const [nextX, nextY] = points[index + 1];
    path += `Q${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`;
  }
  const last = points[points.length - 1];
  return `${path}L${last[0]} ${last[1]}`;
}

/** The two barbs of an arrow head, for a line ending at (toX, toY). */
export function arrowHead(fromX: number, fromY: number, toX: number, toY: number, size = 14) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const barb = (offset: number) => `${toX - size * Math.cos(angle + offset)} ${toY - size * Math.sin(angle + offset)}`;
  return `M${barb(0.5)}L${toX} ${toY}L${barb(-0.5)}`;
}

/** Breaks text to fit a width. SVG has no wrapping of its own, and foreignObject would block PNG export. */
export function wrapLines(text: string, width: number, fontSize: number) {
  const perLine = Math.max(4, Math.floor(width / (fontSize * 0.54)));
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      let rest = word;
      while (rest.length > perLine) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      const joined = line ? `${line} ${rest}` : rest;
      if (joined.length > perLine) {
        lines.push(line);
        line = rest;
      } else {
        line = joined;
      }
    }
    lines.push(line);
  }

  return lines;
}

/** Box of a shape, normalised for shapes drawn from right to left or bottom to top. */
export function boundsOf(shape: Shape) {
  return {
    left: Math.min(shape.x, shape.x + shape.w),
    top: Math.min(shape.y, shape.y + shape.h),
    right: Math.max(shape.x, shape.x + shape.w),
    bottom: Math.max(shape.y, shape.y + shape.h),
  };
}

export function boardBounds(shapes: Shape[], padding = 24) {
  if (shapes.length === 0) return null;
  const boxes = shapes.map(boundsOf);
  return {
    left: Math.min(...boxes.map((box) => box.left)) - padding,
    top: Math.min(...boxes.map((box) => box.top)) - padding,
    right: Math.max(...boxes.map((box) => box.right)) + padding,
    bottom: Math.max(...boxes.map((box) => box.bottom)) + padding,
  };
}

/** The view that shows every shape in a viewport of this size. */
export function fitView(shapes: Shape[], width: number, height: number): View {
  const bounds = boardBounds(shapes);
  if (!bounds) return { x: 0, y: 0, zoom: 1 };
  const zoom = Math.min(1.5, Math.max(MIN_ZOOM, Math.min(width / (bounds.right - bounds.left), height / (bounds.bottom - bounds.top))));
  return {
    x: (bounds.left + bounds.right) / 2 - width / zoom / 2,
    y: (bounds.top + bounds.bottom) / 2 - height / zoom / 2,
    zoom,
  };
}

/** Zooms about a screen point, so what is under the pointer stays there. */
export function zoomAt(view: View, screenX: number, screenY: number, factor: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
  return {
    zoom,
    x: view.x + screenX / view.zoom - screenX / zoom,
    y: view.y + screenY / view.zoom - screenY / zoom,
  };
}

export const moveShape = (shape: Shape, dx: number, dy: number): Shape => ({ ...shape, x: shape.x + dx, y: shape.y + dy });

const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE;

function parseShape(value: unknown): Shape | null {
  const shape = value as Partial<Shape> | null;
  if (!shape || !SHAPE_KINDS.includes(shape.kind as ShapeKind)) return null;
  if (![shape.x, shape.y, shape.w, shape.h].every(number)) return null;

  const clean: Shape = {
    id: typeof shape.id === "string" && /^[\w-]{1,40}$/.test(shape.id) ? shape.id : newShapeId(),
    kind: shape.kind as ShapeKind,
    x: shape.x as number,
    y: shape.y as number,
    w: shape.w as number,
    h: shape.h as number,
    // Only colours from the palette reach an SVG attribute.
    color: INKS.includes(shape.color as string) ? (shape.color as string) : INKS[0],
  };

  if (shape.kind === "pen") {
    if (!Array.isArray(shape.points)) return null;
    clean.points = shape.points
      .filter((point): point is Point => Array.isArray(point) && point.length === 2 && point.every(number))
      .slice(0, MAX_POINTS);
  }

  if (shape.kind === "note" || shape.kind === "text") {
    clean.text = typeof shape.text === "string" ? shape.text.slice(0, MAX_TEXT) : "";
  }

  return clean;
}

export const serializeBoard = (shapes: Shape[]) => JSON.stringify({ version: 1, shapes });

/** A board file is untrusted: anything that is not a well-formed shape is dropped. */
export function parseBoard(text: string | undefined): Shape[] {
  try {
    const parsed = JSON.parse(text ?? "") as { shapes?: unknown };
    if (!Array.isArray(parsed?.shapes)) return [];
    return parsed.shapes.slice(0, MAX_SHAPES).flatMap((shape) => {
      const clean = parseShape(shape);
      return clean ? [clean] : [];
    });
  } catch {
    return [];
  }
}
