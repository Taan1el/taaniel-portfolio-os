import { describe, expect, it } from "vitest";
import { boxFromPoints, boxesIntersect, combineMarqueeSelection, getBoxSize, getMarqueeHits } from "@/lib/marquee";

describe("marquee geometry", () => {
  it("builds the same box whichever way the drag goes", () => {
    const expected = { left: 10, top: 20, right: 110, bottom: 70 };

    expect(boxFromPoints({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual(expected);
    expect(boxFromPoints({ x: 110, y: 70 }, { x: 10, y: 20 })).toEqual(expected);
    expect(boxFromPoints({ x: 110, y: 20 }, { x: 10, y: 70 })).toEqual(expected);
    expect(getBoxSize(expected)).toEqual({ width: 100, height: 50 });
  });

  it("intersects overlapping boxes but not ones that only touch", () => {
    const box = { left: 0, top: 0, right: 10, bottom: 10 };

    expect(boxesIntersect(box, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(boxesIntersect(box, { left: 2, top: 2, right: 4, bottom: 4 })).toBe(true);
    expect(boxesIntersect(box, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(boxesIntersect(box, { left: 20, top: 20, right: 30, bottom: 30 })).toBe(false);
  });

  it("returns the ids the marquee touches, in order", () => {
    const items = [
      { id: "a", box: { left: 0, top: 0, right: 50, bottom: 50 } },
      { id: "b", box: { left: 60, top: 0, right: 110, bottom: 50 } },
      { id: "c", box: { left: 0, top: 60, right: 50, bottom: 110 } },
    ];

    expect(getMarqueeHits(items, { left: 40, top: 10, right: 70, bottom: 30 })).toEqual(["a", "b"]);
    expect(getMarqueeHits(items, { left: 200, top: 200, right: 210, bottom: 210 })).toEqual([]);
  });

  it("replaces the selection normally and flips it relative to the old one with Ctrl", () => {
    expect(combineMarqueeSelection(["a", "b"], ["c"], false)).toEqual(["c"]);
    expect(combineMarqueeSelection(["a", "b"], ["b", "c"], true)).toEqual(["a", "c"]);
    expect(combineMarqueeSelection([], ["x"], true)).toEqual(["x"]);
  });
});
