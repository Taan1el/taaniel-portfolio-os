import { Button } from "@/components/apps/app-layout";
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
          <Button
            key={action.id}
            type="button"
            variant={action.danger ? "danger" : "panel"}
            align="start"
            className={`start-menu__rail-item ${action.danger ? "is-danger" : ""}`}
            onClick={() => onExecuteAction(action)}
            onMouseMove={updateStartMenuSpotlight}
          >
            <Icon size={16} />
            <span>{action.label}</span>
          </Button>
        );
      })}
    </>
  );
}
