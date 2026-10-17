// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getShellEngine } from "@/lib/terminal-engines";
import {
  classifyTerminalKey,
  FOCUS_ESCAPE_KEY,
  isShellShortcut,
  TERMINAL_SHORTCUTS,
  type KeyLike,
  type TerminalCommand,
} from "@/lib/terminal-keys";
import { createShellSession } from "@/lib/terminal-shell";

function key(spec: string, extra: Partial<KeyLike> = {}): KeyLike {
  const parts = spec.split("+");
  const name = parts.pop() as string;
  return {
    key: name,
    code: /^[1-9]$/.test(name) ? `Digit${name}` : name === " " ? "Space" : name,
    ctrlKey: parts.includes("Ctrl"),
    shiftKey: parts.includes("Shift"),
    altKey: parts.includes("Alt"),
    metaKey: parts.includes("Meta"),
    ...extra,
  };
}

const command = (event: KeyLike, hasSelection = false): TerminalCommand | "bubble" | null => {
  const decision = classifyTerminalKey(event, { hasSelection });
  if (!decision) return null;
  return decision.kind === "bubble" ? "bubble" : decision.command;
};

describe("terminal shortcuts (Windows Terminal defaults)", () => {
  it.each<[string, TerminalCommand]>([
    ["Ctrl+Shift+ ", { type: "new-tab-menu" }],
    ["Ctrl+Shift+T", { type: "new-tab" }],
    ["Ctrl+Shift+W", { type: "close-tab" }],
    ["Ctrl+Shift+D", { type: "duplicate-tab" }],
    ["Ctrl+Shift+F", { type: "find" }],
    ["Ctrl+,", { type: "settings" }],
    ["Ctrl+Tab", { type: "next-tab" }],
    ["Ctrl+Shift+Tab", { type: "previous-tab" }],
    ["Ctrl+Shift+A", { type: "select-all" }],
    ["Ctrl+Shift+C", { type: "copy" }],
    ["Ctrl+Insert", { type: "copy" }],
    ["Ctrl+V", { type: "native-paste" }],
    ["Ctrl+Shift+V", { type: "native-paste" }],
    ["Shift+Insert", { type: "native-paste" }],
    ["Ctrl+=", { type: "zoom", delta: 1 }],
    ["Ctrl+-", { type: "zoom", delta: -1 }],
    ["Ctrl+0", { type: "zoom", delta: 0 }],
    ["Ctrl+Shift+ArrowUp", { type: "scroll", target: "line-up" }],
    ["Ctrl+Shift+PageDown", { type: "scroll", target: "page-down" }],
    ["Ctrl+Shift+Home", { type: "scroll", target: "top" }],
    ["Ctrl+Shift+End", { type: "scroll", target: "bottom" }],
  ])("%s", (spec, expected) => {
    expect(command(key(spec))).toEqual(expected);
  });

  it("zooms in on Ctrl+Shift+plus, which is how most keyboards type Ctrl+plus", () => {
    // The spec helper splits on "+", so name the plus key explicitly.
    expect(command(key("Ctrl+Shift+x", { key: "+" }))).toEqual({ type: "zoom", delta: 1 });
    expect(command(key("Ctrl+Shift+x", { key: "_" }))).toEqual({ type: "zoom", delta: -1 });
  });

  it("switches to a numbered tab with Ctrl+Alt+digit and opens a numbered profile with Ctrl+Shift+digit", () => {
    expect(command(key("Ctrl+Alt+3"))).toEqual({ type: "goto-tab", index: 2 });
    expect(command(key("Ctrl+Shift+2", { key: "@" }))).toEqual({ type: "new-tab-profile", index: 1 });
    expect(command(key("Ctrl+Alt+0"))).toBeNull();
  });

  it("copies on Ctrl+C only while something is selected, so Ctrl+C stays the interrupt", () => {
    expect(command(key("Ctrl+C"), false)).toBeNull();
    expect(command(key("Ctrl+C"), true)).toEqual({ type: "copy" });
  });

  it("leaves AltGr alone, so { [ ] } still type on Estonian and German keyboards", () => {
    const altGr = { getModifierState: (modifier: string) => modifier === "AltGraph" };
    expect(command(key("Ctrl+Alt+7", altGr))).toBeNull();
    expect(command(key("Ctrl+Alt+{", altGr))).toBeNull();
    expect(command(key("Ctrl+Alt+[", altGr))).toBeNull();
  });

  it("ignores keys that are not shortcuts and keys pressed while composing text", () => {
    expect(command(key("a"))).toBeNull();
    expect(command(key("Tab"))).toBeNull();
    expect(command(key("Escape"))).toBeNull();
    expect(command(key("Ctrl+L"))).toBeNull();
    expect(command(key("Ctrl+W"))).toBeNull();
    expect(command(key("Ctrl+Shift+T", { isComposing: true }))).toBeNull();
  });

  it("never lists Ctrl+Shift+W, which browsers use to close the whole window", () => {
    const text = TERMINAL_SHORTCUTS.map((entry) => entry.keys.join("+")).join(" ");
    expect(text).not.toMatch(/Shift\+W/);
  });
});

describe("the way out of the keyboard trap", () => {
  it("moves focus with F6 and back with Shift+F6", () => {
    expect(FOCUS_ESCAPE_KEY).toBe("F6");
    expect(command(key("F6"))).toEqual({ type: "move-focus", direction: 1 });
    expect(command(key("Shift+F6"))).toEqual({ type: "move-focus", direction: -1 });
  });

  it("is not a key the shell uses for line editing or Windows Terminal binds", () => {
    expect(TERMINAL_SHORTCUTS.some((entry) => entry.keys.join("+") !== "F6" && entry.keys.includes("F6"))).toBe(false);
    // Ctrl or Alt would make it an AltGr character on some keyboards.
    expect(command(key("Ctrl+F6"))).toBeNull();
    expect(command(key("Alt+F6"))).toBeNull();
  });

  it("is listed with the other shortcuts", () => {
    expect(TERMINAL_SHORTCUTS.some((entry) => entry.keys.join("+") === "F6")).toBe(true);
  });
});

describe("desktop shortcuts bubble out of the terminal", () => {
  it.each(["Ctrl+k", "Meta+k", "Alt+[", "Alt+]", "Alt+F4", "F11", "Shift+Escape", "Shift+F10"])("%s", (spec) => {
    expect(command(key(spec))).toBe("bubble");
  });

  it("does not swallow keys the shell needs", () => {
    expect(isShellShortcut(key("Escape"))).toBe(false);
    expect(isShellShortcut(key("k"))).toBe(false);
    expect(isShellShortcut(key("Ctrl+Alt+["))).toBe(false);
    expect(isShellShortcut(key("Ctrl+Shift+K"))).toBe(false);
  });
});

describe("shell engines", () => {
  it("gives each profile its own prompt, banner and history", () => {
    const session = createShellSession("/Documents");
    const powershell = getShellEngine("pwsh");
    const prompt = getShellEngine("cmd");

    expect(powershell.prompt(session)).toBe("PS C:\\Users\\Taaniel\\Documents> ");
    expect(prompt.prompt(session)).toBe("C:\\Users\\Taaniel\\Documents>");
    expect(powershell.historyKey).not.toBe(prompt.historyKey);
    expect(powershell.banner().join("\n")).toContain("Taaniel OS");
    expect(prompt.banner().join("\n")).toContain("Taaniel OS");
    expect(`${powershell.banner().join("")}${prompt.banner().join("")}`).not.toMatch(/Windows|Microsoft/);
  });

  it("offers inline prediction in PowerShell only", () => {
    const history = ["ls /Media"];
    expect(getShellEngine("pwsh").predict("ls /", history)).toBe("Media");
    expect(getShellEngine("cmd").predict("ls /", history)).toBe("");
  });

  it("colours PowerShell input and leaves Command Prompt input plain", () => {
    expect(getShellEngine("pwsh").highlight("ls")).toContain("\x1b[");
    expect(getShellEngine("cmd").highlight("dir")).toBe("dir");
  });

  it("falls back to PowerShell for an unknown id", () => {
    expect(getShellEngine("nope" as never).id).toBe("pwsh");
  });
});
