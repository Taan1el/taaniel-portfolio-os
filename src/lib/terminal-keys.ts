/*
 * Keyboard shortcuts for the terminal: Windows Terminal's defaults, minus the
 * ones a browser keeps for itself, plus the escape hatch out of the keyboard
 * trap. Pure functions over a key event, so the table is easy to test.
 *
 * Keys the page never receives (Ctrl+T, Ctrl+W, Ctrl+N, and usually
 * Ctrl+Shift+T/W/N and Ctrl+Tab) are handled if they do arrive, but nothing
 * here depends on them: every command also has a visible button and one of
 * Windows Terminal's other defaults (Ctrl+Shift+Space, Ctrl+Alt+1..9,
 * Ctrl+Shift+1..9, Ctrl+Shift+D, Ctrl+,).
 */

export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  isComposing?: boolean;
  getModifierState?: (modifier: string) => boolean;
}

export type ScrollTarget = "line-up" | "line-down" | "page-up" | "page-down" | "top" | "bottom";

export type TerminalCommand =
  | { type: "new-tab" }
  | { type: "new-tab-profile"; index: number }
  | { type: "new-tab-menu" }
  | { type: "close-tab" }
  | { type: "duplicate-tab" }
  | { type: "next-tab" }
  | { type: "previous-tab" }
  | { type: "goto-tab"; index: number }
  | { type: "find" }
  | { type: "settings" }
  | { type: "zoom"; delta: 1 | -1 | 0 }
  | { type: "copy" }
  /** Let the browser paste: it fires a paste event, which the terminal reads. */
  | { type: "native-paste" }
  | { type: "select-all" }
  | { type: "scroll"; target: ScrollTarget }
  /** The escape hatch: move focus between the tab strip and the terminal. */
  | { type: "move-focus"; direction: 1 | -1 };

export type KeyDecision =
  /** The terminal handles it: stop the browser and xterm from also acting on it. */
  | { kind: "command"; command: TerminalCommand }
  /** Not the terminal's: let xterm ignore it and the event reach the OS shell's own shortcuts. */
  | { kind: "bubble" }
  | null;

/**
 * Focus leaves the terminal with F6 (Shift+F6 goes back), as it moves between
 * panes in File Explorer and browsers. xterm sends Tab to the shell for
 * completion and Escape reverts the line, so neither can be the way out.
 *
 * Why F6: PSReadLine and readline bind neither it nor Shift+F6; Windows
 * Terminal binds neither; it needs no Ctrl or Alt, so AltGr keyboards (Estonian
 * among them) can never produce it as a character; and browsers pass it to the
 * page. Ctrl+M, VS Code's choice, is Enter to a terminal (carriage return).
 */
export const FOCUS_ESCAPE_KEY = "F6";

function isAltGraph(event: KeyLike) {
  return Boolean(event.getModifierState?.("AltGraph"));
}

/**
 * Shortcuts that belong to the desktop shell (see use-shell-shortcuts.ts):
 * the launcher, closing and cycling windows, the Start menu, full screen.
 * xterm would turn most of them into escape sequences for the shell and
 * cancel the event, so they are named here and left alone.
 */
export function isShellShortcut(event: KeyLike): boolean {
  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  const lower = event.key.toLowerCase();
  if (ctrlOrMeta && !event.altKey && !event.shiftKey && lower === "k") return true;
  if (event.altKey && !ctrlOrMeta && event.key === "F4") return true;
  if (event.key === "F11") return true;
  if (event.shiftKey && !ctrlOrMeta && !event.altKey && (event.key === "Escape" || event.key === "F10")) return true;
  // Alt+[ and Alt+] cycle windows; with Ctrl they are AltGr characters on many keyboards.
  if (event.altKey && !ctrlOrMeta && !event.shiftKey && (event.key === "[" || event.key === "]")) return true;
  return false;
}

/** What a keydown means to the terminal. Null means xterm should treat it as ordinary input. */
export function classifyTerminalKey(event: KeyLike, context: { hasSelection: boolean }): KeyDecision {
  if (event.isComposing) return null;

  if (isShellShortcut(event)) return { kind: "bubble" };

  const command = (value: TerminalCommand): KeyDecision => ({ kind: "command", command: value });
  const key = event.key;
  const lower = key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const { shiftKey: shift, altKey: alt } = event;

  if (key === FOCUS_ESCAPE_KEY && !ctrl && !alt) return command({ type: "move-focus", direction: shift ? -1 : 1 });

  // Copy and paste. Ctrl+C is the shell's interrupt unless something is selected.
  if (ctrl && !alt && lower === "c" && !shift && context.hasSelection) return command({ type: "copy" });
  if (ctrl && !alt && lower === "c" && shift) return command({ type: "copy" });
  if (ctrl && !alt && key === "Insert" && !shift) return command({ type: "copy" });
  if (ctrl && !alt && lower === "v") return command({ type: "native-paste" });
  if (!ctrl && !alt && shift && key === "Insert") return command({ type: "native-paste" });
  if (ctrl && shift && !alt && lower === "a") return command({ type: "select-all" });

  // AltGr arrives as Ctrl+Alt: never treat it as a shortcut, or braces and brackets would not type.
  if (ctrl && alt) {
    if (isAltGraph(event)) return null;
    if (/^[1-9]$/.test(key) && !shift) return command({ type: "goto-tab", index: Number(key) - 1 });
    return null;
  }

  if (ctrl && shift && !alt) {
    const digit = /^Digit([1-9])$/.exec(event.code);
    if (digit) return command({ type: "new-tab-profile", index: Number(digit[1]) - 1 });
    if (key === " " || event.code === "Space") return command({ type: "new-tab-menu" });
    if (lower === "t") return command({ type: "new-tab" });
    if (lower === "w") return command({ type: "close-tab" });
    if (lower === "d") return command({ type: "duplicate-tab" });
    if (lower === "f") return command({ type: "find" });
    if (key === "Tab") return command({ type: "previous-tab" });
    // On most keyboards Ctrl and the plus sign need Shift as well.
    if (key === "+") return command({ type: "zoom", delta: 1 });
    if (key === "_") return command({ type: "zoom", delta: -1 });
    if (key === "ArrowUp") return command({ type: "scroll", target: "line-up" });
    if (key === "ArrowDown") return command({ type: "scroll", target: "line-down" });
    if (key === "PageUp") return command({ type: "scroll", target: "page-up" });
    if (key === "PageDown") return command({ type: "scroll", target: "page-down" });
    if (key === "Home") return command({ type: "scroll", target: "top" });
    if (key === "End") return command({ type: "scroll", target: "bottom" });
    return null;
  }

  if (ctrl && !shift && !alt) {
    if (key === ",") return command({ type: "settings" });
    if (key === "Tab") return command({ type: "next-tab" });
    if (key === "=" || key === "+") return command({ type: "zoom", delta: 1 });
    if (key === "-" || key === "_") return command({ type: "zoom", delta: -1 });
    if (key === "0") return command({ type: "zoom", delta: 0 });
  }

  return null;
}

/** The shortcuts worth showing people, for the cheatsheet and the settings panel. Ctrl+Shift+W is left out on purpose: browsers use it to close the whole window. */
export const TERMINAL_SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["Ctrl", "Shift", "Space"], label: "New tab menu" },
  { keys: ["Ctrl", "Shift", "1–9"], label: "New tab with profile 1–9" },
  { keys: ["Ctrl", "Alt", "1–9"], label: "Switch to tab 1–9" },
  { keys: ["Ctrl", "Shift", "D"], label: "Duplicate tab" },
  { keys: ["Ctrl", "Shift", "F"], label: "Find in terminal" },
  { keys: ["Ctrl", ","], label: "Terminal settings" },
  { keys: ["Ctrl", "+ / −"], label: "Zoom text in or out (Ctrl+0 resets)" },
  { keys: ["Ctrl", "Shift", "C"], label: "Copy (Ctrl+C also copies a selection)" },
  { keys: ["Ctrl", "V"], label: "Paste" },
  { keys: ["F6"], label: "Move focus out of the terminal (Shift+F6 goes back)" },
];
