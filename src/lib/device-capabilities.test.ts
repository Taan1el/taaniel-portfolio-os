import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prefersStaticWallpaper } from "@/lib/device-capabilities";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

function mockNavigator(overrides: Record<string, unknown>) {
  const base = {
    deviceMemory: 8,
    hardwareConcurrency: 8,
    connection: { saveData: false },
  };
  vi.stubGlobal("navigator", { ...base, ...overrides });
}

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSystemSettingsStore.getState().resetSettings();
});

describe("prefersStaticWallpaper", () => {
  it("keeps animation on capable hardware", () => {
    mockNavigator({});
    expect(prefersStaticWallpaper()).toBe(false);
  });

  it("prefers static when data saver is on", () => {
    mockNavigator({ connection: { saveData: true } });
    expect(prefersStaticWallpaper()).toBe(true);
  });

  it("prefers static on low-memory devices", () => {
    mockNavigator({ deviceMemory: 4 });
    expect(prefersStaticWallpaper()).toBe(true);
  });

  it("prefers static on few-core devices", () => {
    mockNavigator({ hardwareConcurrency: 2 });
    expect(prefersStaticWallpaper()).toBe(true);
  });

  it("prefers static while battery saver is on, whatever the hardware", () => {
    mockNavigator({});
    useSystemSettingsStore.getState().setBatterySaver(true);
    expect(prefersStaticWallpaper()).toBe(true);

    useSystemSettingsStore.getState().setBatterySaver(false);
    expect(prefersStaticWallpaper()).toBe(false);
  });

  it("keeps animation when capability APIs are missing", () => {
    mockNavigator({ deviceMemory: undefined, connection: undefined, hardwareConcurrency: undefined });
    expect(prefersStaticWallpaper()).toBe(false);
  });
});
