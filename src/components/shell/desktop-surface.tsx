import { useMemo, useRef, useState } from "react";
import { desktopEntries } from "@/data/portfolio";
import { listChildren, normalizePath } from "@/lib/filesystem";
import { DesktopIcon } from "@/components/shell/desktop-icon";
import type { DesktopEntry } from "@/types/system";

const DYNAMIC_ICON_START_X = Math.max(...desktopEntries.map((entry) => entry.defaultPosition.x)) + 104;

function getDynamicIconPosition(index: number) {
  const row = index % 5;
  const column = Math.floor(index / 5);

  return {
    x: DYNAMIC_ICON_START_X + column * 104,
    y: 28 + row * 104,
  };
}

function hasFilePayload(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

interface DesktopSurfaceProps {
  nodes: Record<string, import("@/types/system").VirtualNode>;
  selectedIconId: string | null;
  iconPositions: Record<string, import("@/types/system").DesktopIconPosition>;
  onSelectIcon: (iconId: string | null) => void;
  onActivateEntry: (entry: DesktopEntry) => void;
  onUpdatePosition: (iconId: string, position: import("@/types/system").DesktopIconPosition) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (event: React.MouseEvent<HTMLButtonElement>, entry: DesktopEntry) => void;
  onImportFiles: (files: File[]) => Promise<void>;
}

export function DesktopSurface({
  nodes,
  selectedIconId,
  iconPositions,
  onSelectIcon,
  onActivateEntry,
  onUpdatePosition,
  onDesktopContextMenu,
  onEntryContextMenu,
  onImportFiles,
}: DesktopSurfaceProps) {
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const staticDesktopPaths = useMemo(
    () =>
      new Set(
        desktopEntries
          .flatMap((entry) => [entry.filePath, entry.directoryPath].filter(Boolean))
          .map((path) => normalizePath(path as string))
      ),
    []
  );
  const entries = useMemo(() => {
    const dynamicEntries = listChildren(nodes, "/Desktop")
      .filter((node) => !staticDesktopPaths.has(node.path))
      .map<DesktopEntry>((node, index) => ({
        id: `desktop-node:${node.path}`,
        label: node.name,
        type: node.kind === "directory" ? "folder" : "file",
        filePath: node.kind === "file" ? node.path : undefined,
        directoryPath: node.kind === "directory" ? node.path : undefined,
        defaultPosition: getDynamicIconPosition(index),
      }));

    return [...desktopEntries, ...dynamicEntries];
  }, [nodes, staticDesktopPaths]);

  return (
    <div
      className="desktop-surface"
      onPointerDown={() => onSelectIcon(null)}
      onContextMenu={onDesktopContextMenu}
      onDragEnter={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        event.preventDefault();
        dragDepthRef.current += 1;
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (!hasFilePayload(event)) {
          return;
        }

        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) {
          setDragActive(false);
        }
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
        dragDepthRef.current = 0;
        setDragActive(false);
        void onImportFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="desktop-surface__grid">
        {entries.map((entry) => {
          const node = entry.filePath ? nodes[normalizePath(entry.filePath)] : undefined;

          return (
            <DesktopIcon
              key={entry.id}
              entry={entry}
              node={node}
              position={iconPositions[entry.id] ?? entry.defaultPosition}
              selected={selectedIconId === entry.id}
              onSelect={() => onSelectIcon(entry.id)}
              onActivate={() => onActivateEntry(entry)}
              onContextMenu={(event) => onEntryContextMenu(event, entry)}
              onPositionChange={(position) => onUpdatePosition(entry.id, position)}
            />
          );
        })}
      </div>
      {dragActive ? (
        <div className="desktop-surface__dropzone">
          <strong>Drop files to add them to the desktop</strong>
          <small>Uploads are saved into the virtual file system and persist between sessions.</small>
        </div>
      ) : null}
      <div className="desktop-surface__overlay desktop-surface__overlay--top" />
      <div className="desktop-surface__overlay desktop-surface__overlay--bottom" />
    </div>
  );
}
