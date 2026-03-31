import { desktopEntries } from "@/data/portfolio";
import { normalizePath } from "@/lib/filesystem";
import { DesktopIcon } from "@/components/shell/desktop-icon";
import type { DesktopEntry } from "@/types/system";

interface DesktopSurfaceProps {
  nodes: Record<string, import("@/types/system").VirtualNode>;
  selectedIconId: string | null;
  iconPositions: Record<string, import("@/types/system").DesktopIconPosition>;
  onSelectIcon: (iconId: string | null) => void;
  onActivateEntry: (entry: DesktopEntry) => void;
  onUpdatePosition: (iconId: string, position: import("@/types/system").DesktopIconPosition) => void;
  onDesktopContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntryContextMenu: (event: React.MouseEvent<HTMLButtonElement>, entry: DesktopEntry) => void;
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
}: DesktopSurfaceProps) {
  return (
    <div
      className="desktop-surface"
      onPointerDown={() => onSelectIcon(null)}
      onContextMenu={onDesktopContextMenu}
    >
      <div className="desktop-surface__grid">
        {desktopEntries.map((entry) => {
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
      <div className="desktop-surface__overlay desktop-surface__overlay--top" />
      <div className="desktop-surface__overlay desktop-surface__overlay--bottom" />
    </div>
  );
}
