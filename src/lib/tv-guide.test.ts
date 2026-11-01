// @vitest-environment node
import { describe, expect, it } from "vitest";
import { programmeAt, programmeProgress, sanitizeGuide } from "@/lib/tv-guide";

describe("programme progress", () => {
  const programme = { start: 100, stop: 200, title: "A" };

  it("measures how far through we are", () => {
    expect(programmeProgress(programme, 125)).toBe(0.25);
  });

  it("stays between the two ends", () => {
    expect(programmeProgress(programme, 50)).toBe(0);
    expect(programmeProgress(programme, 250)).toBe(1);
  });
});

describe("tv guide file", () => {
  it("reads good rows", () => {
    expect(sanitizeGuide({ channels: { etv: [[1, 2, "Elu"]] } }).etv).toEqual([{ start: 1, stop: 2, title: "Elu" }]);
  });

  it("gives an empty guide for anything that is not one", () => {
    for (const raw of [null, undefined, 5, "x", [], {}, { channels: null }, { channels: [] }]) {
      expect(Object.keys(sanitizeGuide(raw))).toEqual([]);
    }
  });

  it("drops bad rows and keeps good ones", () => {
    const guide = sanitizeGuide({ channels: { etv: [[1, 2, "Good"], [3, 2, "Backwards"], ["1", 2, "Text"], [1, 2, ""], [1, 2, "  "], [1, 2, 7], "row", null] } });

    expect(guide.etv).toHaveLength(1);
  });

  it("drops a channel with nothing left", () => {
    expect(Object.keys(sanitizeGuide({ channels: { etv: [[3, 2, "Bad"]], tv3: "x" } }))).toEqual([]);
  });

  it("refuses odd channel ids", () => {
    const raw = JSON.parse('{"channels":{"__proto__":[[1,2,"x"]],"a b":[[1,2,"x"]]}}');

    expect(Object.keys(sanitizeGuide(raw))).toEqual([]);
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it("has no built-in names to trip over", () => {
    expect(sanitizeGuide({ channels: {} }).constructor).toBeUndefined();
  });

  it("caps long titles", () => {
    expect(sanitizeGuide({ channels: { etv: [[1, 2, "x".repeat(500)]] } }).etv[0].title).toHaveLength(120);
  });
});

describe("what is on", () => {
  const list = [
    { start: 10, stop: 20, title: "A" },
    { start: 20, stop: 30, title: "B" },
    { start: 40, stop: 50, title: "C" },
  ];

  it("finds the programme and the next one", () => {
    expect(programmeAt(list, 15)).toEqual({ current: list[0], next: list[1] });
  });

  it("starts exactly on time and ends exactly on time", () => {
    expect(programmeAt(list, 20)?.current.title).toBe("B");
    expect(programmeAt(list, 19.9)?.current.title).toBe("A");
  });

  it("has no next after the last", () => {
    expect(programmeAt(list, 45)).toEqual({ current: list[2], next: null });
  });

  it("shows nothing in a gap or past the end of the listing", () => {
    expect(programmeAt(list, 35)).toBeNull();
    expect(programmeAt(list, 500)).toBeNull();
    expect(programmeAt(list, 5)).toBeNull();
  });

  it("shows nothing for a channel with no listing", () => {
    expect(programmeAt(undefined, 15)).toBeNull();
  });
});
