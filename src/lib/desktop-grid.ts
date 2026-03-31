import { clamp } from "@/lib/utils";
import type { DesktopEntry, DesktopGridMetrics, DesktopGridPosition } from "@/types/system";

export const DESKTOP_GRID_PADDING_X = 16;
export const DESKTOP_GRID_PADDING_Y = 16;
export const DESKTOP_GRID_MIN_CELL_WIDTH = 75;
export const DESKTOP_GRID_MIN_CELL_HEIGHT = 106;

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
  metrics: DesktopGridMetrics
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

export function findFirstFreeGridCell(
  occupied: Set<string>,
  columns: number,
  rows: number,
  preferred?: DesktopGridPosition
): DesktopGridPosition {
  if (preferred) {
    const clampedPreferred = clampGridPosition(preferred, columns, rows);

    if (!occupied.has(createGridKey(clampedPreferred))) {
      return clampedPreferred;
    }
  }

  for (let gridX = 0; gridX < columns; gridX += 1) {
    for (let gridY = 0; gridY < rows; gridY += 1) {
      const candidate = { gridX, gridY };

      if (!occupied.has(createGridKey(candidate))) {
        return candidate;
      }
    }
  }

  return {
    gridX: Math.max(0, columns - 1),
    gridY: Math.max(0, rows - 1),
  };
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

    const clampedPosition = clampGridPosition(currentPosition, metrics.columns, metrics.rows);
    const key = createGridKey(clampedPosition);

    if (occupied.has(key)) {
      unresolvedEntries.push(entry);
      return;
    }

    occupied.add(key);
    nextPositions[entry.id] = clampedPosition;
  });

  unresolvedEntries.forEach((entry) => {
    const position = findFirstFreeGridCell(
      occupied,
      metrics.columns,
      metrics.rows,
      entry.defaultGridPosition
    );

    occupied.add(createGridKey(position));
    nextPositions[entry.id] = position;
  });

  return nextPositions;
}

export function applyDesktopGridMove(
  currentPositions: Record<string, DesktopGridPosition>,
  iconId: string,
  targetPosition: DesktopGridPosition,
  metrics: Pick<DesktopGridMetrics, "columns" | "rows">
) {
  const nextTarget = clampGridPosition(targetPosition, metrics.columns, metrics.rows);
  const currentPosition = currentPositions[iconId];
  const occupiedEntry = Object.entries(currentPositions).find(
    ([entryId, position]) => entryId !== iconId && areGridPositionsEqual(position, nextTarget)
  );

  if (!occupiedEntry) {
    return {
      ...currentPositions,
      [iconId]: nextTarget,
    };
  }

  const [occupiedId] = occupiedEntry;

  return {
    ...currentPositions,
    [iconId]: nextTarget,
    ...(currentPosition ? { [occupiedId]: currentPosition } : {}),
  };
}
