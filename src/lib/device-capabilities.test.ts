import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersStaticWallpaper } from "@/lib/device-capabilities";

function mockNavigator(overrides: Record<string, unknown>) {
  const base = {
    deviceMemory: 8,
    hardwareConcurrency: 8,
    connection: { saveData: false },
  };
  vi.stubGlobal("navigator", { ...base, ...overrides });
}

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("keeps animation when capability APIs are missing", () => {
    mockNavigator({ deviceMemory: undefined, connection: undefined, hardwareConcurrency: undefined });
    expect(prefersStaticWallpaper()).toBe(false);
  });
});
