// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { themePresets } from "@/data/portfolio";
import {
  DEFAULT_PINNED_APPS,
  sanitizePinnedAppIds,
  sanitizeThemeId,
} from "@/stores/shell-store";

describe("shell store persistence sanitizers", () => {
  it("keeps only known pinned app ids and removes duplicates", () => {
    expect(sanitizePinnedAppIds(["about", "unknown-app", "browser", "about"])).toEqual([
      "about",
      "browser",
    ]);
  });

  it("falls back to default pinned apps when no known app ids remain", () => {
    expect(sanitizePinnedAppIds(["unknown-app", 42, null])).toEqual(DEFAULT_PINNED_APPS);
    expect(sanitizePinnedAppIds("about")).toEqual(DEFAULT_PINNED_APPS);
  });

  it("accepts only known theme ids", () => {
    expect(sanitizeThemeId(themePresets[1].id)).toBe(themePresets[1].id);
    expect(sanitizeThemeId("not-a-theme")).toBe(themePresets[0].id);
    expect(sanitizeThemeId(null)).toBe(themePresets[0].id);
  });
});
