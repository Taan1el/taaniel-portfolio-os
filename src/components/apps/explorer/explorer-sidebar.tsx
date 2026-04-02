import { AppSidebar, Button, ScrollArea } from "@/components/apps/app-layout";
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

            return (
              <Button
                key={location.path}
                type="button"
                variant="panel"
                block
                align="start"
                className={cn("explorer-window__sidebar-item", active && "is-active")}
                onClick={() => onNavigate(location.path)}
              >
                <Icon size={15} />
                <span>{location.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </AppSidebar>
  );
}
