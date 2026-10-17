import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { themePresets } from "@/data/portfolio";
import { defaultDesktopWallpaper } from "@/data/wallpapers";
import { getAppDefinition } from "@/lib/app-registry";
import { remapLegacyDesktopIconIds } from "@/data/desktop-seed";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import {
  areDesktopPositionsEqual,
  reconcileDesktopGridPositions,
  resolveDesktopGroupPlacement,
  sanitizeDesktopGridPositions,
} from "@/lib/desktop-grid";
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

/**
 * The pinned apps as saved. A stored empty list is a visitor who unpinned
 * everything and stays empty; anything that is not a usable list gets the defaults.
 */
function restorePinnedAppIds(value: unknown, fallback: AppId[]): AppId[] {
  if (value === undefined) {
    return fallback;
  }

  return Array.isArray(value) && value.length === 0 ? [] : sanitizePinnedAppIds(value);
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

const WALLPAPER_MODES = new Set<DesktopWallpaperState["mode"]>(["theme", "image", "gradient", "animated"]);

/** A saved wallpaper choice, or undefined when what was stored isn't one. */
export function sanitizeWallpaper(value: unknown): DesktopWallpaperState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const { mode, imageSource, presetId } = value as Partial<DesktopWallpaperState>;

  if (!mode || !WALLPAPER_MODES.has(mode)) {
    return undefined;
  }

  return {
    mode,
    imageSource: typeof imageSource === "string" ? imageSource : null,
    presetId: typeof presetId === "string" ? presetId : null,
  };
}

interface PersistedShellState {
  themeId?: string;
  wallpaper?: DesktopWallpaperState;
  customWallpaperSource?: string | null;
  desktopIconPositions?: Record<string, DesktopGridPosition>;
  pinnedAppIds?: AppId[];
}

/**
 * Bring saved shell state up to the current version. Version 6 keys desktop
 * icons by the file they show ("desktop-node:/Desktop/About.lnk") instead of
 * a fixed list, so older positions are re-keyed rather than lost.
 */
export function migrateShellState(persistedState: unknown, version: number) {
  const state = persistedState as PersistedShellState | undefined;
  const savedPositions = sanitizeDesktopGridPositions(state?.desktopIconPositions);

  return {
    themeId: migrateThemeId(state?.themeId, version),
    wallpaper:
      sanitizeWallpaper(state?.wallpaper) ??
      (state?.customWallpaperSource
        ? {
            mode: "image" as const,
            imageSource: state.customWallpaperSource,
            presetId: null,
          }
        : defaultDesktopWallpaper),
    desktopIconPositions: savedPositions
      ? version < 6
        ? remapLegacyDesktopIconIds(savedPositions)
        : savedPositions
      : initialIconPositions,
    pinnedAppIds: restorePinnedAppIds(state?.pinnedAppIds, DEFAULT_PINNED_APPS),
  };
}

/**
 * Put saved state on top of the current state when the store loads. Everything
 * that was saved comes back as it was, so a field added to `partialize` later
 * needs nothing here; the fields that must be valid to be used are checked on top.
 */
export function mergeShellState(persistedState: unknown, currentState: ShellStoreState): ShellStoreState {
  const saved = (persistedState && typeof persistedState === "object" ? persistedState : {}) as PersistedShellState;

  return {
    ...currentState,
    ...saved,
    themeId: saved.themeId === undefined ? currentState.themeId : sanitizeThemeId(saved.themeId),
    wallpaper: sanitizeWallpaper(saved.wallpaper) ?? currentState.wallpaper,
    desktopIconPositions: sanitizeDesktopGridPositions(saved.desktopIconPositions) ?? currentState.desktopIconPositions,
    pinnedAppIds: restorePinnedAppIds(saved.pinnedAppIds, currentState.pinnedAppIds),
  };
}

interface ShellStoreState {
  /** The icon with the focus ring, and the anchor for Shift+click. */
  selectedIconId: string | null;
  /** Every selected icon on the desktop. */
  selectedIconIds: string[];
  /** The icon being renamed in place, if any. */
  renamingIconId: string | null;
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
  /** Select several icons; the active one (focus ring, Shift anchor) defaults to the last. */
  setSelectedIconIds: (iconIds: string[], activeId?: string | null) => void;
  setRenamingIconId: (iconId: string | null) => void;
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
  /** Move icons together: `anchorId` lands on `position` and the others keep their offset from it. */
  moveDesktopIcons: (
    anchorId: string,
    iconIds: string[],
    position: DesktopGridPosition,
    metrics: { columns: number; rows: number }
  ) => void;
  /** Put icons on exact cells, such as files dropped onto the desktop. */
  placeDesktopIcons: (placements: Record<string, DesktopGridPosition>) => void;
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
  selectedIconIds: [] as string[],
  renamingIconId: null,
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
      setSelectedIconId: (selectedIconId) =>
        set({ selectedIconId, selectedIconIds: selectedIconId ? [selectedIconId] : [], renamingIconId: null }),
      setSelectedIconIds: (iconIds, activeId) => {
        const selectedIconIds = Array.from(new Set(iconIds));

        set({
          selectedIconIds,
          selectedIconId: activeId !== undefined ? activeId : (selectedIconIds.at(-1) ?? null),
          renamingIconId: null,
        });
      },
      setRenamingIconId: (renamingIconId) => set({ renamingIconId }),
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
      moveDesktopIcon: (iconId, position, metrics) => get().moveDesktopIcons(iconId, [iconId], position, metrics),
      moveDesktopIcons: (anchorId, iconIds, position, metrics) =>
        set((state) => ({
          desktopIconPositions: resolveDesktopGroupPlacement(
            state.desktopIconPositions,
            iconIds,
            anchorId,
            position,
            metrics
          ),
        })),
      placeDesktopIcons: (placements) =>
        set((state) => ({ desktopIconPositions: { ...state.desktopIconPositions, ...placements } })),
      reconcileDesktopIconPositions: (entries, metrics) =>
        set((state) => {
          const desktopIconPositions = reconcileDesktopGridPositions(entries, state.desktopIconPositions, metrics);
          return areDesktopPositionsEqual(desktopIconPositions, state.desktopIconPositions) ? state : { desktopIconPositions };
        }),
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
      version: 6,
      storage: createJSONStorage(getSafeLocalStorage),
      migrate: migrateShellState,
      // Whatever was saved is checked on every load, not only when the version changes.
      merge: mergeShellState,
      partialize: (state) => ({
        themeId: state.themeId,
        wallpaper: state.wallpaper,
        desktopIconPositions: state.desktopIconPositions,
        pinnedAppIds: state.pinnedAppIds,
      }),
    }
  )
);
