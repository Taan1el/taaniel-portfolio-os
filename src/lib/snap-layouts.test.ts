import { describe, expect, it } from "vitest";
import { SNAP_LAYOUTS, zoneBounds } from "@/lib/snap-layouts";

describe("snap layouts", () => {
  it("fills the desktop with no gaps or overlaps in every layout", () => {
    const desktop = { width: 1367, height: 719 };
    for (const layout of SNAP_LAYOUTS) {
      const area = layout.zones.map((zone) => zoneBounds(zone, desktop)).reduce((sum, b) => sum + b.width * b.height, 0);
      expect(area).toBe(desktop.width * desktop.height);
    }
  });

  it("shares the edge between neighbours on odd sizes", () => {
    const [left, right] = SNAP_LAYOUTS[0].zones.map((zone) => zoneBounds(zone, { width: 1367, height: 700 }));
    expect(left.x + left.width).toBe(right.x);
    expect(right.x + right.width).toBe(1367);
  });
});
