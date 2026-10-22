import type { ITheme } from "@xterm/xterm";
import { getTerminalScheme } from "@/lib/terminal-schemes";
import type { TerminalCursorShape, TerminalSettings } from "@/stores/terminal-settings-store";

/** What xterm needs to look the way the settings say. */
export interface TerminalAppearance {
  theme: ITheme;
  fontSize: number;
  cursorShape: TerminalCursorShape;
  cursorBlink: boolean;
  screenReaderMode: boolean;
  minimumContrastRatio: number;
  /** Colours for search matches, in #RRGGBB as the search addon requires. */
  search: { match: string; active: string };
}

/** WCAG AA for normal text. */
export const AA_CONTRAST_RATIO = 4.5;

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function buildAppearance(
  settings: Pick<TerminalSettings, "schemeId" | "fontSize" | "cursorShape" | "cursorBlink" | "screenReaderMode" | "improveContrast">,
  reducedMotion: boolean
): TerminalAppearance {
  const scheme = getTerminalScheme(settings.schemeId);
  return {
    theme: scheme.theme,
    fontSize: settings.fontSize,
    cursorShape: settings.cursorShape,
    // A blinking cursor is motion: the system setting wins over this one.
    cursorBlink: settings.cursorBlink && !reducedMotion,
    screenReaderMode: settings.screenReaderMode,
    minimumContrastRatio: settings.improveContrast ? AA_CONTRAST_RATIO : 1,
    search: scheme.light ? { match: "#FFE6A3", active: "#FFB02E" } : { match: "#4B5563", active: "#2F6FB5" },
  };
}
