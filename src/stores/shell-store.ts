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
  ClipboardState,
  ContextMenuState,
  DesktopWallpaperState,
  DesktopEntry,
  DesktopGridPosition,
  ViewportMode,
} from "@/types/system";

interface ShellStoreState {
  selectedIconId: string | null;
  startMenuOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  clipboard: ClipboardState | null;
  themeId: string;
  wallpaper: DesktopWallpaperState;
  desktopIconPositions: Record<string, DesktopGridPosition>;
  viewportMode: ViewportMode;
  focusedWindowId: string | null;
  focusedProcessId: string | null;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
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
  syncRuntimeState: (runtime: {
    viewportMode: ViewportMode;
    focusedWindowId: string | null;
    focusedProcessId: string | null;
  }) => void;
  closeOverlays: () => void;
  resetShell: () => void;
}

const legacyShellSeed = getLegacyShellSeed();

const initialShellState = {
  selectedIconId: null,
  startMenuOpen: false,
  searchOpen: false,
  searchQuery: "",
  calendarOpen: false,
  contextMenu: null,
  clipboard: null,
  themeId: legacyShellSeed.themeId,
  wallpaper: legacyShellSeed.wallpaper ?? defaultDesktopWallpaper,
  desktopIconPositions: legacyShellSeed.desktopIconPositions,
  viewportMode: getViewportMode(),
  focusedWindowId: null,
  focusedProcessId: null,
};

export const useShellStore = create<ShellStoreState>()(
  persist(
    (set, get) => ({
      ...initialShellState,
      setStartMenuOpen: (open) =>
        set((state) => ({
          startMenuOpen: open,
          searchOpen: open ? false : state.searchOpen,
          calendarOpen: open ? false : state.calendarOpen,
        })),
      toggleStartMenu: () =>
        set((state) => ({
          startMenuOpen: !state.startMenuOpen,
          searchOpen: state.startMenuOpen ? state.searchOpen : false,
          calendarOpen: state.startMenuOpen ? state.calendarOpen : false,
          contextMenu: null,
        })),
      setSearchOpen: (open) =>
        set((state) => ({
          searchOpen: open,
          startMenuOpen: open ? false : state.startMenuOpen,
          calendarOpen: open ? false : state.calendarOpen,
          contextMenu: null,
        })),
      toggleSearch: () =>
        set((state) => ({
          searchOpen: !state.searchOpen,
          startMenuOpen: state.searchOpen ? state.startMenuOpen : false,
          calendarOpen: state.searchOpen ? state.calendarOpen : false,
          contextMenu: null,
        })),
      setSearchQuery: (searchQuery) =>
        set((state) => ({
          searchQuery,
          searchOpen: state.searchOpen || searchQuery.trim().length > 0,
          startMenuOpen: searchQuery.trim().length > 0 ? false : state.startMenuOpen,
          calendarOpen: searchQuery.trim().length > 0 ? false : state.calendarOpen,
          contextMenu: searchQuery.trim().length > 0 ? null : state.contextMenu,
        })),
      setCalendarOpen: (open) =>
        set((state) => ({
          calendarOpen: open,
          startMenuOpen: open ? false : state.startMenuOpen,
          searchOpen: open ? false : state.searchOpen,
        })),
      setSelectedIconId: (selectedIconId) => set({ selectedIconId }),
      setContextMenu: (contextMenu) => set({ contextMenu }),
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
          searchOpen: false,
          searchQuery: "",
          calendarOpen: false,
          contextMenu: null,
        }),
      resetShell: () =>
        set({
          ...initialShellState,
          themeId: themePresets[0].id,
          wallpaper: defaultDesktopWallpaper,
          desktopIconPositions: initialIconPositions,
          viewportMode: getViewportMode(),
        }),
    }),
    {
      name: SHELL_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as
          | {
              themeId?: string;
              wallpaper?: DesktopWallpaperState;
              customWallpaperSource?: string | null;
              desktopIconPositions?: Record<string, DesktopGridPosition>;
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
        };
      },
      partialize: (state) => ({
        themeId: state.themeId,
        wallpaper: state.wallpaper,
        desktopIconPositions: state.desktopIconPositions,
      }),
    }
  )
);
