import { describe, expect, it } from "vitest";
import { getAppDefinition } from "@/lib/app-registry";
import { isSettingsSectionId } from "@/lib/settings-sections";

describe("Settings jump list", () => {
  const items = getAppDefinition("settings").jumpList ?? [];

  it("links straight to the device pages", () => {
    const sections = items.map((item) => item.payload?.section);

    expect(sections).toEqual(expect.arrayContaining(["display", "sound", "network", "power"]));
  });

  it("only points at pages that exist", () => {
    for (const item of items) {
      expect(isSettingsSectionId(item.payload?.section)).toBe(true);
    }
  });

  it("keeps the appearance shortcut on the personalization page", () => {
    const appearance = items.find((item) => item.label === "Appearance & Wallpaper");

    expect(appearance?.payload).toEqual({ section: "personalization" });
  });

  it("describes what Settings now holds", () => {
    expect(getAppDefinition("settings").description).toMatch(/sound/i);
  });
});
