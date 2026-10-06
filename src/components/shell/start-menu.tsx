import { useEffect, useMemo, useRef, useState, type Ref, type RefObject } from "react";
import { motion } from "framer-motion";
import { LogOut, Power, RotateCcw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileIcon, PdfIcon } from "@/components/icons/apps";
import { profile } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import type { ShellAiSearchStatus } from "@/hooks/use-shell-ai-search";
import type { ShellSearchAction, ShellSearchSection } from "@/lib/shell-search";
import { ShellSearchResults, type ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import type { AppDefinition, AppIcon, AppId } from "@/types/system";

/** Apps pinned to the top row, in order. Everything else is listed alphabetically below. */
const PINNED_APPS: AppId[] = ["about", "projects", "contact", "files", "browser", "terminal"];

interface RecommendedItem {
  id: string;
  label: string;
  detail: string;
  icon: AppIcon;
  filePath: string;
}

const RECOMMENDED: RecommendedItem[] = [
  {
    id: "resume",
    label: "Taaniel-Vananurm-CV.pdf",
    detail: "Documents",
    icon: PdfIcon,
    filePath: "/Documents/Taaniel-Vananurm-CV.pdf",
  },
  {
    id: "case-study",
    label: "OS-Case-Study.md",
    detail: "Portfolio",
    icon: FileIcon,
    filePath: "/Portfolio/OS-Case-Study.md",
  },
];

interface StartMenuProps {
  onLaunchApp: (appId: AppId) => void;
  onOpenDirectory: (directoryPath: string) => void;
  onOpenFile: (filePath: string) => void;
  searchQuery: string;
  onSearchQueryChange?: (query: string) => void;
  searchBrowseRef: RefObject<ShellSearchResultsHandle | null>;
  searchSections: ShellSearchSection[];
  aiStatus: ShellAiSearchStatus;
  aiEnabled: boolean;
  onSearchSelect: (action: ShellSearchAction) => void;
  onResetSession: () => void;
  onRequestClose: () => void;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AppTile({ app, onLaunch }: { app: AppDefinition; onLaunch: (appId: AppId) => void }) {
  const Icon = app.icon;

  return (
    <button type="button" className="w11-start__tile" onClick={() => onLaunch(app.id)} title={app.description}>
      <Icon size={32} />
      <span>{app.title}</span>
    </button>
  );
}

export function StartMenu({
  onLaunchApp,
  onOpenFile,
  searchQuery,
  onSearchQueryChange,
  searchBrowseRef,
  searchSections,
  aiStatus,
  aiEnabled,
  onSearchSelect,
  onResetSession,
  onRequestClose,
}: StartMenuProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [powerMenu, setPowerMenu] = useState<"closed" | "open" | "confirm-reset">("closed");
  const searching = searchQuery.trim().length > 0;

  const { pinned, others } = useMemo(() => {
    const visible = getAppRegistry().filter((app) => !app.hidden);
    const byId = new Map(visible.map((app) => [app.id, app]));
    const pinnedApps = PINNED_APPS.map((id) => byId.get(id)).filter((app): app is AppDefinition => Boolean(app));
    const rest = visible
      .filter((app) => !PINNED_APPS.includes(app.id))
      .sort((a, b) => a.title.localeCompare(b.title));
    return { pinned: pinnedApps, others: rest };
  }, []);

  // Like Windows: Start opens with the caret in search, so typing searches immediately.
  useEffect(() => {
    if (onSearchQueryChange) {
      searchRef.current?.focus({ preventScroll: true });
    }
  }, [onSearchQueryChange]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (
        menuRef.current?.contains(target) ||
        target.closest(".w11-taskbar__start") ||
        target.closest(".w11-taskbar__search")
      ) {
        return;
      }

      onRequestClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onRequestClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (powerMenu !== "closed") {
        setPowerMenu("closed");
        return;
      }

      if (searching && onSearchQueryChange) {
        onSearchQueryChange("");
        return;
      }

      onRequestClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRequestClose, onSearchQueryChange, powerMenu, searching]);

  return (
    <motion.aside
      ref={menuRef}
      className="w11-start"
      aria-label="Start"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18, ease: [0, 0, 0, 1] }}
    >
      <div className="w11-start__top">
        <label className="w11-start__search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search for apps, settings, and documents"
            value={searchQuery}
            readOnly={!onSearchQueryChange}
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
            aria-label="Search"
          />
        </label>

        <button
          type="button"
          className="w11-start__avatar"
          onClick={() => onLaunchApp("about")}
          title={`${profile.name} - open About`}
        >
          {initialsOf(profile.name)}
        </button>

        <div className="w11-start__power-wrap">
          <button
            type="button"
            className="w11-start__icon-button"
            aria-label="Power"
            aria-haspopup="menu"
            aria-expanded={powerMenu !== "closed"}
            onClick={() => setPowerMenu((state) => (state === "closed" ? "open" : "closed"))}
          >
            <Power size={16} />
          </button>

          {powerMenu === "open" ? (
            <div className="w11-flyout w11-start__power-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="w11-flyout__item"
                onClick={() => {
                  onRequestClose();
                  navigate("/portfolio");
                }}
              >
                <LogOut size={16} />
                <span>Sign out</span>
                <small>Quick portfolio view</small>
              </button>
              <button
                type="button"
                role="menuitem"
                className="w11-flyout__item"
                onClick={() => setPowerMenu("confirm-reset")}
              >
                <RotateCcw size={16} />
                <span>Reset this PC…</span>
                <small>Erase files you created</small>
              </button>
            </div>
          ) : null}

          {powerMenu === "confirm-reset" ? (
            <div className="w11-flyout w11-start__power-menu" role="alertdialog" aria-label="Reset this PC">
              <p className="w11-flyout__text">
                This removes every file and folder you created and restores the original desktop.
              </p>
              <div className="w11-flyout__actions">
                <button
                  type="button"
                  className="w11-button w11-button--accent"
                  onClick={() => {
                    setPowerMenu("closed");
                    onResetSession();
                  }}
                >
                  Reset
                </button>
                <button type="button" className="w11-button" onClick={() => setPowerMenu("closed")}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="w11-start__body">
        {searching ? (
          <div className="w11-start__results">
            <ShellSearchResults
              ref={searchBrowseRef as Ref<ShellSearchResultsHandle>}
              query={searchQuery}
              sections={searchSections}
              aiStatus={aiStatus}
              aiEnabled={aiEnabled}
              onSelectResult={onSearchSelect}
            />
          </div>
        ) : (
          <>
            <section aria-labelledby="w11-start-pinned">
              <h2 id="w11-start-pinned" className="w11-start__heading">
                Pinned
              </h2>
              <div className="w11-start__grid">
                {pinned.map((app) => (
                  <AppTile key={app.id} app={app} onLaunch={onLaunchApp} />
                ))}
              </div>
            </section>

            <hr className="w11-start__divider" />

            <section aria-label="All apps">
              <div className="w11-start__grid">
                {others.map((app) => (
                  <AppTile key={app.id} app={app} onLaunch={onLaunchApp} />
                ))}
              </div>
            </section>

            <section aria-labelledby="w11-start-recommended" className="w11-start__recommended">
              <h2 id="w11-start-recommended" className="w11-start__heading">
                Recommended
              </h2>
              <div className="w11-start__rec-grid">
                {RECOMMENDED.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="w11-start__rec-item"
                      onClick={() => onOpenFile(item.filePath)}
                    >
                      <Icon size={32} />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </motion.aside>
  );
}
