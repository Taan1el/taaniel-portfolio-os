import { create } from "zustand";
import { desktopEntries } from "@/data/portfolio";
import { canLaunchMultiple, getAppDefinition } from "@/lib/app-registry";
import {
  buildAppWindows,
  clampWindowBoundsToViewport,
  getDefaultWindowBounds,
  getMaximizedBounds,
  getViewportMode,
  isCompactViewport,
  launchPayloadsMatch,
  resolveWindowTitle,
  LEGACY_SYSTEM_STORAGE_KEY,
} from "@/stores/system-runtime";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useWindowStore } from "@/stores/window-store";
import type {
  AppId,
  AppProcess,
  AppWindow,
  ClipboardState,
  ContextMenuState,
  DesktopWallpaperState,
  DesktopEntry,
  DesktopGridPosition,
  ViewportMode,
  WindowPayload,
} from "@/types/system";

export const SYSTEM_STORAGE_KEY = LEGACY_SYSTEM_STORAGE_KEY;

interface LaunchAppOptions {
  appId: AppId;
  payload?: WindowPayload;
  title?: string;
}

interface SystemState {
  windows: AppWindow[];
  processes: AppProcess[];
  nextZ: number;
  activeWindowId: string | null;
  selectedIconId: string | null;
  startMenuOpen: boolean;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  clipboard: ClipboardState | null;
  themeId: string;
  wallpaper: DesktopWallpaperState;
  customWallpaperSource: string | null;
  desktopIconPositions: Record<string, DesktopGridPosition>;
  viewportMode: ViewportMode;
  focusedWindowId: string | null;
  focusedProcessId: string | null;
  launchApp: (options: LaunchAppOptions) => string;
  bringToFront: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  toggleMinimize: (windowId: string) => void;
  toggleMaximize: (windowId: string) => void;
  updateWindowBounds: (
    windowId: string,
    partial: Partial<Pick<AppWindow, "x" | "y" | "width" | "height">>
  ) => void;
  toggleTaskbarWindow: (windowId: string) => void;
  showDesktop: () => void;
  restoreDesktop: () => void;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  requestStartMenuSearchFocus: () => void;
  setCalendarOpen: (open: boolean) => void;
  setSelectedIconId: (iconId: string | null) => void;
  setContextMenu: (contextMenu: ContextMenuState | null) => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  clearClipboard: () => void;
  setThemeId: (themeId: string) => void;
  setWallpaper: (wallpaper: DesktopWallpaperState) => void;
  setWallpaperPreset: (mode: "gradient" | "animated", presetId: string) => void;
  setWallpaperImage: (source: string) => void;
  resetWallpaper: () => void;
  setCustomWallpaperSource: (source: string | null) => void;
  moveDesktopIcon: (
    iconId: string,
    position: DesktopGridPosition,
    metrics: { columns: number; rows: number }
  ) => void;
  reconcileDesktopIconPositions: (
    entries: DesktopEntry[],
    metrics: { columns: number; rows: number }
  ) => void;
  hydrateForViewport: () => void;
  resetLayout: () => void;
}

function getRuntimeViewState() {
  const windowState = useWindowStore.getState();
  const processState = useProcessStore.getState();
  const shellState = useShellStore.getState();

  return {
    windows: buildAppWindows(windowState.windows, processState.processes),
    processes: processState.processes,
    nextZ: windowState.nextZ,
    activeWindowId: windowState.activeWindowId,
    selectedIconId: shellState.selectedIconId,
    startMenuOpen: shellState.startMenuOpen,
    calendarOpen: shellState.calendarOpen,
    contextMenu: shellState.contextMenu,
    clipboard: shellState.clipboard,
    themeId: shellState.themeId,
    wallpaper: shellState.wallpaper,
    customWallpaperSource:
      shellState.wallpaper.mode === "image" ? shellState.wallpaper.imageSource : null,
    desktopIconPositions: shellState.desktopIconPositions,
    viewportMode: shellState.viewportMode,
    focusedWindowId: shellState.focusedWindowId,
    focusedProcessId: shellState.focusedProcessId,
  };
}

function syncSystemFacadeState() {
  useSystemStore.setState(getRuntimeViewState());
}

function syncProcessRuntime() {
  const windowState = useWindowStore.getState();
  useProcessStore.getState().syncStatusesFromWindows(windowState.windows);
}

function syncShellRuntime() {
  const windowState = useWindowStore.getState();
  const focusedWindow = windowState.windows.find((windowItem) => windowItem.id === windowState.activeWindowId) ?? null;

  useShellStore.getState().syncRuntimeState({
    viewportMode: getViewportMode(),
    focusedWindowId: focusedWindow?.id ?? null,
    focusedProcessId: focusedWindow?.processId ?? null,
  });
}

function syncWindowMetadata() {
  const windowState = useWindowStore.getState();
  const processesById = new Map(useProcessStore.getState().processes.map((process) => [process.id, process]));
  let didChange = false;

  const nextWindows = windowState.windows.map((windowItem) => {
    const process = processesById.get(windowItem.processId);

    if (!process) {
      return windowItem;
    }

    const nextTitle =
      windowItem.title && windowItem.title !== "Window"
        ? windowItem.title
        : resolveWindowTitle(process.appId, process.launchPayload);

    if (nextTitle === windowItem.title) {
      return windowItem;
    }

    didChange = true;

    return {
      ...windowItem,
      title: nextTitle,
    };
  });

  if (!didChange) {
    return;
  }

  useWindowStore
    .getState()
    .replaceRuntime(nextWindows, windowState.activeWindowId, windowState.nextZ);
}

function findReusableWindow(windows: AppWindow[], appId: AppId, payload?: WindowPayload) {
  return windows.find((windowState) => {
    if (windowState.appId !== appId) {
      return false;
    }

    if (!canLaunchMultiple(appId)) {
      return true;
    }

    if (!payload) {
      return false;
    }

    return launchPayloadsMatch(windowState.payload, payload);
  });
}

const systemActions: Omit<SystemState, keyof ReturnType<typeof getRuntimeViewState>> = {
  launchApp: ({ appId, payload, title }) => {
    const definition = getAppDefinition(appId);
    const currentWindows = buildAppWindows(
      useWindowStore.getState().windows,
      useProcessStore.getState().processes
    );
    const existingWindow = findReusableWindow(currentWindows, appId, payload);

    if (existingWindow) {
      const nextPayload = canLaunchMultiple(appId)
        ? existingWindow.payload ?? payload
        : payload ?? existingWindow.payload;
      const nextTitle =
        title ??
        (launchPayloadsMatch(existingWindow.payload, nextPayload)
          ? existingWindow.title
          : resolveWindowTitle(appId, nextPayload));

      if (!launchPayloadsMatch(existingWindow.payload, nextPayload)) {
        useProcessStore.getState().updateProcess(existingWindow.processId, {
          launchPayload: nextPayload,
        });
      }

      if (nextTitle !== existingWindow.title) {
        useWindowStore.getState().setWindowTitle(existingWindow.id, nextTitle);
      }

      useWindowStore.getState().focusWindow(existingWindow.id);
      useShellStore.getState().closeOverlays();
      return existingWindow.id;
    }

    const process = useProcessStore.getState().createProcess(appId, payload);
    const nextTitle = resolveWindowTitle(appId, payload, title);
    const restoreBounds = getDefaultWindowBounds(appId, useWindowStore.getState().windows.length);
    const maximizeOnOpen = Boolean(isCompactViewport() && definition.mobileMaximized !== false);
    const windowId = useWindowStore.getState().openWindow({
      processId: process.id,
      title: nextTitle,
      bounds: maximizeOnOpen ? getMaximizedBounds() : restoreBounds,
      maximized: maximizeOnOpen,
      restoreBounds: maximizeOnOpen ? restoreBounds : undefined,
      createdAt: process.createdAt,
    });

    useShellStore.getState().closeOverlays();

    return windowId;
  },
  bringToFront: (windowId) => useWindowStore.getState().bringToFront(windowId),
  focusWindow: (windowId) => useWindowStore.getState().focusWindow(windowId),
  closeWindow: (windowId) => {
    const targetWindow = useWindowStore
      .getState()
      .windows.find((windowState) => windowState.id === windowId);

    useWindowStore.getState().closeWindow(windowId);

    if (targetWindow) {
      useProcessStore.getState().removeProcess(targetWindow.processId);
    }
  },
  toggleMinimize: (windowId) => useWindowStore.getState().minimizeWindow(windowId),
  toggleMaximize: (windowId) => {
    const targetWindow = buildAppWindows(
      useWindowStore.getState().windows,
      useProcessStore.getState().processes
    ).find((windowState) => windowState.id === windowId);

    useWindowStore
      .getState()
      .maximizeWindow(windowId, getDefaultWindowBounds(targetWindow?.appId ?? "about", 0));
  },
  updateWindowBounds: (windowId, partial) => useWindowStore.getState().updateWindowBounds(windowId, partial),
  toggleTaskbarWindow: (windowId) => {
    const targetWindow = buildAppWindows(
      useWindowStore.getState().windows,
      useProcessStore.getState().processes
    ).find((windowState) => windowState.id === windowId);

    if (!targetWindow) {
      return;
    }

    if (targetWindow.focused && !targetWindow.minimized) {
      useWindowStore.getState().minimizeWindow(windowId);
      return;
    }

    useWindowStore.getState().focusWindow(windowId);
  },
  showDesktop: () => {
    useShellStore.getState().closeOverlays();
    useWindowStore.getState().showDesktop();
  },
  restoreDesktop: () => useWindowStore.getState().restoreDesktop(),
  setStartMenuOpen: (open) => useShellStore.getState().setStartMenuOpen(open),
  toggleStartMenu: () => useShellStore.getState().toggleStartMenu(),
  requestStartMenuSearchFocus: () => useShellStore.getState().requestStartMenuSearchFocus(),
  setCalendarOpen: (open) => useShellStore.getState().setCalendarOpen(open),
  setSelectedIconId: (iconId) => useShellStore.getState().setSelectedIconId(iconId),
  setContextMenu: (contextMenu) => useShellStore.getState().setContextMenu(contextMenu),
  setClipboard: (clipboard) => useShellStore.getState().setClipboard(clipboard),
  clearClipboard: () => useShellStore.getState().clearClipboard(),
  setThemeId: (themeId) => useShellStore.getState().setThemeId(themeId),
  setWallpaper: (wallpaper) => useShellStore.getState().setWallpaper(wallpaper),
  setWallpaperPreset: (mode, presetId) =>
    useShellStore.getState().setWallpaperPreset(mode, presetId),
  setWallpaperImage: (source) => useShellStore.getState().setWallpaperImage(source),
  resetWallpaper: () => useShellStore.getState().resetWallpaper(),
  setCustomWallpaperSource: (source) => useShellStore.getState().setCustomWallpaperSource(source),
  moveDesktopIcon: (iconId, position, metrics) =>
    useShellStore.getState().moveDesktopIcon(iconId, position, metrics),
  reconcileDesktopIconPositions: (entries, metrics) =>
    useShellStore.getState().reconcileDesktopIconPositions(entries, metrics),
  hydrateForViewport: () => {
    if (typeof window === "undefined") {
      return;
    }

    const rawWindows = useWindowStore.getState().windows;
    const processesById = new Map(useProcessStore.getState().processes.map((process) => [process.id, process]));
    const compactViewport = isCompactViewport();
    const maximizedBounds = getMaximizedBounds();
    const nextWindows = rawWindows.map((windowState, index) => {
      const appId = processesById.get(windowState.processId)?.appId ?? "about";
      const definition = getAppDefinition(appId);

      if (compactViewport && definition.mobileMaximized !== false) {
        const nextRestoreBounds = windowState.maximized
          ? windowState.restoreBounds ?? clampWindowBoundsToViewport(windowState)
          : clampWindowBoundsToViewport(windowState);

        return {
          ...windowState,
          ...maximizedBounds,
          maximized: true,
          restoreBounds: nextRestoreBounds,
        };
      }

      if (windowState.maximized) {
        return {
          ...windowState,
          ...maximizedBounds,
        };
      }

      return {
        ...windowState,
        ...clampWindowBoundsToViewport(windowState),
        restoreBounds: windowState.restoreBounds
          ? clampWindowBoundsToViewport(windowState.restoreBounds)
          : getDefaultWindowBounds(appId, index),
      };
    });

    useWindowStore
      .getState()
      .replaceRuntime(nextWindows, useWindowStore.getState().activeWindowId, useWindowStore.getState().nextZ);
  },
  resetLayout: () => {
    useWindowStore.getState().resetWindows();
    useProcessStore.getState().resetProcesses();
    useShellStore.getState().resetShell();
  },
};

export const useSystemStore = create<SystemState>(() => ({
  ...getRuntimeViewState(),
  ...systemActions,
}));

useWindowStore.subscribe(() => {
  syncProcessRuntime();
  syncShellRuntime();
  syncSystemFacadeState();
});

useProcessStore.subscribe(() => {
  syncWindowMetadata();
  syncShellRuntime();
  syncSystemFacadeState();
});

useShellStore.subscribe(() => {
  syncSystemFacadeState();
});

syncWindowMetadata();
syncProcessRuntime();
syncShellRuntime();
syncSystemFacadeState();

export function getDesktopEntries() {
  return desktopEntries;
}
