import { useEffect, useMemo, useRef, useState, type Ref, type RefObject } from "react";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, ScrollArea } from "@/components/apps/app-layout";
import { liveDemoUrl, profile, repoUrl, socialLinks } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import type { ShellAiSearchStatus } from "@/hooks/use-shell-ai-search";
import type { ShellSearchAction, ShellSearchSection } from "@/lib/shell-search";
import { ShellSearchResults, type ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import { StartAppList } from "@/components/shell/start-menu/start-app-list";
import {
  startMenuCategories,
  startMenuPowerActions,
  startMenuQuickLinks,
  startMenuSidebarLinks,
} from "@/components/shell/start-menu/start-menu-data";
import { StartMenuShell } from "@/components/shell/start-menu/start-menu-shell";
import { StartPowerSection } from "@/components/shell/start-menu/start-power-section";
import { StartQuickLinks } from "@/components/shell/start-menu/start-quick-links";
import { StartSidebar } from "@/components/shell/start-menu/start-sidebar";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";
import type { AppCategory, AppId, StartMenuShortcut } from "@/types/system";

interface StartMenuProps {
  onLaunchApp: (appId: AppId) => void;
  onOpenDirectory: (directoryPath: string) => void;
  onOpenFile: (filePath: string) => void;
  searchQuery: string;
  searchBrowseRef: RefObject<ShellSearchResultsHandle | null>;
  searchSections: ShellSearchSection[];
  aiStatus: ShellAiSearchStatus;
  aiEnabled: boolean;
  onSearchSelect: (action: ShellSearchAction) => void;
  onResetSession: () => void;
  onRequestClose: () => void;
}

export function StartMenu({
  onLaunchApp,
  onOpenDirectory,
  onOpenFile,
  searchQuery,
  searchBrowseRef,
  searchSections,
  aiStatus,
  aiEnabled,
  onSearchSelect,
  onResetSession,
  onRequestClose,
}: StartMenuProps) {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState<Record<AppCategory, boolean>>(() =>
    startMenuCategories.reduce<Record<AppCategory, boolean>>((state, category) => {
      state[category.category] = category.defaultExpanded;
      return state;
    }, {} as Record<AppCategory, boolean>)
  );
  const menuRef = useRef<HTMLElement>(null);
  const apps = getAppRegistry();
  const searching = searchQuery.trim().length > 0;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (
        menuRef.current?.contains(target) ||
        target.closest(".taskbar__start") ||
        target.closest(".taskbar__search-field")
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
      if (event.key === "Escape") {
        onRequestClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRequestClose]);

  const appsByCategory = useMemo(
    () =>
      startMenuCategories
        .map((category) => ({
          category,
          items: apps.filter((app) => app.category === category.category),
        }))
        .filter((group) => group.items.length > 0),
    [apps]
  );

  const executeShortcut = (shortcut: StartMenuShortcut) => {
    switch (shortcut.action.type) {
      case "app":
        onLaunchApp(shortcut.action.appId);
        break;
      case "directory":
        onOpenDirectory(shortcut.action.directoryPath);
        break;
      case "file":
        onOpenFile(shortcut.action.filePath);
        break;
      case "reset-session":
        onResetSession();
        break;
    }
  };

  return (
    <StartMenuShell menuRef={menuRef} className={searching ? "is-searching" : undefined}>
      <div className="start-menu__top">
        <div className="start-menu__hero">
          <div>
            <p className="eyebrow">Portfolio OS</p>
            <h2>{profile.name}</h2>
            <p>{profile.headline}</p>
          </div>
          <Button
            type="button"
            variant="panel"
            className="ghost-button"
            onClick={() => onLaunchApp("contact")}
            onMouseMove={updateStartMenuSpotlight}
          >
            <Mail size={14} />
            Contact
          </Button>
        </div>
      </div>

      <div className="start-menu__body">
        {searching ? (
          <ShellSearchResults
            ref={searchBrowseRef as Ref<ShellSearchResultsHandle>}
            query={searchQuery}
            sections={searchSections}
            aiStatus={aiStatus}
            aiEnabled={aiEnabled}
            onSelectResult={onSearchSelect}
          />
        ) : (
          <>
            <StartSidebar
              shortcuts={[
                {
                  id: "resume",
                  label: "Open Resume.pdf",
                  icon: Mail,
                  action: { type: "file", filePath: "/Documents/Taaniel-Vananurm-CV.pdf" },
                },
                ...startMenuSidebarLinks,
              ]}
              onExecuteAction={executeShortcut}
            />

            <div className="start-menu__main">
              <ScrollArea className="start-menu__content">
                <section className="start-menu__section" aria-label="Try these">
                  <div className="section-row">
                    <p className="eyebrow">Try these</p>
                    <small>30-second tour</small>
                  </div>
                  <div className="action-row">
                    <Button
                      type="button"
                      variant="ghost"
                      className="quick-link"
                      onClick={() => onOpenFile("/Portfolio/OS-Case-Study.md")}
                      onMouseMove={updateStartMenuSpotlight}
                    >
                      OS Case Study
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="quick-link"
                      onClick={() => onOpenFile("/Portfolio/Apps.md")}
                      onMouseMove={updateStartMenuSpotlight}
                    >
                      Apps catalog
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="quick-link"
                      onClick={() => onOpenDirectory("/Portfolio/Case Studies")}
                      onMouseMove={updateStartMenuSpotlight}
                    >
                      Featured work
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="quick-link"
                      onClick={() => onLaunchApp("photos")}
                      onMouseMove={updateStartMenuSpotlight}
                    >
                      Photos
                    </Button>
                  </div>
                </section>
                <StartQuickLinks links={startMenuQuickLinks} onExecuteAction={executeShortcut} />

                <StartAppList
                  categories={startMenuCategories}
                  appsByCategory={appsByCategory}
                  expandedCategories={expandedCategories}
                  onToggleCategory={(category) =>
                    setExpandedCategories((current) => ({
                      ...current,
                      [category]: !current[category as AppCategory],
                    }))
                  }
                  onLaunchSettings={() => onLaunchApp("settings")}
                  onLaunchApp={onLaunchApp}
                />
              </ScrollArea>
            </div>
          </>
        )}
      </div>

      <div className="start-menu__footer">
        <div className="start-menu__footer-actions">
          <StartPowerSection actions={startMenuPowerActions} onExecuteAction={executeShortcut} />
          <small className="start-menu__persist-note">
            Session state is saved in your browser (IndexedDB/localStorage).
          </small>
        </div>
        <div className="start-menu__footer-meta">
          <div className="start-menu__links">
            <a href={liveDemoUrl} target="_blank" rel="noreferrer">
              Live demo
            </a>
            <a href={repoUrl} target="_blank" rel="noreferrer">
              GitHub repo
            </a>
            {socialLinks.slice(0, 4).map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="quick-link"
            onClick={() => {
              onRequestClose();
              navigate("/simple");
            }}
            onMouseMove={updateStartMenuSpotlight}
          >
            Quick portfolio
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="quick-link"
            onClick={() => onOpenDirectory("/Portfolio/Case Studies")}
            onMouseMove={updateStartMenuSpotlight}
          >
            Featured work
          </Button>
        </div>
      </div>
    </StartMenuShell>
  );
}
