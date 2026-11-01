import { describe, expect, it } from "vitest";
import { eventTimeAsDate, eventsOn, occursOn, parseDateKey, sanitizeEvents, type CalendarEvent } from "@/lib/calendar-events";

const event = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id: "a", title: "Dentist", date: "2026-01-14", time: "", notes: "", repeat: "none", ...extra });

describe("date keys", () => {
  it("reads real days only", () => {
    expect(parseDateKey("2026-02-28")?.getDate()).toBe(28);
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("tomorrow")).toBeNull();
  });
});

describe("when an event happens", () => {
  it("is on its own day and no other", () => {
    expect(occursOn(event(), "2026-01-14")).toBe(true);
    expect(occursOn(event(), "2026-01-15")).toBe(false);
  });

  it("repeats weekly on the same weekday", () => {
    const weekly = event({ repeat: "weekly" });

    expect(occursOn(weekly, "2026-01-21")).toBe(true);
    expect(occursOn(weekly, "2026-01-22")).toBe(false);
  });

  it("repeats monthly on the same date", () => {
    expect(occursOn(event({ repeat: "monthly" }), "2026-03-14")).toBe(true);
    expect(occursOn(event({ repeat: "monthly" }), "2026-03-15")).toBe(false);
  });

  it("skips months too short for the date", () => {
    const end = event({ date: "2026-01-31", repeat: "monthly" });

    expect(occursOn(end, "2026-03-31")).toBe(true);
    expect(occursOn(end, "2026-02-28")).toBe(false);
  });

  it("repeats yearly on the same day", () => {
    expect(occursOn(event({ repeat: "yearly" }), "2030-01-14")).toBe(true);
    expect(occursOn(event({ repeat: "yearly" }), "2030-02-14")).toBe(false);
  });

  it("never happens before it starts", () => {
    expect(occursOn(event({ repeat: "weekly" }), "2026-01-07")).toBe(false);
  });
});

describe("a day's list", () => {
  it("puts all-day events first, then by time", () => {
    const events = [event({ id: "c", time: "14:00", title: "Late" }), event({ id: "a", time: "09:00", title: "Early" }), event({ id: "b", title: "All day" })];

    expect(eventsOn(events, "2026-01-14").map((entry) => entry.title)).toEqual(["All day", "Early", "Late"]);
  });

  it("does not disturb the original list", () => {
    const events = [event({ id: "c", time: "14:00" }), event({ id: "a", time: "09:00" })];
    eventsOn(events, "2026-01-14");

    expect(events[0].id).toBe("c");
  });
});

describe("saved events", () => {
  it("keeps good events", () => {
    expect(sanitizeEvents([event({ time: "09:30", repeat: "yearly" })])).toEqual([event({ time: "09:30", repeat: "yearly" })]);
  });

  it("drops what cannot be an event", () => {
    expect(sanitizeEvents("nope")).toEqual([]);
    expect(sanitizeEvents([null, { id: "x" }, event({ title: "   " }), event({ date: "2026-02-31" })])).toEqual([]);
  });

  it("repairs bad fields", () => {
    const [saved] = sanitizeEvents([{ ...event(), time: "25:99", repeat: "hourly", notes: 5, title: "x".repeat(500) }]);

    expect(saved).toMatchObject({ time: "", repeat: "none", notes: "" });
    expect(saved.title).toHaveLength(120);
  });
});

describe("event times", () => {
  it("builds a local time", () => {
    expect(eventTimeAsDate(event({ time: "09:05" }), "2026-01-14")?.getHours()).toBe(9);
    expect(eventTimeAsDate(event(), "2026-01-14")).toBeNull();
  });
});
