// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_IDS,
  getSettingsSection,
  sanitizeSettingsSection,
} from "@/lib/settings-sections";
import { launchPayloadsMatch } from "@/stores/system-runtime";

describe("settings sections", () => {
  it("opens on the System page by default", () => {
    expect(DEFAULT_SETTINGS_SECTION).toBe("system");
    expect(sanitizeSettingsSection(undefined)).toBe("system");
    expect(sanitizeSettingsSection("nope")).toBe("system");
    expect(sanitizeSettingsSection("display")).toBe("display");
  });

  it("describes every page once", () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([...SETTINGS_SECTION_IDS]);
    expect(getSettingsSection("power").title).toBe("Power & battery");
    expect(getSettingsSection("network").title).toBe("Network & internet");
  });

  it("treats a different page as a different launch", () => {
    expect(launchPayloadsMatch({ section: "sound" }, { section: "sound" })).toBe(true);
    expect(launchPayloadsMatch({ section: "sound" }, { section: "display" })).toBe(false);
  });
});
