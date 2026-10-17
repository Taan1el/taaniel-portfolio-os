// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { themePresets } from "@/data/portfolio";
import {
  DEFAULT_PINNED_APPS,
  migrateThemeId,
  sanitizePinnedAppIds,
  sanitizeThemeId,
  useShellStore,
} from "@/stores/shell-store";

function openFlyouts() {
  const { startMenuOpen, calendarOpen, quickSettingsOpen } = useShellStore.getState();
  return { startMenuOpen, calendarOpen, quickSettingsOpen };
}

describe("shell flyouts", () => {
  beforeEach(() => {
    useShellStore.getState().closeOverlays();
  });

  it("closes the calendar when Start opens", () => {
    const store = useShellStore.getState();
    store.setCalendarOpen(true);
    store.toggleStartMenu();
    expect(openFlyouts()).toEqual({ startMenuOpen: true, calendarOpen: false, quickSettingsOpen: false });
  });

  it("keeps Start, the calendar and Quick Settings exclusive", () => {
    const store = useShellStore.getState();
    store.setStartMenuOpen(true);
    store.toggleQuickSettings();
    expect(openFlyouts()).toEqual({ startMenuOpen: false, calendarOpen: false, quickSettingsOpen: true });

    store.setCalendarOpen(true);
    expect(openFlyouts()).toEqual({ startMenuOpen: false, calendarOpen: true, quickSettingsOpen: false });

    store.setQuickSettingsOpen(true);
    store.setStartMenuOpen(true);
    expect(openFlyouts()).toEqual({ startMenuOpen: true, calendarOpen: false, quickSettingsOpen: false });
  });

  it("toggles Quick Settings closed and leaves the others alone when closing", () => {
    const store = useShellStore.getState();
    store.toggleQuickSettings();
    store.toggleQuickSettings();
    expect(openFlyouts()).toEqual({ startMenuOpen: false, calendarOpen: false, quickSettingsOpen: false });

    store.setCalendarOpen(true);
    store.setQuickSettingsOpen(false);
    expect(useShellStore.getState().calendarOpen).toBe(true);
  });

  it("closes every flyout with the rest of the overlays", () => {
    useShellStore.getState().setQuickSettingsOpen(true);
    useShellStore.getState().closeOverlays();
    expect(openFlyouts()).toEqual({ startMenuOpen: false, calendarOpen: false, quickSettingsOpen: false });
  });
});

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

  it("defaults to the dark bloom wallpaper", () => {
    expect(themePresets[0].id).toBe("windows-bloom-dark");
  });

  it("moves visitors from the old light default to the dark bloom once", () => {
    expect(migrateThemeId("windows-bloom", 4)).toBe("windows-bloom-dark");
    // Choosing the light bloom again after the migration sticks.
    expect(migrateThemeId("windows-bloom", 5)).toBe("windows-bloom");
    expect(migrateThemeId("ember-grid", 4)).toBe("ember-grid");
    expect(migrateThemeId("not-a-theme", 4)).toBe("windows-bloom-dark");
  });
});
