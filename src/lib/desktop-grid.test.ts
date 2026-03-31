import { describe, expect, it } from "vitest";
import {
  createDesktopGridMetrics,
  findNearestFreeGridCell,
  reconcileDesktopGridPositions,
  resolveDesktopGridPlacement,
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
        { id: "about", label: "About", type: "app", appId: "about", defaultGridPosition: { gridX: 0, gridY: 0 } },
        {
          id: "projects",
          label: "Projects",
          type: "app",
          appId: "projects",
          defaultGridPosition: { gridX: 0, gridY: 1 },
        },
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
