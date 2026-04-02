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
  onNavigate: (path: string) => void;
}

export function ExplorerSidebar({
  locations,
  activePath,
  onNavigate,
}: ExplorerSidebarProps) {
  return (
    <aside className="explorer-window__sidebar">
      <div className="explorer-window__sidebar-heading">
        <strong>Locations</strong>
        <small>IndexedDB workspace</small>
      </div>

      <div className="explorer-window__sidebar-list">
        {locations.map((location) => {
          const Icon = location.icon;
          const active = activePath === location.path || activePath.startsWith(`${location.path}/`);

          return (
            <button
              key={location.path}
              type="button"
              className={cn("explorer-window__sidebar-item", active && "is-active")}
              onClick={() => onNavigate(location.path)}
            >
              <Icon size={15} />
              <span>{location.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
