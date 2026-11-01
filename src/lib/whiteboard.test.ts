import { describe, expect, it } from "vitest";
import { INKS, MAX_ZOOM, boundsOf, fitView, moveShape, parseBoard, serializeBoard, simplify, strokePath, wrapLines, zoomAt, type Point, type Shape } from "@/lib/whiteboard";

const rect = (extra: Partial<Shape> = {}): Shape => ({ id: "a", kind: "rect", x: 10, y: 20, w: 100, h: 50, color: INKS[0], ...extra });

describe("drawing helpers", () => {
  it("thins a stroke but keeps both ends", () => {
    const points: Point[] = Array.from({ length: 100 }, (_, index) => [index * 0.1, 0]);
    const thin = simplify(points);

    expect(thin.length).toBeLessThan(20);
    expect(thin[0]).toEqual(points[0]);
    expect(thin.at(-1)).toEqual(points.at(-1));
  });

  it("makes a path from any number of points", () => {
    expect(strokePath([])).toBe("");
    expect(strokePath([[1, 2]])).toContain("M1 2");
    expect(strokePath([[0, 0], [10, 0], [20, 10]])).toContain("Q10 0");
  });

  it("wraps on words and hard-breaks long ones", () => {
    expect(wrapLines("one two three", 60, 10)).toEqual(["one two", "three"]);
    expect(wrapLines("a\nb", 100, 10)).toEqual(["a", "b"]);
    expect(wrapLines("x".repeat(25), 60, 10).every((line) => line.length <= 11)).toBe(true);
    expect(wrapLines("x".repeat(25), 60, 10).join("")).toHaveLength(25);
  });

  it("normalises a box drawn backwards", () => {
    expect(boundsOf(rect({ x: 100, y: 100, w: -40, h: -20 }))).toEqual({ left: 60, top: 80, right: 100, bottom: 100 });
  });

  it("moves a shape", () => {
    expect(moveShape(rect(), 5, -5)).toMatchObject({ x: 15, y: 15, w: 100 });
  });
});

describe("the view", () => {
  it("keeps the point under the pointer still when zooming", () => {
    const before = { x: 30, y: 40, zoom: 1 };
    const after = zoomAt(before, 200, 100, 2);

    expect(before.x + 200 / before.zoom).toBeCloseTo(after.x + 200 / after.zoom);
    expect(before.y + 100 / before.zoom).toBeCloseTo(after.y + 100 / after.zoom);
  });

  it("stops at the zoom limits", () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 3 }, 0, 0, 100).zoom).toBe(MAX_ZOOM);
  });

  it("fits every shape into the viewport", () => {
    const view = fitView([rect({ x: 0, y: 0, w: 1000, h: 1000 })], 500, 500);
    const right = view.x + 500 / view.zoom;

    expect(view.x).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(1000);
    expect(fitView([], 500, 500)).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe("board files", () => {
  it("round-trips", () => {
    const shapes = [rect(), rect({ id: "b", kind: "note", text: "hello" }), rect({ id: "c", kind: "pen", points: [[0, 0], [1, 1]] })];

    expect(parseBoard(serializeBoard(shapes))).toEqual(shapes);
  });

  it("survives broken files", () => {
    expect(parseBoard("not json")).toEqual([]);
    expect(parseBoard(undefined)).toEqual([]);
    expect(parseBoard('{"shapes":"x"}')).toEqual([]);
  });

  it("drops malformed shapes", () => {
    const text = JSON.stringify({ shapes: [{ kind: "virus" }, rect({ x: Number.NaN }), { ...rect(), x: "1" }, { ...rect(), kind: "pen" }, rect()] });

    expect(parseBoard(text)).toHaveLength(1);
  });

  it("will not pass an unknown colour or id into the page", () => {
    const [shape] = parseBoard(JSON.stringify({ shapes: [{ ...rect(), color: 'red"/><script>', id: '"><img>' }] }));

    expect(shape.color).toBe(INKS[0]);
    expect(shape.id).toMatch(/^[\w-]+$/);
  });

  it("caps huge coordinates, text and point lists", () => {
    const text = JSON.stringify({
      shapes: [
        { ...rect(), x: 1e12 },
        { ...rect(), kind: "note", text: "x".repeat(5000) },
        { ...rect(), kind: "pen", points: Array.from({ length: 6000 }, () => [1, 1]) },
      ],
    });
    const shapes = parseBoard(text);

    expect(shapes).toHaveLength(2);
    expect(shapes[0].text).toHaveLength(2000);
    expect(shapes[1].points).toHaveLength(4000);
  });
});
