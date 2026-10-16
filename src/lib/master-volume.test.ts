// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachMediaVolume,
  attachV86Volume,
  getMasterGain,
  scaleVolume,
} from "@/lib/master-volume";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  useSystemSettingsStore.getState().resetSettings();
});

describe("master gain", () => {
  it("maps 0-100 to a 0-1 gain and silences while muted", () => {
    expect(getMasterGain(100, false)).toBe(1);
    expect(getMasterGain(42, false)).toBeCloseTo(0.42, 5);
    expect(getMasterGain(42, true)).toBe(0);
  });

  it("scales an app's own level by the master", () => {
    expect(scaleVolume(0.5, 50, false)).toBeCloseTo(0.25, 5);
    expect(scaleVolume(0.72, 100, false)).toBeCloseTo(0.72, 5);
    expect(scaleVolume(1, 80, true)).toBe(0);
  });

  it("stays within 0-1 for broken input", () => {
    expect(scaleVolume(5, 100, false)).toBe(1);
    expect(scaleVolume(Number.NaN, 100, false)).toBe(0);
    expect(getMasterGain(Number.NaN, false)).toBe(0);
  });
});

describe("attachMediaVolume", () => {
  it("applies the master volume at once and follows later changes", () => {
    const element = { volume: 1, muted: false };
    const controller = attachMediaVolume(element);

    useSystemSettingsStore.getState().setVolume(40);
    expect(element.volume).toBeCloseTo(0.4, 5);

    useSystemSettingsStore.getState().setMuted(true);
    expect(element.muted).toBe(true);

    useSystemSettingsStore.getState().setMuted(false);
    expect(element.muted).toBe(false);
    controller.detach();
  });

  it("scales the player's own slider and re-applies on sync", () => {
    let local = 0.5;
    const element = { volume: 1, muted: false };
    const controller = attachMediaVolume(element, () => local);
    useSystemSettingsStore.getState().setVolume(50);
    expect(element.volume).toBeCloseTo(0.25, 5);

    local = 1;
    controller.sync();
    expect(element.volume).toBeCloseTo(0.5, 5);
    controller.detach();
  });

  it("leaves a native control alone between master changes", () => {
    const element = { volume: 1, muted: false };
    const controller = attachMediaVolume(element);
    useSystemSettingsStore.getState().setVolume(60);

    element.volume = 0.2;
    useSystemSettingsStore.getState().setBrightness(30);
    expect(element.volume).toBe(0.2);
    controller.detach();
  });

  it("stops following once detached", () => {
    const element = { volume: 1, muted: false };
    attachMediaVolume(element).detach();
    useSystemSettingsStore.getState().setVolume(10);
    expect(element.volume).toBe(1);
  });
});

describe("attachV86Volume", () => {
  it("sets the mixer gain on both channels and follows the store", () => {
    const setVolume = vi.fn();
    const detach = attachV86Volume({ speaker_adapter: { mixer: { set_volume: setVolume } } });
    expect(setVolume).toHaveBeenLastCalledWith(1, 2);

    useSystemSettingsStore.getState().setVolume(25);
    expect(setVolume).toHaveBeenLastCalledWith(0.25, 2);

    useSystemSettingsStore.getState().setMuted(true);
    expect(setVolume).toHaveBeenLastCalledWith(0, 2);

    detach();
    setVolume.mockClear();
    useSystemSettingsStore.getState().setMuted(false);
    expect(setVolume).not.toHaveBeenCalled();
  });

  it("copes with an emulator that has no speaker", () => {
    expect(() => attachV86Volume({})()).not.toThrow();
    expect(() => attachV86Volume({ speaker_adapter: null })()).not.toThrow();
  });
});
