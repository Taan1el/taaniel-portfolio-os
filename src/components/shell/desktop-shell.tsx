import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import {
  ClipboardPaste,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { DESKTOP_PATH, getDesktopNodeId, getDesktopNodePath } from "@/data/desktop-seed";
import { themePresets } from "@/data/portfolio";
import { resolveDesktopWallpaper } from "@/data/wallpapers";
import { getContextMenuPoint } from "@/lib/context-menu-point";
import { createDesktopFolder, createDesktopTextDocument } from "@/lib/desktop-actions";
import { placeArrivalsOnDesktop } from "@/lib/dnd/desktop-placement";
import { emptyRecycleBin, pasteIntoFolder } from "@/lib/file-actions";
import { buildFileMenu } from "@/lib/file-menu";
import { toggleDocumentFullscreen } from "@/lib/fullscreen";
import { prefersStaticWallpaper } from "@/lib/device-capabilities";
import { cn } from "@/lib/utils";
import { openFileSystemPath } from "@/lib/launchers";
import { registerShellNavigator } from "@/lib/shell-navigation";
import { buildShellSearchIndex, queryShellSearch, type ShellSearchAction } from "@/lib/shell-search";
import { buildTaskbarWindowEntries } from "@/lib/taskbar-system";
import { TRASH_PATH } from "@/lib/system-workspace";
import { OsOnboarding } from "@/components/landing/os-onboarding";
import { ContextMenu } from "@/components/system/context-menu";
import { DragLayer } from "@/components/system/drag-layer";
import { OpenWithDialog } from "@/components/system/open-with-dialog";
import { SessionScreen } from "@/components/shell/session-screen";
import { ShortcutCheatsheet } from "@/components/system/shortcut-cheatsheet";
import { ToastContainer } from "@/components/system/toast-container";
import { DesktopManager } from "@/components/shell/desktop-manager";
import { DisplayFilterOverlay } from "@/components/shell/display-filter-overlay";
import type { ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import { StartMenu } from "@/components/shell/start-menu";
import { Taskbar } from "@/components/shell/taskbar";
import { TrayFlyouts } from "@/components/shell/tray-flyouts";
import { WindowHost } from "@/components/shell/window-host";
import { useShellAiSearch } from "@/hooks/use-shell-ai-search";
import { useShellServices } from "@/hooks/use-shell-services";
import { useShellShortcuts } from "@/hooks/use-shell-shortcuts";
import { describeOfflineBanner } from "@/lib/device-status";
import { selectNetworkStatus, useDeviceStore } from "@/stores/device-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { getDesktopSize } from "@/stores/system-runtime";
import { useSystemStore } from "@/stores/system-store";
import { desktopOf, useWindowStore } from "@/stores/window-store";
import { LEFT_HALF, RIGHT_HALF, zoneBounds } from "@/lib/snap-layouts";
import type { DesktopEntry } from "@/types/system";

export function DesktopShell() {
  useShellServices();
  const offlineBanner = describeOfflineBanner(useDeviceStore(selectNetworkStatus));
  const { processes } = useProcessStore(
    useShallow((state) => ({
      processes: state.processes,
    }))
  );
  const {
    startMenuOpen,
    searchQuery,
    calendarOpen,
    contextMenu,
    openWithTarget,
    clipboard,
    setStartMenuOpen,
    toggleStartMenu,
    requestStartMenuSearchFocus,
    setSearchQuery,
    setCalendarOpen,
    setSelectedIconId,
    setSelectedIconIds,
    setRenamingIconId,
    setContextMenu,
    setOpenWithTarget,
    clearClipboard,
    themeId,
    wallpaper,
    viewportMode,
    focusedWindowId,
    pinnedAppIds,
    pinApp,
    unpinApp,
  } = useShellStore(
    useShallow((state) => ({
      startMenuOpen: state.startMenuOpen,
      searchQuery: state.searchQuery,
      calendarOpen: state.calendarOpen,
      contextMenu: state.contextMenu,
      clipboard: state.clipboard,
      themeId: state.themeId,
      wallpaper: state.wallpaper,
      viewportMode: state.viewportMode,
      focusedWindowId: state.focusedWindowId,
      pinnedAppIds: state.pinnedAppIds,
      setStartMenuOpen: state.setStartMenuOpen,
      toggleStartMenu: state.toggleStartMenu,
      requestStartMenuSearchFocus: state.requestStartMenuSearchFocus,
      setSearchQuery: state.setSearchQuery,
      setCalendarOpen: state.setCalendarOpen,
      setSelectedIconId: state.setSelectedIconId,
      setSelectedIconIds: state.setSelectedIconIds,
      setRenamingIconId: state.setRenamingIconId,
      setContextMenu: state.setContextMenu,
      openWithTarget: state.openWithTarget,
      setOpenWithTarget: state.setOpenWithTarget,
      clearClipboard: state.clearClipboard,
      pinApp: state.pinApp,
      unpinApp: state.unpinApp,
    }))
  );
  const {
    windows,
    launchApp,
    closeWindow,
    focusWindow,
    toggleTaskbarWindow,
    showDesktop,
    hydrateForViewport,
    resetLayout,
  } = useSystemStore(
    useShallow((state) => ({
      windows: state.windows,
      launchApp: state.launchApp,
      closeWindow: state.closeWindow,
      focusWindow: state.focusWindow,
      toggleTaskbarWindow: state.toggleTaskbarWindow,
      showDesktop: state.showDesktop,
      hydrateForViewport: state.hydrateForViewport,
      resetLayout: state.resetLayout,
    }))
  );
  const {
    nodes,
    initialized,
    initialize,
    importFiles,
    reset: resetFileSystem,
  } = useFileSystemStore(
    useShallow((state) => ({
      nodes: state.nodes,
      initialized: state.initialized,
      initialize: state.initialize,
      importFiles: state.importFiles,
      reset: state.reset,
    }))
  );

  const theme = useMemo(
    () => themePresets.find((preset) => preset.id === themeId) ?? themePresets[0],
    [themeId]
  );
  const wallpaperPresentation = useMemo(
    () => resolveDesktopWallpaper(theme, wallpaper),
    [theme, wallpaper]
  );
  const activeDesktop = useWindowStore((state) => state.activeDesktop);
  const taskbarEntries = useMemo(
    () => buildTaskbarWindowEntries(processes, windows.filter((entry) => desktopOf(entry) === activeDesktop)),
    [activeDesktop, processes, windows]
  );
  const searchIndex = useMemo(() => buildShellSearchIndex(nodes), [nodes]);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchSections = useMemo(
    () => queryShellSearch(searchIndex, deferredSearchQuery),
    [deferredSearchQuery, searchIndex]
  );
  const { sections: smartSearchSections, aiStatus, aiEnabled } = useShellAiSearch({
    query: deferredSearchQuery,
    sections: searchSections,
  });

  const shellSearchBrowseRef = useRef<ShellSearchResultsHandle>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const navigate = useNavigate();

  const openExternal = (url: string) => {
    launchApp({
      appId: "browser",
      payload: {
        externalUrl: url,
      },
      title: url,
    });
  };

  const runSearchAction = (action: ShellSearchAction) => {
    closeShellOverlays();

    switch (action.type) {
      case "launch-app":
        launchApp({
          appId: action.appId,
          payload: action.payload,
          title: action.title,
        });
        return;
      case "open-path":
        openPath(action.path);
        return;
      case "open-external":
        openExternal(action.url);
    }
  };

  const toggleFullscreen = () => {
    void toggleDocumentFullscreen();
  };

  const closeShellOverlays = () => {
    setStartMenuOpen(false);
    setSearchQuery("");
    setCalendarOpen(false);
    setContextMenu(null);
    setOpenWithTarget(null);
    setCheatsheetOpen(false);
  };

  // With no window left to take it, focus returns to the desktop instead of being lost.
  useEffect(() => {
    if (focusedWindowId) return;
    // Focus stays inside a closing window until its exit animation removes it, so wait for that.
    let checks = 0;
    const timer = setInterval(() => {
      const current = document.activeElement;
      if (current?.closest(".window-frame") && ++checks < 20) return;
      clearInterval(timer);
      if (current && current !== document.body) return;
      document.querySelector<HTMLElement>('.desktop-icon[tabindex="0"], .w11-taskbar__start')?.focus({ preventScroll: true });
    }, 100);
    return () => clearInterval(timer);
  }, [focusedWindowId]);

  const openLauncherSearch = () => {
    requestStartMenuSearchFocus();
    setStartMenuOpen(true);
  };

  const openPath = (path: string) => {
    openFileSystemPath(path, nodes, launchApp);
  };

  // Files dragged in from the visitor's computer appear on the desktop where they were dropped, or go
  // into the desktop folder they were dropped on.
  const importFilesIntoDesktop = useCallback(
    async (files: File[], point: { x: number; y: number }, folder?: string) => {
      const importedPaths = await importFiles(folder ?? DESKTOP_PATH, files);

      if (!folder && importedPaths.length > 0) {
        placeArrivalsOnDesktop(importedPaths, point);
        setSelectedIconIds(importedPaths.map(getDesktopNodeId));
      }
    },
    [importFiles, setSelectedIconIds]
  );

  useShellShortcuts({
    activeWindowId: focusedWindowId,
    onCloseOverlays: closeShellOverlays,
    onToggleStartMenu: toggleStartMenu,
    onOpenLauncherSearch: openLauncherSearch,
    onCloseActiveWindow: closeWindow,
    onOpenTerminal: () => launchApp({ appId: "terminal" }),
    onToggleFullscreen: toggleFullscreen,
    onToggleCheatsheet: () => setCheatsheetOpen((v) => !v),
    onSnapActiveWindow: (direction) => {
      if (!focusedWindowId) return;
      const system = useSystemStore.getState();
      if (direction === "up") system.toggleMaximize(focusedWindowId);
      else if (direction === "down") system.toggleMinimize(focusedWindowId);
      else useWindowStore.getState().snapWindow(focusedWindowId, zoneBounds(direction === "left" ? LEFT_HALF : RIGHT_HALF, getDesktopSize()));
    },
    onSwitchDesktop: (step) => {
      const { activeDesktop, switchDesktop } = useWindowStore.getState();
      switchDesktop(activeDesktop + step);
    },
  });

  useEffect(() => {
    const handleCycle = (event: KeyboardEvent) => {
      if (!event.altKey || (event.key !== "[" && event.key !== "]")) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const visible = windows
        .filter((w) => !w.minimized)
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex);

      if (visible.length < 2) {
        return;
      }

      event.preventDefault();
      const focusedIndex = visible.findIndex((w) => w.focused);
      const current = focusedIndex < 0 ? 0 : focusedIndex;
      const next =
        event.key === "]" ? (current + 1) % visible.length : (current - 1 + visible.length) % visible.length;
      focusWindow(visible[next].id);
    };

    window.addEventListener("keydown", handleCycle);
    return () => window.removeEventListener("keydown", handleCycle);
  }, [windows, focusWindow]);

  // Shortcuts to pages of this site (the quick portfolio) navigate through the router.
  useEffect(() => registerShellNavigator(navigate), [navigate]);

  useEffect(() => {
    void initialize();
    hydrateForViewport();

    const handleResize = () => hydrateForViewport();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [hydrateForViewport, initialize]);

  const activateEntry = useCallback(
    (entry: DesktopEntry) => {
      if (entry.kind === "recycle-bin") {
        launchApp({ appId: "files", payload: { directoryPath: TRASH_PATH } });
        return;
      }

      // Reads the filesystem as it is now, so a shortcut opens what it points at today.
      openFileSystemPath(entry.path, useFileSystemStore.getState().nodes, launchApp);
    },
    [launchApp]
  );

  const resetSession = async () => {
    closeShellOverlays();
    clearClipboard();
    setSelectedIconId(null);
    await resetFileSystem();
    resetLayout();
  };

  const openDesktopContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSelectedIconId(null);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: "Desktop",
      actions: [
        {
          id: "new-folder",
          label: "New folder",
          icon: FolderPlus,
          shortcut: "Ctrl+Shift+N",
          onSelect: () => void createDesktopFolder(),
        },
        {
          id: "new-text-document",
          label: "New text document",
          icon: FilePlus2,
          onSelect: () => void createDesktopTextDocument(),
        },
        { id: "sep-1", label: "", separator: true, onSelect: () => {} },
        {
          id: "paste",
          label: "Paste",
          icon: ClipboardPaste,
          shortcut: "Ctrl+V",
          disabled: !clipboard,
          onSelect: () => void pasteIntoFolder("/Desktop"),
        },
        { id: "sep-2", label: "", separator: true, onSelect: () => {} },
        {
          id: "personalize",
          label: "Personalize…",
          icon: Settings,
          onSelect: () => launchApp({ appId: "settings" }),
        },
        { id: "sep-3", label: "", separator: true, onSelect: () => {} },
        {
          id: "reset-session",
          label: "Reset session",
          icon: RefreshCw,
          danger: true,
          onSelect: () => {
            void resetSession();
          },
        },
      ],
    });
  };

  const openEntryContextMenu = useCallback(
    (entry: DesktopEntry, event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const shell = useShellStore.getState();
      const fileSystem = useFileSystemStore.getState();
      const selection = shell.selectedIconIds.includes(entry.id) ? shell.selectedIconIds : [entry.id];
      const paths = selection.flatMap((id) => {
        const path = getDesktopNodePath(id);
        return path ? [path] : [];
      });
      const { x, y } = getContextMenuPoint(event);

      if (paths.length === 0) {
        const trashCount = fileSystem.listDirectory(TRASH_PATH).length;

        setContextMenu({
          x,
          y,
          title: entry.label,
          actions: [
            { id: "open", label: "Open", icon: FolderOpen, onSelect: () => activateEntry(entry) },
            { id: "sep-trash", label: "", separator: true, onSelect: () => {} },
            {
              id: "empty-trash",
              label: "Empty Recycle Bin",
              icon: Trash2,
              danger: true,
              disabled: trashCount === 0,
              onSelect: () => void emptyRecycleBin(),
            },
          ],
        });
        return;
      }

      setContextMenu({
        x,
        y,
        title: paths.length > 1 ? `${paths.length} items` : entry.label,
        actions: buildFileMenu({
          nodes: fileSystem.nodes,
          paths,
          clipboard: shell.clipboard,
          locationForAll: true,
          onOpen: () => paths.forEach((path) => openFileSystemPath(path, useFileSystemStore.getState().nodes, launchApp)),
          onRename: () => setRenamingIconId(entry.id),
        }),
      });
    },
    [activateEntry, launchApp, setContextMenu, setRenamingIconId]
  );

  if (initialized === false) {
    return (
      <main
        className="os-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Initializing filesystem...
      </main>
    );
  }

  return (
    <div
      className={cn(
        "os-root",
        theme.id === "windows-bloom" && "is-light-wallpaper",
        wallpaperPresentation.animated && !prefersStaticWallpaper() && "is-animated-wallpaper"
      )}
      style={
        {
          "--desktop-wallpaper": wallpaperPresentation.background,
          "--desktop-tint": wallpaperPresentation.desktopTint,
          "--desktop-glow": wallpaperPresentation.glow,
          "--shell-surface": wallpaperPresentation.shell,
          "--theme-accent": theme.accent,
        } as CSSProperties
      }
      onClick={() => setContextMenu(null)}
    >
      <a
        className="os-skip-link"
        href={`${import.meta.env.BASE_URL}portfolio`}
        onClick={(event) => {
          event.preventDefault();
          navigate("/portfolio");
        }}
      >
        Skip to the accessible portfolio
      </a>
      <h1 className="sr-only">Taaniel OS desktop</h1>
      <SessionScreen />
      <OsOnboarding />
      {offlineBanner ? (
        <div className="os-offline-banner" role="status" aria-live="polite">
          {offlineBanner}
        </div>
      ) : null}
      {viewportMode === "mobile" && !windows.some((entry) => !entry.minimized) ? (
        <div className="os-mobile-banner" role="status" aria-live="polite">
          <span>Tip: use the quick recruiter view on mobile.</span>
          <button
            type="button"
            className="os-mobile-banner__button"
            onClick={() => navigate("/portfolio")}
          >
            Open portfolio
          </button>
        </div>
      ) : null}
      <div className="os-root__wallpaper" />
      <div className="os-root__noise" />

      <main className="os-root__main">

      <DesktopManager
        nodes={nodes}
        onActivateEntry={activateEntry}
        onDesktopContextMenu={openDesktopContextMenu}
        onEntryContextMenu={openEntryContextMenu}
        onImportFiles={importFilesIntoDesktop}
      />

      <WindowHost />
      <DragLayer />

      <AnimatePresence>
        {startMenuOpen ? (
          <StartMenu
            onLaunchApp={(appId) => launchApp({ appId })}
            onOpenDirectory={(directoryPath) =>
              launchApp({
                appId: "files",
                payload: { directoryPath },
              })
            }
            onOpenFile={openPath}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchBrowseRef={shellSearchBrowseRef}
            searchSections={smartSearchSections}
            aiStatus={aiStatus}
            aiEnabled={aiEnabled}
            onSearchSelect={runSearchAction}
            onResetSession={() => {
              void resetSession();
            }}
            onRequestClose={() => setStartMenuOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <TrayFlyouts />
      <DisplayFilterOverlay />

      <AnimatePresence>
        {contextMenu ? <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} /> : null}
      </AnimatePresence>

      <ToastContainer />

      <ShortcutCheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />

      <OpenWithDialog
        target={openWithTarget}
        onOpen={(appId) => {
          if (!openWithTarget) return;
          launchApp({ appId, payload: { filePath: openWithTarget.filePath } });
        }}
        onClose={() => setOpenWithTarget(null)}
      />
      </main>

      <Taskbar
        entries={taskbarEntries}
        pinnedAppIds={pinnedAppIds}
        startMenuOpen={startMenuOpen}
        calendarOpen={calendarOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchFieldFocus={() => setStartMenuOpen(true)}
        searchBrowseRef={shellSearchBrowseRef}
        onToggleStartMenu={toggleStartMenu}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
        onToggleWindow={toggleTaskbarWindow}
        onLaunchApp={(appId, payload) => launchApp({ appId, payload })}
        onCloseWindow={closeWindow}
        onPinApp={pinApp}
        onUnpinApp={unpinApp}
        onShowDesktop={showDesktop}
      />
    </div>
  );
}
