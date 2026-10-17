// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { themePresets } from "@/data/portfolio";
import { RECYCLE_BIN_DESKTOP_ID, initialDesktopIconPositions } from "@/data/desktop-seed";
import { defaultDesktopWallpaper } from "@/data/wallpapers";
import {
  DEFAULT_PINNED_APPS,
  mergeShellState,
  migrateShellState,
  migrateThemeId,
  sanitizePinnedAppIds,
  sanitizeThemeId,
  sanitizeWallpaper,
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

describe("shell store merge on load", () => {
  const current = () => useShellStore.getState();
  const merge = (saved: unknown) => mergeShellState(saved, current());

  it("brings back every saved field, including ones added to the store later", () => {
    const merged = merge({ themeId: themePresets[1].id, quickSettingsVolume: 40 }) as unknown as Record<string, unknown>;

    expect(merged.themeId).toBe(themePresets[1].id);
    expect(merged.quickSettingsVolume).toBe(40);
    // Everything not saved keeps its current value.
    expect(merged.pinnedAppIds).toEqual(current().pinnedAppIds);
    expect(typeof merged.setThemeId).toBe("function");
  });

  it("keeps an emptied pinned list instead of resetting it to the defaults", () => {
    expect(merge({ pinnedAppIds: [] }).pinnedAppIds).toEqual([]);
    expect(merge({ pinnedAppIds: ["files", "nope"] }).pinnedAppIds).toEqual(["files"]);
    // A list that holds nothing usable, or no list at all, is not a choice the visitor made.
    expect(merge({ pinnedAppIds: ["nope"] }).pinnedAppIds).toEqual(DEFAULT_PINNED_APPS);
    expect(merge({ pinnedAppIds: "files" }).pinnedAppIds).toEqual(DEFAULT_PINNED_APPS);
    expect(merge({}).pinnedAppIds).toEqual(current().pinnedAppIds);
  });

  it("checks the theme, wallpaper and icon positions that were saved", () => {
    const merged = merge({ themeId: "not-a-theme", wallpaper: { mode: "video" }, desktopIconPositions: "nope" });

    expect(merged.themeId).toBe(themePresets[0].id);
    expect(merged.wallpaper).toEqual(current().wallpaper);
    expect(merged.desktopIconPositions).toEqual(current().desktopIconPositions);
  });

  it("ignores saved state that is not an object", () => {
    expect(merge(undefined).themeId).toBe(current().themeId);
    expect(merge("oops").pinnedAppIds).toEqual(current().pinnedAppIds);
  });

  it("is the merge the persisted store uses", () => {
    expect(useShellStore.persist.getOptions().merge).toBe(mergeShellState);
  });

  it("does not turn an emptied pinned list back into the defaults when the version changes", () => {
    expect(migrateShellState({ pinnedAppIds: [] }, 5).pinnedAppIds).toEqual([]);
    expect(migrateShellState({}, 5).pinnedAppIds).toEqual(DEFAULT_PINNED_APPS);
  });
});

describe("shell store migration to version 6", () => {
  const about = "desktop-node:/Desktop/About.lnk";

  it("re-keys the old fixed desktop ids to the files they became", () => {
    const migrated = migrateShellState(
      {
        desktopIconPositions: {
          "about-app": { gridX: 4, gridY: 3 },
          "resume-file": { gridX: 5, gridY: 0 },
          trash: { gridX: 6, gridY: 1 },
        },
      },
      5
    );

    expect(migrated.desktopIconPositions).toEqual({
      [about]: { gridX: 4, gridY: 3 },
      "desktop-node:/Desktop/Resume.pdf.lnk": { gridX: 5, gridY: 0 },
      [RECYCLE_BIN_DESKTOP_ID]: { gridX: 6, gridY: 1 },
    });
  });

  it("keeps positions of files the visitor added, and a current position over a legacy one", () => {
    const migrated = migrateShellState(
      {
        desktopIconPositions: {
          "desktop-node:/Desktop/notes.txt": { gridX: 7, gridY: 7 },
          "about-app": { gridX: 1, gridY: 1 },
          [about]: { gridX: 2, gridY: 2 },
        },
      },
      5
    );

    expect(migrated.desktopIconPositions["desktop-node:/Desktop/notes.txt"]).toEqual({ gridX: 7, gridY: 7 });
    expect(migrated.desktopIconPositions[about]).toEqual({ gridX: 2, gridY: 2 });
    expect(migrated.desktopIconPositions).not.toHaveProperty("about-app");
  });

  it("leaves version 6 positions as they are", () => {
    const positions = { [about]: { gridX: 3, gridY: 3 } };

    expect(migrateShellState({ desktopIconPositions: positions }, 6).desktopIconPositions).toEqual(positions);
  });

  it("falls back to the default layout when the saved positions are unusable", () => {
    expect(migrateShellState({ desktopIconPositions: "nope" }, 5).desktopIconPositions).toEqual(initialDesktopIconPositions);
    expect(migrateShellState(undefined, 5).desktopIconPositions).toEqual(initialDesktopIconPositions);
  });

  it("still moves visitors from the old light bloom to the dark one", () => {
    expect(migrateShellState({ themeId: "windows-bloom" }, 4).themeId).toBe("windows-bloom-dark");
    expect(migrateShellState({ themeId: "windows-bloom" }, 5).themeId).toBe("windows-bloom");
  });

  it("keeps a saved wallpaper, turns an old custom wallpaper into one, and otherwise uses the default", () => {
    const saved = { mode: "gradient" as const, imageSource: null, presetId: "sunset" };

    expect(migrateShellState({ wallpaper: saved }, 5).wallpaper).toEqual(saved);
    expect(migrateShellState({ customWallpaperSource: "data:image/png;base64,AAAA" }, 5).wallpaper).toEqual({
      mode: "image",
      imageSource: "data:image/png;base64,AAAA",
      presetId: null,
    });
    expect(migrateShellState({}, 5).wallpaper).toEqual(defaultDesktopWallpaper);
  });

  it("ignores a wallpaper that is not one", () => {
    expect(sanitizeWallpaper({ mode: "video" })).toBeUndefined();
    expect(sanitizeWallpaper("sunset")).toBeUndefined();
    expect(sanitizeWallpaper({ mode: "theme", imageSource: 5, presetId: "x" })).toEqual({
      mode: "theme",
      imageSource: null,
      presetId: "x",
    });
  });
});
