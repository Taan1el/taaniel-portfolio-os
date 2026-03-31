import type { RefObject } from "react";
import { useState } from "react";
import { DesktopIcon } from "@/components/shell/desktop-icon";
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
  const [dragPreview, setDragPreview] = useState<{
    iconId: string;
    targetPosition: DesktopGridPosition;
  } | null>(null);

  const resolveGridTargetFromSnapshot = (snapshot: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) => {
    const container = containerRef.current;

    if (!container) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();

    return getGridPositionFromRect(snapshot, containerRect, gridMetrics);
  };

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

          return (
            <DesktopIcon
              key={entry.id}
              entry={entry}
              node={node}
              pixelPosition={toPixels(position)}
              gridMetrics={gridMetrics}
              dragConstraintsRef={containerRef}
              selected={selectedIconId === entry.id}
              onSelect={() => onSelectIcon(entry.id)}
              onActivate={() => onActivateEntry(entry)}
              onContextMenu={(event) => onEntryContextMenu(event, entry)}
              onDragPreviewChange={(iconId, snapshot) => {
                const targetPosition = resolveGridTargetFromSnapshot(snapshot);

                if (!targetPosition) {
                  return;
                }

                setDragPreview({
                  iconId,
                  targetPosition,
                });
              }}
              onDragCommit={(iconId, snapshot) => {
                const targetPosition = resolveGridTargetFromSnapshot(snapshot);

                if (targetPosition) {
                  onMoveIcon(iconId, targetPosition);
                }

                setDragPreview(null);
              }}
              onDragCancel={() => setDragPreview(null)}
            />
          );
        })}
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
