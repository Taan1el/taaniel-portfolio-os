import { useDeferredValue, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { themePresets } from "@/data/portfolio";
import { resolveDesktopWallpaper } from "@/data/wallpapers";
import { resolveEditApp } from "@/lib/file-registry";
import { toggleDocumentFullscreen } from "@/lib/fullscreen";
import { downloadFileNode, normalizePath } from "@/lib/filesystem";
import { cn } from "@/lib/utils";
import { editFileSystemPath, openFileSystemPath } from "@/lib/launchers";
import { buildShellSearchIndex, queryShellSearch, type ShellSearchAction } from "@/lib/shell-search";
import { buildTaskbarWindowEntries } from "@/lib/taskbar-system";
import { OsOnboarding } from "@/components/landing/os-onboarding";
import { CalendarPopover } from "@/components/system/calendar-popover";
import { ContextMenu } from "@/components/system/context-menu";
import { DesktopManager } from "@/components/shell/desktop-manager";
import type { ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import { StartMenu } from "@/components/shell/start-menu";
import { Taskbar } from "@/components/shell/taskbar";
import { WindowHost } from "@/components/shell/window-host";
import { useShellAiSearch } from "@/hooks/use-shell-ai-search";
import { useShellShortcuts } from "@/hooks/use-shell-shortcuts";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import type { DesktopEntry } from "@/types/system";

export function DesktopShell() {
  const { processes } = useProcessStore(
    useShallow((state) => ({
      processes: state.processes,
    }))
  );
  const {
    selectedIconId,
    startMenuOpen,
    searchQuery,
    calendarOpen,
    contextMenu,
    clipboard,
    setStartMenuOpen,
    toggleStartMenu,
    requestStartMenuSearchFocus,
    setSearchQuery,
    setCalendarOpen,
    setSelectedIconId,
    setContextMenu,
    setClipboard,
    clearClipboard,
    themeId,
    wallpaper,
    desktopIconPositions,
    focusedWindowId,
    moveDesktopIcon,
    reconcileDesktopIconPositions,
  } = useShellStore(
    useShallow((state) => ({
      selectedIconId: state.selectedIconId,
      startMenuOpen: state.startMenuOpen,
      searchQuery: state.searchQuery,
      calendarOpen: state.calendarOpen,
      contextMenu: state.contextMenu,
      clipboard: state.clipboard,
      themeId: state.themeId,
      wallpaper: state.wallpaper,
      desktopIconPositions: state.desktopIconPositions,
      focusedWindowId: state.focusedWindowId,
      setStartMenuOpen: state.setStartMenuOpen,
      toggleStartMenu: state.toggleStartMenu,
      requestStartMenuSearchFocus: state.requestStartMenuSearchFocus,
      setSearchQuery: state.setSearchQuery,
      setCalendarOpen: state.setCalendarOpen,
      setSelectedIconId: state.setSelectedIconId,
      setContextMenu: state.setContextMenu,
      setClipboard: state.setClipboard,
      clearClipboard: state.clearClipboard,
      moveDesktopIcon: state.moveDesktopIcon,
      reconcileDesktopIconPositions: state.reconcileDesktopIconPositions,
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
    createDirectory,
    createTextFile,
    importFiles,
    pasteNode,
    canCutNode,
    reset: resetFileSystem,
  } = useFileSystemStore(
    useShallow((state) => ({
      nodes: state.nodes,
      initialized: state.initialized,
      initialize: state.initialize,
      createDirectory: state.createDirectory,
      createTextFile: state.createTextFile,
      importFiles: state.importFiles,
      pasteNode: state.pasteNode,
      canCutNode: state.canCutNode,
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
  const taskbarEntries = useMemo(
    () => buildTaskbarWindowEntries(processes, windows),
    [processes, windows]
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
  };

  const openLauncherSearch = () => {
    requestStartMenuSearchFocus();
    setStartMenuOpen(true);
  };

  const openPath = (path: string) => {
    openFileSystemPath(path, nodes, launchApp);
  };

  const editPath = (path: string) => {
    editFileSystemPath(path, nodes, launchApp);
  };

  const pasteIntoDirectory = async (directoryPath: string) => {
    if (!clipboard) {
      return;
    }

    await pasteNode(clipboard.path, directoryPath, clipboard.operation);

    if (clipboard.operation === "cut") {
      clearClipboard();
    }
  };

  const importFilesIntoDesktop = async (files: File[]) => {
    const importedPaths = await importFiles("/Desktop", files);
    const latestPath = importedPaths.at(-1);

    if (latestPath) {
      setSelectedIconId(`desktop-node:${latestPath}`);
    }
  };

  useShellShortcuts({
    activeWindowId: focusedWindowId,
    onCloseOverlays: closeShellOverlays,
    onToggleStartMenu: toggleStartMenu,
    onOpenLauncherSearch: openLauncherSearch,
    onCloseActiveWindow: closeWindow,
    onOpenTerminal: () => launchApp({ appId: "terminal" }),
    onToggleFullscreen: toggleFullscreen,
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

  useEffect(() => {
    void initialize();
    hydrateForViewport();

    const handleResize = () => hydrateForViewport();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [hydrateForViewport, initialize]);

  const activateEntry = (entry: DesktopEntry) => {
    if (entry.type === "app" && entry.appId) {
      launchApp({
        appId: entry.appId,
        payload: entry.externalUrl ? { externalUrl: entry.externalUrl } : undefined,
      });
      return;
    }

    if (entry.type === "file" && entry.filePath) {
      openPath(entry.filePath);
      return;
    }

    if (entry.type === "folder" && entry.directoryPath) {
      launchApp({
        appId: "files",
        payload: {
          directoryPath: entry.directoryPath,
        },
      });
      return;
    }

    if (entry.type === "link" && entry.externalUrl) {
      if (entry.externalUrl.startsWith("/")) {
        navigate(entry.externalUrl);
      } else {
        openExternal(entry.externalUrl);
      }
    }
  };

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
          label: "New Folder",
          onSelect: () => {
            void createDirectory("/Desktop");
          },
        },
        {
          id: "new-note",
          label: "New Note",
          onSelect: () => {
            void createTextFile("/Desktop");
          },
        },
        {
          id: "paste",
          label: clipboard ? "Paste" : "Paste",
          disabled: !clipboard,
          onSelect: () => {
            void pasteIntoDirectory("/Desktop");
          },
        },
        {
          id: "open-about",
          label: "Open About",
          onSelect: () => launchApp({ appId: "about" }),
        },
        {
          id: "open-explorer",
          label: "Open File Explorer",
          onSelect: () => launchApp({ appId: "files" }),
        },
        {
          id: "open-terminal",
          label: "Open Terminal",
          onSelect: () => launchApp({ appId: "terminal" }),
        },
        {
          id: "personalize",
          label: "Personalize",
          onSelect: () => launchApp({ appId: "settings" }),
        },
        {
          id: "reset-session",
          label: "Reset session",
          danger: true,
          onSelect: () => {
            void resetSession();
          },
        },
      ],
    });
  };

  const openEntryContextMenu = (event: React.MouseEvent<HTMLButtonElement>, entry: DesktopEntry) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedIconId(entry.id);

    const targetPath = entry.filePath ?? entry.directoryPath;
    const targetNode = targetPath ? nodes[normalizePath(targetPath)] : null;

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: entry.label,
      actions: [
        {
          id: "open",
          label: entry.type === "link" ? "Open link" : "Open",
          onSelect: () => activateEntry(entry),
        },
        targetPath
          ? {
              id: "edit",
              label: "Edit",
              disabled: !resolveEditApp(targetNode ?? undefined),
              onSelect: () => editPath(targetPath),
            }
          : null,
        targetPath
          ? {
              id: "copy",
              label: "Copy",
              onSelect: () => setClipboard({ path: targetPath, operation: "copy" }),
            }
          : null,
        targetPath
          ? {
              id: "cut",
              label: "Cut",
              disabled: !canCutNode(targetPath),
              onSelect: () => setClipboard({ path: targetPath, operation: "cut" }),
            }
          : null,
        targetNode?.kind === "file"
          ? {
              id: "download",
              label: "Download",
              onSelect: () => {
                void downloadFileNode(targetNode);
              },
            }
          : null,
        entry.type !== "app" && entry.directoryPath
          ? {
              id: "open-folder",
              label: "Open in File Explorer",
              onSelect: () =>
                launchApp({
                  appId: "files",
                  payload: { directoryPath: entry.directoryPath },
                }),
            }
          : null,
        entry.type !== "app" && entry.filePath
          ? {
              id: "open-location",
              label: "Reveal location",
              onSelect: () => {
                const filePath = entry.filePath;

                if (!filePath) {
                  return;
                }

                launchApp({
                  appId: "files",
                  payload: {
                    directoryPath: normalizePath(filePath).split("/").slice(0, -1).join("/") || "/",
                  },
                });
              },
            }
          : null,
      ].filter(Boolean) as NonNullable<typeof contextMenu>["actions"],
    });
  };

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
    <main
      className={cn(
        "os-root",
        wallpaperPresentation.animated && "is-animated-wallpaper"
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
      <OsOnboarding />
      <div className="os-root__wallpaper" />
      <div className="os-root__noise" />

      <DesktopManager
        nodes={nodes}
        selectedIconId={selectedIconId}
        iconPositions={desktopIconPositions}
        onSelectIcon={setSelectedIconId}
        onActivateEntry={activateEntry}
        onMoveIcon={moveDesktopIcon}
        onReconcileIconPositions={reconcileDesktopIconPositions}
        onDesktopContextMenu={openDesktopContextMenu}
        onEntryContextMenu={openEntryContextMenu}
        onImportFiles={importFilesIntoDesktop}
      />

      <WindowHost />

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

      <AnimatePresence>{calendarOpen ? <CalendarPopover /> : null}</AnimatePresence>

      <AnimatePresence>
        {contextMenu ? <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} /> : null}
      </AnimatePresence>

      <Taskbar
        entries={taskbarEntries}
        startMenuOpen={startMenuOpen}
        calendarOpen={calendarOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchFieldFocus={() => setStartMenuOpen(true)}
        searchBrowseRef={shellSearchBrowseRef}
        onToggleStartMenu={toggleStartMenu}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
        onToggleWindow={toggleTaskbarWindow}
        onShowDesktop={showDesktop}
      />
    </main>
  );
}
