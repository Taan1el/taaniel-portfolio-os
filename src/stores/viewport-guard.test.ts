import { afterEach, describe, expect, it, vi } from "vitest";
import { hasUsableViewport } from "./system-runtime";

afterEach(() => vi.restoreAllMocks());

describe("hasUsableViewport", () => {
  it.each([
    [0, 0],
    [0, 800],
    [1280, 0],
    [120, 700],
  ])("rejects a %ix%i viewport so windows are not laid out to nothing", (width, height) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
    expect(hasUsableViewport()).toBe(false);
  });

  it.each([
    [320, 568],
    [1280, 800],
  ])("accepts a real %ix%i viewport", (width, height) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
    expect(hasUsableViewport()).toBe(true);
  });
});
