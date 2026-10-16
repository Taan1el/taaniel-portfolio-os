import { afterEach, describe, expect, it, vi } from "vitest";
import { playTestTone, resolveTonePeak } from "@/lib/test-tone";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubAudio() {
  const peaks: number[] = [];
  const oscillator = {
    type: "",
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as null | (() => void),
  };
  const envelope = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn((value: number) => peaks.push(value)),
    },
  };
  const close = vi.fn(() => Promise.resolve());

  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator = () => oscillator;
    createGain = () => envelope;
    close = close;
  }

  vi.stubGlobal("AudioContext", FakeAudioContext);

  return { peaks, oscillator, close };
}

describe("resolveTonePeak", () => {
  it("scales the tone with the master gain and stays silent at zero", () => {
    expect(resolveTonePeak(0)).toBe(0);
    expect(resolveTonePeak(1)).toBeCloseTo(0.25, 5);
    expect(resolveTonePeak(0.5)).toBeCloseTo(0.125, 5);
  });

  it("clamps broken gains", () => {
    expect(resolveTonePeak(9)).toBeCloseTo(0.25, 5);
    expect(resolveTonePeak(-1)).toBe(0);
    expect(resolveTonePeak(Number.NaN)).toBe(0);
  });
});

describe("playTestTone", () => {
  it("plays a faded tone at the master gain and cleans up when it ends", () => {
    const { peaks, oscillator, close } = stubAudio();

    expect(playTestTone(0.4)).toBe(true);
    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
    expect(peaks[0]).toBeCloseTo(0.1, 5);
    expect(peaks.at(-1)).toBe(0);

    oscillator.onended?.();
    expect(close).toHaveBeenCalled();
  });

  it("reports false where there is no Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);

    expect(playTestTone(1)).toBe(false);
  });

  it("reports false when the browser refuses to start audio", () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("blocked");
        }
      }
    );

    expect(playTestTone(1)).toBe(false);
  });
});
