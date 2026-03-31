import { useEffect, useMemo } from "react";
import { desktopEntries } from "@/data/portfolio";
import { listChildren, normalizePath } from "@/lib/filesystem";
import { DesktopSurface } from "@/components/shell/desktop-surface";
import { useGridSystem } from "@/hooks/use-grid-system";
import type { DesktopEntry, DesktopGridPosition, VirtualNode } from "@/types/system";

interface DesktopManagerProps {
  nodes: Record<string, VirtualNode>;
  selectedIconId: string | null;
  iconPositions: Record<string, DesktopGridPosition>;
  onSelectIcon: (iconId: string | null) => void;
  onActivateEntry: (entry: DesktopEntry) => void;
  onMoveIcon: (
    iconId: string,
    position: DesktopGridPosition,
    metrics: { columns: number; rows: number }
  ) => void;
  onReconcileIconPositions: (
    entries: DesktopEntry[],
    metrics: { columns: number; rows: number }
  ) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (event: React.MouseEvent<HTMLButtonElement>, entry: DesktopEntry) => void;
  onImportFiles: (files: File[]) => Promise<void>;
}

export function DesktopManager({
  nodes,
  selectedIconId,
  iconPositions,
  onSelectIcon,
  onActivateEntry,
  onMoveIcon,
  onReconcileIconPositions,
  onDesktopContextMenu,
  onEntryContextMenu,
  onImportFiles,
}: DesktopManagerProps) {
  const gridSystem = useGridSystem<HTMLDivElement>();
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
      .map<DesktopEntry>((node) => ({
        id: `desktop-node:${node.path}`,
        label: node.name,
        type: node.kind === "directory" ? "folder" : "file",
        filePath: node.kind === "file" ? node.path : undefined,
        directoryPath: node.kind === "directory" ? node.path : undefined,
        defaultGridPosition: { gridX: 0, gridY: 0 },
      }));

    return [...desktopEntries, ...dynamicEntries];
  }, [nodes, staticDesktopPaths]);

  useEffect(() => {
    onReconcileIconPositions(entries, {
      columns: gridSystem.columns,
      rows: gridSystem.rows,
    });
  }, [entries, gridSystem.columns, gridSystem.rows, onReconcileIconPositions]);

  return (
    <DesktopSurface
      entries={entries}
      nodes={nodes}
      selectedIconId={selectedIconId}
      iconPositions={iconPositions}
      containerRef={gridSystem.containerRef}
      gridMetrics={gridSystem}
      toPixels={gridSystem.toPixels}
      onSelectIcon={onSelectIcon}
      onActivateEntry={onActivateEntry}
      onMoveIcon={(iconId, position) =>
        onMoveIcon(iconId, position, {
          columns: gridSystem.columns,
          rows: gridSystem.rows,
        })
      }
      onDesktopContextMenu={onDesktopContextMenu}
      onEntryContextMenu={onEntryContextMenu}
      onImportFiles={onImportFiles}
    />
  );
}
