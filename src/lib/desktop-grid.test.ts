import { describe, expect, it } from "vitest";
import {
  areDesktopPositionsEqual,
  createDesktopGridMetrics,
  findNearestFreeGridCell,
  reconcileDesktopGridPositions,
  resolveDesktopGridPlacement,
  resolveDesktopGroupPlacement,
  sanitizeDesktopGridPositions,
} from "@/lib/desktop-grid";

describe("desktop-grid", () => {
  it("creates responsive grid metrics from the available viewport", () => {
    const metrics = createDesktopGridMetrics(1920, 1080);

    expect(metrics.columns).toBeGreaterThanOrEqual(25);
    expect(metrics.rows).toBeGreaterThanOrEqual(9);
  });

  it("swaps icon positions when a dragged icon lands on an occupied cell", () => {
    const result = resolveDesktopGridPlacement(
      {
        alpha: { gridX: 0, gridY: 0 },
        beta: { gridX: 1, gridY: 0 },
      },
      "alpha",
      { gridX: 1, gridY: 0 },
      { columns: 4, rows: 3 }
    );

    expect(result.positions.alpha).toEqual({ gridX: 1, gridY: 0 });
    expect(result.positions.beta).toEqual({ gridX: 0, gridY: 0 });
    expect(result.displacedEntryId).toBe("beta");
  });

  it("finds the nearest free cell when the preferred cell is blocked", () => {
    const nextCell = findNearestFreeGridCell(
      {
        "0:0": "alpha",
        "1:0": "beta",
      },
      { gridX: 0, gridY: 0 },
      { columns: 3, rows: 2 }
    );

    expect(nextCell).toEqual({ gridX: 0, gridY: 1, key: "0:1" });
  });

  it("reconciles duplicate icon positions back into deterministic free cells", () => {
    const positions = reconcileDesktopGridPositions(
      [
        { id: "about", defaultGridPosition: { gridX: 0, gridY: 0 } },
        { id: "projects", defaultGridPosition: { gridX: 0, gridY: 1 } },
      ],
      {
        about: { gridX: 0, gridY: 0 },
        projects: { gridX: 0, gridY: 0 },
      },
      { columns: 4, rows: 3 }
    );

    expect(positions.about).toEqual({ gridX: 0, gridY: 0, key: "0:0" });
    expect(positions.projects).toEqual({ gridX: 0, gridY: 1, key: "0:1" });
  });
});

describe("resolveDesktopGroupPlacement", () => {
  const metrics = { columns: 6, rows: 4 };

  it("moves a single icon to a free cell", () => {
    const next = resolveDesktopGroupPlacement(
      { a: { gridX: 0, gridY: 0 }, b: { gridX: 3, gridY: 3 } },
      ["a"],
      "a",
      { gridX: 2, gridY: 1 },
      metrics
    );

    expect(next.a).toEqual({ gridX: 2, gridY: 1 });
    expect(next.b).toEqual({ gridX: 3, gridY: 3 });
  });

  it("never swaps: an occupied cell sends the icon to the nearest free one", () => {
    const next = resolveDesktopGroupPlacement(
      { a: { gridX: 0, gridY: 0 }, b: { gridX: 1, gridY: 0 } },
      ["a"],
      "a",
      { gridX: 1, gridY: 0 },
      metrics
    );

    expect(next.b).toEqual({ gridX: 1, gridY: 0 });
    expect(next.a).toEqual({ gridX: 0, gridY: 0 });
  });

  it("moves a group by the anchor's offset and keeps its shape", () => {
    const next = resolveDesktopGroupPlacement(
      { a: { gridX: 0, gridY: 0 }, b: { gridX: 0, gridY: 1 }, c: { gridX: 1, gridY: 0 } },
      ["a", "b", "c"],
      "a",
      { gridX: 3, gridY: 2 },
      metrics
    );

    expect(next.a).toEqual({ gridX: 3, gridY: 2 });
    expect(next.b).toEqual({ gridX: 3, gridY: 3 });
    expect(next.c).toEqual({ gridX: 4, gridY: 2 });
  });

  it("clamps the offset so no icon of the group leaves the grid", () => {
    const next = resolveDesktopGroupPlacement(
      { a: { gridX: 0, gridY: 0 }, b: { gridX: 2, gridY: 0 } },
      ["a", "b"],
      "a",
      { gridX: 5, gridY: 0 },
      metrics
    );

    // b is two columns right of a, so the group stops with b on the last column.
    expect(next.b).toEqual({ gridX: 5, gridY: 0 });
    expect(next.a).toEqual({ gridX: 3, gridY: 0 });
  });

  it("moves into cells vacated by the group itself", () => {
    const next = resolveDesktopGroupPlacement(
      { a: { gridX: 0, gridY: 0 }, b: { gridX: 0, gridY: 1 } },
      ["a", "b"],
      "a",
      { gridX: 0, gridY: 1 },
      metrics
    );

    expect(next.a).toEqual({ gridX: 0, gridY: 1 });
    expect(next.b).toEqual({ gridX: 0, gridY: 2 });
  });
});

describe("persisted desktop positions", () => {
  it("keeps only well-formed cells and rounds them", () => {
    expect(
      sanitizeDesktopGridPositions({
        ok: { gridX: 2, gridY: 3 },
        fractional: { gridX: 1.6, gridY: -4 },
        text: { gridX: "1", gridY: 2 },
        missing: { gridX: 1 },
        nope: null,
        infinite: { gridX: Infinity, gridY: 0 },
      })
    ).toEqual({
      ok: { gridX: 2, gridY: 3 },
      fractional: { gridX: 2, gridY: 0 },
    });
  });

  it("rejects values that are not a map", () => {
    expect(sanitizeDesktopGridPositions(null)).toBeNull();
    expect(sanitizeDesktopGridPositions([])).toBeNull();
    expect(sanitizeDesktopGridPositions("grid")).toBeNull();
  });

  it("compares two position maps cell by cell", () => {
    const a = { x: { gridX: 0, gridY: 0 }, y: { gridX: 1, gridY: 1 } };

    expect(areDesktopPositionsEqual(a, { ...a })).toBe(true);
    expect(areDesktopPositionsEqual(a, { ...a, y: { gridX: 1, gridY: 2 } })).toBe(false);
    expect(areDesktopPositionsEqual(a, { x: a.x })).toBe(false);
  });
});
