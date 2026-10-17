import {
  createDesktopOccupancyMap,
  createGridKey,
  findNearestFreeGridCell,
  getGridPositionFromRect,
  resolveDesktopGroupPlacement,
} from "@/lib/desktop-grid";
import type { DesktopGridMetrics, DesktopGridPosition } from "@/types/system";

/** Where the desktop surface is on screen, and how its grid is laid out. */
export interface DesktopGeometry {
  container: { left: number; top: number };
  metrics: Pick<DesktopGridMetrics, "columns" | "rows" | "cellWidth" | "cellHeight" | "paddingX" | "paddingY">;
}

/**
 * The grid cell a dragged icon lands on. `grab` is where inside the icon the
 * pointer took hold, so the icon (not the pointer) decides the cell.
 */
export function getDropCell(
  pointer: { x: number; y: number },
  grab: { x: number; y: number },
  geometry: DesktopGeometry
): DesktopGridPosition {
  const { metrics, container } = geometry;

  return getGridPositionFromRect(
    { left: pointer.x - grab.x, top: pointer.y - grab.y, width: metrics.cellWidth, height: metrics.cellHeight },
    container,
    metrics
  );
}

/**
 * Where moved icons end up when dropped: the grabbed icon on the cell under it,
 * the rest at the same offsets. Returns only the icons that moved.
 */
export function planIconMove(input: {
  positions: Record<string, DesktopGridPosition>;
  iconIds: string[];
  /** The icon the pointer grabbed. */
  anchorId: string;
  pointer: { x: number; y: number };
  grab: { x: number; y: number };
  geometry: DesktopGeometry;
}) {
  const { positions, iconIds, anchorId, pointer, grab, geometry } = input;
  const target = getDropCell(pointer, grab, geometry);
  const next = resolveDesktopGroupPlacement(positions, iconIds, anchorId, target, geometry.metrics);

  return Object.fromEntries(iconIds.filter((id) => next[id]).map((id) => [id, next[id]])) as Record<string, DesktopGridPosition>;
}

/**
 * Where files that were dropped onto the desktop from elsewhere appear: at the
 * drop point, spreading to the nearest free cells when there are several.
 */
export function planIconArrivals(input: {
  positions: Record<string, DesktopGridPosition>;
  iconIds: string[];
  pointer: { x: number; y: number };
  geometry: DesktopGeometry;
}) {
  const { positions, iconIds, pointer, geometry } = input;
  const { metrics } = geometry;
  const target = getDropCell(pointer, { x: metrics.cellWidth / 2, y: metrics.cellHeight / 2 }, geometry);
  const taken = Object.fromEntries(Object.entries(positions).filter(([id]) => !iconIds.includes(id)));
  const occupancy = createDesktopOccupancyMap(taken, metrics);
  const placed: Record<string, DesktopGridPosition> = {};

  iconIds.forEach((id) => {
    const cell = findNearestFreeGridCell(occupancy, target, metrics);
    occupancy[createGridKey(cell)] = id;
    placed[id] = { gridX: cell.gridX, gridY: cell.gridY };
  });

  return placed;
}
