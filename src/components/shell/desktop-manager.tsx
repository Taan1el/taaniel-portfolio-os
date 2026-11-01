import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { DesktopSurface } from "@/components/shell/desktop-surface";
import { DESKTOP_PATH, getDesktopNodeId } from "@/data/desktop-seed";
import { useGridSystem } from "@/hooks/use-grid-system";
import { carryDesktopPositions, createDesktopFolder } from "@/lib/desktop-actions";
import {
  buildDesktopEntries,
  findNeighborEntryId,
  orderEntriesByGrid,
  selectRange,
  type DesktopDirection,
} from "@/lib/desktop-entries";
import { armFileDrag } from "@/lib/dnd/controller";
import type { DragItem } from "@/lib/dnd/types";
import { copyItems, cutItems, deleteItems, pasteIntoFolder } from "@/lib/file-actions";
import { isLockedNode } from "@/lib/filesystem";
import { toStoredName } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import { subscribeFileSystemMoves, useFileSystemStore } from "@/stores/filesystem-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useShellStore } from "@/stores/shell-store";
import type { DesktopEntry, FileSystemRecord } from "@/types/system";

interface DesktopManagerProps {
  nodes: FileSystemRecord;
  onActivateEntry: (entry: DesktopEntry) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (entry: DesktopEntry, event: React.MouseEvent<HTMLElement>) => void;
  onImportFiles: (files: File[], point: { x: number; y: number }, folder?: string) => Promise<void>;
}

const ARROW_DIRECTIONS: Record<string, DesktopDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function DesktopManager({
  nodes,
  onActivateEntry,
  onDesktopContextMenu,
  onEntryContextMenu,
  onImportFiles,
}: DesktopManagerProps) {
  const gridSystem = useGridSystem<HTMLDivElement>();
  const {
    selectedIconIds,
    selectedIconId,
    renamingIconId,
    iconPositions,
    clipboard,
    setSelectedIconIds,
    setRenamingIconId,
    placeDesktopIcons,
    reconcileDesktopIconPositions,
  } = useShellStore(
    useShallow((state) => ({
      selectedIconIds: state.selectedIconIds,
      selectedIconId: state.selectedIconId,
      renamingIconId: state.renamingIconId,
      iconPositions: state.desktopIconPositions,
      clipboard: state.clipboard,
      setSelectedIconIds: state.setSelectedIconIds,
      setRenamingIconId: state.setRenamingIconId,
      placeDesktopIcons: state.placeDesktopIcons,
      reconcileDesktopIconPositions: state.reconcileDesktopIconPositions,
    }))
  );
  const rename = useFileSystemStore((state) => state.rename);

  const entries = useMemo(() => buildDesktopEntries(nodes), [nodes]);
  const recycleBinFull = useMemo(() => Object.keys(nodes).some((path) => path.startsWith(`${TRASH_PATH}/`)), [nodes]);
  const cutPaths = useMemo(() => new Set(clipboard?.operation === "cut" ? clipboard.paths : []), [clipboard]);

  // Handlers read the latest of these without being recreated on every change.
  const latest = useRef({ entries, iconPositions, selectedIconIds, selectedIconId, nodes });
  latest.current = { entries, iconPositions, selectedIconIds, selectedIconId, nodes };
  const anchorRef = useRef<string | null>(null);
  const typeAheadRef = useRef({ text: "", at: 0 });

  useEffect(() => {
    reconcileDesktopIconPositions(entries, { columns: gridSystem.columns, rows: gridSystem.rows });
  }, [entries, gridSystem.columns, gridSystem.rows, reconcileDesktopIconPositions]);

  // A file renamed from anywhere (Explorer, the terminal) keeps its icon where it was.
  useEffect(() => subscribeFileSystemMoves(carryDesktopPositions), []);

  // Icons that no longer exist (moved, deleted) drop out of the selection.
  useEffect(() => {
    const ids = new Set(entries.map((entry) => entry.id));
    const valid = selectedIconIds.filter((id) => ids.has(id));

    if (valid.length !== selectedIconIds.length) {
      setSelectedIconIds(valid, valid.includes(selectedIconId ?? "") ? selectedIconId : (valid.at(-1) ?? null));
    }
  }, [entries, selectedIconId, selectedIconIds, setSelectedIconIds]);

  const getEntry = useCallback((id: string) => latest.current.entries.find((entry) => entry.id === id), []);

  const pathsOf = useCallback(
    (ids: string[]) =>
      ids.flatMap((id) => {
        const entry = getEntry(id);
        return entry?.kind === "node" ? [entry.path] : [];
      }),
    [getEntry]
  );

  const focusIcon = useCallback(
    (id: string) => {
      const icons = gridSystem.containerRef.current?.querySelectorAll<HTMLElement>("[data-desktop-icon-id]");
      Array.from(icons ?? [])
        .find((element) => element.dataset.desktopIconId === id)
        ?.focus({ preventScroll: true });
    },
    [gridSystem.containerRef]
  );

  const select = useCallback(
    (ids: string[], activeId?: string | null) => {
      setSelectedIconIds(ids, activeId);

      if (ids.length === 1) {
        anchorRef.current = ids[0];
      }
    },
    [setSelectedIconIds]
  );

  const handleIconPointerDown = useCallback(
    (entry: DesktopEntry, event: React.PointerEvent<HTMLElement>) => {
      const { selectedIconIds: current, entries: all, iconPositions: positions } = latest.current;

      if (useShellStore.getState().renamingIconId === entry.id) {
        return;
      }

      const additive = event.ctrlKey || event.metaKey;
      const rightButton = event.button === 2;
      const isSelected = current.includes(entry.id);
      let next = current;
      // Pressing a selected icon keeps the selection (so the group can be dragged); it narrows on release.
      let onRelease: (() => void) | null = null;

      if (rightButton) {
        if (!isSelected) next = [entry.id];
      } else if (event.shiftKey && !additive) {
        next = selectRange(all, positions, anchorRef.current ?? entry.id, entry.id);
      } else if (additive) {
        if (isSelected) {
          onRelease = () => select(current.filter((id) => id !== entry.id), entry.id);
        } else {
          next = [...current, entry.id];
        }
      } else if (!isSelected) {
        next = [entry.id];
      } else if (current.length > 1) {
        onRelease = () => select([entry.id], entry.id);
      }

      if (next !== current || latest.current.selectedIconId !== entry.id) {
        setSelectedIconIds(next, entry.id);
      }

      // Shift+click extends from the anchor; every other press moves it here.
      if (!event.shiftKey || additive || rightButton) {
        anchorRef.current = entry.id;
      }

      if (event.pointerType !== "touch") {
        // A mouse press focuses the icon the way Tab would, so arrow keys carry on from here.
        (event.currentTarget as HTMLElement).focus({ preventScroll: true });
      }

      const dragIds = next.includes(entry.id) ? [entry.id, ...next.filter((id) => id !== entry.id)] : [entry.id];
      const items: DragItem[] = dragIds.map((id) => {
        const dragged = all.find((candidate) => candidate.id === id);
        return dragged?.kind === "node" ? { id, path: dragged.path } : { id };
      });
      const bounds = event.currentTarget.getBoundingClientRect();
      let dragged = false;

      armFileDrag({
        event: event.nativeEvent,
        items,
        origin: "desktop",
        grab: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        contextTarget: event.currentTarget,
        onStart: () => {
          dragged = true;
        },
      });

      if (onRelease) {
        const apply = onRelease;
        window.addEventListener(
          "pointerup",
          () => {
            if (!dragged) apply();
          },
          { once: true }
        );
      }
    },
    [select, setSelectedIconIds]
  );

  const handleEntryContextMenu = useCallback(
    (entry: DesktopEntry, event: React.MouseEvent<HTMLElement>) => {
      if (!latest.current.selectedIconIds.includes(entry.id)) {
        select([entry.id], entry.id);
      }

      onEntryContextMenu(entry, event);
    },
    [onEntryContextMenu, select]
  );

  const handleCommitRename = useCallback(
    async (entry: DesktopEntry, name: string) => {
      setRenamingIconId(null);

      if (entry.kind !== "node") {
        return;
      }

      const node = latest.current.nodes[entry.path];

      if (!node) {
        return;
      }

      const storedName = toStoredName(name, node);

      if (storedName === node.name) {
        return;
      }

      // The icon is keyed by its path, so the renamed file is a new icon; the move event carries its place over.
      const nextPath = await rename(entry.path, storedName);
      const nextId = getDesktopNodeId(nextPath);

      select([nextId], nextId);
      window.requestAnimationFrame(() => focusIcon(nextId));
    },
    [focusIcon, rename, select, setRenamingIconId]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("input, textarea")) {
        return;
      }

      const { entries: all, iconPositions: positions, selectedIconIds: ids, selectedIconId: active, nodes: current } = latest.current;
      const key = event.key;
      const ctrl = event.ctrlKey || event.metaKey;
      const paths = pathsOf(ids);

      if (event.altKey && key === "Enter" && paths.length > 0) {
        event.preventDefault();
        usePropertiesStore.getState().open(paths);
        return;
      }

      if (key === "Enter" && ids.length > 0) {
        event.preventDefault();
        ids.forEach((id) => {
          const entry = getEntry(id);
          if (entry) onActivateEntry(entry);
        });
        return;
      }

      if (key === "F2" && ids.length === 1 && paths.length === 1 && !isLockedNode(current, paths[0])) {
        event.preventDefault();
        setRenamingIconId(ids[0]);
        return;
      }

      if (key === "Delete" && paths.length > 0) {
        event.preventDefault();
        void deleteItems(paths, { permanent: event.shiftKey });
        return;
      }

      if (ctrl && event.shiftKey && key.toLowerCase() === "n") {
        event.preventDefault();
        void createDesktopFolder();
        return;
      }

      if (ctrl && !event.shiftKey && !event.altKey) {
        const letter = key.toLowerCase();

        if (letter === "a") {
          event.preventDefault();
          select(orderEntriesByGrid(all, positions).map((entry) => entry.id), active);
          return;
        }

        if (letter === "c" && paths.length > 0) {
          event.preventDefault();
          copyItems(paths);
          return;
        }

        if (letter === "x" && paths.length > 0) {
          event.preventDefault();
          cutItems(paths);
          return;
        }

        if (letter === "v") {
          event.preventDefault();
          void pasteIntoFolder(DESKTOP_PATH);
          return;
        }
      }

      const direction = ARROW_DIRECTIONS[key];
      const isNavigation = direction !== undefined || key === "Home" || key === "End";

      if (isNavigation && all.length > 0 && !event.altKey) {
        event.preventDefault();
        const ordered = orderEntriesByGrid(all, positions);
        const from = active && all.some((entry) => entry.id === active) ? active : null;
        let target: string | null;

        if (!from) {
          target = ordered[0]?.id ?? null;
        } else if (direction) {
          target = findNeighborEntryId(all, positions, from, direction);
        } else {
          target = key === "Home" ? ordered[0].id : ordered[ordered.length - 1].id;
        }

        if (!target) {
          return;
        }

        if (event.shiftKey) {
          select(selectRange(all, positions, anchorRef.current ?? from ?? target, target), target);
        } else {
          select([target], target);
        }

        focusIcon(target);
        return;
      }

      // Type a name to jump to the first icon that starts with it, as in Explorer.
      if (key.length === 1 && !ctrl && !event.altKey && key !== " ") {
        const now = Date.now();
        const text = now - typeAheadRef.current.at < 900 ? typeAheadRef.current.text + key : key;
        typeAheadRef.current = { text, at: now };
        const match = orderEntriesByGrid(all, positions).find((entry) => entry.label.toLowerCase().startsWith(text.toLowerCase()));

        if (match) {
          select([match.id], match.id);
          focusIcon(match.id);
        }
      }
    },
    [focusIcon, getEntry, onActivateEntry, pathsOf, select, setRenamingIconId]
  );

  return (
    <DesktopSurface
      entries={entries}
      nodes={nodes}
      selectedIds={selectedIconIds}
      activeId={selectedIconId}
      renamingId={renamingIconId}
      cutPaths={cutPaths}
      recycleBinFull={recycleBinFull}
      iconPositions={iconPositions}
      containerRef={gridSystem.containerRef as RefObject<HTMLDivElement>}
      gridMetrics={gridSystem}
      toPixels={gridSystem.toPixels}
      onSelectionChange={select}
      onIconPointerDown={handleIconPointerDown}
      onActivateEntry={onActivateEntry}
      onPlaceIcons={placeDesktopIcons}
      onDesktopContextMenu={onDesktopContextMenu}
      onEntryContextMenu={handleEntryContextMenu}
      onKeyDown={handleKeyDown}
      onCommitRename={handleCommitRename}
      onCancelRename={() => setRenamingIconId(null)}
      onImportFiles={onImportFiles}
    />
  );
}
