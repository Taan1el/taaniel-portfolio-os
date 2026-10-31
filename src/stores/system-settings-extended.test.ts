// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY } from "@/stores/system-runtime";
import {
  DEFAULT_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_VERSION,
  getSystemSettings,
  sanitizeAccent,
  sanitizeDateFormat,
  sanitizeDefaultApps,
  sanitizeDesktopIconSize,
  sanitizeFirstDayOfWeek,
  sanitizeSystemSettings,
  sanitizeTaskbarAlignment,
  sanitizeWallpaperFit,
  useSystemSettingsStore,
} from "@/stores/system-settings-store";
import { resolveOpenApp } from "@/lib/file-registry";
import { buildSettingsExport, parseSettingsImport } from "@/lib/settings-transfer";
import type { VirtualFile } from "@/types/system";

beforeEach(() => {
  localStorage.clear();
  useSystemSettingsStore.getState().resetSettings();
});

describe("choice sanitizers", () => {
  it("only lets a listed name through", () => {
    expect(sanitizeAccent("violet")).toBe("violet");
    expect(sanitizeAccent("red; background:url(//evil)")).toBe("default");
    expect(sanitizeAccent({ toString: () => "rose" })).toBe("default");
    expect(sanitizeTaskbarAlignment("right")).toBe("center");
    expect(sanitizeTaskbarAlignment("left")).toBe("left");
    expect(sanitizeDesktopIconSize("huge")).toBe("medium");
    expect(sanitizeWallpaperFit("tile")).toBe("tile");
    expect(sanitizeWallpaperFit(null)).toBe("fill");
    expect(sanitizeDateFormat("ymd")).toBe("ymd");
    expect(sanitizeDateFormat("DMY")).toBe("auto");
  });

  it("keeps the first day of the week to auto or 0-6", () => {
    expect(sanitizeFirstDayOfWeek("auto")).toBe("auto");
    expect(sanitizeFirstDayOfWeek(0)).toBe(0);
    expect(sanitizeFirstDayOfWeek(6)).toBe(6);
    expect(sanitizeFirstDayOfWeek(7)).toBe("auto");
    expect(sanitizeFirstDayOfWeek(1.5)).toBe("auto");
    expect(sanitizeFirstDayOfWeek("1")).toBe("auto");
  });

  it("keeps only real extensions mapped to real apps", () => {
    expect(
      sanitizeDefaultApps({
        ".txt": "editor",
        ".md": "no-such-app",
        "txt": "editor",
        ".a/b": "editor",
        ".png": "constructor",
        __proto__: "editor",
      })
    ).toEqual({ ".txt": "editor" });
    expect(sanitizeDefaultApps(["editor"])).toEqual({});
    expect(sanitizeDefaultApps("editor")).toEqual({});
    expect(sanitizeDefaultApps(null)).toEqual({});
  });
});

describe("older saves", () => {
  it("fills the new fields with defaults and keeps the old values", async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { volume: 33, textSize: 130, moreContrast: true }, version: SYSTEM_SETTINGS_VERSION })
    );
    await useSystemSettingsStore.persist.rehydrate();
    expect(getSystemSettings()).toEqual({ ...DEFAULT_SYSTEM_SETTINGS, volume: 33, textSize: 130, moreContrast: true });
  });

  it("repairs bad values in the new fields", async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { accent: "<script>", clockSeconds: "yes", defaultApps: { ".txt": "x" }, doNotDisturb: true },
        version: SYSTEM_SETTINGS_VERSION,
      })
    );
    await useSystemSettingsStore.persist.rehydrate();
    expect(getSystemSettings()).toEqual({ ...DEFAULT_SYSTEM_SETTINGS, doNotDisturb: true });
  });
});

describe("actions", () => {
  it("sets and persists the new fields", () => {
    const store = useSystemSettingsStore.getState();
    store.setTaskbarAlignment("left");
    store.setAccent("mint");
    store.setTransparency(false);
    store.setClockHourCycle("24");
    store.setFirstDayOfWeek(0);
    store.setDoNotDisturb(true);
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}").state;
    expect(saved).toMatchObject({
      taskbarAlignment: "left",
      accent: "mint",
      transparency: false,
      clockHourCycle: "24",
      firstDayOfWeek: 0,
      doNotDisturb: true,
    });
  });

  it("ignores values outside the lists", () => {
    // @ts-expect-error a caller that skips the types
    useSystemSettingsStore.getState().setAccent("hotpink");
    expect(getSystemSettings().accent).toBe("default");
  });

  it("sets and clears a default app", () => {
    useSystemSettingsStore.getState().setDefaultApp(".txt", "editor");
    expect(getSystemSettings().defaultApps).toEqual({ ".txt": "editor" });
    useSystemSettingsStore.getState().setDefaultApp(".txt", null);
    expect(getSystemSettings().defaultApps).toEqual({});
  });

  it("applies only the fields an import carries, each checked", () => {
    useSystemSettingsStore.getState().setVolume(40);
    useSystemSettingsStore.getState().applySettings({ accent: "rose", dateFormat: "nope", unknown: 1 });
    const settings = getSystemSettings();
    expect(settings.accent).toBe("rose");
    expect(settings.dateFormat).toBe("auto");
    expect(settings.volume).toBe(40);
    expect("unknown" in settings).toBe(false);
  });
});

describe("default apps", () => {
  const file = (extension: string): VirtualFile => ({
    kind: "file",
    path: `/Documents/a${extension}`,
    name: `a${extension}`,
    extension: extension.slice(1),
    mimeType: "text/plain",
    createdAt: 0,
    updatedAt: 0,
  });

  it("changes which app opens a file type", () => {
    const before = resolveOpenApp(file(".png"));
    expect(before).toBe("photos");
    useSystemSettingsStore.getState().setDefaultApp(".png", "paint");
    expect(resolveOpenApp(file(".png"))).toBe("paint");
    useSystemSettingsStore.getState().setDefaultApp(".png", null);
    expect(resolveOpenApp(file(".png"))).toBe("photos");
  });

  it("ignores an app the file type cannot use", () => {
    useSystemSettingsStore.setState({ defaultApps: { ".png": "doom" } });
    expect(resolveOpenApp(file(".png"))).toBe("photos");
  });
});

describe("settings export and import", () => {
  it("round-trips", () => {
    useSystemSettingsStore.getState().setAccent("amber");
    const result = parseSettingsImport(buildSettingsExport(getSystemSettings()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(sanitizeSystemSettings(result.values).accent).toBe("amber");
    }
  });

  it("rejects anything that is not an export", () => {
    expect(parseSettingsImport("not json").ok).toBe(false);
    expect(parseSettingsImport("[]").ok).toBe(false);
    expect(parseSettingsImport(JSON.stringify({ kind: "other", version: 1, settings: {} })).ok).toBe(false);
    expect(parseSettingsImport(JSON.stringify({ kind: "taaniel-os-settings", version: 9, settings: {} })).ok).toBe(false);
    expect(parseSettingsImport(JSON.stringify({ kind: "taaniel-os-settings", version: 1, settings: [] })).ok).toBe(false);
    expect(parseSettingsImport(JSON.stringify({ kind: "taaniel-os-settings", version: 1, settings: { x: 1 } })).ok).toBe(false);
    expect(parseSettingsImport("x".repeat(70_000)).ok).toBe(false);
  });

  it("returns only known fields", () => {
    const result = parseSettingsImport(
      JSON.stringify({ kind: "taaniel-os-settings", version: 1, settings: { accent: "evil", volume: 5, extra: 1 } })
    );
    expect(result).toMatchObject({ ok: true, count: 2 });
    if (result.ok) expect(Object.keys(result.values).sort()).toEqual(["accent", "volume"]);
  });
});
