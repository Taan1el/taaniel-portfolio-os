import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  getFirstDayOfWeek,
  getWeekdayLabels,
  isSameDay,
  shiftMonth,
  startOfDay,
  toDateKey,
} from "@/lib/calendar";

describe("buildMonthGrid", () => {
  const today = new Date(2026, 9, 16);

  it("always lays out six weeks of seven days", () => {
    for (let month = 0; month < 12; month += 1) {
      const grid = buildMonthGrid({ year: 2026, month }, today);
      expect(grid).toHaveLength(6);
      grid.forEach((week) => expect(week).toHaveLength(7));
    }
  });

  it("starts the first row on the chosen weekday", () => {
    // 1 October 2026 is a Thursday.
    const monday = buildMonthGrid({ year: 2026, month: 9 }, today, 1);
    expect(monday[0][0].key).toBe("2026-09-28");
    expect(monday[0][3].key).toBe("2026-10-01");

    const sunday = buildMonthGrid({ year: 2026, month: 9 }, today, 0);
    expect(sunday[0][0].key).toBe("2026-09-27");
    expect(sunday[0][4].key).toBe("2026-10-01");
  });

  it("marks neighbouring months and today", () => {
    const grid = buildMonthGrid({ year: 2026, month: 9 }, today, 1).flat();
    expect(grid.filter((day) => day.inMonth)).toHaveLength(31);
    expect(grid.find((day) => day.key === "2026-09-28")?.inMonth).toBe(false);
    expect(grid.filter((day) => day.isToday).map((day) => day.key)).toEqual(["2026-10-16"]);
  });

  it("does not mark today in another month's grid", () => {
    // November's first row starts on 26 October, so 16 October is not on screen.
    const november = buildMonthGrid({ year: 2026, month: 10 }, today, 1).flat();
    expect(november.some((day) => day.isToday)).toBe(false);
  });

  it("handles a leap day", () => {
    const grid = buildMonthGrid({ year: 2028, month: 1 }, new Date(2028, 1, 29), 1).flat();
    expect(grid.filter((day) => day.inMonth)).toHaveLength(29);
    expect(grid.find((day) => day.isToday)?.key).toBe("2028-02-29");
  });
});

describe("date helpers", () => {
  it("formats keys with padding", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("compares calendar days, not instants", () => {
    expect(isSameDay(new Date(2026, 5, 1, 0, 0), new Date(2026, 5, 1, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 5, 1), new Date(2026, 5, 2))).toBe(false);
    expect(startOfDay(new Date(2026, 5, 1, 13, 30)).getHours()).toBe(0);
  });

  it("adds days across month and year ends", () => {
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(toDateKey(addDays(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
  });

  it("clamps day-of-month when moving to a shorter month", () => {
    expect(toDateKey(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(toDateKey(addMonths(new Date(2026, 11, 15), 1))).toBe("2027-01-15");
    expect(toDateKey(addMonths(new Date(2026, 0, 15), -1))).toBe("2025-12-15");
  });

  it("shifts a visible month over the year boundary", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("week conventions", () => {
  it("knows the common first days", () => {
    expect(getFirstDayOfWeek("en-US")).toBe(0);
    expect(getFirstDayOfWeek("et-EE")).toBe(1);
  });

  it("falls back to Monday for an unusable locale", () => {
    expect(getFirstDayOfWeek("not a locale!!")).toBe(1);
  });

  it("labels columns in week order", () => {
    const labels = getWeekdayLabels(1, "en-US");
    expect(labels.map((label) => label.short)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(labels[0].long).toBe("Monday");
    expect(getWeekdayLabels(0, "en-US")[0].short).toBe("Sun");
  });
});
