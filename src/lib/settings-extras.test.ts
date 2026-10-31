// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { formatShortDate, formatTime, resolveFirstDayOfWeek } from "@/lib/clock-format";
import { describeDevice, describeUptime } from "@/lib/device-details";
import { listIndexedDatabases, listLocalStorage } from "@/lib/local-data";
import { SETTINGS_SEARCH_ENTRIES, searchSettings } from "@/lib/settings-search";
import { SETTINGS_SECTION_IDS } from "@/lib/settings-sections";
import { summarizeFileSystem } from "@/lib/storage-usage";
import { NOTIFICATION_HISTORY_LIMIT, toast, useToastStore } from "@/stores/toast-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import type { FileSystemRecord } from "@/types/system";

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
  useToastStore.setState({ toasts: [], history: [] });
});

describe("clock formats", () => {
  const date = new Date(2026, 9, 5, 15, 7, 9);

  it("forces 12 or 24 hours", () => {
    expect(formatTime(date, { clockHourCycle: "24" })).toBe("15:07");
    expect(formatTime(date, { clockHourCycle: "12" })).toMatch(/^3:07\s?PM$/i);
    expect(formatTime(date, { clockHourCycle: "24" }, { seconds: true })).toBe("15:07:09");
  });

  it("prints the short date three ways", () => {
    expect(formatShortDate(date, { dateFormat: "dmy" })).toBe("5.10.2026");
    expect(formatShortDate(date, { dateFormat: "mdy" })).toBe("10/5/2026");
    expect(formatShortDate(date, { dateFormat: "ymd" })).toBe("2026-10-05");
  });

  it("follows the setting for the first weekday", () => {
    expect(resolveFirstDayOfWeek({ firstDayOfWeek: 3 })).toBe(3);
    expect(resolveFirstDayOfWeek({ firstDayOfWeek: "auto" })).toBeGreaterThanOrEqual(0);
  });
});

describe("settings search", () => {
  it("finds a setting by title or keyword", () => {
    expect(searchSettings("brightness")[0]).toMatchObject({ id: "brightness", section: "display" });
    expect(searchSettings("dnd")[0]).toMatchObject({ id: "do-not-disturb", section: "notifications" });
    expect(searchSettings("reset this pc")[0]).toMatchObject({ id: "reset-desktop", section: "about" });
  });

  it("needs every word and ignores an empty query", () => {
    expect(searchSettings("   ")).toEqual([]);
    expect(searchSettings("brightness zebra")).toEqual([]);
  });

  it("also finds whole pages", () => {
    expect(searchSettings("storage").some((result) => result.id === "page:storage")).toBe(true);
  });

  it("only points at real pages, with unique ids", () => {
    const ids = SETTINGS_SEARCH_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of SETTINGS_SEARCH_ENTRIES) {
      expect(SETTINGS_SECTION_IDS).toContain(entry.section);
    }
  });
});

describe("storage usage", () => {
  it("adds file sizes up by top-level folder", () => {
    const file = (path: string, size?: number) =>
      ({ kind: "file", path, name: path.split("/").pop(), extension: "txt", mimeType: "text/plain", size, createdAt: 0, updatedAt: 0 }) as const;
    const nodes = {
      "/Documents": { kind: "directory", path: "/Documents", name: "Documents", createdAt: 0, updatedAt: 0 },
      "/Documents/a.txt": file("/Documents/a.txt", 100),
      "/Documents/sub/b.txt": file("/Documents/sub/b.txt", 50),
      "/Trash/c.txt": file("/Trash/c.txt", 900),
      "/loose.txt": file("/loose.txt", -5),
      "/Pictures/d.txt": file("/Pictures/d.txt"),
    } as unknown as FileSystemRecord;
    const usage = summarizeFileSystem(nodes);

    expect(usage.totalFiles).toBe(5);
    expect(usage.totalBytes).toBe(1050);
    expect(usage.folders[0]).toMatchObject({ name: "Recycle Bin", bytes: 900, files: 1 });
    expect(usage.folders.find((folder) => folder.path === "/Documents")).toMatchObject({ bytes: 150, files: 2 });
    expect(usage.folders.find((folder) => folder.path === "/")).toMatchObject({ bytes: 0, files: 1 });
  });
});

describe("local data", () => {
  it("lists keys with a size and a readable name", () => {
    localStorage.clear();
    localStorage.setItem("taaniel-os-settings-v1", "{}");
    localStorage.setItem("something-else", "abcdef");
    const entries = listLocalStorage(localStorage);

    expect(entries.find((entry) => entry.key === "taaniel-os-settings-v1")?.label).toBe("Settings");
    expect(entries.find((entry) => entry.key === "something-else")).toMatchObject({ label: "something-else", bytes: 40 });
    expect(listLocalStorage(null)).toEqual([]);
  });

  it("lists databases where the browser can, and nothing where it cannot", async () => {
    expect(await listIndexedDatabases({ databases: async () => [{ name: "keyval-store", version: 1 }, {}] })).toEqual(["keyval-store"]);
    expect(await listIndexedDatabases({ databases: async () => Promise.reject(new Error("no")) })).toEqual([]);
    expect(await listIndexedDatabases(null)).toEqual([]);
  });
});

describe("device details", () => {
  it("reports only what the browser gives", () => {
    const details = describeDevice({
      navigator: {
        platform: "Win32",
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
        language: "et-EE",
        userAgent: "UA",
        userAgentData: { brands: [{ brand: "Not A Brand", version: "8" }, { brand: "Chromium", version: "130" }] },
      } as unknown as Navigator,
      screen: { width: 1920, height: 1080, colorDepth: 24 },
      devicePixelRatio: 1.25,
      gpu: null,
    });
    const labels = details.map((detail) => detail.label);

    expect(details.find((detail) => detail.label === "Browser")?.value).toBe("Chromium 130");
    expect(details.find((detail) => detail.label === "Screen")?.value).toContain("1920 x 1080 at 125%");
    expect(labels).not.toContain("Device memory");
    expect(labels).not.toContain("Graphics");
  });

  it("writes uptime in plain units", () => {
    expect(describeUptime(5_000)).toBe("5 s");
    expect(describeUptime(125_000)).toBe("2 min 5 s");
    expect(describeUptime(3_700_000)).toBe("1 h 1 min");
  });
});

describe("do not disturb", () => {
  it("shows toasts normally", () => {
    toast("hello");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().history[0]).toMatchObject({ message: "hello", muted: false });
  });

  it("holds toasts back but keeps them in the history", () => {
    useSystemSettingsStore.getState().setDoNotDisturb(true);
    toast("quiet", "success");
    expect(useToastStore.getState().toasts).toHaveLength(0);
    expect(useToastStore.getState().history[0]).toMatchObject({ message: "quiet", type: "success", muted: true });
  });

  it("keeps a bounded history that can be cleared", () => {
    for (let index = 0; index < NOTIFICATION_HISTORY_LIMIT + 5; index += 1) toast(`n${index}`);
    expect(useToastStore.getState().history).toHaveLength(NOTIFICATION_HISTORY_LIMIT);
    expect(useToastStore.getState().history[0].message).toBe(`n${NOTIFICATION_HISTORY_LIMIT + 4}`);
    useToastStore.getState().clearHistory();
    expect(useToastStore.getState().history).toEqual([]);
  });
});
