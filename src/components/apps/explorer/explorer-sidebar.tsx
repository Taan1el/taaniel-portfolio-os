import { AppSidebar, Button, ScrollArea } from "@/components/apps/app-layout";
import { Clock, FileText, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExplorerSidebarLocation {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface ExplorerSidebarProps {
  locations: ExplorerSidebarLocation[];
  activePath: string;
  recentPaths?: string[];
  onNavigate: (path: string) => void;
  onOpenFile: (path: string) => void;
  onClearRecent?: () => void;
  /** Path currently highlighted as a drop target (e.g. while a drag hovers over a sidebar location). */
  dropTargetPath?: string | null;
  onItemDragOver?: (path: string, event: React.DragEvent<HTMLButtonElement>) => void;
  onItemDragLeave?: (path: string, event: React.DragEvent<HTMLButtonElement>) => void;
  onItemDrop?: (path: string, event: React.DragEvent<HTMLButtonElement>) => void;
}

function basename(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function ExplorerSidebar({
  locations,
  activePath,
  recentPaths = [],
  onNavigate,
  onOpenFile,
  onClearRecent,
  dropTargetPath,
  onItemDragOver,
  onItemDragLeave,
  onItemDrop,
}: ExplorerSidebarProps) {
  return (
    <AppSidebar className="explorer-window__sidebar">
      <div className="explorer-window__sidebar-heading">
        <strong>Locations</strong>
        <small>IndexedDB workspace</small>
      </div>

      <ScrollArea className="explorer-window__sidebar-scroll">
        <div className="explorer-window__sidebar-list">
          {locations.map((location) => {
            const Icon = location.icon;
            const active = activePath === location.path || activePath.startsWith(`${location.path}/`);
            const isDropTarget = dropTargetPath === location.path;

            return (
              <Button
                key={location.path}
                type="button"
                variant="panel"
                block
                align="start"
                className={cn(
                  "explorer-window__sidebar-item",
                  active && "is-active",
                  isDropTarget && "is-drop-target"
                )}
                onClick={() => onNavigate(location.path)}
                onDragOver={(event) => onItemDragOver?.(location.path, event)}
                onDragLeave={(event) => onItemDragLeave?.(location.path, event)}
                onDrop={(event) => onItemDrop?.(location.path, event)}
              >
                <Icon size={15} />
                <span>{location.label}</span>
              </Button>
            );
          })}
        </div>

        {recentPaths.length > 0 ? (
          <>
            <div className="explorer-window__sidebar-section-header">
              <span><Clock size={11} /> Recent</span>
              {onClearRecent ? (
                <button
                  className="explorer-window__sidebar-clear"
                  type="button"
                  title="Clear recent files"
                  onClick={onClearRecent}
                >
                  <X size={11} />
                </button>
              ) : null}
            </div>
            <div className="explorer-window__sidebar-list">
              {recentPaths.map((path) => (
                <Button
                  key={path}
                  type="button"
                  variant="panel"
                  block
                  align="start"
                  className="explorer-window__sidebar-item explorer-window__sidebar-item--recent"
                  title={path}
                  onClick={() => onOpenFile(path)}
                >
                  <FileText size={13} />
                  <span>{basename(path)}</span>
                </Button>
              ))}
            </div>
          </>
        ) : null}
      </ScrollArea>
    </AppSidebar>
  );
}
