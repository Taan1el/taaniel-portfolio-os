import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import { createId } from "@/lib/utils";
import {
  WINDOW_STORAGE_KEY,
  clampWindowBoundsToViewport,
  getLegacyWindowSeed,
  getMaximizedBounds,
  getTopVisibleWindowId,
} from "@/stores/system-runtime";
import type { WindowBounds, WindowRecord } from "@/types/system";

interface PersistedWindowV1 extends Omit<WindowRecord, "title" | "focused"> {
  title?: string;
  focused?: boolean;
}

interface OpenWindowOptions {
  processId: string;
  title: string;
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
  activeDesktop: number;
  desktopCount: number;
  openWindow: (options: OpenWindowOptions) => string;
  replaceRuntime: (windows: WindowRecord[], activeWindowId: string | null, nextZ?: number) => void;
  bringToFront: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  setWindowTitle: (windowId: string, title: string) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string, fallbackRestoreBounds?: WindowBounds) => void;
  snapWindow: (windowId: string, bounds: WindowBounds) => void;
  switchDesktop: (desktop: number) => void;
  addDesktop: () => void;
  removeDesktop: (desktop: number) => void;
  moveWindowToDesktop: (windowId: string, desktop: number) => void;
  updateWindowBounds: (
    windowId: string,
    partial: Partial<Pick<WindowRecord, "x" | "y" | "width" | "height">>
  ) => void;
  showDesktop: () => void;
  restoreDesktop: () => void;
  resetWindows: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeRestoreBounds(value: unknown): WindowBounds | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.x !== "number" ||
    typeof value.y !== "number" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number"
  ) {
    return undefined;
  }

  return clampWindowBoundsToViewport({
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
  });
}

export function sanitizePersistedWindows(value: unknown): WindowRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((windowState): WindowRecord[] => {
    if (!isRecord(windowState)) {
      return [];
    }

    if (typeof windowState.id !== "string" || typeof windowState.processId !== "string") {
      return [];
    }

    const fallbackBounds = { x: 120, y: 88, width: 720, height: 480 };
    const bounds = clampWindowBoundsToViewport({
      x: getFiniteNumber(windowState.x, fallbackBounds.x),
      y: getFiniteNumber(windowState.y, fallbackBounds.y),
      width: getFiniteNumber(windowState.width, fallbackBounds.width),
      height: getFiniteNumber(windowState.height, fallbackBounds.height),
    });

    return [
      {
        id: windowState.id,
        processId: windowState.processId,
        desktop: sanitizeDesktop(windowState.desktop),
        title: typeof windowState.title === "string" ? windowState.title : "Window",
        minimized: Boolean(windowState.minimized),
        minimizedByShowDesktop: Boolean(windowState.minimizedByShowDesktop),
        maximized: Boolean(windowState.maximized),
        focused: Boolean(windowState.focused),
        zIndex: getFiniteNumber(windowState.zIndex, 2),
        createdAt: getFiniteNumber(windowState.createdAt, Date.now()),
        restoreBounds: sanitizeRestoreBounds(windowState.restoreBounds),
        ...bounds,
      },
    ];
  });
}

function resolveActiveWindowId(windows: WindowRecord[], requestedActiveWindowId: string | null) {
  if (
    requestedActiveWindowId &&
    windows.some((windowState) => windowState.id === requestedActiveWindowId && !windowState.minimized)
  ) {
    return requestedActiveWindowId;
  }

  return getTopVisibleWindowId(windows);
}

function syncWindowRuntime(windows: WindowRecord[], requestedActiveWindowId: string | null, desktop = 1) {
  const activeWindowId = resolveActiveWindowId(
    windows.filter((windowState) => desktopOf(windowState) === desktop),
    requestedActiveWindowId
  );

  return {
    windows: windows.map((windowState) => ({
      ...windowState,
      focused: windowState.id === activeWindowId && !windowState.minimized,
    })),
    activeWindowId,
  };
}

export const MAX_DESKTOPS = 4;

export function desktopOf(windowState: Pick<WindowRecord, "desktop">) {
  return windowState.desktop ?? 1;
}

function sanitizeDesktop(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_DESKTOPS ? value : undefined;
}

const legacySeed = getLegacyWindowSeed();
const initialRuntime = syncWindowRuntime(legacySeed.windows, legacySeed.activeWindowId);

const initialWindowState = {
  windows: initialRuntime.windows,
  activeWindowId: initialRuntime.activeWindowId,
  nextZ: legacySeed.nextZ,
  activeDesktop: 1,
  desktopCount: 1,
};

export const useWindowStore = create<WindowStoreState>()(
  persist(
    (set, get) => ({
      ...initialWindowState,
      openWindow: ({
        processId,
        title,
        bounds,
        windowId,
        maximized = false,
        minimized = false,
        restoreBounds,
        createdAt,
        zIndex,
      }) => {
        const assignedZ = zIndex ?? get().nextZ + 1;
        // Always advance the counter at least to the assigned value so future
        // auto-generated windows never collide with or go below this one.
        const nextCounter = Math.max(get().nextZ, assignedZ);
        const nextWindowId = windowId ?? createId("window");
        const nextWindow: WindowRecord = {
          id: nextWindowId,
          processId,
          title,
          minimized,
          minimizedByShowDesktop: false,
          maximized,
          focused: false,
          zIndex: assignedZ,
          restoreBounds,
          desktop: get().activeDesktop,
          createdAt: createdAt ?? Date.now(),
          ...clampWindowBoundsToViewport(bounds),
        };
        const runtime = syncWindowRuntime([...get().windows, nextWindow], nextWindowId, get().activeDesktop);

        set({
          nextZ: nextCounter,
          ...runtime,
        });

        return nextWindowId;
      },
      replaceRuntime: (windows, activeWindowId, nextZ) =>
        set({
          ...syncWindowRuntime(windows, activeWindowId, get().activeDesktop),
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

        // A window opened from elsewhere brings its desktop along with it.
        const target = get().windows.find((windowState) => windowState.id === windowId);
        const activeDesktop = target ? desktopOf(target) : get().activeDesktop;

        set({
          nextZ,
          activeDesktop,
          ...syncWindowRuntime(windows, windowId, activeDesktop),
        });
      },
      focusWindow: (windowId) => get().bringToFront(windowId),
      setWindowTitle: (windowId, title) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId && windowState.title !== title
            ? {
                ...windowState,
                title,
              }
            : windowState
        );

        set(syncWindowRuntime(windows, get().activeWindowId));
      },
      closeWindow: (windowId) => {
        const windows = get().windows.filter((windowState) => windowState.id !== windowId);
        set(syncWindowRuntime(windows, get().activeWindowId === windowId ? null : get().activeWindowId, get().activeDesktop));
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
            get().activeWindowId === windowId ? null : get().activeWindowId,
            get().activeDesktop
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

        set(syncWindowRuntime(windows, windowId, get().activeDesktop));
      },
      snapWindow: (windowId, bounds) => {
        const windows = get().windows.map((windowState) =>
          windowState.id === windowId
            ? {
                ...windowState,
                ...bounds,
                // Restore returns to the size it had before it was first snapped.
                restoreBounds: windowState.restoreBounds ?? clampWindowBoundsToViewport(windowState),
                maximized: false,
              }
            : windowState
        );
        set(syncWindowRuntime(windows, windowId, get().activeDesktop));
      },
      switchDesktop: (desktop) => {
        if (desktop < 1 || desktop > get().desktopCount || desktop === get().activeDesktop) return;
        set({ activeDesktop: desktop, ...syncWindowRuntime(get().windows, null, desktop) });
      },
      addDesktop: () => {
        const desktopCount = get().desktopCount;
        if (desktopCount >= MAX_DESKTOPS) return;
        const activeDesktop = desktopCount + 1;
        set({ desktopCount: activeDesktop, activeDesktop, ...syncWindowRuntime(get().windows, null, activeDesktop) });
      },
      removeDesktop: (desktop) => {
        const { desktopCount, activeDesktop } = get();
        if (desktopCount <= 1 || desktop < 1 || desktop > desktopCount) return;
        // Like Windows: its windows join the neighbouring desktop and later desktops shift down.
        const fallback = Math.max(1, desktop - 1);
        const renumber = (value: number) => (value === desktop ? fallback : value > desktop ? value - 1 : value);
        const windows = get().windows.map((windowState) => ({ ...windowState, desktop: renumber(desktopOf(windowState)) }));
        const nextActive = renumber(activeDesktop);
        set({ desktopCount: desktopCount - 1, activeDesktop: nextActive, ...syncWindowRuntime(windows, get().activeWindowId, nextActive) });
      },
      moveWindowToDesktop: (windowId, desktop) => {
        if (desktop < 1 || desktop > get().desktopCount) return;
        const windows = get().windows.map((windowState) => (windowState.id === windowId ? { ...windowState, desktop } : windowState));
        const keep = get().activeWindowId === windowId ? null : get().activeWindowId;
        set(syncWindowRuntime(windows, keep, get().activeDesktop));
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

        set(syncWindowRuntime(windows, get().activeWindowId, get().activeDesktop));
      },
      showDesktop: () => {
        const activeDesktop = get().activeDesktop;
        const hasVisibleWindow = get().windows.some(
          (windowState) => desktopOf(windowState) === activeDesktop && !windowState.minimized
        );

        if (!hasVisibleWindow) {
          get().restoreDesktop();
          return;
        }

        const windows = get().windows.map((windowState) => desktopOf(windowState) !== activeDesktop ? windowState : ({
          ...windowState,
          minimized: true,
          // Only mark windows that are currently visible so restoreDesktop
          // can bring them back. Already-minimized windows keep their existing
          // flag — otherwise a second Show Desktop press wipes the flag for
          // windows minimised by the first press, orphaning them permanently.
          minimizedByShowDesktop: windowState.minimized
            ? windowState.minimizedByShowDesktop
            : true,
        }));

        set(syncWindowRuntime(windows, null, activeDesktop));
      },
      restoreDesktop: () => {
        let nextZ = get().nextZ;
        const activeDesktop = get().activeDesktop;
        const windows = get().windows.map((windowState) => {
          if (desktopOf(windowState) !== activeDesktop) return windowState;
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
          ...syncWindowRuntime(windows, null, activeDesktop),
        });
      },
      resetWindows: () =>
        set({
          windows: [],
          activeWindowId: null,
          nextZ: 2,
          activeDesktop: 1,
          desktopCount: 1,
        }),
    }),
    {
      name: WINDOW_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(getSafeLocalStorage),
      migrate: (persistedState) => {
        const state = persistedState as
          | {
              windows?: PersistedWindowV1[];
              activeWindowId?: string | null;
              nextZ?: number;
              activeDesktop?: number;
              desktopCount?: number;
            }
          | undefined;

        const windows = sanitizePersistedWindows(state?.windows);
        const desktopCount = sanitizeDesktop(state?.desktopCount) ?? 1;
        const activeDesktop = Math.min(sanitizeDesktop(state?.activeDesktop) ?? 1, desktopCount);
        const runtime = syncWindowRuntime(windows, state?.activeWindowId ?? null, activeDesktop);

        return {
          windows: runtime.windows,
          activeWindowId: runtime.activeWindowId,
          nextZ: state?.nextZ ?? 2,
          activeDesktop,
          desktopCount,
        };
      },
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        nextZ: state.nextZ,
        activeDesktop: state.activeDesktop,
        desktopCount: state.desktopCount,
      }),
    }
  )
);
