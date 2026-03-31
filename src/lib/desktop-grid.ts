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

export function reconcileDesktopGridPositions(
  entries: DesktopEntry[],
  currentPositions: Record<string, DesktopGridPosition>,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
) {
  const nextPositions: Record<string, DesktopGridPosition> = {};
  const occupied = new Set<string>();
  const unresolvedEntries: DesktopEntry[] = [];

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
