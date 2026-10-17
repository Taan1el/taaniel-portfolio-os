/** Geometry for rubber-band (marquee) selection: drag a rectangle to select what it touches. */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The box between where the drag started and where the pointer is now, whichever way it was dragged. */
export function boxFromPoints(a: Point, b: Point): Box {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

/** True when the boxes overlap. Boxes that only share an edge don't. */
export function boxesIntersect(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function getBoxSize(box: Box) {
  return { width: box.right - box.left, height: box.bottom - box.top };
}

/** The ids whose boxes the marquee touches, in the order given. */
export function getMarqueeHits(items: Array<{ id: string; box: Box }>, marquee: Box) {
  return items.filter((item) => boxesIntersect(item.box, marquee)).map((item) => item.id);
}

/**
 * The selection while the marquee is dragged. Plain: exactly what it touches.
 * With Ctrl: what it touches flips relative to what was selected before, as in Explorer.
 */
export function combineMarqueeSelection(base: string[], hits: string[], additive: boolean) {
  if (!additive) {
    return hits;
  }

  const hitSet = new Set(hits);
  const baseSet = new Set(base);

  return [...base.filter((id) => !hitSet.has(id)), ...hits.filter((id) => !baseSet.has(id))];
}
