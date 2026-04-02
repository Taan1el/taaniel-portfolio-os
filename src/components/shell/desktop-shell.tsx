import { useEffect, useMemo, type CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { themePresets } from "@/data/portfolio";
import { resolveEditApp } from "@/lib/file-registry";
import { toggleDocumentFullscreen } from "@/lib/fullscreen";
import { downloadFileNode, normalizePath } from "@/lib/filesystem";
import { editFileSystemPath, openFileSystemPath } from "@/lib/launchers";
import { buildShellSearchIndex, queryShellSearch, type ShellSearchAction } from "@/lib/shell-search";
import { buildTaskbarWindowEntries } from "@/lib/taskbar-system";
import { CalendarPopover } from "@/components/system/calendar-popover";
import { ContextMenu } from "@/components/system/context-menu";
import { DesktopManager } from "@/components/shell/desktop-manager";
import { SearchPanel } from "@/components/shell/search-panel";
import { StartMenu } from "@/components/shell/start-menu";
import { Taskbar } from "@/components/shell/taskbar";
import { WindowHost } from "@/components/shell/window-host";
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
    searchOpen,
    searchQuery,
    calendarOpen,
    contextMenu,
    clipboard,
    setStartMenuOpen,
    toggleStartMenu,
    setSearchOpen,
    toggleSearch,
    setSearchQuery,
    setCalendarOpen,
    setSelectedIconId,
    setContextMenu,
    setClipboard,
    clearClipboard,
    themeId,
    customWallpaperSource,
    desktopIconPositions,
    focusedWindowId,
    moveDesktopIcon,
    reconcileDesktopIconPositions,
  } = useShellStore(
    useShallow((state) => ({
      selectedIconId: state.selectedIconId,
      startMenuOpen: state.startMenuOpen,
      searchOpen: state.searchOpen,
      searchQuery: state.searchQuery,
      calendarOpen: state.calendarOpen,
      contextMenu: state.contextMenu,
      clipboard: state.clipboard,
      themeId: state.themeId,
      customWallpaperSource: state.customWallpaperSource,
      desktopIconPositions: state.desktopIconPositions,
      focusedWindowId: state.focusedWindowId,
      setStartMenuOpen: state.setStartMenuOpen,
      toggleStartMenu: state.toggleStartMenu,
      setSearchOpen: state.setSearchOpen,
      toggleSearch: state.toggleSearch,
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
    toggleTaskbarWindow,
    showDesktop,
    hydrateForViewport,
    resetLayout,
  } = useSystemStore(
    useShallow((state) => ({
      windows: state.windows,
      launchApp: state.launchApp,
      closeWindow: state.closeWindow,
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
  const taskbarEntries = useMemo(
    () => buildTaskbarWindowEntries(processes, windows),
    [processes, windows]
  );
  const searchIndex = useMemo(() => buildShellSearchIndex(nodes), [nodes]);
  const searchSections = useMemo(() => queryShellSearch(searchIndex, searchQuery), [searchIndex, searchQuery]);

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
    setSearchOpen(false);
    setCalendarOpen(false);
    setContextMenu(null);
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
    onToggleSearch: toggleSearch,
    onCloseActiveWindow: closeWindow,
    onOpenTerminal: () => launchApp({ appId: "terminal" }),
    onToggleFullscreen: toggleFullscreen,
  });

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
      launchApp({ appId: entry.appId });
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
      openExternal(entry.externalUrl);
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
      className="os-root"
      style={
        {
          "--desktop-wallpaper": theme.wallpaper,
          ...(customWallpaperSource
            ? {
                "--desktop-custom-wallpaper": `linear-gradient(rgba(6, 11, 18, 0.42), rgba(6, 11, 18, 0.74)), url('${customWallpaperSource}') center/cover no-repeat`,
              }
            : {}),
          "--desktop-tint": theme.desktopTint,
          "--desktop-glow": theme.glow,
          "--shell-surface": theme.shell,
          "--theme-accent": theme.accent,
        } as CSSProperties
      }
      onClick={() => setContextMenu(null)}
    >
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
            onOpenSearch={() => {
              setSearchQuery("");
              setSearchOpen(true);
            }}
            onResetSession={() => {
              void resetSession();
            }}
            onRequestClose={() => setStartMenuOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen ? (
          <SearchPanel
            query={searchQuery}
            sections={searchSections}
            onQueryChange={setSearchQuery}
            onSelectResult={runSearchAction}
            onRequestClose={() => setSearchOpen(false)}
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
        searchOpen={searchOpen}
        calendarOpen={calendarOpen}
        onToggleStartMenu={toggleStartMenu}
        onToggleSearch={toggleSearch}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
        onToggleWindow={toggleTaskbarWindow}
        onShowDesktop={showDesktop}
      />
    </main>
  );
}
