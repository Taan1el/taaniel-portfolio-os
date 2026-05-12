import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { themePresets } from "@/data/portfolio";
import { defaultDesktopWallpaper } from "@/data/wallpapers";
import { reconcileDesktopGridPositions, resolveDesktopGridPlacement } from "@/lib/desktop-grid";
import {
  SHELL_STORAGE_KEY,
  getLegacyShellSeed,
  getViewportMode,
  initialIconPositions,
} from "@/stores/system-runtime";
import type {
  AppId,
  ClipboardState,
  ContextMenuState,
  DesktopWallpaperState,
  DesktopEntry,
  DesktopGridPosition,
  ViewportMode,
  VirtualNode,
} from "@/types/system";

export const DEFAULT_PINNED_APPS: AppId[] = ["about", "files", "terminal", "browser"];

interface ShellStoreState {
  selectedIconId: string | null;
  startMenuOpen: boolean;
  pinnedAppIds: AppId[];
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  startMenuSearchFocusNonce: number;
  searchQuery: string;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  openWithTarget: { filePath: string; node: VirtualNode } | null;
  clipboard: ClipboardState | null;
  themeId: string;
  wallpaper: DesktopWallpaperState;
  desktopIconPositions: Record<string, DesktopGridPosition>;
  viewportMode: ViewportMode;
  focusedWindowId: string | null;
  focusedProcessId: string | null;
  theatreMode: boolean;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  requestStartMenuSearchFocus: () => void;
  setSearchQuery: (query: string) => void;
  setCalendarOpen: (open: boolean) => void;
  setSelectedIconId: (iconId: string | null) => void;
  setContextMenu: (contextMenu: ContextMenuState | null) => void;
  setOpenWithTarget: (target: { filePath: string; node: VirtualNode } | null) => void;
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
  syncRuntimeState: (runtime: {
    viewportMode: ViewportMode;
    focusedWindowId: string | null;
    focusedProcessId: string | null;
  }) => void;
  closeOverlays: () => void;
  resetShell: () => void;
  setTheatreMode: (on: boolean) => void;
  toggleTheatreMode: () => void;
}

const legacyShellSeed = getLegacyShellSeed();

const initialShellState = {
  selectedIconId: null,
  startMenuOpen: false,
  pinnedAppIds: DEFAULT_PINNED_APPS,
  startMenuSearchFocusNonce: 0,
  searchQuery: "",
  calendarOpen: false,
  contextMenu: null,
  openWithTarget: null,
  clipboard: null,
  themeId: legacyShellSeed.themeId,
  wallpaper: legacyShellSeed.wallpaper ?? defaultDesktopWallpaper,
  desktopIconPositions: legacyShellSeed.desktopIconPositions,
  viewportMode: getViewportMode(),
  focusedWindowId: null,
  focusedProcessId: null,
  theatreMode: false,
};

export const useShellStore = create<ShellStoreState>()(
  persist(
    (set, get) => ({
      ...initialShellState,
      setStartMenuOpen: (open) =>
        set((state) => ({
          startMenuOpen: open,
          calendarOpen: open ? false : state.calendarOpen,
        })),
      toggleStartMenu: () =>
        set((state) => ({
          startMenuOpen: !state.startMenuOpen,
          calendarOpen: state.startMenuOpen ? false : state.calendarOpen,
          contextMenu: null,
        })),
      requestStartMenuSearchFocus: () =>
        set((state) => ({
          startMenuSearchFocusNonce: state.startMenuSearchFocusNonce + 1,
        })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCalendarOpen: (open) =>
        set((state) => ({
          calendarOpen: open,
          startMenuOpen: open ? false : state.startMenuOpen,
        })),
      pinApp: (appId) =>
        set((state) =>
          state.pinnedAppIds.includes(appId)
            ? state
            : { pinnedAppIds: [...state.pinnedAppIds, appId] }
        ),
      unpinApp: (appId) =>
        set((state) => ({ pinnedAppIds: state.pinnedAppIds.filter((id) => id !== appId) })),
      setSelectedIconId: (selectedIconId) => set({ selectedIconId }),
      setContextMenu: (contextMenu) => set({ contextMenu }),
      setOpenWithTarget: (openWithTarget) => set({ openWithTarget }),
      setClipboard: (clipboard) => set({ clipboard }),
      clearClipboard: () => set({ clipboard: null }),
      setThemeId: (themeId) => set({ themeId }),
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setWallpaperPreset: (mode, presetId) =>
        set({
          wallpaper: {
            mode,
            presetId,
            imageSource: null,
          },
        }),
      setWallpaperImage: (imageSource) =>
        set({
          wallpaper: {
            mode: "image",
            imageSource,
            presetId: null,
          },
        }),
      resetWallpaper: () => set({ wallpaper: defaultDesktopWallpaper }),
      setCustomWallpaperSource: (source) =>
        set({
          wallpaper: source
            ? {
                mode: "image",
                imageSource: source,
                presetId: null,
              }
            : defaultDesktopWallpaper,
        }),
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
      syncRuntimeState: ({ viewportMode, focusedWindowId, focusedProcessId }) => {
        const current = get();

        if (
          current.viewportMode === viewportMode &&
          current.focusedWindowId === focusedWindowId &&
          current.focusedProcessId === focusedProcessId
        ) {
          return;
        }

        set({
          viewportMode,
          focusedWindowId,
          focusedProcessId,
        });
      },
      closeOverlays: () =>
        set({
          startMenuOpen: false,
          searchQuery: "",
          calendarOpen: false,
          contextMenu: null,
          openWithTarget: null,
        }),
      resetShell: () =>
        set({
          ...initialShellState,
          themeId: themePresets[0].id,
          wallpaper: defaultDesktopWallpaper,
          desktopIconPositions: initialIconPositions,
          viewportMode: getViewportMode(),
        }),
      setTheatreMode: (on) => set({ theatreMode: on }),
      toggleTheatreMode: () => set((state) => ({ theatreMode: !state.theatreMode })),
    }),
    {
      name: SHELL_STORAGE_KEY,
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as
          | {
              themeId?: string;
              wallpaper?: DesktopWallpaperState;
              customWallpaperSource?: string | null;
              desktopIconPositions?: Record<string, DesktopGridPosition>;
              pinnedAppIds?: AppId[];
            }
          | undefined;

        return {
          themeId: state?.themeId ?? themePresets[0].id,
          wallpaper:
            state?.wallpaper ??
            (state?.customWallpaperSource
              ? {
                  mode: "image" as const,
                  imageSource: state.customWallpaperSource,
                  presetId: null,
                }
              : defaultDesktopWallpaper),
          desktopIconPositions: state?.desktopIconPositions ?? initialIconPositions,
          pinnedAppIds: state?.pinnedAppIds ?? DEFAULT_PINNED_APPS,
        };
      },
      partialize: (state) => ({
        themeId: state.themeId,
        wallpaper: state.wallpaper,
        desktopIconPositions: state.desktopIconPositions,
        pinnedAppIds: state.pinnedAppIds,
      }),
    }
  )
);
