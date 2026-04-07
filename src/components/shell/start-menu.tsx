import { useEffect, useMemo, useRef, useState, type Ref, type RefObject } from "react";
import { Mail } from "lucide-react";
import { Button, ScrollArea } from "@/components/apps/app-layout";
import { profile, socialLinks } from "@/data/portfolio";
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
  const [expandedCategories, setExpandedCategories] = useState<Record<AppCategory, boolean>>(() =>
    startMenuCategories.reduce<Record<AppCategory, boolean>>((state, category) => {
      state[category.category] = category.defaultExpanded;
      return state;
    }, {} as Record<AppCategory, boolean>)
  );
  const menuRef = useRef<HTMLElement | null>(null);
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
        </div>
        <div className="start-menu__footer-meta">
          <div className="start-menu__links">
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
            onClick={() => onOpenDirectory("/Portfolio/Case Studies")}
            onMouseMove={updateStartMenuSpotlight}
          >
            Featured work
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="quick-link"
            onClick={() => {
              onRequestClose();
              window.dispatchEvent(new CustomEvent("portfolio:open-landing"));
            }}
            onMouseMove={updateStartMenuSpotlight}
          >
            Welcome screen
          </Button>
        </div>
      </div>
    </StartMenuShell>
  );
}
