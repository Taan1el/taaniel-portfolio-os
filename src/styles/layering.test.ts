// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the shell's stacking order without a browser: window z-indices climb
 * forever, so the window layer must sit in its own stacking context below the
 * taskbar and every flyout. Reads the shipped stylesheets and compares the
 * z-index each layer declares.
 */
const read = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const stylesheets = ["global.css", "visual-redesign.css", "win11.css", "win11-tray.css"].map(read);

/** The z-index declared by the last rule whose selector list includes `selector`. */
function zIndexOf(selector: string) {
  let found: number | null = null;

  for (const css of stylesheets) {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = match[1].split(",").map((entry) => entry.trim());
      const zIndex = /z-index:\s*(-?\d+)/.exec(match[2]);

      if (zIndex && selectors.includes(selector)) {
        found = Number(zIndex[1]);
      }
    }
  }

  return found;
}

describe("shell layering", () => {
  const windows = zIndexOf(".window-manager");
  const taskbar = zIndexOf(".taskbar.w11-taskbar");

  it("gives the window layer a stacking context of its own", () => {
    expect(windows).not.toBeNull();
  });

  it("keeps every window below the taskbar", () => {
    expect(windows!).toBeLessThan(taskbar!);
  });

  it.each([".w11-start", ".w11-flyout.w11-quick", ".w11-flyout.w11-clock"])(
    "keeps every window below %s",
    (selector) => {
      expect(zIndexOf(selector)).not.toBeNull();
      expect(windows!).toBeLessThan(zIndexOf(selector)!);
    }
  );

  it("keeps the snap ghost above the windows", () => {
    expect(zIndexOf(".window-snap-ghost")!).toBeGreaterThan(windows!);
  });

  it("keeps the thumbnails and jump lists above the taskbar", () => {
    expect(zIndexOf(".taskbar__preview.w11-thumb")!).toBeGreaterThan(taskbar!);
  });

  it("keeps the quick settings and clock flyouts level with Start", () => {
    expect(zIndexOf(".w11-flyout.w11-quick")).toBe(zIndexOf(".w11-start"));
    expect(zIndexOf(".w11-flyout.w11-clock")).toBe(zIndexOf(".w11-start"));
  });
});
