import { describe, expect, it } from "vitest";
import { DEFAULT_TERMINAL_SCHEME_ID, getTerminalScheme, terminalSchemes } from "@/lib/terminal-schemes";

const COLOR_KEYS = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
] as const;

describe("terminal colour schemes", () => {
  it("gives every scheme a unique id and a full 16-colour palette", () => {
    expect(new Set(terminalSchemes.map((scheme) => scheme.id)).size).toBe(terminalSchemes.length);

    for (const { theme } of terminalSchemes) {
      for (const key of ["background", "foreground", ...COLOR_KEYS] as const) {
        expect(theme[key]).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it("falls back to Campbell for unknown ids", () => {
    expect(getTerminalScheme("nope").id).toBe(DEFAULT_TERMINAL_SCHEME_ID);
    expect(getTerminalScheme(undefined).name).toBe("Campbell");
    expect(getTerminalScheme("one-half-light").light).toBe(true);
  });
});
