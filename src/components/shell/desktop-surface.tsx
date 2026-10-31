import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { DesktopIcon } from "@/components/shell/desktop-icon";
import { DESKTOP_PATH, getDesktopNodeId } from "@/data/desktop-seed";
import { useMarqueeSelection } from "@/hooks/use-marquee-selection";
import { planIconArrivals, planIconMove, type DesktopGeometry } from "@/lib/desktop-drop";
import { configureDragEnvironment } from "@/lib/dnd/controller";
import { registerDesktopPlacement } from "@/lib/dnd/desktop-placement";
import { folderDropProps } from "@/lib/dnd/dom";
import { useDragStore } from "@/lib/dnd/drag-store";
import { hasExternalFiles } from "@/lib/drag-payload";
import { TRASH_PATH } from "@/lib/system-workspace";
import type {
  DesktopEntry,
  DesktopGridMetrics,
  DesktopGridPosition,
  FileSystemRecord,
} from "@/types/system";

/** The desktop icon that files from outside are held over, when it is a folder or the Recycle Bin. */
function getExternalDropIcon(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>("[data-desktop-icon-id][data-drop-folder]") : null;
}

interface DesktopSurfaceProps {
  entries: DesktopEntry[];
  nodes: FileSystemRecord;
  selectedIds: string[];
  activeId: string | null;
  renamingId: string | null;
  cutPaths: ReadonlySet<string>;
  recycleBinFull: boolean;
  iconPositions: Record<string, DesktopGridPosition>;
  containerRef: RefObject<HTMLDivElement>;
  gridMetrics: DesktopGridMetrics;
  toPixels: (position: DesktopGridPosition) => { x: number; y: number };
  onSelectionChange: (ids: string[], activeId?: string | null) => void;
  onIconPointerDown: (entry: DesktopEntry, event: React.PointerEvent<HTMLElement>) => void;
  onActivateEntry: (entry: DesktopEntry) => void;
  onPlaceIcons: (placements: Record<string, DesktopGridPosition>) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (entry: DesktopEntry, event: React.MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onCommitRename: (entry: DesktopEntry, name: string) => void;
  onCancelRename: () => void;
  /** `folder` is the desktop folder icon the files were dropped on; without it they go onto the desktop at `point`. */
  onImportFiles: (files: File[], point: { x: number; y: number }, folder?: string) => Promise<void>;
}

export function DesktopSurface({
  entries,
  nodes,
  selectedIds,
  activeId,
  renamingId,
  cutPaths,
  recycleBinFull,
  iconPositions,
  containerRef,
  gridMetrics,
  toPixels,
  onSelectionChange,
  onIconPointerDown,
  onActivateEntry,
  onPlaceIcons,
  onDesktopContextMenu,
  onEntryContextMenu,
  onKeyDown,
  onCommitRename,
  onCancelRename,
  onImportFiles,
}: DesktopSurfaceProps) {
  const [dragActive, setDragActive] = useState(false);
  /** Files from outside are held over a folder icon or the Recycle Bin, not the bare desktop. */
  const [overIcon, setOverIcon] = useState(false);
  const externalHighlightRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragSession = useDragStore((state) => state.session);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const tabStopId = entries.some((entry) => entry.id === activeId) ? activeId : (entries[0]?.id ?? null);

  const marquee = useMarqueeSelection({
    contentRef: gridRef,
    itemSelector: "[data-desktop-icon-id]",
    getItemId: (element) => element.dataset.desktopIconId ?? null,
    getSelection: () => selectedIds,
    onSelectionChange: (ids) => onSelectionChange(ids),
  });

  const getGeometry = useCallback((): DesktopGeometry | null => {
    const container = containerRef.current;

    if (!container) {
      return null;
    }

    const bounds = container.getBoundingClientRect();
    return { container: { left: bounds.left, top: bounds.top }, metrics: gridMetrics };
  }, [containerRef, gridMetrics]);

  // Dropping desktop icons on the desktop moves them to the cell under them.
  useEffect(
    () =>
      configureDragEnvironment({
        reposition: ({ items, x, y, grab }) => {
          const geometry = getGeometry();
          const iconIds = items.map((item) => item.id);

          if (geometry && iconIds.length > 0) {
            onPlaceIcons(planIconMove({ positions: iconPositions, iconIds, anchorId: iconIds[0], pointer: { x, y }, grab, geometry }));
          }
        },
      }),
    [getGeometry, iconPositions, onPlaceIcons]
  );

  // Files dragged in from other windows land where they were dropped.
  useEffect(
    () =>
      registerDesktopPlacement((paths, point) => {
        const geometry = getGeometry();

        if (geometry) {
          onPlaceIcons(
            planIconArrivals({ positions: iconPositions, iconIds: paths.map((path) => getDesktopNodeId(path)), pointer: point, geometry })
          );
        }
      }),
    [getGeometry, iconPositions, onPlaceIcons]
  );

  // Where the dragged icons would land if released now.
  const previewCells = useMemo(() => {
    if (dragSession?.origin !== "desktop" || dragSession.plan.kind !== "reposition") {
      return [];
    }

    const geometry = getGeometry();
    const iconIds = dragSession.items.map((item) => item.id);

    if (!geometry || iconIds.length === 0) {
      return [];
    }

    return Object.values(
      planIconMove({
        positions: iconPositions,
        iconIds,
        anchorId: iconIds[0],
        pointer: { x: dragSession.x, y: dragSession.y },
        grab: dragSession.grab,
        geometry,
      })
    );
  }, [dragSession, getGeometry, iconPositions]);

  const dragSourceIds = useMemo(() => new Set(dragSession?.items.map((item) => item.id) ?? []), [dragSession?.items]);

  const clearExternalHighlight = () => {
    externalHighlightRef.current?.removeAttribute("data-drop-active");
    externalHighlightRef.current = null;
  };

  const endExternalDrag = () => {
    clearExternalHighlight();
    setDragActive(false);
    setOverIcon(false);
  };

  return (
    <div
      ref={containerRef}
      className="desktop-surface"
      role="listbox"
      aria-label="Desktop"
      aria-multiselectable="true"
      tabIndex={-1}
      style={
        {
          "--desktop-columns": gridMetrics.columns,
          "--desktop-rows": gridMetrics.rows,
          "--desktop-cell-width": `${gridMetrics.cellWidth}px`,
          "--desktop-cell-height": `${gridMetrics.cellHeight}px`,
          "--desktop-grid-padding-x": `${gridMetrics.paddingX}px`,
          "--desktop-grid-padding-y": `${gridMetrics.paddingY}px`,
        } as React.CSSProperties
      }
      // The desktop is the folder /Desktop: a drop target like any other folder.
      {...folderDropProps(DESKTOP_PATH, { surface: "desktop" })}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-desktop-icon-id]")) {
          return;
        }

        event.currentTarget.focus({ preventScroll: true });

        // Pressing the bare desktop deselects, as in Windows; Ctrl and Shift keep the selection.
        if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
          onSelectionChange([]);
        }

        marquee.onPointerDown(event);
      }}
      onContextMenu={onDesktopContextMenu}
      onKeyDown={onKeyDown}
      onDragEnter={(event) => {
        if (!hasExternalFiles(event.dataTransfer)) {
          return;
        }

        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (!hasExternalFiles(event.dataTransfer)) {
          return;
        }

        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }

        event.preventDefault();
        endExternalDrag();
      }}
      onDragOver={(event) => {
        if (!hasExternalFiles(event.dataTransfer)) {
          return;
        }

        event.preventDefault();

        // Files held over a folder icon go into that folder, so it lights up; the Recycle Bin takes none.
        const icon = getExternalDropIcon(event.target);
        const folder = icon && icon.dataset.dropFolder !== TRASH_PATH ? icon : null;

        event.dataTransfer.dropEffect = icon && !folder ? "none" : "copy";

        if (folder !== externalHighlightRef.current) {
          clearExternalHighlight();
          folder?.setAttribute("data-drop-active", "true");
          externalHighlightRef.current = folder;
        }

        setOverIcon(icon !== null);
      }}
      onDrop={(event) => {
        if (!hasExternalFiles(event.dataTransfer)) {
          return;
        }

        event.preventDefault();
        const icon = getExternalDropIcon(event.target);
        endExternalDrag();

        // Nothing from outside can be dropped into the Recycle Bin.
        if (icon?.dataset.dropFolder === TRASH_PATH) {
          return;
        }

        void onImportFiles(Array.from(event.dataTransfer.files), { x: event.clientX, y: event.clientY }, icon?.dataset.dropFolder);
      }}
    >
      <div ref={gridRef} className="desktop-surface__grid">
        {previewCells.map((cell) => (
          <div
            key={`${cell.gridX}:${cell.gridY}`}
            className="desktop-surface__cell-preview"
            style={
              {
                left: toPixels(cell).x,
                top: toPixels(cell).y,
                width: `${gridMetrics.cellWidth}px`,
                height: `${gridMetrics.cellHeight}px`,
              } as React.CSSProperties
            }
          />
        ))}

        {entries.map((entry) => {
          const node = entry.kind === "node" ? nodes[entry.path] : undefined;
          const position = iconPositions[entry.id] ?? entry.defaultGridPosition;

          return (
            <DesktopIcon
              key={entry.id}
              entry={entry}
              node={node}
              pixelPosition={toPixels(position)}
              gridMetrics={gridMetrics}
              selected={selectedSet.has(entry.id)}
              tabbable={entry.id === tabStopId}
              renaming={renamingId === entry.id}
              cut={entry.kind === "node" && cutPaths.has(entry.path)}
              dragSource={dragSourceIds.has(entry.id)}
              recycleBinFull={recycleBinFull}
              onPointerDown={onIconPointerDown}
              onActivate={onActivateEntry}
              onContextMenu={onEntryContextMenu}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
            />
          );
        })}

        {marquee.rect ? (
          <div
            className="desktop-surface__marquee"
            aria-hidden="true"
            style={{ left: marquee.rect.left, top: marquee.rect.top, width: marquee.rect.width, height: marquee.rect.height }}
          />
        ) : null}
      </div>

      {dragActive && !overIcon ? (
        <div className="desktop-surface__dropzone">
          <strong>Drop files to add them to the desktop</strong>
          <small>Uploads are saved into the virtual file system and snap into the desktop grid.</small>
        </div>
      ) : null}
      <div className="desktop-surface__overlay desktop-surface__overlay--top" />
      <div className="desktop-surface__overlay desktop-surface__overlay--bottom" />
    </div>
  );
}
