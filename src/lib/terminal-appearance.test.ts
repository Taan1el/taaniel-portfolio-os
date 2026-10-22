// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AA_CONTRAST_RATIO, buildAppearance, prefersReducedMotion } from "@/lib/terminal-appearance";
import { safeLinkTarget } from "@/lib/terminal-links";
import { DEFAULT_TERMINAL_SETTINGS } from "@/stores/terminal-settings-store";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("terminal appearance", () => {
  it("turns the settings into xterm options", () => {
    const look = buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, schemeId: "one-half-dark", fontSize: 18, cursorShape: "block" }, false);
    expect(look.theme.background).toBe("#282C34");
    expect(look.fontSize).toBe(18);
    expect(look.cursorShape).toBe("block");
    expect(look.cursorBlink).toBe(true);
    expect(look.minimumContrastRatio).toBe(1);
  });

  it("never blinks the cursor under reduced motion, whatever the setting says", () => {
    expect(buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, cursorBlink: true }, true).cursorBlink).toBe(false);
    expect(buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, cursorBlink: false }, false).cursorBlink).toBe(false);
  });

  it("asks xterm for AA contrast when the setting is on", () => {
    expect(buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, improveContrast: true }, false).minimumContrastRatio).toBe(AA_CONTRAST_RATIO);
  });

  it("picks search colours that suit light and dark schemes, in the form the addon needs", () => {
    const dark = buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, schemeId: "campbell" }, false);
    const light = buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, schemeId: "solarized-light" }, false);
    for (const colour of [dark.search.match, dark.search.active, light.search.match, light.search.active]) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(light.search.match).not.toBe(dark.search.match);
  });

  it("reads the reduced motion media query, and copes without matchMedia", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("links in terminal output", () => {
  it("follows web addresses only", () => {
    expect(safeLinkTarget("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeLinkTarget("http://localhost:3000")).toBe("http://localhost:3000/");
    expect(safeLinkTarget("javascript:alert(1)")).toBeNull();
    expect(safeLinkTarget("data:text/html,<script>1</script>")).toBeNull();
    expect(safeLinkTarget("file:///C:/Windows")).toBeNull();
    expect(safeLinkTarget("not a url")).toBeNull();
  });

  it("refuses addresses with credentials, and very long ones", () => {
    expect(safeLinkTarget("https://user:pass@example.com")).toBeNull();
    expect(safeLinkTarget(`https://example.com/${"a".repeat(3000)}`)).toBeNull();
  });
});
