import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { themePresets } from "@/data/portfolio";
import { reconcileDesktopGridPositions, resolveDesktopGridPlacement } from "@/lib/desktop-grid";
import { SHELL_STORAGE_KEY, getLegacyShellSeed, initialIconPositions } from "@/stores/system-runtime";
import type {
  ClipboardState,
  ContextMenuState,
  DesktopEntry,
  DesktopGridPosition,
} from "@/types/system";

interface ShellStoreState {
  selectedIconId: string | null;
  startMenuOpen: boolean;
  searchOpen: boolean;
  calendarOpen: boolean;
  contextMenu: ContextMenuState | null;
  clipboard: ClipboardState | null;
  themeId: string;
  customWallpaperSource: string | null;
  desktopIconPositions: Record<string, DesktopGridPosition>;
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
  closeOverlays: () => void;
  resetShell: () => void;
}

const legacyShellSeed = getLegacyShellSeed();

const initialShellState = {
  selectedIconId: null,
  startMenuOpen: false,
  searchOpen: false,
  calendarOpen: false,
  contextMenu: null,
  clipboard: null,
  themeId: legacyShellSeed.themeId,
  customWallpaperSource: legacyShellSeed.customWallpaperSource,
  desktopIconPositions: legacyShellSeed.desktopIconPositions,
};

export const useShellStore = create<ShellStoreState>()(
  persist(
    (set) => ({
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
      closeOverlays: () =>
        set({
          startMenuOpen: false,
          searchOpen: false,
          calendarOpen: false,
          contextMenu: null,
        }),
      resetShell: () =>
        set({
          ...initialShellState,
          themeId: themePresets[0].id,
          customWallpaperSource: null,
          desktopIconPositions: initialIconPositions,
        }),
    }),
    {
      name: SHELL_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        themeId: state.themeId,
        customWallpaperSource: state.customWallpaperSource,
        desktopIconPositions: state.desktopIconPositions,
      }),
    }
  )
);
