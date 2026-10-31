import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAppDefinition } from "@/lib/app-registry";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import { SETTINGS_STORAGE_KEY } from "@/stores/system-runtime";
import type { AppId } from "@/types/system";

export const TASKBAR_ALIGNMENTS = ["center", "left"] as const;
export const ACCENT_IDS = ["default", "sky", "mint", "lime", "amber", "coral", "rose", "violet"] as const;
export const DESKTOP_ICON_SIZES = ["small", "medium", "large"] as const;
export const WALLPAPER_FITS = ["fill", "fit", "stretch", "center", "tile"] as const;
export const CLOCK_HOUR_CYCLES = ["auto", "12", "24"] as const;
export const DATE_FORMATS = ["auto", "dmy", "mdy", "ymd"] as const;

export type TaskbarAlignment = (typeof TASKBAR_ALIGNMENTS)[number];
export type AccentId = (typeof ACCENT_IDS)[number];
export type DesktopIconSize = (typeof DESKTOP_ICON_SIZES)[number];
export type WallpaperFit = (typeof WALLPAPER_FITS)[number];
export type ClockHourCycle = (typeof CLOCK_HOUR_CYCLES)[number];
export type DateFormatId = (typeof DATE_FORMATS)[number];
/** 0 is Sunday, like Date#getDay; "auto" follows the device's region. */
export type FirstDayOfWeek = "auto" | 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** File extension (".txt") to the app that opens it. */
export type DefaultApps = Record<string, AppId>;

/**
 * Device preferences a visitor sets from Quick Settings or the Settings app.
 *
 * Kept apart from the shell store so new preferences (the accessibility pass
 * adds more) never touch the shell's persist version. Every field has its own
 * exported sanitizer, and the persisted blob is rebuilt field by field, so a
 * malformed or older save can only ever fall back to defaults.
 */
export interface SystemSettings {
  /** Master volume, 0-100, like the Windows speaker slider. */
  volume: number;
  muted: boolean;
  /** Screen brightness, 0-100. Applied as a capped dimming layer. */
  brightness: number;
  nightLight: boolean;
  /** Night light warmth, 0-100. */
  nightLightStrength: number;
  batterySaver: boolean;
  /** Settings > Accessibility > Visual effects > Animation effects, inverted. */
  reduceMotion: boolean;
  /** Size of everything inside app windows, in percent. */
  textSize: number;
  /** Solid surfaces and stronger text and borders. */
  moreContrast: boolean;
  taskbarAlignment: TaskbarAlignment;
  /** A named colour, never a CSS value: the stylesheet owns what each name looks like. */
  accent: AccentId;
  /** Frosted glass behind the taskbar, Start, flyouts and windows. */
  transparency: boolean;
  desktopIconSize: DesktopIconSize;
  showDesktopIcons: boolean;
  wallpaperFit: WallpaperFit;
  clockHourCycle: ClockHourCycle;
  clockSeconds: boolean;
  firstDayOfWeek: FirstDayOfWeek;
  dateFormat: DateFormatId;
  /** Toasts are held back (they still land in the notification history). */
  doNotDisturb: boolean;
  defaultApps: DefaultApps;
}

export const SYSTEM_SETTINGS_VERSION = 1;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  // Full volume keeps media exactly as loud as before the master slider existed.
  volume: 100,
  muted: false,
  brightness: 100,
  nightLight: false,
  nightLightStrength: 50,
  batterySaver: false,
  reduceMotion: false,
  textSize: 100,
  moreContrast: false,
  taskbarAlignment: "center",
  accent: "default",
  transparency: true,
  desktopIconSize: "medium",
  showDesktopIcons: true,
  wallpaperFit: "fill",
  clockHourCycle: "auto",
  clockSeconds: false,
  firstDayOfWeek: "auto",
  dateFormat: "auto",
  doNotDisturb: false,
  defaultApps: {},
};

export const TEXT_SIZES = [100, 115, 130, 150];

/** Windows steps the volume by 2 for each wheel notch over the speaker icon. */
export const VOLUME_WHEEL_STEP = 2;

export function sanitizePercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

export function sanitizeFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export const sanitizeVolume = (value: unknown) => sanitizePercent(value, DEFAULT_SYSTEM_SETTINGS.volume);
export const sanitizeMuted = (value: unknown) => sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.muted);
export const sanitizeBrightness = (value: unknown) =>
  sanitizePercent(value, DEFAULT_SYSTEM_SETTINGS.brightness);
export const sanitizeNightLight = (value: unknown) =>
  sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.nightLight);
export const sanitizeNightLightStrength = (value: unknown) =>
  sanitizePercent(value, DEFAULT_SYSTEM_SETTINGS.nightLightStrength);
export const sanitizeBatterySaver = (value: unknown) =>
  sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.batterySaver);
export const sanitizeReduceMotion = (value: unknown) =>
  sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.reduceMotion);

export const sanitizeTextSize = (value: unknown) =>
  TEXT_SIZES.includes(value as number) ? (value as number) : DEFAULT_SYSTEM_SETTINGS.textSize;
export const sanitizeMoreContrast = (value: unknown) => sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.moreContrast);

export function sanitizeChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export const sanitizeTaskbarAlignment = (value: unknown) =>
  sanitizeChoice(value, TASKBAR_ALIGNMENTS, DEFAULT_SYSTEM_SETTINGS.taskbarAlignment);
export const sanitizeAccent = (value: unknown) => sanitizeChoice(value, ACCENT_IDS, DEFAULT_SYSTEM_SETTINGS.accent);
export const sanitizeDesktopIconSize = (value: unknown) =>
  sanitizeChoice(value, DESKTOP_ICON_SIZES, DEFAULT_SYSTEM_SETTINGS.desktopIconSize);
export const sanitizeWallpaperFit = (value: unknown) =>
  sanitizeChoice(value, WALLPAPER_FITS, DEFAULT_SYSTEM_SETTINGS.wallpaperFit);
export const sanitizeClockHourCycle = (value: unknown) =>
  sanitizeChoice(value, CLOCK_HOUR_CYCLES, DEFAULT_SYSTEM_SETTINGS.clockHourCycle);
export const sanitizeDateFormat = (value: unknown) =>
  sanitizeChoice(value, DATE_FORMATS, DEFAULT_SYSTEM_SETTINGS.dateFormat);
export const sanitizeTransparency = (value: unknown) => sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.transparency);
export const sanitizeShowDesktopIcons = (value: unknown) =>
  sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.showDesktopIcons);
export const sanitizeClockSeconds = (value: unknown) => sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.clockSeconds);
export const sanitizeDoNotDisturb = (value: unknown) => sanitizeFlag(value, DEFAULT_SYSTEM_SETTINGS.doNotDisturb);

export function sanitizeFirstDayOfWeek(value: unknown): FirstDayOfWeek {
  return value === "auto" || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6)
    ? (value as FirstDayOfWeek)
    : DEFAULT_SYSTEM_SETTINGS.firstDayOfWeek;
}

const MAX_DEFAULT_APPS = 64;
const EXTENSION_PATTERN = /^\.[a-z0-9]{1,12}$/;

/** Only a real extension mapped to an app that exists survives; anything else is dropped. */
export function sanitizeDefaultApps(value: unknown): DefaultApps {
  const apps: DefaultApps = {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return apps;
  }

  for (const [extension, appId] of Object.entries(value as Record<string, unknown>).slice(0, MAX_DEFAULT_APPS)) {
    if (EXTENSION_PATTERN.test(extension) && typeof appId === "string" && getAppDefinition(appId as AppId)?.id === appId) {
      apps[extension] = appId as AppId;
    }
  }

  return apps;
}

const fieldSanitizers: { [Key in keyof SystemSettings]: (value: unknown) => SystemSettings[Key] } = {
  volume: sanitizeVolume,
  muted: sanitizeMuted,
  brightness: sanitizeBrightness,
  nightLight: sanitizeNightLight,
  nightLightStrength: sanitizeNightLightStrength,
  batterySaver: sanitizeBatterySaver,
  reduceMotion: sanitizeReduceMotion,
  textSize: sanitizeTextSize,
  moreContrast: sanitizeMoreContrast,
  taskbarAlignment: sanitizeTaskbarAlignment,
  accent: sanitizeAccent,
  transparency: sanitizeTransparency,
  desktopIconSize: sanitizeDesktopIconSize,
  showDesktopIcons: sanitizeShowDesktopIcons,
  wallpaperFit: sanitizeWallpaperFit,
  clockHourCycle: sanitizeClockHourCycle,
  clockSeconds: sanitizeClockSeconds,
  firstDayOfWeek: sanitizeFirstDayOfWeek,
  dateFormat: sanitizeDateFormat,
  doNotDisturb: sanitizeDoNotDisturb,
  defaultApps: sanitizeDefaultApps,
};

export function sanitizeSystemSettings(value: unknown): SystemSettings {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const settings = { ...DEFAULT_SYSTEM_SETTINGS };

  for (const key of Object.keys(fieldSanitizers) as Array<keyof SystemSettings>) {
    (settings as Record<keyof SystemSettings, unknown>)[key] = fieldSanitizers[key](record[key]);
  }

  return settings;
}

export function pickSystemSettings(state: SystemSettings): SystemSettings {
  return sanitizeSystemSettings(state);
}

interface SystemSettingsActions {
  setVolume: (volume: number) => void;
  changeVolume: (delta: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setBrightness: (brightness: number) => void;
  setNightLight: (enabled: boolean) => void;
  toggleNightLight: () => void;
  setNightLightStrength: (strength: number) => void;
  setBatterySaver: (enabled: boolean) => void;
  toggleBatterySaver: () => void;
  setReduceMotion: (enabled: boolean) => void;
  setTextSize: (size: number) => void;
  setMoreContrast: (enabled: boolean) => void;
  setTaskbarAlignment: (alignment: TaskbarAlignment) => void;
  setAccent: (accent: AccentId) => void;
  setTransparency: (enabled: boolean) => void;
  setDesktopIconSize: (size: DesktopIconSize) => void;
  setShowDesktopIcons: (show: boolean) => void;
  setWallpaperFit: (fit: WallpaperFit) => void;
  setClockHourCycle: (cycle: ClockHourCycle) => void;
  setClockSeconds: (show: boolean) => void;
  setFirstDayOfWeek: (day: FirstDayOfWeek) => void;
  setDateFormat: (format: DateFormatId) => void;
  setDoNotDisturb: (enabled: boolean) => void;
  /** Pass null to go back to the built-in app for that file type. */
  setDefaultApp: (extension: string, appId: AppId | null) => void;
  /** Apply the fields present in a parsed export; each is checked on the way in. */
  applySettings: (values: Record<string, unknown>) => void;
  resetSettings: () => void;
}

export type SystemSettingsState = SystemSettings & SystemSettingsActions;

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SYSTEM_SETTINGS,
      // Moving the slider unmutes, as it does in Windows.
      setVolume: (volume) =>
        set((state) => {
          const next = sanitizePercent(volume, state.volume);
          return { volume: next, muted: next === 0 ? state.muted : false };
        }),
      changeVolume: (delta) =>
        set((state) => {
          const next = sanitizePercent(state.volume + delta, state.volume);
          return { volume: next, muted: next === 0 ? state.muted : false };
        }),
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      setBrightness: (brightness) =>
        set((state) => ({ brightness: sanitizePercent(brightness, state.brightness) })),
      setNightLight: (nightLight) => set({ nightLight }),
      toggleNightLight: () => set((state) => ({ nightLight: !state.nightLight })),
      setNightLightStrength: (strength) =>
        set((state) => ({ nightLightStrength: sanitizePercent(strength, state.nightLightStrength) })),
      setBatterySaver: (batterySaver) => set({ batterySaver }),
      toggleBatterySaver: () => set((state) => ({ batterySaver: !state.batterySaver })),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setTextSize: (size) => set({ textSize: sanitizeTextSize(size) }),
      setMoreContrast: (moreContrast) => set({ moreContrast }),
      setTaskbarAlignment: (value) => set({ taskbarAlignment: sanitizeTaskbarAlignment(value) }),
      setAccent: (value) => set({ accent: sanitizeAccent(value) }),
      setTransparency: (value) => set({ transparency: sanitizeTransparency(value) }),
      setDesktopIconSize: (value) => set({ desktopIconSize: sanitizeDesktopIconSize(value) }),
      setShowDesktopIcons: (value) => set({ showDesktopIcons: sanitizeShowDesktopIcons(value) }),
      setWallpaperFit: (value) => set({ wallpaperFit: sanitizeWallpaperFit(value) }),
      setClockHourCycle: (value) => set({ clockHourCycle: sanitizeClockHourCycle(value) }),
      setClockSeconds: (value) => set({ clockSeconds: sanitizeClockSeconds(value) }),
      setFirstDayOfWeek: (value) => set({ firstDayOfWeek: sanitizeFirstDayOfWeek(value) }),
      setDateFormat: (value) => set({ dateFormat: sanitizeDateFormat(value) }),
      setDoNotDisturb: (value) => set({ doNotDisturb: sanitizeDoNotDisturb(value) }),
      setDefaultApp: (extension, appId) =>
        set((state) => {
          const rest = Object.fromEntries(Object.entries(state.defaultApps).filter(([key]) => key !== extension));
          return { defaultApps: sanitizeDefaultApps(appId ? { ...rest, [extension]: appId } : rest) };
        }),
      applySettings: (values) =>
        set((state) => {
          const next: Record<string, unknown> = {};
          for (const key of Object.keys(fieldSanitizers) as Array<keyof SystemSettings>) {
            if (Object.hasOwn(values, key)) next[key] = fieldSanitizers[key](values[key]);
          }
          return { ...state, ...next };
        }),
      resetSettings: () => set({ ...DEFAULT_SYSTEM_SETTINGS }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SYSTEM_SETTINGS_VERSION,
      storage: createJSONStorage(getSafeLocalStorage),
      migrate: (persistedState) => sanitizeSystemSettings(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizeSystemSettings(persistedState),
      }),
      partialize: (state) => pickSystemSettings(state),
    }
  )
);

/** Non-React read, for code that runs outside components. */
export function getSystemSettings(): SystemSettings {
  return pickSystemSettings(useSystemSettingsStore.getState());
}
