import {
  DESKTOP_PATH,
  RECYCLE_BIN_DESKTOP_ID,
  RECYCLE_BIN_DEFAULT_POSITION,
  getDefaultDesktopPosition,
  getDesktopNodeId,
} from "@/data/desktop-seed";
import { listChildren } from "@/lib/filesystem";
import { getDisplayName } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import type { DesktopEntry, DesktopGridPosition, FileSystemRecord } from "@/types/system";

/**
 * The icons on the desktop: everything in /Desktop (files, folders, shortcuts),
 * plus the Recycle Bin, which Windows also draws as a system icon rather than a
 * file in the Desktop folder.
 */
export function buildDesktopEntries(nodes: FileSystemRecord): DesktopEntry[] {
  const items = listChildren(nodes, DESKTOP_PATH).map<DesktopEntry>((node) => {
    const id = getDesktopNodeId(node.path);

    return {
      id,
      kind: "node",
      path: node.path,
      label: getDisplayName(node),
      defaultGridPosition: getDefaultDesktopPosition(id),
    };
  });

  return [
    ...items,
    {
      id: RECYCLE_BIN_DESKTOP_ID,
      kind: "recycle-bin",
      path: TRASH_PATH,
      label: "Recycle Bin",
      defaultGridPosition: RECYCLE_BIN_DEFAULT_POSITION,
    },
  ];
}

/** Entries in the order Windows walks them: down each column, then across. */
export function orderEntriesByGrid<T extends { id: string }>(
  entries: T[],
  positions: Record<string, DesktopGridPosition>
) {
  const cell = (entry: T) => positions[entry.id] ?? { gridX: Number.MAX_SAFE_INTEGER, gridY: 0 };

  return [...entries].sort((a, b) => cell(a).gridX - cell(b).gridX || cell(a).gridY - cell(b).gridY);
}

export type DesktopDirection = "up" | "down" | "left" | "right";

/**
 * The icon an arrow key moves to: the nearest one in that direction, preferring
 * the one most in line with where you are. Null when nothing lies that way.
 */
export function findNeighborEntryId(
  entries: Array<{ id: string }>,
  positions: Record<string, DesktopGridPosition>,
  fromId: string,
  direction: DesktopDirection
) {
  const from = positions[fromId];

  if (!from) {
    return null;
  }

  let bestId: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const cell = positions[entry.id];

    if (!cell || entry.id === fromId) {
      continue;
    }

    const dx = cell.gridX - from.gridX;
    const dy = cell.gridY - from.gridY;
    const along = direction === "up" ? -dy : direction === "down" ? dy : direction === "left" ? -dx : dx;
    const across = direction === "up" || direction === "down" ? Math.abs(dx) : Math.abs(dy);

    if (along <= 0) {
      continue;
    }

    // Stay in the row or column first; among those, the closest. Off-axis icons only when the line is empty.
    const score = across * 1000 + along;

    if (score < bestScore) {
      bestScore = score;
      bestId = entry.id;
    }
  }

  return bestId;
}

/** Selection between two icons in grid order, for Shift+click and Shift+arrow. */
export function selectRange(
  entries: Array<{ id: string }>,
  positions: Record<string, DesktopGridPosition>,
  anchorId: string,
  targetId: string
) {
  const ordered = orderEntriesByGrid(entries, positions).map((entry) => entry.id);
  const from = ordered.indexOf(anchorId);
  const to = ordered.indexOf(targetId);

  if (from < 0 || to < 0) {
    return [targetId];
  }

  return ordered.slice(Math.min(from, to), Math.max(from, to) + 1);
}
