import { describe, expect, it } from "vitest";
import {
  MAX_DIM_ALPHA,
  resolveDimAlpha,
  resolveDisplayFilter,
  resolveEffectiveBrightness,
  resolveNightLightColor,
} from "@/lib/display-filter";

describe("resolveDimAlpha", () => {
  it("adds no layer at full brightness", () => {
    expect(resolveDimAlpha(100)).toBe(0);
  });

  it("never dims past the cap, even at zero brightness", () => {
    expect(resolveDimAlpha(0)).toBe(MAX_DIM_ALPHA);
    expect(MAX_DIM_ALPHA).toBeLessThanOrEqual(0.7);
  });

  it("dims in proportion between the ends", () => {
    expect(resolveDimAlpha(50)).toBeCloseTo(0.35, 5);
  });

  it("clamps out-of-range and broken values", () => {
    expect(resolveDimAlpha(-40)).toBe(MAX_DIM_ALPHA);
    expect(resolveDimAlpha(400)).toBe(0);
    expect(resolveDimAlpha(Number.NaN)).toBe(0);
  });

  it("lowers the screen further under battery saver but stays capped", () => {
    expect(resolveDimAlpha(100, true)).toBeGreaterThan(0);
    expect(resolveDimAlpha(100, true)).toBeLessThan(MAX_DIM_ALPHA);
    expect(resolveDimAlpha(0, true)).toBe(MAX_DIM_ALPHA);
  });
});

describe("resolveEffectiveBrightness", () => {
  it("scales brightness only while battery saver is on", () => {
    expect(resolveEffectiveBrightness(80, false)).toBe(80);
    expect(resolveEffectiveBrightness(100, true)).toBeCloseTo(70, 5);
  });
});

describe("resolveNightLightColor", () => {
  it("is neutral at zero strength", () => {
    expect(resolveNightLightColor(0)).toBeNull();
  });

  it("gets warmer as strength grows", () => {
    expect(resolveNightLightColor(50)).toBe("rgb(255, 220, 160)");
    expect(resolveNightLightColor(100)).toBe("rgb(255, 185, 65)");
  });

  it("clamps strength", () => {
    expect(resolveNightLightColor(500)).toBe(resolveNightLightColor(100));
  });
});

describe("resolveDisplayFilter", () => {
  const base = { brightness: 100, nightLight: false, nightLightStrength: 50, batterySaver: false };

  it("is empty by default", () => {
    expect(resolveDisplayFilter(base)).toEqual({ dimAlpha: 0, warmColor: null });
  });

  it("adds the warm layer only while night light is on", () => {
    expect(resolveDisplayFilter({ ...base, nightLight: true }).warmColor).toBe("rgb(255, 220, 160)");
    expect(resolveDisplayFilter({ ...base, nightLight: false, nightLightStrength: 90 }).warmColor).toBeNull();
  });
});
