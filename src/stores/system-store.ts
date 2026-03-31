import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { desktopEntries, themePresets } from "@/data/portfolio";
import { getAppDefinition } from "@/lib/app-registry";
import { clamp, createId } from "@/lib/utils";
import type {
  AppId,
  AppWindow,
  ContextMenuState,
  DesktopIconPosition,
  WindowPayload,
} from "@/types/system";

export const SYSTEM_STORAGE_KEY = "taaniel-os-system-v1";

const TASKBAR_HEIGHT = 72;

const initialIconPositions = desktopEntries.reduce<Record<string, DesktopIconPosition>>(
  (positions, entry) => {
    positions[entry.id] = entry.defaultPosition;
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
  nextZ: number;
  activeWindowId: string | null;
  selectedIconId: string | null;
  startMenuOpen: boolean;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  themeId: string;
  desktopIconPositions: Record<string, DesktopIconPosition>;
  launchApp: (options: LaunchAppOptions) => string;
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
  setCalendarOpen: (open: boolean) => void;
  setSelectedIconId: (iconId: string | null) => void;
  setContextMenu: (contextMenu: ContextMenuState | null) => void;
  setThemeId: (themeId: string) => void;
  updateDesktopIconPosition: (iconId: string, position: DesktopIconPosition) => void;
  hydrateForViewport: () => void;
  resetLayout: () => void;
}

function getDesktopHeight() {
  return Math.max(480, window.innerHeight - TASKBAR_HEIGHT - 18);
}

function getDefaultBounds(appId: AppId, index: number) {
  const definition = getAppDefinition(appId);
  const isMobile = window.innerWidth < 820;

  if (isMobile) {
    return {
      x: 8,
      y: 8,
      width: window.innerWidth - 16,
      height: getDesktopHeight() - 8,
    };
  }

  const offset = index * 28;
  const width = Math.min(definition.defaultBounds.width, window.innerWidth - 72);
  const height = Math.min(definition.defaultBounds.height, getDesktopHeight() - 32);

  return {
    x: clamp(definition.defaultBounds.x + offset, 18, window.innerWidth - width - 18),
    y: clamp(definition.defaultBounds.y + offset, 18, getDesktopHeight() - height + 18),
    width,
    height,
  };
}

function withFocusedWindow(windows: AppWindow[]) {
  const topWindow = [...windows]
    .filter((windowState) => !windowState.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0];

  return topWindow?.id ?? null;
}

export const useSystemStore = create<SystemState>()(
  persist(
    (set, get) => ({
      windows: [],
      nextZ: 2,
      activeWindowId: null,
      selectedIconId: null,
      startMenuOpen: false,
      calendarOpen: false,
      contextMenu: null,
      themeId: themePresets[0].id,
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

          return windowState.payload?.filePath === payload?.filePath;
        });

        if (existingWindow) {
          const nextZ = get().nextZ + 1;
          const windows = get().windows.map((windowState) =>
            windowState.id === existingWindow.id
              ? {
                  ...windowState,
                  minimized: false,
                  zIndex: nextZ,
                }
              : windowState
          );

          set({
            windows,
            nextZ,
            activeWindowId: existingWindow.id,
            startMenuOpen: false,
          });

          return existingWindow.id;
        }

        const nextZ = get().nextZ + 1;
        const bounds = getDefaultBounds(appId, get().windows.length);
        const windowId = createId("window");
        const windowTitle = title ?? definition.resolveTitle?.(payload) ?? definition.title;

        const nextWindow: AppWindow = {
          id: windowId,
          appId,
          title: windowTitle,
          zIndex: nextZ,
          minimized: false,
          maximized: false,
          payload,
          createdAt: Date.now(),
          ...bounds,
        };

        set((state) => ({
          windows: [...state.windows, nextWindow],
          nextZ,
          activeWindowId: windowId,
          startMenuOpen: false,
          calendarOpen: false,
          contextMenu: null,
        }));

        return windowId;
      },
      focusWindow: (windowId) => {
        const nextZ = get().nextZ + 1;
        set((state) => ({
          nextZ,
          activeWindowId: windowId,
          windows: state.windows.map((windowState) =>
            windowState.id === windowId
              ? {
                  ...windowState,
                  minimized: false,
                  zIndex: nextZ,
                }
              : windowState
          ),
        }));
      },
      closeWindow: (windowId) => {
        const windows = get().windows.filter((windowState) => windowState.id !== windowId);
        set({
          windows,
          activeWindowId: withFocusedWindow(windows),
        });
      },
      toggleMinimize: (windowId) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                minimized: !windowState.minimized,
              }
            : windowState
        );

        set({
          windows,
          activeWindowId: withFocusedWindow(windows),
        });
      },
      toggleMaximize: (windowId) => {
        const desktopHeight = getDesktopHeight();

        set((state) => ({
          windows: state.windows.map((windowState) => {
            if (windowState.id !== windowId) {
              return windowState;
            }

            if (windowState.maximized) {
              return {
                ...windowState,
                ...(windowState.restoreBounds ?? {
                  x: 120,
                  y: 88,
                  width: 920,
                  height: 640,
                }),
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
          }),
        }));
      },
      updateWindowBounds: (windowId, partial) => {
        set((state) => ({
          windows: state.windows.map((windowState) =>
            windowState.id === windowId
              ? {
                  ...windowState,
                  ...partial,
                }
              : windowState
          ),
        }));
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

        get().focusWindow(windowId);
      },
      showDesktop: () => {
        const hasVisibleWindow = get().windows.some((windowState) => !windowState.minimized);

        if (!hasVisibleWindow) {
          get().restoreDesktop();
          return;
        }

        set((state) => ({
          windows: state.windows.map((windowState) => ({
            ...windowState,
            minimized: true,
          })),
          activeWindowId: null,
          startMenuOpen: false,
          calendarOpen: false,
        }));
      },
      restoreDesktop: () => {
        const nextZStart = get().nextZ + 1;
        let zCounter = nextZStart;
        const windows = get().windows.map((windowState) => {
          zCounter += 1;
          return {
            ...windowState,
            minimized: false,
            zIndex: zCounter,
          };
        });

        set({
          windows,
          nextZ: zCounter,
          activeWindowId: withFocusedWindow(windows),
        });
      },
      setStartMenuOpen: (open) =>
        set({
          startMenuOpen: open,
          calendarOpen: open ? false : get().calendarOpen,
        }),
      toggleStartMenu: () =>
        set((state) => ({
          startMenuOpen: !state.startMenuOpen,
          calendarOpen: state.startMenuOpen ? state.calendarOpen : false,
          contextMenu: null,
        })),
      setCalendarOpen: (open) =>
        set({
          calendarOpen: open,
          startMenuOpen: open ? false : get().startMenuOpen,
        }),
      setSelectedIconId: (selectedIconId) => set({ selectedIconId }),
      setContextMenu: (contextMenu) => set({ contextMenu }),
      setThemeId: (themeId) => set({ themeId }),
      updateDesktopIconPosition: (iconId, position) =>
        set((state) => ({
          desktopIconPositions: {
            ...state.desktopIconPositions,
            [iconId]: {
              x: Math.max(12, Math.round(position.x)),
              y: Math.max(12, Math.round(position.y)),
            },
          },
        })),
      hydrateForViewport: () => {
        if (typeof window === "undefined") {
          return;
        }

        const desktopHeight = getDesktopHeight();
        set((state) => ({
          windows: state.windows.map((windowState) => {
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
              x: clamp(windowState.x, 8, Math.max(8, window.innerWidth - 120)),
              y: clamp(windowState.y, 8, Math.max(8, desktopHeight - 80)),
              width: clamp(windowState.width, 320, window.innerWidth - 8),
              height: clamp(windowState.height, 240, desktopHeight),
            };
          }),
        }));
      },
      resetLayout: () =>
        set({
          windows: [],
          nextZ: 2,
          activeWindowId: null,
          selectedIconId: null,
          startMenuOpen: false,
          calendarOpen: false,
          contextMenu: null,
          themeId: themePresets[0].id,
          desktopIconPositions: initialIconPositions,
        }),
    }),
    {
      name: SYSTEM_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        windows: state.windows,
        nextZ: state.nextZ,
        themeId: state.themeId,
        desktopIconPositions: state.desktopIconPositions,
      }),
    }
  )
);
