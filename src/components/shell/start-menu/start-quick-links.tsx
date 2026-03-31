import type { StartMenuShortcut } from "@/types/system";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartQuickLinksProps {
  links: StartMenuShortcut[];
  onExecuteAction: (shortcut: StartMenuShortcut) => void;
}

export function StartQuickLinks({ links, onExecuteAction }: StartQuickLinksProps) {
  return (
    <div className="start-menu__quick-grid">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <button
            key={link.id}
            type="button"
            className="start-menu__quick-card"
            onClick={() => onExecuteAction(link)}
            onMouseMove={updateStartMenuSpotlight}
          >
            <span className="start-menu__quick-card-icon">
              <Icon size={16} />
            </span>
            <span>
              <strong>{link.label}</strong>
              {link.description ? <small>{link.description}</small> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
