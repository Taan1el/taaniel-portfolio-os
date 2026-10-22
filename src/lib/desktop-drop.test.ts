import { describe, expect, it } from "vitest";
import { getDropCell, planIconArrivals, planIconMove, type DesktopGeometry } from "@/lib/desktop-drop";

// A 6 x 4 grid of 100 x 100 cells with 16px padding, the surface at the screen's origin.
const geometry: DesktopGeometry = {
  container: { left: 0, top: 0 },
  metrics: { columns: 6, rows: 4, cellWidth: 100, cellHeight: 100, paddingX: 16, paddingY: 16 },
};

describe("getDropCell", () => {
  it("picks the cell the dragged icon sits over, not the one under the pointer", () => {
    // The pointer is on the right edge of an icon grabbed 90px from its left edge.
    // The icon's left edge is at x = 330 - 90 = 240, which is cell 2 ((240 - 16) / 100 = 2.2).
    expect(getDropCell({ x: 330, y: 60 }, { x: 90, y: 20 }, geometry)).toEqual({ gridX: 2, gridY: 0 });
  });

  it("clamps to the grid", () => {
    expect(getDropCell({ x: 5000, y: 5000 }, { x: 0, y: 0 }, geometry)).toEqual({ gridX: 5, gridY: 3 });
    expect(getDropCell({ x: -50, y: -50 }, { x: 0, y: 0 }, geometry)).toEqual({ gridX: 0, gridY: 0 });
  });

  it("accounts for where the surface is on screen", () => {
    const offset = { ...geometry, container: { left: 200, top: 40 } };
    expect(getDropCell({ x: 440, y: 160 }, { x: 10, y: 10 }, offset)).toEqual({ gridX: 2, gridY: 1 });
  });
});

describe("planIconMove", () => {
  const positions = {
    a: { gridX: 0, gridY: 0 },
    b: { gridX: 0, gridY: 1 },
    c: { gridX: 4, gridY: 3 },
  };

  it("moves the grabbed icon to the cell under it", () => {
    const moved = planIconMove({
      positions,
      iconIds: ["a"],
      anchorId: "a",
      pointer: { x: 340, y: 240 },
      grab: { x: 40, y: 30 },
      geometry,
    });

    expect(moved).toEqual({ a: { gridX: 3, gridY: 2 } });
  });

  it("carries a selection along with the grabbed icon", () => {
    const moved = planIconMove({
      positions,
      iconIds: ["a", "b"],
      anchorId: "a",
      pointer: { x: 240, y: 60 },
      grab: { x: 20, y: 20 },
      geometry,
    });

    expect(moved).toEqual({ a: { gridX: 2, gridY: 0 }, b: { gridX: 2, gridY: 1 } });
  });

  it("avoids icons that stay put", () => {
    const moved = planIconMove({
      positions,
      iconIds: ["a"],
      anchorId: "a",
      pointer: { x: 450, y: 350 },
      grab: { x: 10, y: 10 },
      geometry,
    });

    // Cell 4:3 holds c, so a takes the nearest free cell.
    expect(moved.a).not.toEqual({ gridX: 4, gridY: 3 });
    expect(Math.abs(moved.a.gridX - 4) + Math.abs(moved.a.gridY - 3)).toBe(1);
  });
});

describe("planIconArrivals", () => {
  it("puts one arriving icon at the drop point", () => {
    const placed = planIconArrivals({ positions: {}, iconIds: ["new"], pointer: { x: 360, y: 260 }, geometry });

    expect(placed).toEqual({ new: { gridX: 3, gridY: 2 } });
  });

  it("spreads several arrivals over the nearest free cells without overlapping", () => {
    const placed = planIconArrivals({
      positions: { taken: { gridX: 3, gridY: 2 } },
      iconIds: ["x", "y", "z"],
      pointer: { x: 360, y: 260 },
      geometry,
    });
    const cells = Object.values(placed).map((cell) => `${cell.gridX}:${cell.gridY}`);

    expect(new Set(cells).size).toBe(3);
    expect(cells).not.toContain("3:2");
  });
});
