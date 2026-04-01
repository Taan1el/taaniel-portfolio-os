import type { StartMenuShortcut } from "@/types/system";
import { StartPowerSection } from "@/components/shell/start-menu/start-power-section";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartSidebarProps {
  shortcuts: StartMenuShortcut[];
  powerActions: StartMenuShortcut[];
  onExecuteAction: (shortcut: StartMenuShortcut) => void;
}

export function StartSidebar({
  shortcuts,
  powerActions,
  onExecuteAction,
}: StartSidebarProps) {
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

      <StartPowerSection actions={powerActions} onExecuteAction={onExecuteAction} />
    </aside>
  );
}
