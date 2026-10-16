import { describe, expect, it } from "vitest";
import { consumeWheel } from "@/lib/tray-wheel";

describe("consumeWheel", () => {
  it("turns a mouse notch into one step, up being positive", () => {
    expect(consumeWheel(0, -100)).toEqual({ steps: 1, remainder: 0 });
    expect(consumeWheel(0, 100)).toEqual({ steps: -1, remainder: 0 });
  });

  it("collects small trackpad events until they make a notch", () => {
    let state = consumeWheel(0, -30);
    expect(state.steps).toBe(0);
    state = consumeWheel(state.remainder, -30);
    expect(state.steps).toBe(0);
    state = consumeWheel(state.remainder, -30);
    expect(state.steps).toBe(0);
    state = consumeWheel(state.remainder, -30);
    expect(state.steps).toBe(1);
    expect(state.remainder).toBeCloseTo(-20, 5);
  });

  it("reads line and page deltas", () => {
    expect(consumeWheel(0, -3, 1).steps).toBe(1);
    expect(consumeWheel(0, 1, 2).steps).toBe(-4);
  });

  it("ignores broken deltas", () => {
    expect(consumeWheel(0, Number.NaN)).toEqual({ steps: 0, remainder: 0 });
  });
});
