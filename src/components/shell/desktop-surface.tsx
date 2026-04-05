import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DesktopIcon, DesktopIconGhost } from "@/components/shell/desktop-icon";
import { getGridPositionFromRect } from "@/lib/desktop-grid";
import type { DesktopEntry, DesktopGridMetrics, DesktopGridPosition, VirtualNode } from "@/types/system";

function hasFilePayload(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

interface DesktopSurfaceProps {
  entries: DesktopEntry[];
  nodes: Record<string, VirtualNode>;
  selectedIconId: string | null;
  iconPositions: Record<string, DesktopGridPosition>;
  containerRef: RefObject<HTMLDivElement>;
  gridMetrics: DesktopGridMetrics;
  toPixels: (position: DesktopGridPosition) => { x: number; y: number };
  onSelectIcon: (iconId: string | null) => void;
  onActivateEntry: (entry: DesktopEntry) => void;
  onMoveIcon: (iconId: string, position: DesktopGridPosition) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (event: React.MouseEvent<HTMLButtonElement>, entry: DesktopEntry) => void;
  onImportFiles: (files: File[]) => Promise<void>;
}

interface DesktopDragState {
  iconId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
  targetPosition: DesktopGridPosition;
  pointerType: string;
}

export function DesktopSurface({
  entries,
  nodes,
  selectedIconId,
  iconPositions,
  containerRef,
  gridMetrics,
  toPixels,
  onSelectIcon,
  onActivateEntry,
  onMoveIcon,
  onDesktopContextMenu,
  onEntryContextMenu,
  onImportFiles,
}: DesktopSurfaceProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragState, setDragState] = useState<DesktopDragState | null>(null);
  const dragStateRef = useRef<DesktopDragState | null>(null);

  useEffect(() => {
    if (!dragStateRef.current) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const currentDragState = dragStateRef.current;
      const container = containerRef.current;

      if (!currentDragState || !container) {
        dragStateRef.current = null;
        setDragState(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        0,
        Math.min(
          event.clientX - containerRect.left - currentDragState.offsetX,
          containerRect.width - currentDragState.width
        )
      );
      const nextTop = Math.max(
        0,
        Math.min(
          event.clientY - containerRect.top - currentDragState.offsetY,
          containerRect.height - currentDragState.height
        )
      );
      const moved =
        currentDragState.moved ||
        Math.abs(event.clientX - currentDragState.startClientX) > 4 ||
        Math.abs(event.clientY - currentDragState.startClientY) > 4;
      const targetPosition = getGridPositionFromRect(
        {
          left: containerRect.left + nextLeft,
          top: containerRect.top + nextTop,
          width: currentDragState.width,
          height: currentDragState.height,
        },
        containerRect,
        gridMetrics
      );

      const nextState = {
        ...currentDragState,
        left: nextLeft,
        top: nextTop,
        moved,
        targetPosition,
      };

      dragStateRef.current = nextState;
      setDragState(nextState);
    };

    const finishDrag = (commit: boolean) => {
      const currentDragState = dragStateRef.current;

      if (commit && currentDragState?.moved) {
        onMoveIcon(currentDragState.iconId, currentDragState.targetPosition);
      } else if (
        commit &&
        currentDragState &&
        !currentDragState.moved &&
        currentDragState.pointerType !== "touch"
      ) {
        const entry = entries.find((item) => item.id === currentDragState.iconId);
        if (entry) {
          onActivateEntry(entry);
        }
      }

      delete document.body.dataset.desktopDragLock;
      document.body.style.removeProperty("overflow");
      dragStateRef.current = null;
      setDragState(null);
    };

    const handlePointerUp = () => finishDrag(true);
    const handlePointerCancel = () => finishDrag(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finishDrag(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      delete document.body.dataset.desktopDragLock;
      document.body.style.removeProperty("overflow");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    containerRef,
    dragState !== null,
    entries,
    gridMetrics.cellHeight,
    gridMetrics.cellWidth,
    gridMetrics.columns,
    gridMetrics.paddingX,
    gridMetrics.paddingY,
    gridMetrics.rows,
    onActivateEntry,
    onMoveIcon,
  ]);

  const dragPreview = dragState?.moved
    ? {
        iconId: dragState.iconId,
        targetPosition: dragState.targetPosition,
      }
    : null;
  const draggedEntry = dragState ? entries.find((entry) => entry.id === dragState.iconId) : undefined;
  const draggedPath = draggedEntry?.filePath ?? draggedEntry?.directoryPath;
  const draggedNode = draggedPath ? nodes[draggedPath] : undefined;

  return (
    <div
      ref={containerRef}
      className="desktop-surface"
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
      onPointerDown={() => onSelectIcon(null)}
      onContextMenu={onDesktopContextMenu}
      onDragEnter={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }

        event.preventDefault();
        setDragActive(false);
      }}
      onDragOver={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        event.preventDefault();
        setDragActive(false);
        void onImportFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="desktop-surface__grid">
        {dragPreview ? (
          <div
            className="desktop-surface__cell-preview"
            style={
              {
                left: toPixels(dragPreview.targetPosition).x,
                top: toPixels(dragPreview.targetPosition).y,
                width: `${gridMetrics.cellWidth}px`,
                height: `${gridMetrics.cellHeight}px`,
              } as React.CSSProperties
            }
          />
        ) : null}

        {entries.map((entry) => {
          const targetPath = entry.filePath ?? entry.directoryPath;
          const node = targetPath ? nodes[targetPath] : undefined;
          const position = iconPositions[entry.id] ?? entry.defaultGridPosition;
          const dragging = dragState?.iconId === entry.id;
          const dragPointerSink = Boolean(dragging && dragState?.moved);

          return (
            <DesktopIcon
              key={entry.id}
              entry={entry}
              node={node}
              pixelPosition={toPixels(position)}
              gridMetrics={gridMetrics}
              selected={selectedIconId === entry.id}
              dragging={dragging}
              dragPointerSink={dragPointerSink}
              onSelect={() => onSelectIcon(entry.id)}
              onActivate={() => onActivateEntry(entry)}
              onContextMenu={(event) => onEntryContextMenu(event, entry)}
              onPointerStart={(pointer, snapshot) => {
                const container = containerRef.current;

                if (!container) {
                  return;
                }

                const containerRect = container.getBoundingClientRect();
                document.body.dataset.desktopDragLock = "true";
                document.body.style.overflow = "hidden";

                setDragState({
                  iconId: entry.id,
                  left: snapshot.left - containerRect.left,
                  top: snapshot.top - containerRect.top,
                  width: snapshot.width,
                  height: snapshot.height,
                  offsetX: pointer.clientX - snapshot.left,
                  offsetY: pointer.clientY - snapshot.top,
                  startClientX: pointer.clientX,
                  startClientY: pointer.clientY,
                  moved: false,
                  targetPosition: position,
                  pointerType: pointer.pointerType,
                });
                dragStateRef.current = {
                  iconId: entry.id,
                  left: snapshot.left - containerRect.left,
                  top: snapshot.top - containerRect.top,
                  width: snapshot.width,
                  height: snapshot.height,
                  offsetX: pointer.clientX - snapshot.left,
                  offsetY: pointer.clientY - snapshot.top,
                  startClientX: pointer.clientX,
                  startClientY: pointer.clientY,
                  moved: false,
                  targetPosition: position,
                  pointerType: pointer.pointerType,
                };
              }}
            />
          );
        })}

        {dragState?.moved && draggedEntry ? (
          <DesktopIconGhost
            entry={draggedEntry}
            node={draggedNode}
            pixelPosition={{ x: dragState.left, y: dragState.top }}
            gridMetrics={gridMetrics}
          />
        ) : null}
      </div>

      {dragActive ? (
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
