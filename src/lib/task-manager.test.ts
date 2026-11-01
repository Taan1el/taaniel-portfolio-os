import { describe, expect, it } from "vitest";
import { HISTORY_SECONDS, buildTaskRows, chartPoints, formatDuration, pushSample } from "@/lib/task-manager";
import type { AppProcess, WindowRecord } from "@/types/system";

const win = (id: string, title: string, extra: Partial<WindowRecord> & { desktop?: number } = {}) =>
  ({ id, processId: `p-${id}`, title, minimized: false, ...extra }) as WindowRecord & { desktop?: number };
const proc = (id: string, createdAt = 5): AppProcess => ({ id: `p-${id}`, appId: "notes", status: "running", createdAt });

describe("task rows", () => {
  it("joins windows to processes, sorted by name", () => {
    const rows = buildTaskRows([win("b", "Zebra", { desktop: 1 }), win("a", "Apple")], [proc("a"), proc("b", 9)], "a");

    expect(rows.map((row) => row.title)).toEqual(["Apple", "Zebra"]);
    expect(rows[0]).toMatchObject({ status: "Active", desktop: 1, appId: "notes" });
    expect(rows[1]).toMatchObject({ status: "Running", desktop: 2, startedAt: 9 });
  });

  it("says when a window is minimized, even if it was last in front", () => {
    const rows = buildTaskRows([win("a", "Apple", { minimized: true })], [proc("a")], "a");

    expect(rows[0].status).toBe("Minimized");
  });

  it("leaves out a window with no process", () => {
    expect(buildTaskRows([win("a", "Apple")], [], null)).toEqual([]);
  });
});

describe("task numbers", () => {
  it("formats a running time", () => {
    expect(formatDuration(-5)).toBe("00:00");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });

  it("keeps one minute of samples", () => {
    let history: number[] = [];
    for (let sample = 0; sample < HISTORY_SECONDS + 5; sample += 1) history = pushSample(history, sample);

    expect(history).toHaveLength(HISTORY_SECONDS);
    expect(history[0]).toBe(5);
  });

  it("draws the newest sample at the right, scaled to the peak", () => {
    const points = chartPoints([30, 60], 60).split(" ");

    expect(points.at(-1)).toBe("100.00,0.00");
    expect(points[0].split(",")[1]).toBe("50.00");
  });

  it("copes with no samples", () => {
    expect(chartPoints([], 60)).toBe("");
  });
});
