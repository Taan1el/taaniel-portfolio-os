// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY } from "@/stores/system-runtime";
import {
  DEFAULT_SYSTEM_SETTINGS,
  SYSTEM_SETTINGS_VERSION,
  getSystemSettings,
  sanitizeBrightness,
  sanitizePercent,
  sanitizeSystemSettings,
  useSystemSettingsStore,
} from "@/stores/system-settings-store";

describe("system settings sanitizers", () => {
  it("clamps and rounds percentages", () => {
    expect(sanitizePercent(42.6, 10)).toBe(43);
    expect(sanitizePercent(-5, 10)).toBe(0);
    expect(sanitizePercent(140, 10)).toBe(100);
    expect(sanitizePercent(Number.NaN, 10)).toBe(10);
    expect(sanitizePercent("50", 10)).toBe(10);
    expect(sanitizeBrightness(undefined)).toBe(DEFAULT_SYSTEM_SETTINGS.brightness);
  });

  it("rebuilds a saved blob field by field", () => {
    expect(
      sanitizeSystemSettings({
        volume: 30,
        muted: "yes",
        brightness: 500,
        nightLight: true,
        nightLightStrength: null,
        batterySaver: 1,
        reduceMotion: true,
        unknownField: "dropped",
      })
    ).toEqual({
      ...DEFAULT_SYSTEM_SETTINGS,
      volume: 30,
      brightness: 100,
      nightLight: true,
      reduceMotion: true,
    });
  });

  it("falls back to defaults for anything that is not an object", () => {
    expect(sanitizeSystemSettings(null)).toEqual(DEFAULT_SYSTEM_SETTINGS);
    expect(sanitizeSystemSettings("broken")).toEqual(DEFAULT_SYSTEM_SETTINGS);
    expect(sanitizeSystemSettings([1, 2])).toEqual(DEFAULT_SYSTEM_SETTINGS);
  });
});

describe("system settings store", () => {
  beforeEach(() => {
    useSystemSettingsStore.getState().resetSettings();
  });

  it("unmutes when the volume slider moves", () => {
    const store = useSystemSettingsStore.getState();
    store.setMuted(true);
    store.setVolume(40);
    expect(getSystemSettings()).toMatchObject({ volume: 40, muted: false });
  });

  it("steps the volume within bounds", () => {
    const store = useSystemSettingsStore.getState();
    store.setVolume(99);
    store.changeVolume(4);
    expect(useSystemSettingsStore.getState().volume).toBe(100);
    store.setVolume(1);
    store.changeVolume(-4);
    expect(useSystemSettingsStore.getState().volume).toBe(0);
  });

  it("keeps out-of-range input inside 0-100", () => {
    useSystemSettingsStore.getState().setBrightness(-20);
    expect(useSystemSettingsStore.getState().brightness).toBe(0);
    useSystemSettingsStore.getState().setNightLightStrength(250);
    expect(useSystemSettingsStore.getState().nightLightStrength).toBe(100);
  });

  it("persists only settings fields under its own key", () => {
    useSystemSettingsStore.getState().setBatterySaver(true);
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
    expect(saved.version).toBe(SYSTEM_SETTINGS_VERSION);
    expect(saved.state).toEqual({ ...DEFAULT_SYSTEM_SETTINGS, batterySaver: true });
  });

  it("repairs a malformed save on rehydrate", async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { volume: "loud", brightness: 12, reduceMotion: true }, version: SYSTEM_SETTINGS_VERSION })
    );
    await useSystemSettingsStore.persist.rehydrate();
    expect(getSystemSettings()).toEqual({
      ...DEFAULT_SYSTEM_SETTINGS,
      brightness: 12,
      reduceMotion: true,
    });
  });
});
