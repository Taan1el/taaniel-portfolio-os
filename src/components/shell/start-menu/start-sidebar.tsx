import type { StartMenuShortcut } from "@/types/system";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartSidebarProps {
  shortcuts: StartMenuShortcut[];
  onExecuteAction: (shortcut: StartMenuShortcut) => void;
}

export function StartSidebar({ shortcuts, onExecuteAction }: StartSidebarProps) {
  return (
    <aside className="start-menu__rail">
      <div className="start-menu__rail-heading">
        <strong>Quick links</strong>
        <small>Folders and system tools</small>
      </div>

      <div className="start-menu__rail-group">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <button
              key={shortcut.id}
              type="button"
              className="start-menu__rail-item"
              onClick={() => onExecuteAction(shortcut)}
              onMouseMove={updateStartMenuSpotlight}
            >
              <Icon size={16} />
              <span>{shortcut.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
