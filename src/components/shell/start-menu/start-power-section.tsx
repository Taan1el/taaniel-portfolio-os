import type { StartMenuShortcut } from "@/types/system";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartPowerSectionProps {
  actions: StartMenuShortcut[];
  onExecuteAction: (shortcut: StartMenuShortcut) => void;
}

export function StartPowerSection({ actions, onExecuteAction }: StartPowerSectionProps) {
  return (
    <>
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.id}
            type="button"
            className={`start-menu__rail-item ${action.danger ? "is-danger" : ""}`}
            onClick={() => onExecuteAction(action)}
            onMouseMove={updateStartMenuSpotlight}
          >
            <Icon size={16} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </>
  );
}
