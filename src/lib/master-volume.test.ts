// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachMediaVolume,
  attachV86Volume,
  getMasterGain,
  scaleVolume,
  type VolumeControlledEmulator,
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

  describe("with an element's own native controls", () => {
    it("keeps the player's own mute when the master volume moves", () => {
      const element = document.createElement("video");
      const controller = attachMediaVolume(element);

      element.muted = true;
      useSystemSettingsStore.getState().setVolume(55);
      expect(element.muted).toBe(true);
      expect(element.volume).toBeCloseTo(0.55, 5);

      // Muting and unmuting the speakers leaves that own mute in place.
      useSystemSettingsStore.getState().setMuted(true);
      useSystemSettingsStore.getState().setMuted(false);
      expect(element.muted).toBe(true);

      element.muted = false;
      useSystemSettingsStore.getState().setVolume(70);
      expect(element.muted).toBe(false);
      controller.detach();
    });

    it("scales the level set on the native slider instead of discarding it", () => {
      const element = document.createElement("audio");
      const controller = attachMediaVolume(element);

      element.volume = 0.3;
      useSystemSettingsStore.getState().setVolume(50);
      expect(element.volume).toBeCloseTo(0.15, 5);

      useSystemSettingsStore.getState().setVolume(100);
      expect(element.volume).toBeCloseTo(0.3, 5);

      // Dragging the native slider while the master is at 50 sets the own level relative to it.
      useSystemSettingsStore.getState().setVolume(50);
      element.volume = 0.4;
      expect(element.volume).toBeCloseTo(0.4, 5);
      useSystemSettingsStore.getState().setVolume(100);
      expect(element.volume).toBeCloseTo(0.8, 5);
      controller.detach();
    });

    it("lets a master mute win over a native unmute", () => {
      const element = document.createElement("video");
      const controller = attachMediaVolume(element);

      useSystemSettingsStore.getState().setMuted(true);
      expect(element.muted).toBe(true);

      element.muted = false;
      expect(element.muted).toBe(true);

      useSystemSettingsStore.getState().setMuted(false);
      expect(element.muted).toBe(false);
      controller.detach();
    });

    it("tracks native changes that arrive after the apply, as browsers queue them", () => {
      const listeners = new Set<() => void>();
      const element = {
        volume: 1,
        muted: false,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      };
      const emitVolumeChange = () => listeners.forEach((listener) => listener());
      const controller = attachMediaVolume(element as unknown as HTMLMediaElement);

      // The event for the controller's own write lands late and changes nothing.
      useSystemSettingsStore.getState().setVolume(50);
      emitVolumeChange();
      expect(element.volume).toBeCloseTo(0.5, 5);

      element.muted = true;
      emitVolumeChange();
      useSystemSettingsStore.getState().setVolume(80);
      expect(element.muted).toBe(true);
      expect(element.volume).toBeCloseTo(0.8, 5);

      controller.detach();
      expect(listeners.size).toBe(0);
    });

    it("hands the element back at its own state when detached", () => {
      const element = document.createElement("audio");
      const controller = attachMediaVolume(element, () => 0.5);
      useSystemSettingsStore.getState().setVolume(20);
      useSystemSettingsStore.getState().setMuted(true);
      expect(element.volume).toBeCloseTo(0.1, 5);
      expect(element.muted).toBe(true);

      controller.detach();
      expect(element.volume).toBeCloseTo(0.5, 5);
      expect(element.muted).toBe(false);

      // Attaching again does not mistake the master's mute for the player's own.
      attachMediaVolume(element, () => 0.5).detach();
      expect(element.muted).toBe(false);
    });
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

  describe("when the speaker is created after the emulator", () => {
    // v86 builds speaker_adapter once its wasm has loaded, long after `new V86(...)` returns.
    function createLateEmulator() {
      const setVolume = vi.fn();
      const listeners = new Map<string, Set<() => void>>();
      const emulator: VolumeControlledEmulator = {
        add_listener: (event, listener) => {
          listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
        },
        remove_listener: (event, listener) => {
          listeners.get(event)?.delete(listener);
        },
      };
      const emit = (event: string) => listeners.get(event)?.forEach((listener) => listener());
      const createSpeaker = () => {
        emulator.speaker_adapter = { mixer: { set_volume: setVolume } };
      };
      return { emulator, setVolume, emit, createSpeaker, listeners };
    }

    it("applies a mute set before boot once the emulator is ready", () => {
      const { emulator, setVolume, emit, createSpeaker } = createLateEmulator();
      useSystemSettingsStore.getState().setVolume(30);
      useSystemSettingsStore.getState().setMuted(true);

      const detach = attachV86Volume(emulator);
      expect(setVolume).not.toHaveBeenCalled();

      createSpeaker();
      emit("emulator-ready");
      expect(setVolume).toHaveBeenLastCalledWith(0, 2);

      useSystemSettingsStore.getState().setMuted(false);
      expect(setVolume).toHaveBeenLastCalledWith(0.3, 2);
      detach();
    });

    it("applies the volume when only the loaded event arrives", () => {
      const { emulator, setVolume, emit, createSpeaker } = createLateEmulator();
      useSystemSettingsStore.getState().setVolume(20);

      const detach = attachV86Volume(emulator);
      createSpeaker();
      emit("emulator-loaded");
      expect(setVolume).toHaveBeenLastCalledWith(0.2, 2);
      detach();
    });

    it("removes its listeners when detached", () => {
      const { emulator, setVolume, emit, createSpeaker, listeners } = createLateEmulator();
      const detach = attachV86Volume(emulator);
      detach();

      createSpeaker();
      emit("emulator-ready");
      expect(setVolume).not.toHaveBeenCalled();
      expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
    });
  });
});
