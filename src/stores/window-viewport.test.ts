import { afterEach, describe, expect, it, vi } from "vitest";
import { clampWindowBoundsToViewport, getMaximizedBounds } from "./system-runtime";

afterEach(() => vi.restoreAllMocks());

describe("window viewport bounds", () => {
  it.each([[320, 568], [390, 844], [740, 360]])("keeps windows inside a %ix%i viewport", (width, height) => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
    for (const bounds of [
      getMaximizedBounds(),
      clampWindowBoundsToViewport({ x: 600, y: 500, width: 900, height: 800 }),
    ]) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height - 120);
    }
  });
});
