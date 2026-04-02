import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId } from "@/lib/utils";
import {
  WINDOW_STORAGE_KEY,
  clampWindowBoundsToViewport,
  getLegacyWindowSeed,
  getMaximizedBounds,
  getTopVisibleWindowId,
} from "@/stores/system-runtime";
import type { WindowBounds, WindowRecord } from "@/types/system";

interface OpenWindowOptions {
  processId: string;
  bounds: WindowBounds;
  windowId?: string;
  maximized?: boolean;
  minimized?: boolean;
  restoreBounds?: WindowBounds;
  createdAt?: number;
  zIndex?: number;
}

interface WindowStoreState {
  windows: WindowRecord[];
  activeWindowId: string | null;
  nextZ: number;
  openWindow: (options: OpenWindowOptions) => string;
  replaceRuntime: (windows: WindowRecord[], activeWindowId: string | null, nextZ?: number) => void;
  bringToFront: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string, fallbackRestoreBounds?: WindowBounds) => void;
  updateWindowBounds: (
    windowId: string,
    partial: Partial<Pick<WindowRecord, "x" | "y" | "width" | "height">>
  ) => void;
  showDesktop: () => void;
  restoreDesktop: () => void;
  resetWindows: () => void;
}

function resolveActiveWindowId(windows: WindowRecord[], requestedActiveWindowId: string | null) {
  if (requestedActiveWindowId && windows.some((windowState) => windowState.id === requestedActiveWindowId && !windowState.minimized)) {
    return requestedActiveWindowId;
  }

  return getTopVisibleWindowId(windows);
}

function syncWindowRuntime(windows: WindowRecord[], requestedActiveWindowId: string | null) {
  return {
    windows,
    activeWindowId: resolveActiveWindowId(windows, requestedActiveWindowId),
  };
}

const legacySeed = getLegacyWindowSeed();

const initialWindowState = {
  windows: legacySeed.windows,
  activeWindowId: legacySeed.activeWindowId,
  nextZ: legacySeed.nextZ,
};

export const useWindowStore = create<WindowStoreState>()(
  persist(
    (set, get) => ({
      ...initialWindowState,
      openWindow: ({
        processId,
        bounds,
        windowId,
        maximized = false,
        minimized = false,
        restoreBounds,
        createdAt,
        zIndex,
      }) => {
        const nextZ = zIndex ?? get().nextZ + 1;
        const nextWindowId = windowId ?? createId("window");
        const nextWindow: WindowRecord = {
          id: nextWindowId,
          processId,
          minimized,
          minimizedByShowDesktop: false,
          maximized,
          zIndex: nextZ,
          restoreBounds,
          createdAt: createdAt ?? Date.now(),
          ...clampWindowBoundsToViewport(bounds),
        };
        const runtime = syncWindowRuntime([...get().windows, nextWindow], nextWindowId);

        set({
          nextZ,
          ...runtime,
        });

        return nextWindowId;
      },
      replaceRuntime: (windows, activeWindowId, nextZ) =>
        set({
          ...syncWindowRuntime(windows, activeWindowId),
          nextZ:
            nextZ ??
            windows.reduce((highest, windowState) => Math.max(highest, windowState.zIndex), 2),
        }),
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

        set({
          nextZ,
          ...syncWindowRuntime(windows, windowId),
        });
      },
      focusWindow: (windowId) => get().bringToFront(windowId),
      closeWindow: (windowId) => {
        const windows = get().windows.filter((windowState) => windowState.id !== windowId);
        set(syncWindowRuntime(windows, get().activeWindowId === windowId ? null : get().activeWindowId));
      },
      minimizeWindow: (windowId) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                minimized: !windowState.minimized,
                minimizedByShowDesktop: false,
              }
            : windowState
        );

        set(
          syncWindowRuntime(
            windows,
            get().activeWindowId === windowId ? null : get().activeWindowId
          )
        );
      },
      maximizeWindow: (windowId, fallbackRestoreBounds) => {
        const maximizedBounds = getMaximizedBounds();
        const windows = get().windows.map((windowState) => {
          if (windowState.id !== windowId) {
            return windowState;
          }

          if (windowState.maximized) {
            const restoreTarget = windowState.restoreBounds ?? fallbackRestoreBounds ?? windowState;

            return {
              ...windowState,
              ...clampWindowBoundsToViewport(restoreTarget),
              maximized: false,
              restoreBounds: undefined,
            };
          }

          return {
            ...windowState,
            restoreBounds: clampWindowBoundsToViewport(windowState),
            ...maximizedBounds,
            maximized: true,
          };
        });

        set(syncWindowRuntime(windows, windowId));
      },
      updateWindowBounds: (windowId, partial) => {
        const windows = get().windows.map((windowState) => {
          if (windowState.id !== windowId) {
            return windowState;
          }

          return {
            ...windowState,
            ...partial,
          };
        });

        set(syncWindowRuntime(windows, get().activeWindowId));
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

        set(syncWindowRuntime(windows, null));
      },
      restoreDesktop: () => {
        let nextZ = get().nextZ;
        const windows = get().windows.map((windowState) => {
          if (!windowState.minimizedByShowDesktop) {
            return {
              ...windowState,
              minimizedByShowDesktop: false,
            };
          }

          nextZ += 1;
          return {
            ...windowState,
            minimized: false,
            minimizedByShowDesktop: false,
            zIndex: nextZ,
          };
        });

        set({
          nextZ,
          ...syncWindowRuntime(windows, getTopVisibleWindowId(windows)),
        });
      },
      resetWindows: () =>
        set({
          windows: [],
          activeWindowId: null,
          nextZ: 2,
        }),
    }),
    {
      name: WINDOW_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        nextZ: state.nextZ,
      }),
    }
  )
);
