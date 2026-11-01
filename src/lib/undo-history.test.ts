import { describe, expect, it } from "vitest";
import { UndoHistory, undoKey } from "@/lib/undo-history";

describe("undo history", () => {
  it("walks back and forward", () => {
    const history = new UndoHistory<string>();
    history.record("a");
    history.record("b");

    expect(history.undo("c")).toBe("b");
    expect(history.undo("b")).toBe("a");
    expect(history.canUndo).toBe(false);
    expect(history.redo("a")).toBe("b");
    expect(history.redo("b")).toBe("c");
    expect(history.canRedo).toBe(false);
  });

  it("gives nothing when there is nothing to undo", () => {
    const history = new UndoHistory<string>();

    expect(history.undo("a")).toBeUndefined();
    expect(history.redo("a")).toBeUndefined();
    expect(history.canRedo).toBe(false);
  });

  it("drops redo after a new change", () => {
    const history = new UndoHistory<string>();
    history.record("a");
    history.undo("b");
    history.record("a");

    expect(history.canRedo).toBe(false);
  });

  it("forgets the oldest step past its limit", () => {
    const history = new UndoHistory<number>(2);
    [1, 2, 3].forEach((step) => history.record(step));

    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(2);
    expect(history.canUndo).toBe(false);
  });

  it("can be held to a smaller limit for a big snapshot", () => {
    const history = new UndoHistory<number>(50);
    [1, 2, 3].forEach((step) => history.record(step, 1));

    expect(history.undo(4)).toBe(3);
    expect(history.canUndo).toBe(false);
  });

  it("clears", () => {
    const history = new UndoHistory<string>();
    history.record("a");
    history.undo("b");
    history.clear();

    expect(history.canUndo || history.canRedo).toBe(false);
  });
});

describe("undo keys", () => {
  const key = (name: string, extra: Partial<Parameters<typeof undoKey>[0]> = {}) => undoKey({ key: name, ctrlKey: true, metaKey: false, shiftKey: false, ...extra });

  it("reads the usual shortcuts", () => {
    expect(key("z")).toBe("undo");
    expect(key("Z", { shiftKey: true })).toBe("redo");
    expect(key("y")).toBe("redo");
    expect(key("z", { ctrlKey: false, metaKey: true })).toBe("undo");
  });

  it("ignores everything else", () => {
    expect(key("x")).toBeNull();
    expect(key("z", { ctrlKey: false })).toBeNull();
  });
});
