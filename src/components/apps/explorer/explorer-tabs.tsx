import type { KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { TRASH_PATH } from "@/lib/system-workspace";
import { SHELL_USER } from "@/lib/windows-path";
import { cn } from "@/lib/utils";

export interface ExplorerTabView {
  id: string;
  path: string;
}

/** A tab is named after its folder. */
export function getTabLabel(path: string) {
  if (path === "/") return SHELL_USER;
  return path === TRASH_PATH ? "Recycle Bin" : path.slice(path.lastIndexOf("/") + 1);
}

interface ExplorerTabsProps {
  tabs: ExplorerTabView[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function ExplorerTabs({ tabs, activeId, onSelect, onClose, onNew }: ExplorerTabsProps) {
  const moveFocus = (event: KeyboardEvent<HTMLElement>) => {
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;

    event.preventDefault();
    event.stopPropagation();
    const target = tabs[(next + tabs.length) % tabs.length];
    onSelect(target.id);
    event.currentTarget.querySelector<HTMLElement>(`[data-tab-id="${target.id}"]`)?.focus();
  };

  return (
    <div className="explorer-tabs">
      <div className="explorer-tabs__list" role="tablist" aria-label="Open folders" onKeyDown={moveFocus}>
        {tabs.map((tab) => {
          const label = getTabLabel(tab.path);
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={cn("explorer-tabs__tab", active && "is-active")}
              onAuxClick={(event) => {
                if (event.button === 1) onClose(tab.id);
              }}
            >
              <button
                type="button"
                role="tab"
                data-tab-id={tab.id}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                title={label}
                onClick={() => onSelect(tab.id)}
              >
                {label}
              </button>
              <button type="button" className="explorer-tabs__close" aria-label={`Close ${label} tab`} tabIndex={active ? 0 : -1} onClick={() => onClose(tab.id)}>
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="explorer-tabs__new" aria-label="New tab" title="New tab (Alt+T)" onClick={onNew}>
        <Plus size={14} />
      </button>
    </div>
  );
}
