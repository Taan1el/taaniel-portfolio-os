import { clamp } from "@/lib/utils";
import type {
  DesktopEntry,
  DesktopGridCell,
  DesktopGridMetrics,
  DesktopGridPosition,
  DesktopOccupancyMap,
  DesktopPlacementResult,
} from "@/types/system";

export const DESKTOP_GRID_PADDING_X = 16;
export const DESKTOP_GRID_PADDING_Y = 16;
export const DESKTOP_GRID_MIN_CELL_WIDTH = 75;
export const DESKTOP_GRID_MIN_CELL_HEIGHT = 106;

interface GridRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function createDesktopGridMetrics(width: number, height: number): DesktopGridMetrics {
  const safeWidth = Math.max(320, Math.floor(width));
  const safeHeight = Math.max(320, Math.floor(height));
  const innerWidth = Math.max(0, safeWidth - DESKTOP_GRID_PADDING_X * 2);
  const innerHeight = Math.max(0, safeHeight - DESKTOP_GRID_PADDING_Y * 2);
  const columns = Math.max(1, Math.floor(innerWidth / DESKTOP_GRID_MIN_CELL_WIDTH));
  const rows = Math.max(1, Math.floor(innerHeight / DESKTOP_GRID_MIN_CELL_HEIGHT));

  return {
    columns,
    rows,
    cellWidth: innerWidth / columns,
    cellHeight: innerHeight / rows,
    paddingX: DESKTOP_GRID_PADDING_X,
    paddingY: DESKTOP_GRID_PADDING_Y,
    width: safeWidth,
    height: safeHeight,
  };
}

export function createGridKey(position: DesktopGridPosition) {
  return `${position.gridX}:${position.gridY}`;
}

export function createDesktopGridCell(position: DesktopGridPosition): DesktopGridCell {
  return {
    ...position,
    key: createGridKey(position),
  };
}

export function areGridPositionsEqual(a?: DesktopGridPosition, b?: DesktopGridPosition) {
  return Boolean(a && b && a.gridX === b.gridX && a.gridY === b.gridY);
}

export function clampGridPosition(
  position: DesktopGridPosition,
  columns: number,
  rows: number
): DesktopGridPosition {
  return {
    gridX: clamp(Math.round(position.gridX), 0, Math.max(0, columns - 1)),
    gridY: clamp(Math.round(position.gridY), 0, Math.max(0, rows - 1)),
  };
}

export function getGridPixelPosition(position: DesktopGridPosition, metrics: DesktopGridMetrics) {
  return {
    x: metrics.paddingX + metrics.cellWidth * position.gridX,
    y: metrics.paddingY + metrics.cellHeight * position.gridY,
  };
}

export function getGridPositionFromPixels(
  x: number,
  y: number,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows" | "cellWidth" | "cellHeight" | "paddingX" | "paddingY">
): DesktopGridPosition {
  return clampGridPosition(
    {
      gridX: (x - metrics.paddingX) / metrics.cellWidth,
      gridY: (y - metrics.paddingY) / metrics.cellHeight,
    },
    metrics.columns,
    metrics.rows
  );
}

export function getGridPositionFromRect(
  rect: GridRectLike,
  containerRect: Pick<GridRectLike, "left" | "top">,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows" | "cellWidth" | "cellHeight" | "paddingX" | "paddingY">
) {
  const relativeCenterX = rect.left - containerRect.left + rect.width / 2;
  const relativeCenterY = rect.top - containerRect.top + rect.height / 2;

  return clampGridPosition(
    {
      gridX: (relativeCenterX - metrics.paddingX - metrics.cellWidth / 2) / metrics.cellWidth,
      gridY: (relativeCenterY - metrics.paddingY - metrics.cellHeight / 2) / metrics.cellHeight,
    },
    metrics.columns,
    metrics.rows
  );
}

export function getOrderedGridCells(columns: number, rows: number) {
  const cells: DesktopGridCell[] = [];

  for (let gridX = 0; gridX < columns; gridX += 1) {
    for (let gridY = 0; gridY < rows; gridY += 1) {
      cells.push(createDesktopGridCell({ gridX, gridY }));
    }
  }

  return cells;
}

export function createDesktopOccupancyMap(
  positions: Record<string, DesktopGridPosition>,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">,
  excludedEntryId?: string
): DesktopOccupancyMap {
  return Object.entries(positions).reduce<DesktopOccupancyMap>((occupancyMap, [entryId, position]) => {
    if (entryId === excludedEntryId) {
      return occupancyMap;
    }

    const cell = createDesktopGridCell(clampGridPosition(position, metrics.columns, metrics.rows));
    occupancyMap[cell.key] = entryId;
    return occupancyMap;
  }, {});
}

export function findFirstFreeGridCell(
  occupancyMap: DesktopOccupancyMap,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">,
  preferred?: DesktopGridPosition
): DesktopGridPosition {
  if (preferred) {
    const preferredCell = createDesktopGridCell(
      clampGridPosition(preferred, metrics.columns, metrics.rows)
    );

    if (!occupancyMap[preferredCell.key]) {
      return preferredCell;
    }
  }

  return (
    getOrderedGridCells(metrics.columns, metrics.rows).find((cell) => !occupancyMap[cell.key]) ?? {
      gridX: Math.max(0, metrics.columns - 1),
      gridY: Math.max(0, metrics.rows - 1),
      key: createGridKey({
        gridX: Math.max(0, metrics.columns - 1),
        gridY: Math.max(0, metrics.rows - 1),
      }),
    }
  );
}

export function findNearestFreeGridCell(
  occupancyMap: DesktopOccupancyMap,
  targetPosition: DesktopGridPosition,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
): DesktopGridPosition {
  const target = clampGridPosition(targetPosition, metrics.columns, metrics.rows);
  const orderedCells = getOrderedGridCells(metrics.columns, metrics.rows);
  const freeCells = orderedCells.filter((cell) => !occupancyMap[cell.key]);

  if (freeCells.length === 0) {
    return target;
  }

  return freeCells.sort((a, b) => {
    const distanceA = Math.abs(a.gridX - target.gridX) + Math.abs(a.gridY - target.gridY);
    const distanceB = Math.abs(b.gridX - target.gridX) + Math.abs(b.gridY - target.gridY);

    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    if (a.gridX !== b.gridX) {
      return a.gridX - b.gridX;
    }

    return a.gridY - b.gridY;
  })[0];
}

type PlaceableEntry = Pick<DesktopEntry, "id" | "defaultGridPosition">;

/** Keep only well-formed { gridX, gridY } cells; persisted state is never trusted as-is. */
export function sanitizeDesktopGridPositions(value: unknown): Record<string, DesktopGridPosition> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const positions: Record<string, DesktopGridPosition> = {};

  Object.entries(value as Record<string, unknown>).forEach(([id, position]) => {
    if (!id || !position || typeof position !== "object") {
      return;
    }

    const { gridX, gridY } = position as Partial<DesktopGridPosition>;

    if (typeof gridX !== "number" || typeof gridY !== "number" || !Number.isFinite(gridX) || !Number.isFinite(gridY)) {
      return;
    }

    positions[id] = { gridX: Math.max(0, Math.round(gridX)), gridY: Math.max(0, Math.round(gridY)) };
  });

  return positions;
}

/** True when two position maps place the same icons in the same cells. */
export function areDesktopPositionsEqual(
  a: Record<string, DesktopGridPosition>,
  b: Record<string, DesktopGridPosition>
) {
  const aKeys = Object.keys(a);

  return aKeys.length === Object.keys(b).length && aKeys.every((key) => areGridPositionsEqual(a[key], b[key]));
}

export function reconcileDesktopGridPositions(
  entries: PlaceableEntry[],
  currentPositions: Record<string, DesktopGridPosition>,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
) {
  const nextPositions: Record<string, DesktopGridPosition> = {};
  const occupied = new Set<string>();
  const unresolvedEntries: PlaceableEntry[] = [];

  entries.forEach((entry) => {
    const currentPosition = currentPositions[entry.id];

    if (!currentPosition) {
      unresolvedEntries.push(entry);
      return;
    }

    const cell = createDesktopGridCell(clampGridPosition(currentPosition, metrics.columns, metrics.rows));

    if (occupied.has(cell.key)) {
      unresolvedEntries.push(entry);
      return;
    }

    occupied.add(cell.key);
    nextPositions[entry.id] = cell;
  });

  unresolvedEntries.forEach((entry) => {
    const position = findFirstFreeGridCell(
      Array.from(occupied).reduce<DesktopOccupancyMap>((map, key) => {
        map[key] = key;
        return map;
      }, {}),
      metrics,
      entry.defaultGridPosition
    );

    occupied.add(createGridKey(position));
    nextPositions[entry.id] = position;
  });

  return nextPositions;
}

/**
 * Move one or more icons by the offset between the anchor icon and the cell it
 * was dropped on, as a single drag does. The group keeps its shape (the offset
 * is clamped so no icon leaves the grid); an icon whose cell is taken by an
 * icon that is not moving goes to the nearest free cell. Windows never swaps.
 */
export function resolveDesktopGroupPlacement(
  currentPositions: Record<string, DesktopGridPosition>,
  movingIds: string[],
  anchorId: string,
  targetPosition: DesktopGridPosition,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
): Record<string, DesktopGridPosition> {
  const moving = movingIds.filter((id) => currentPositions[id]);
  const target = clampGridPosition(targetPosition, metrics.columns, metrics.rows);
  const anchor = currentPositions[anchorId];

  if (moving.length === 0) {
    return { ...currentPositions, [anchorId]: target };
  }

  const origins = moving.map((id) => clampGridPosition(currentPositions[id], metrics.columns, metrics.rows));
  const minX = Math.min(...origins.map((cell) => cell.gridX));
  const maxX = Math.max(...origins.map((cell) => cell.gridX));
  const minY = Math.min(...origins.map((cell) => cell.gridY));
  const maxY = Math.max(...origins.map((cell) => cell.gridY));
  const anchorCell = anchor ? clampGridPosition(anchor, metrics.columns, metrics.rows) : origins[0];
  const deltaX = clamp(target.gridX - anchorCell.gridX, -minX, metrics.columns - 1 - maxX);
  const deltaY = clamp(target.gridY - anchorCell.gridY, -minY, metrics.rows - 1 - maxY);

  const staying = Object.fromEntries(Object.entries(currentPositions).filter(([id]) => !moving.includes(id)));
  const occupancy = createDesktopOccupancyMap(staying, metrics);
  const placed: Record<string, DesktopGridPosition> = {};

  // Column-major, the order the desktop fills in, so a block lands the way it was laid out.
  moving
    .map((id, index) => ({ id, origin: origins[index] }))
    .sort((a, b) => a.origin.gridX - b.origin.gridX || a.origin.gridY - b.origin.gridY)
    .forEach(({ id, origin }) => {
      const desired = { gridX: origin.gridX + deltaX, gridY: origin.gridY + deltaY };
      const cell = findNearestFreeGridCell(occupancy, desired, metrics);
      occupancy[createGridKey(cell)] = id;
      placed[id] = { gridX: cell.gridX, gridY: cell.gridY };
    });

  return { ...staying, ...placed };
}

export function resolveDesktopGridPlacement(
  currentPositions: Record<string, DesktopGridPosition>,
  iconId: string,
  targetPosition: DesktopGridPosition,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
): DesktopPlacementResult {
  const nextTarget = clampGridPosition(targetPosition, metrics.columns, metrics.rows);
  const currentPosition = currentPositions[iconId];
  const occupancyMap = createDesktopOccupancyMap(currentPositions, metrics, iconId);
  const occupantId = occupancyMap[createGridKey(nextTarget)];

  if (!occupantId) {
    return {
      positions: {
        ...currentPositions,
        [iconId]: nextTarget,
      },
      placedPosition: nextTarget,
    };
  }

  if (currentPosition) {
    const nextPositions = {
      ...currentPositions,
      [iconId]: nextTarget,
      [occupantId]: clampGridPosition(currentPosition, metrics.columns, metrics.rows),
    };

    return {
      positions: nextPositions,
      placedPosition: nextTarget,
      displacedEntryId: occupantId,
    };
  }

  const freeCell = findNearestFreeGridCell(occupancyMap, nextTarget, metrics);

  return {
    positions: {
      ...currentPositions,
      [iconId]: freeCell,
    },
    placedPosition: freeCell,
  };
}
