import { ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { cn } from "@/lib/utils";
import type { AppDefinition, StartMenuCategoryDescriptor } from "@/types/system";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartAppListProps {
  categories: StartMenuCategoryDescriptor[];
  appsByCategory: Array<{ category: StartMenuCategoryDescriptor; items: AppDefinition[] }>;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  onLaunchSettings: () => void;
  onLaunchApp: (appId: AppDefinition["id"]) => void;
}

export function StartAppList({
  categories,
  appsByCategory,
  expandedCategories,
  onToggleCategory,
  onLaunchSettings,
  onLaunchApp,
}: StartAppListProps) {
  void categories;

  return (
    <div className="start-menu__section">
      <div className="section-row">
        <span className="section-title">Apps</span>
        <Button type="button" variant="ghost" className="ghost-button" onClick={onLaunchSettings}>
          <Settings2 size={14} />
          Settings
        </Button>
      </div>

      <div className="start-menu__catalog">
        {appsByCategory.length > 0 ? (
          appsByCategory.map((group) => {
            const meta = group.category;
            const FolderIcon = meta.icon;
            const expanded = expandedCategories[group.category.category];

            return (
              <section key={group.category.category} className="start-menu__folder">
                <button
                  type="button"
                  className={cn("start-menu__folder-trigger", expanded && "is-open")}
                  onClick={() => onToggleCategory(group.category.category)}
                  onMouseMove={updateStartMenuSpotlight}
                >
                  <span className="start-menu__folder-meta">
                    <span className="start-menu__folder-icon">
                      <FolderIcon size={16} />
                    </span>
                    <span>
                      <strong>{meta.label}</strong>
                      <small>{meta.description}</small>
                    </span>
                  </span>
                  <span className="start-menu__folder-count">
                    {group.items.length}
                    <ChevronRight size={14} />
                  </span>
                </button>

                {expanded ? (
                  <div className="start-menu__apps">
                    {group.items.map((app) => {
                      const Icon = app.icon;

                      return (
                        <button
                          key={app.id}
                          type="button"
                          className="start-menu__app"
                          onClick={() => onLaunchApp(app.id)}
                          onMouseMove={updateStartMenuSpotlight}
                        >
                          <span
                            className="start-menu__app-icon"
                            style={{ "--app-accent": app.accent } as React.CSSProperties}
                          >
                            <Icon size={18} />
                          </span>
                          <span>
                            <strong>{app.title}</strong>
                            <small>{app.description}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <div className="start-menu__empty">
            <strong>No apps match your search</strong>
            <small>Try "terminal", "explorer", "settings", or "projects".</small>
          </div>
        )}
      </div>
    </div>
  );
}
