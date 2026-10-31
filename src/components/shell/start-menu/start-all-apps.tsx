import { useMemo, useState, type MouseEvent } from "react";
import { ChevronLeft } from "lucide-react";
import { startMenuCategories } from "@/components/shell/start-menu/start-menu-data";
import { cn } from "@/lib/utils";
import { START_VIEWS, type StartView } from "@/stores/start-menu-store";
import type { AppDefinition, AppId } from "@/types/system";

export interface StartAppActions {
  onLaunch: (appId: AppId) => void;
  onAppMenu: (app: AppDefinition, event: MouseEvent) => void;
}

const VIEW_LABELS: Record<StartView, string> = { category: "Category", grid: "Grid", list: "List" };

export function AppTile({ app, onLaunch, onAppMenu }: { app: AppDefinition } & StartAppActions) {
  const Icon = app.icon;

  return (
    <button
      type="button"
      className="w11-start__tile"
      onClick={() => onLaunch(app.id)}
      onContextMenu={(event) => onAppMenu(app, event)}
      title={app.description}
    >
      <Icon size={32} />
      <span>{app.title}</span>
    </button>
  );
}

function CategoryCard({
  label,
  apps,
  onOpen,
  onLaunch,
  onAppMenu,
}: { label: string; apps: AppDefinition[]; onOpen: () => void } & StartAppActions) {
  return (
    <div className="w11-start__folder" onClick={onOpen}>
      <span className="w11-start__folder-icons">
        {apps.slice(0, 4).map((app) => {
          const Icon = app.icon;

          return (
            <button
              key={app.id}
              type="button"
              aria-label={app.title}
              title={app.title}
              onClick={(event) => {
                event.stopPropagation();
                onLaunch(app.id);
              }}
              onContextMenu={(event) => onAppMenu(app, event)}
            >
              <Icon size={28} />
            </button>
          );
        })}
      </span>
      <button
        type="button"
        className="w11-start__folder-label"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        {label}
      </button>
    </div>
  );
}

function AppList({ apps, onLaunch, onAppMenu }: { apps: AppDefinition[] } & StartAppActions) {
  const groups = useMemo(() => {
    const byLetter = new Map<string, AppDefinition[]>();

    for (const app of apps) {
      const letter = app.title[0].toUpperCase();
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), app]);
    }

    return [...byLetter];
  }, [apps]);

  return (
    <div className="w11-start__list">
      {groups.map(([letter, entries]) => (
        <section key={letter} aria-label={letter}>
          <h3 className="w11-start__letter">{letter}</h3>
          {entries.map((app) => {
            const Icon = app.icon;

            return (
              <button
                key={app.id}
                type="button"
                className="w11-start__row"
                onClick={() => onLaunch(app.id)}
                onContextMenu={(event) => onAppMenu(app, event)}
              >
                <Icon size={24} />
                <span>{app.title}</span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export function StartAllApps({
  apps,
  view,
  onViewChange,
  onLaunch,
  onAppMenu,
}: { apps: AppDefinition[]; view: StartView; onViewChange: (view: StartView) => void } & StartAppActions) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const actions = { onLaunch, onAppMenu };
  const groups = useMemo(
    () =>
      startMenuCategories
        .map((category) => ({ category, items: apps.filter((app) => app.category === category.category) }))
        .filter((group) => group.items.length > 0),
    [apps]
  );
  const folder = view === "category" ? groups.find((group) => group.category.category === openCategory) : undefined;

  return (
    <section aria-labelledby="w11-start-all">
      <div className="w11-start__heading-row">
        <h2 id="w11-start-all" className="w11-start__heading">
          All
        </h2>
        <label className="w11-start__view">
          <span>View:</span>
          <select value={view} onChange={(event) => onViewChange(event.target.value as StartView)}>
            {START_VIEWS.map((entry) => (
              <option key={entry} value={entry}>
                {VIEW_LABELS[entry]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {folder ? (
        <>
          <button type="button" className="w11-start__back" onClick={() => setOpenCategory(null)}>
            <ChevronLeft size={16} aria-hidden="true" />
            {folder.category.label}
          </button>
          <div className="w11-start__grid">
            {folder.items.map((app) => (
              <AppTile key={app.id} app={app} {...actions} />
            ))}
          </div>
        </>
      ) : view === "category" ? (
        <div className="w11-start__folders">
          {groups.map((group) => (
            <CategoryCard
              key={group.category.category}
              label={group.category.label}
              apps={group.items}
              onOpen={() => setOpenCategory(group.category.category)}
              {...actions}
            />
          ))}
        </div>
      ) : view === "grid" ? (
        <div className={cn("w11-start__grid")}>
          {apps.map((app) => (
            <AppTile key={app.id} app={app} {...actions} />
          ))}
        </div>
      ) : (
        <AppList apps={apps} {...actions} />
      )}
    </section>
  );
}
