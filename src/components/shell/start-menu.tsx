import { useEffect, useMemo, useRef, useState, type MouseEvent, type Ref, type RefObject } from "react";
import { motion } from "framer-motion";
import { BriefcaseBusiness, FileText, Image, Lock, LogOut, Pin, PinOff, Power, RefreshCw, RotateCcw, Search, Settings, SquareArrowOutUpRight, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppTile, StartAllApps } from "@/components/shell/start-menu/start-all-apps";
import { useSessionScreenStore } from "@/stores/session-screen-store";
import { useShellStore } from "@/stores/shell-store";
import { useStartMenuStore } from "@/stores/start-menu-store";
import { FileIcon, PdfIcon } from "@/components/icons/apps";
import { profile } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import type { ShellAiSearchStatus } from "@/hooks/use-shell-ai-search";
import type { ShellSearchAction, ShellSearchSection } from "@/lib/shell-search";
import { ShellSearchResults, type ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import type { AppDefinition, AppIcon, AppId } from "@/types/system";

/** Two rows of pins, then Show all. */
const PINNED_PREVIEW = 12;

const FOOTER_LINKS: { label: string; icon: LucideIcon; directoryPath?: string; appId?: AppId }[] = [
  { label: "Documents", icon: FileText, directoryPath: "/Documents" },
  { label: "Portfolio", icon: BriefcaseBusiness, directoryPath: "/Portfolio" },
  { label: "Pictures", icon: Image, directoryPath: "/Media/Photography" },
  { label: "Settings", icon: Settings, appId: "settings" },
];

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

export function StartMenu({
  onLaunchApp,
  onOpenDirectory,
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
  const [allPinsShown, setAllPinsShown] = useState(false);
  const searching = searchQuery.trim().length > 0;
  const pinnedIds = useStartMenuStore((state) => state.pinned);
  const view = useStartMenuStore((state) => state.view);
  const setView = useStartMenuStore((state) => state.setView);

  const apps = useMemo(
    () => getAppRegistry().filter((app) => !app.hidden).sort((a, b) => a.title.localeCompare(b.title)),
    []
  );
  const pinned = useMemo(
    () => pinnedIds.map((id) => apps.find((app) => app.id === id)).filter((app): app is AppDefinition => Boolean(app)),
    [apps, pinnedIds]
  );

  const openAppMenu = (app: AppDefinition, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const start = useStartMenuStore.getState();
    const shell = useShellStore.getState();
    const onStart = start.pinned.includes(app.id);
    const onTaskbar = shell.pinnedAppIds.includes(app.id);

    shell.setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: app.title,
      actions: [
        { id: "open", label: "Open", icon: SquareArrowOutUpRight, onSelect: () => onLaunchApp(app.id) },
        onStart
          ? { id: "unpin-start", label: "Unpin from Start", icon: PinOff, onSelect: () => start.unpin(app.id) }
          : { id: "pin-start", label: "Pin to Start", icon: Pin, onSelect: () => start.pin(app.id) },
        ...(onStart && start.pinned[0] !== app.id
          ? [{ id: "front", label: "Move to front", icon: Pin, onSelect: () => start.moveToFront(app.id) }]
          : []),
        onTaskbar
          ? { id: "unpin-taskbar", label: "Unpin from taskbar", icon: PinOff, onSelect: () => shell.unpinApp(app.id) }
          : { id: "pin-taskbar", label: "Pin to taskbar", icon: Pin, onSelect: () => shell.pinApp(app.id) },
      ],
    });
  };

  // Like Windows: Start opens with the caret in search, so typing searches immediately.
  // Not on touch screens, where focusing would throw the on-screen keyboard over the menu.
  useEffect(() => {
    if (onSearchQueryChange && globalThis.matchMedia?.("(pointer: fine)").matches) {
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
        target.closest(".context-menu") ||
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
      // Typing anywhere in Start searches, wherever focus has wandered to.
      const typing = event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.altKey && !event.metaKey;
      if (typing && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLSelectElement)) {
        searchRef.current?.focus({ preventScroll: true });
        return;
      }

      if (event.key !== "Escape") {
        return;
      }

      // Peel one layer at a time; the shell's own Escape handler stands down.
      event.preventDefault();

      const shell = useShellStore.getState();

      if (shell.contextMenu) {
        shell.setContextMenu(null);
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

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
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
            onKeyDown={(event) => searchBrowseRef.current?.handleSearchKeyDown(event)}
            aria-label="Search"
          />
        </label>
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
              <div className="w11-start__heading-row">
                <h2 id="w11-start-pinned" className="w11-start__heading">
                  Pinned
                </h2>
                {pinned.length > PINNED_PREVIEW ? (
                  <button type="button" className="w11-start__more" onClick={() => setAllPinsShown((shown) => !shown)}>
                    {allPinsShown ? "Show less" : "Show all"}
                  </button>
                ) : null}
              </div>
              <div className="w11-start__grid">
                {(allPinsShown ? pinned : pinned.slice(0, PINNED_PREVIEW)).map((app) => (
                  <AppTile key={app.id} app={app} onLaunch={onLaunchApp} onAppMenu={openAppMenu} />
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

            <StartAllApps apps={apps} view={view} onViewChange={setView} onLaunch={onLaunchApp} onAppMenu={openAppMenu} />
          </>
        )}
      </div>
<footer className="w11-start__footer">
        <button
          type="button"
          className="w11-start__account"
          onClick={() => onLaunchApp("about")}
          title={`${profile.name} - open About`}
        >
          <span className="w11-start__avatar">{initialsOf(profile.name)}</span>
          <span>{profile.name}</span>
        </button>

        <div className="w11-start__footer-actions">
          {FOOTER_LINKS.map(({ label, icon: Icon, directoryPath, appId }) => (
            <button
              key={label}
              type="button"
              className="w11-start__icon-button"
              aria-label={label}
              title={label}
              onClick={() => (directoryPath ? onOpenDirectory(directoryPath) : onLaunchApp(appId ?? "files"))}
            >
              <Icon size={16} />
            </button>
          ))}

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
                    useSessionScreenStore.getState().lock();
                  }}
                >
                  <Lock size={16} />
                  <span>Lock</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w11-flyout__item"
                  onClick={() => {
                    onRequestClose();
                    useSessionScreenStore.getState().restart();
                  }}
                >
                  <RefreshCw size={16} />
                  <span>Restart</span>
                </button>
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
      </footer>
    </motion.aside>
  );
}
