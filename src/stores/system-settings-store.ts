import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import { SETTINGS_STORAGE_KEY } from "@/stores/system-runtime";

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
