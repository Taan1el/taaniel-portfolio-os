import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import { DEFAULT_TERMINAL_SCHEME_ID, terminalSchemes } from "@/lib/terminal-schemes";
import { DEFAULT_PROFILE_ID, isShellProfileId, type ShellProfileId } from "@/lib/terminal-profiles";

export const TERMINAL_SETTINGS_STORAGE_KEY = "taaniel-os-terminal-settings";

export type TerminalCursorShape = "bar" | "block" | "underline";

/** The Windows Terminal settings this terminal honours, with its defaults. */
export interface TerminalSettings {
  schemeId: string;
  fontSize: number;
  cursorShape: TerminalCursorShape;
  /** Off under prefers-reduced-motion whatever this says. */
  cursorBlink: boolean;
  /** Mirrors output into an accessibility tree that screen readers announce. */
  screenReaderMode: boolean;
  defaultProfile: ShellProfileId;
  copyOnSelect: boolean;
  multiLinePasteWarning: boolean;
}

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 32;

export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  schemeId: DEFAULT_TERMINAL_SCHEME_ID,
  fontSize: 14,
  cursorShape: "bar",
  cursorBlink: true,
  screenReaderMode: false,
  defaultProfile: DEFAULT_PROFILE_ID,
  copyOnSelect: false,
  multiLinePasteWarning: true,
};

const CURSOR_SHAPES = new Set<TerminalCursorShape>(["bar", "block", "underline"]);

export function clampFontSize(value: unknown) {
  const size = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : DEFAULT_TERMINAL_SETTINGS.fontSize;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
}

/**
 * Saved settings are untrusted on read (devtools, older versions, other tabs):
 * every field is checked on its own, so one bad value falls back to its
 * default without throwing away the rest.
 */
export function sanitizeTerminalSettings(raw: unknown): TerminalSettings {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T,>(value: unknown, valid: boolean, fallback: T): T => (valid ? (value as T) : fallback);
  const defaults = DEFAULT_TERMINAL_SETTINGS;

  return {
    schemeId: pick(data.schemeId, terminalSchemes.some((scheme) => scheme.id === data.schemeId), defaults.schemeId),
    fontSize: data.fontSize === undefined ? defaults.fontSize : clampFontSize(data.fontSize),
    cursorShape: pick(data.cursorShape, CURSOR_SHAPES.has(data.cursorShape as TerminalCursorShape), defaults.cursorShape),
    cursorBlink: pick(data.cursorBlink, typeof data.cursorBlink === "boolean", defaults.cursorBlink),
    screenReaderMode: pick(data.screenReaderMode, typeof data.screenReaderMode === "boolean", defaults.screenReaderMode),
    defaultProfile: pick(data.defaultProfile, isShellProfileId(data.defaultProfile), defaults.defaultProfile),
    copyOnSelect: pick(data.copyOnSelect, typeof data.copyOnSelect === "boolean", defaults.copyOnSelect),
    multiLinePasteWarning: pick(
      data.multiLinePasteWarning,
      typeof data.multiLinePasteWarning === "boolean",
      defaults.multiLinePasteWarning
    ),
  };
}

interface TerminalSettingsState extends TerminalSettings {
  update: (partial: Partial<TerminalSettings>) => void;
  changeFontSize: (delta: number) => void;
  reset: () => void;
}

const settingsOf = (state: TerminalSettings): TerminalSettings => ({
  schemeId: state.schemeId,
  fontSize: state.fontSize,
  cursorShape: state.cursorShape,
  cursorBlink: state.cursorBlink,
  screenReaderMode: state.screenReaderMode,
  defaultProfile: state.defaultProfile,
  copyOnSelect: state.copyOnSelect,
  multiLinePasteWarning: state.multiLinePasteWarning,
});

export const useTerminalSettingsStore = create<TerminalSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_TERMINAL_SETTINGS,
      update: (partial) => set(sanitizeTerminalSettings({ ...settingsOf(get()), ...partial })),
      changeFontSize: (delta) => set({ fontSize: clampFontSize(get().fontSize + delta) }),
      reset: () => set({ ...DEFAULT_TERMINAL_SETTINGS }),
    }),
    {
      name: TERMINAL_SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(getSafeLocalStorage),
      partialize: (state) => settingsOf(state),
      migrate: (persisted) => sanitizeTerminalSettings(persisted),
      merge: (persisted, current) => ({ ...current, ...sanitizeTerminalSettings(persisted) }),
    }
  )
);
