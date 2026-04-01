import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { desktopEntries, themePresets } from "@/data/portfolio";
import { buildProcessesFromWindows } from "@/lib/taskbar-system";
import { getAppDefinition } from "@/lib/app-registry";
import { reconcileDesktopGridPositions, resolveDesktopGridPlacement } from "@/lib/desktop-grid";
import { LEGACY_WELCOME_PATH } from "@/lib/system-workspace";
import { clamp, createId } from "@/lib/utils";
import type {
  AppId,
  AppProcess,
  AppWindow,
  ClipboardState,
  ContextMenuState,
  DesktopEntry,
  DesktopGridPosition,
  WindowPayload,
} from "@/types/system";

export const SYSTEM_STORAGE_KEY = "taaniel-os-system-v1";

const TASKBAR_HEIGHT = 72;

const initialIconPositions = desktopEntries.reduce<Record<string, DesktopGridPosition>>(
  (positions, entry) => {
    positions[entry.id] = entry.defaultGridPosition;
    return positions;
  },
  {}
);

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
  searchOpen: boolean;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  clipboard: ClipboardState | null;
  themeId: string;
  customWallpaperSource: string | null;
  desktopIconPositions: Record<string, DesktopGridPosition>;
  launchApp: (options: LaunchAppOptions) => string;
  bringToFront: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  toggleMinimize: (windowId: string) => void;
  toggleMaximize: (windowId: string) => void;
  updateWindowBounds: (windowId: string, partial: Partial<Pick<AppWindow, "x" | "y" | "width" | "height">>) => void;
  toggleTaskbarWindow: (windowId: string) => void;
  showDesktop: () => void;
  restoreDesktop: () => void;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setCalendarOpen: (open: boolean) => void;
  setSelectedIconId: (iconId: string | null) => void;
  setContextMenu: (contextMenu: ContextMenuState | null) => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  clearClipboard: () => void;
  setThemeId: (themeId: string) => void;
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

function getDesktopHeight() {
  return Math.max(480, window.innerHeight - TASKBAR_HEIGHT - 18);
}

function isCompactViewport() {
  return typeof window !== "undefined" && window.innerWidth < 820;
}

function clampWindowBoundsToViewport(windowState: Pick<AppWindow, "x" | "y" | "width" | "height">) {
  const desktopHeight = getDesktopHeight();
  const width = clamp(windowState.width, 360, Math.max(360, window.innerWidth - 24));
  const height = clamp(windowState.height, 280, Math.max(280, desktopHeight));

  return {
    width,
    height,
    x: clamp(windowState.x, 8, Math.max(8, window.innerWidth - width - 8)),
    y: clamp(windowState.y, 8, Math.max(8, desktopHeight - height + 8)),
  };
}

function getDefaultBounds(appId: AppId, index: number) {
  const definition = getAppDefinition(appId);
  const isMobile = isCompactViewport();
  const desktopHeight = getDesktopHeight();

  if (isMobile) {
    return {
      x: 8,
      y: 8,
      width: window.innerWidth - 16,
      height: desktopHeight - 8,
    };
  }

  const maxWidth = Math.min(window.innerWidth - 44, Math.floor(window.innerWidth * 0.84));
  const maxHeight = Math.min(desktopHeight - 16, Math.floor(desktopHeight * 0.82));
  const width = clamp(Math.min(definition.defaultBounds.width, maxWidth), 520, maxWidth);
  const height = clamp(Math.min(definition.defaultBounds.height, maxHeight), 340, maxHeight);
  const slotColumns = Math.max(1, Math.min(4, Math.floor((window.innerWidth - 80) / 260)));
  const slotRows = Math.max(1, Math.min(3, Math.floor((desktopHeight - 72) / 180)));
  const slotIndex = index % (slotColumns * slotRows);
  const slotX = slotIndex % slotColumns;
  const slotY = Math.floor(slotIndex / slotColumns);
  const availableX = Math.max(0, window.innerWidth - width - 40);
  const availableY = Math.max(0, desktopHeight - height - 28);
  const baseX =
    slotColumns > 1 ? 20 + Math.round((availableX / Math.max(1, slotColumns - 1)) * slotX) : 28;
  const baseY =
    slotRows > 1 ? 20 + Math.round((availableY / Math.max(1, slotRows - 1)) * slotY) : 24;

  return clampWindowBoundsToViewport({
    x: clamp(Math.max(baseX, definition.defaultBounds.x), 20, Math.max(20, window.innerWidth - width - 12)),
    y: clamp(Math.max(baseY, definition.defaultBounds.y), 20, Math.max(20, desktopHeight - height + 16)),
    width,
    height,
  });
}

function sanitizePersistedWindows(windows: AppWindow[]) {
  return windows
    .filter((windowState) => windowState.payload?.filePath !== LEGACY_WELCOME_PATH)
    .map((windowState) => {
      const clampedBounds = clampWindowBoundsToViewport(windowState);
      const restoreBounds = windowState.restoreBounds
        ? clampWindowBoundsToViewport(windowState.restoreBounds)
        : undefined;

      return {
        ...windowState,
        processId: windowState.processId ?? createId("process"),
        focused: false,
        ...clampedBounds,
        restoreBounds,
      };
    });
}

function withFocusedWindow(windows: AppWindow[]) {
  const topWindow = [...windows]
    .filter((windowState) => !windowState.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0];

  return topWindow?.id ?? null;
}

function createInitialWindowState() {
  return {
    windows: [] as AppWindow[],
    processes: [] as AppProcess[],
    nextZ: 2,
    activeWindowId: null as string | null,
  };
}

function syncFocusedWindows(windows: AppWindow[], activeWindowId: string | null) {
  return windows.map((windowState) => ({
    ...windowState,
    focused: activeWindowId === windowState.id && !windowState.minimized,
  }));
}

function createRuntimeSnapshot(windows: AppWindow[], requestedActiveWindowId: string | null) {
  const nextActiveWindowId =
    requestedActiveWindowId && windows.some((windowState) => windowState.id === requestedActiveWindowId && !windowState.minimized)
      ? requestedActiveWindowId
      : withFocusedWindow(windows);
  const nextWindows = syncFocusedWindows(windows, nextActiveWindowId);

  return {
    windows: nextWindows,
    processes: buildProcessesFromWindows(nextWindows, nextActiveWindowId),
    activeWindowId: nextActiveWindowId,
  };
}

export const useSystemStore = create<SystemState>()(
  persist(
    (set, get) => ({
      ...createInitialWindowState(),
      selectedIconId: null,
      startMenuOpen: false,
      searchOpen: false,
      calendarOpen: false,
      contextMenu: null,
      clipboard: null,
      themeId: themePresets[0].id,
      customWallpaperSource: null,
      desktopIconPositions: initialIconPositions,
      launchApp: ({ appId, payload, title }) => {
        const definition = getAppDefinition(appId);
        const existingWindow = get().windows.find((windowState) => {
          if (windowState.appId !== appId) {
            return false;
          }

          if (definition.singleInstance) {
            return true;
          }

          if (payload?.filePath) {
            return windowState.payload?.filePath === payload.filePath;
          }

          return false;
        });

        if (existingWindow) {
          const nextZ = get().nextZ + 1;
          const nextPayload = definition.singleInstance
            ? payload ?? existingWindow.payload
            : existingWindow.payload;
          const nextTitle =
            title ?? definition.resolveTitle?.(nextPayload) ?? existingWindow.title;
          const windows = get().windows.map((windowState) =>
            windowState.id === existingWindow.id
              ? {
                  ...windowState,
                  title: nextTitle,
                  minimized: false,
                  minimizedByShowDesktop: false,
                  payload: nextPayload,
                  zIndex: nextZ,
                }
              : windowState
          );
          const runtime = createRuntimeSnapshot(windows, existingWindow.id);

          set({
            nextZ,
            ...runtime,
            startMenuOpen: false,
            searchOpen: false,
            calendarOpen: false,
            contextMenu: null,
          });

          return existingWindow.id;
        }

        const nextZ = get().nextZ + 1;
        const bounds = getDefaultBounds(appId, get().windows.length);
        const windowId = createId("window");
        const processId = createId("process");
        const windowTitle = title ?? definition.resolveTitle?.(payload) ?? definition.title;
        const compactViewport = isCompactViewport();
        const desktopHeight = getDesktopHeight();

        const nextWindow: AppWindow = {
          id: windowId,
          processId,
          appId,
          title: windowTitle,
          zIndex: nextZ,
          minimized: false,
          maximized: compactViewport,
          focused: true,
          payload,
          createdAt: Date.now(),
          ...(compactViewport
            ? {
                x: 12,
                y: 12,
                width: window.innerWidth - 24,
                height: desktopHeight,
                restoreBounds: bounds,
              }
            : bounds),
        };
        const runtime = createRuntimeSnapshot([...get().windows, nextWindow], windowId);

        set({
          nextZ,
          ...runtime,
          startMenuOpen: false,
          searchOpen: false,
          calendarOpen: false,
          contextMenu: null,
        });

        return windowId;
      },
      bringToFront: (windowId) => {
        const nextZ = get().nextZ + 1;
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                minimized: false,
                minimizedByShowDesktop: false,
                zIndex: nextZ,
              }
            : windowState
        );
        const runtime = createRuntimeSnapshot(windows, windowId);

        set({
          nextZ,
          ...runtime,
        });
      },
      focusWindow: (windowId) => get().bringToFront(windowId),
      closeWindow: (windowId) => {
        const windows = get().windows.filter((windowState) => windowState.id !== windowId);
        const runtime = createRuntimeSnapshot(windows, get().activeWindowId === windowId ? null : get().activeWindowId);
        set({
          ...runtime,
        });
      },
      toggleMinimize: (windowId) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                minimized: !windowState.minimized,
                minimizedByShowDesktop: false,
              }
            : windowState
        );
        const runtime = createRuntimeSnapshot(
          windows,
          get().activeWindowId === windowId ? null : get().activeWindowId
        );

        set({
          ...runtime,
        });
      },
      toggleMaximize: (windowId) => {
        const desktopHeight = getDesktopHeight();
        const windows = get().windows.map((windowState) => {
          if (windowState.id !== windowId) {
            return windowState;
          }

          if (windowState.maximized) {
            const fallbackBounds = getDefaultBounds(windowState.appId, 0);

            return {
              ...windowState,
              ...(windowState.restoreBounds ?? fallbackBounds),
              maximized: false,
              restoreBounds: undefined,
            };
          }

          return {
            ...windowState,
            restoreBounds: {
              x: windowState.x,
              y: windowState.y,
              width: windowState.width,
              height: windowState.height,
            },
            x: 12,
            y: 12,
            width: window.innerWidth - 24,
            height: desktopHeight,
            maximized: true,
          };
        });
        const runtime = createRuntimeSnapshot(windows, windowId);

        set({
          ...runtime,
        });
      },
      updateWindowBounds: (windowId, partial) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                ...partial,
              }
            : windowState
        );
        const runtime = createRuntimeSnapshot(windows, get().activeWindowId);

        set({
          ...runtime,
        });
      },
      toggleTaskbarWindow: (windowId) => {
        const windowState = get().windows.find((item) => item.id === windowId);

        if (!windowState) {
          return;
        }

        if (windowState.id === get().activeWindowId && !windowState.minimized) {
          get().toggleMinimize(windowId);
          return;
        }

        get().bringToFront(windowId);
      },
      showDesktop: () => {
        const hasVisibleWindow = get().windows.some((windowState) => !windowState.minimized);

        if (!hasVisibleWindow) {
          get().restoreDesktop();
          return;
        }

        const windows = get().windows.map((windowState) => ({
          ...windowState,
          minimized: true,
          minimizedByShowDesktop: !windowState.minimized,
        }));
        const runtime = createRuntimeSnapshot(windows, null);

        set({
          ...runtime,
          startMenuOpen: false,
          searchOpen: false,
          calendarOpen: false,
        });
      },
      restoreDesktop: () => {
        const nextZStart = get().nextZ + 1;
        let zCounter = nextZStart;
        const windows = get().windows.map((windowState) => {
          if (!windowState.minimizedByShowDesktop) {
            return {
              ...windowState,
              minimizedByShowDesktop: false,
            };
          }

          zCounter += 1;
          return {
            ...windowState,
            minimized: false,
            minimizedByShowDesktop: false,
            zIndex: zCounter,
          };
        });
        const runtime = createRuntimeSnapshot(windows, withFocusedWindow(windows));

        set({
          nextZ: zCounter,
          ...runtime,
        });
      },
      setStartMenuOpen: (open) =>
        set({
          startMenuOpen: open,
          searchOpen: open ? false : get().searchOpen,
          calendarOpen: open ? false : get().calendarOpen,
        }),
      toggleStartMenu: () =>
        set((state) => ({
          startMenuOpen: !state.startMenuOpen,
          searchOpen: state.startMenuOpen ? state.searchOpen : false,
          calendarOpen: state.startMenuOpen ? state.calendarOpen : false,
          contextMenu: null,
        })),
      setSearchOpen: (open) =>
        set({
          searchOpen: open,
          startMenuOpen: open ? false : get().startMenuOpen,
          calendarOpen: open ? false : get().calendarOpen,
          contextMenu: null,
        }),
      toggleSearch: () =>
        set((state) => ({
          searchOpen: !state.searchOpen,
          startMenuOpen: state.searchOpen ? state.startMenuOpen : false,
          calendarOpen: state.searchOpen ? state.calendarOpen : false,
          contextMenu: null,
        })),
      setCalendarOpen: (open) =>
        set({
          calendarOpen: open,
          startMenuOpen: open ? false : get().startMenuOpen,
          searchOpen: open ? false : get().searchOpen,
        }),
      setSelectedIconId: (selectedIconId) => set({ selectedIconId }),
      setContextMenu: (contextMenu) => set({ contextMenu }),
      setClipboard: (clipboard) => set({ clipboard }),
      clearClipboard: () => set({ clipboard: null }),
      setThemeId: (themeId) => set({ themeId }),
      setCustomWallpaperSource: (customWallpaperSource) => set({ customWallpaperSource }),
      moveDesktopIcon: (iconId, position, metrics) =>
        set((state) => ({
          desktopIconPositions: resolveDesktopGridPlacement(
            state.desktopIconPositions,
            iconId,
            position,
            metrics
          ).positions,
        })),
      reconcileDesktopIconPositions: (entries, metrics) =>
        set((state) => ({
          desktopIconPositions: reconcileDesktopGridPositions(
            entries,
            state.desktopIconPositions,
            metrics
          ),
        })),
      hydrateForViewport: () => {
        if (typeof window === "undefined") {
          return;
        }

        const desktopHeight = getDesktopHeight();
        const compactViewport = isCompactViewport();
        const windows = get().windows.map((windowState) => {
          if (compactViewport) {
            const nextRestoreBounds = windowState.maximized
              ? windowState.restoreBounds ?? clampWindowBoundsToViewport(windowState)
              : clampWindowBoundsToViewport(windowState);

            return {
              ...windowState,
              x: 12,
              y: 12,
              width: window.innerWidth - 24,
              height: desktopHeight,
              maximized: true,
              restoreBounds: nextRestoreBounds,
            };
          }

          if (windowState.maximized) {
            return {
              ...windowState,
              x: 12,
              y: 12,
              width: window.innerWidth - 24,
              height: desktopHeight,
            };
          }

          return {
            ...windowState,
            ...clampWindowBoundsToViewport(windowState),
            restoreBounds: windowState.restoreBounds
              ? clampWindowBoundsToViewport(windowState.restoreBounds)
              : undefined,
          };
        });
        const runtime = createRuntimeSnapshot(windows, get().activeWindowId);

        set({
          ...runtime,
        });
      },
      resetLayout: () =>
        set({
          ...createInitialWindowState(),
          selectedIconId: null,
          startMenuOpen: false,
          searchOpen: false,
          calendarOpen: false,
          contextMenu: null,
          clipboard: null,
          themeId: themePresets[0].id,
          customWallpaperSource: null,
          desktopIconPositions: initialIconPositions,
        }),
    }),
    {
      name: SYSTEM_STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return persistedState as SystemState;
        }

        const state = persistedState as Partial<SystemState> & {
          desktopIconPositions?: Record<string, { x?: number; y?: number }>;
        };

        if (version < 2) {
          return {
            ...state,
            ...createInitialWindowState(),
            desktopIconPositions: initialIconPositions,
          } as SystemState;
        }

        if (version < 3) {
          return {
            ...state,
            ...createInitialWindowState(),
          } as SystemState;
        }

        if (version < 4) {
          const windows = sanitizePersistedWindows((state.windows ?? []) as AppWindow[]);
          const runtime = createRuntimeSnapshot(
            windows,
            windows.some((windowState) => windowState.id === state.activeWindowId)
              ? state.activeWindowId ?? withFocusedWindow(windows)
              : withFocusedWindow(windows)
          );

          return {
            ...state,
            ...runtime,
          } as SystemState;
        }

        if (version < 5) {
          const windows = sanitizePersistedWindows((state.windows ?? []) as AppWindow[]);
          return {
            ...state,
            ...createRuntimeSnapshot(windows, state.activeWindowId ?? withFocusedWindow(windows)),
          } as SystemState;
        }

        const windows = sanitizePersistedWindows((state.windows ?? []) as AppWindow[]);

        return {
          ...state,
          ...createRuntimeSnapshot(windows, state.activeWindowId ?? withFocusedWindow(windows)),
        } as SystemState;
      },
      partialize: (state) => ({
        windows: state.windows,
        processes: state.processes,
        nextZ: state.nextZ,
        activeWindowId: state.activeWindowId,
        themeId: state.themeId,
        customWallpaperSource: state.customWallpaperSource,
        desktopIconPositions: state.desktopIconPositions,
      }),
    }
  )
);
