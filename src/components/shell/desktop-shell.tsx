import { useEffect, useMemo, type CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import { themePresets } from "@/data/portfolio";
import { resolveAppIdForNode } from "@/lib/app-registry";
import { clearPersistedFileSystem, downloadFileNode, normalizePath } from "@/lib/filesystem";
import { CalendarPopover } from "@/components/system/calendar-popover";
import { ContextMenu } from "@/components/system/context-menu";
import { DesktopManager } from "@/components/shell/desktop-manager";
import { SearchPanel } from "@/components/shell/search-panel";
import { StartMenu } from "@/components/shell/start-menu";
import { Taskbar } from "@/components/shell/taskbar";
import { WindowManager } from "@/components/shell/window-manager";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { SYSTEM_STORAGE_KEY, useSystemStore } from "@/stores/system-store";
import type { DesktopEntry } from "@/types/system";

const FIRST_RUN_KEY = "taaniel-os-first-run-v1";

export function DesktopShell() {
  const {
    windows,
    activeWindowId,
    selectedIconId,
    startMenuOpen,
    searchOpen,
    calendarOpen,
    contextMenu,
    clipboard,
    themeId,
    customWallpaperSource,
    desktopIconPositions,
    launchApp,
    focusWindow,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    updateWindowBounds,
    toggleTaskbarWindow,
    showDesktop,
    setStartMenuOpen,
    toggleStartMenu,
    setSearchOpen,
    toggleSearch,
    setCalendarOpen,
    setSelectedIconId,
    setContextMenu,
    setClipboard,
    clearClipboard,
    moveDesktopIcon,
    reconcileDesktopIconPositions,
    hydrateForViewport,
    resetLayout,
  } = useSystemStore();
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
  } = useFileSystemStore();

  const theme = useMemo(
    () => themePresets.find((preset) => preset.id === themeId) ?? themePresets[0],
    [themeId]
  );

  const openExternal = (url: string) => {
    launchApp({
      appId: "browser",
      payload: {
        externalUrl: url,
      },
      title: url,
    });
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  };

  const openPath = (path: string) => {
    const node = nodes[normalizePath(path)];

    if (!node) {
      return;
    }

    if (node.kind === "directory") {
      launchApp({
        appId: "files",
        payload: {
          directoryPath: node.path,
        },
      });
      return;
    }

    const appId = resolveAppIdForNode(node);
    launchApp({
      appId,
      payload: {
        filePath: node.path,
      },
    });
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

  useEffect(() => {
    void initialize();
    hydrateForViewport();

    const handleResize = () => hydrateForViewport();
    const handleKeyDown = (event: KeyboardEvent) => {
      const loweredKey = event.key.toLowerCase();
      const isLauncherMetaKey =
        (event.key === "Meta" || event.key === "OS" || event.code === "MetaLeft" || event.code === "MetaRight") &&
        !event.ctrlKey &&
        !event.altKey;

      if (event.key === "Escape") {
        setStartMenuOpen(false);
        setSearchOpen(false);
        setCalendarOpen(false);
        setContextMenu(null);
      }

      if (isLauncherMetaKey && !event.repeat) {
        event.preventDefault();
        setStartMenuOpen(true);

        if (!document.fullscreenElement) {
          void toggleFullscreen();
        }

        return;
      }

      if (event.ctrlKey && event.key === "Escape") {
        event.preventDefault();
        toggleStartMenu();
      }

      if ((event.ctrlKey || event.metaKey) && loweredKey === "k") {
        event.preventDefault();
        toggleSearch();
      }

      if (event.altKey && event.key === "F4" && activeWindowId) {
        event.preventDefault();
        closeWindow(activeWindowId);
      }

      if (event.key === "F11") {
        event.preventDefault();
        void toggleFullscreen();
      }

      if (event.shiftKey && event.key === "Escape") {
        event.preventDefault();
        toggleStartMenu();
      }

      if (event.shiftKey && event.key === "F10") {
        event.preventDefault();
        launchApp({ appId: "terminal" });
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeWindowId,
    closeWindow,
    hydrateForViewport,
    initialize,
    launchApp,
    setCalendarOpen,
    setContextMenu,
    setSearchOpen,
    setStartMenuOpen,
    toggleSearch,
    toggleStartMenu,
  ]);

  useEffect(() => {
    if (!initialized || windows.length > 0 || localStorage.getItem(FIRST_RUN_KEY)) {
      return;
    }

    launchApp({ appId: "about" });
    openPath("/Desktop/Welcome.md");
    localStorage.setItem(FIRST_RUN_KEY, "true");
  }, [initialized, launchApp, windows.length]);

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
    resetLayout();
    await clearPersistedFileSystem();
    await resetFileSystem();
    localStorage.removeItem(FIRST_RUN_KEY);
    window.localStorage.removeItem(SYSTEM_STORAGE_KEY);
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

      <WindowManager
        windows={windows}
        activeWindowId={activeWindowId}
        onFocusWindow={focusWindow}
        onCloseWindow={closeWindow}
        onMinimizeWindow={toggleMinimize}
        onMaximizeWindow={toggleMaximize}
        onWindowBoundsChange={updateWindowBounds}
      />

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
            nodes={nodes}
            onLaunchApp={(appId) => launchApp({ appId })}
            onOpenPath={openPath}
            onOpenExternal={openExternal}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{calendarOpen ? <CalendarPopover /> : null}</AnimatePresence>

      <AnimatePresence>
        {contextMenu ? <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} /> : null}
      </AnimatePresence>

      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        startMenuOpen={startMenuOpen}
        searchOpen={searchOpen}
        calendarOpen={calendarOpen}
        themeName={theme.name}
        onToggleStartMenu={toggleStartMenu}
        onToggleSearch={toggleSearch}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
        onToggleWindow={toggleTaskbarWindow}
        onShowDesktop={showDesktop}
      />
    </main>
  );
}
