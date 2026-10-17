import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { themePresets } from "@/data/portfolio";
import { defaultDesktopWallpaper } from "@/data/wallpapers";
import { getAppDefinition } from "@/lib/app-registry";
import { getSafeLocalStorage } from "@/lib/safe-storage";
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

export function isKnownAppId(value: unknown): value is AppId {
  return typeof value === "string" && Boolean(getAppDefinition(value as AppId));
}

export function sanitizePinnedAppIds(value: unknown): AppId[] {
  if (!Array.isArray(value)) {
    return DEFAULT_PINNED_APPS;
  }

  const pinnedAppIds = Array.from(new Set(value.filter(isKnownAppId)));
  return pinnedAppIds.length > 0 ? pinnedAppIds : DEFAULT_PINNED_APPS;
}

export function sanitizeThemeId(value: unknown) {
  return typeof value === "string" && themePresets.some((theme) => theme.id === value)
    ? value
    : themePresets[0].id;
}

/** The light Bloom was the default before version 5; visitors still on it move to the dark default. */
export function migrateThemeId(value: unknown, version: number) {
  const themeId = sanitizeThemeId(value);
  return version < 5 && themeId === "windows-bloom" ? themePresets[0].id : themeId;
}

interface ShellStoreState {
  selectedIconId: string | null;
  startMenuOpen: boolean;
  pinnedAppIds: AppId[];
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  startMenuSearchFocusNonce: number;
  searchQuery: string;
  calendarOpen: boolean;
  quickSettingsOpen: boolean;
  contextMenu: ContextMenuState | null;
  openWithTarget: { filePath: string; node: VirtualNode } | null;
  clipboard: ClipboardState | null;
  themeId: string;
  wallpaper: DesktopWallpaperState;
  desktopIconPositions: Record<string, DesktopGridPosition>;
  viewportMode: ViewportMode;
  focusedWindowId: string | null;
  focusedProcessId: string | null;
  setStartMenuOpen: (open: boolean) => void;
  toggleStartMenu: () => void;
  requestStartMenuSearchFocus: () => void;
  setSearchQuery: (query: string) => void;
  setCalendarOpen: (open: boolean) => void;
  setQuickSettingsOpen: (open: boolean) => void;
  toggleQuickSettings: () => void;
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
}

type ShellFlyout = "startMenuOpen" | "calendarOpen" | "quickSettingsOpen";

/** Start, the calendar and Quick Settings share the taskbar edge: only one is open at a time. */
export function openOnlyFlyout(flyout: ShellFlyout): Record<ShellFlyout, boolean> {
  return { startMenuOpen: false, calendarOpen: false, quickSettingsOpen: false, [flyout]: true };
}

const legacyShellSeed = getLegacyShellSeed();

const initialShellState = {
  selectedIconId: null,
  startMenuOpen: false,
  pinnedAppIds: DEFAULT_PINNED_APPS,
  startMenuSearchFocusNonce: 0,
  searchQuery: "",
  calendarOpen: false,
  quickSettingsOpen: false,
  contextMenu: null,
  openWithTarget: null,
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
      setStartMenuOpen: (open) => set(open ? openOnlyFlyout("startMenuOpen") : { startMenuOpen: false }),
      // Opening Start closes the calendar and Quick Settings, as in Windows.
      toggleStartMenu: () =>
        set((state) => ({
          ...(state.startMenuOpen ? { startMenuOpen: false } : openOnlyFlyout("startMenuOpen")),
          contextMenu: null,
        })),
      requestStartMenuSearchFocus: () =>
        set((state) => ({
          startMenuSearchFocusNonce: state.startMenuSearchFocusNonce + 1,
        })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setCalendarOpen: (open) =>
        set(open ? { ...openOnlyFlyout("calendarOpen"), contextMenu: null } : { calendarOpen: false }),
      setQuickSettingsOpen: (open) =>
        set(open ? { ...openOnlyFlyout("quickSettingsOpen"), contextMenu: null } : { quickSettingsOpen: false }),
      toggleQuickSettings: () => get().setQuickSettingsOpen(!get().quickSettingsOpen),
      pinApp: (appId) =>
        set((state) =>
          !isKnownAppId(appId) || state.pinnedAppIds.includes(appId)
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
      setThemeId: (themeId) => set({ themeId: sanitizeThemeId(themeId) }),
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
          quickSettingsOpen: false,
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
    }),
    {
      name: SHELL_STORAGE_KEY,
      version: 5,
      storage: createJSONStorage(getSafeLocalStorage),
      migrate: (persistedState, version) => {
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
          themeId: migrateThemeId(state?.themeId, version),
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
          pinnedAppIds: sanitizePinnedAppIds(state?.pinnedAppIds),
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
