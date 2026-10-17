import { describe, expect, it } from "vitest";
import {
  deleteBackward,
  deleteForward,
  deleteToEnd,
  deleteToStart,
  deleteWordBackward,
  deleteWordForward,
  historyNext,
  historyPrevious,
  historySearch,
  insertText,
  LARGE_PASTE_LENGTH,
  MAX_LINE_LENGTH,
  MAX_PASTE_LENGTH,
  moveTo,
  reviewPaste,
  sanitizePaste,
  startHistoryWalk,
  wordLeft,
  wordRight,
  type LineState,
} from "@/lib/terminal-line";

const at = (line: string, cursor = line.length): LineState => ({ line, cursor });

describe("editing", () => {
  it("inserts at the cursor and moves past the text", () => {
    expect(insertText(at("helo", 3), "l")).toEqual({ line: "hello", cursor: 4 });
    expect(insertText(at(""), "")).toEqual(at(""));
  });

  it("cuts an insert that would pass the maximum line length", () => {
    const full = at("a".repeat(MAX_LINE_LENGTH - 2));
    const next = insertText(full, "bcdef");
    expect(next.line).toHaveLength(MAX_LINE_LENGTH);
    expect(next.line.endsWith("bc")).toBe(true);
    expect(insertText(next, "x")).toBe(next);
  });

  it("deletes backward and forward and stops at the ends", () => {
    expect(deleteBackward(at("abc", 2))).toEqual({ line: "ac", cursor: 1 });
    expect(deleteBackward(at("abc", 0))).toEqual(at("abc", 0));
    expect(deleteForward(at("abc", 1))).toEqual({ line: "ac", cursor: 1 });
    expect(deleteForward(at("abc"))).toEqual(at("abc"));
  });

  it("clamps the cursor", () => {
    expect(moveTo(at("abc", 1), 99).cursor).toBe(3);
    expect(moveTo(at("abc", 1), -4).cursor).toBe(0);
  });
});

describe("words", () => {
  it("jumps over words, treating dots, dashes, ~ and $ as part of them", () => {
    const state = at("Get-ChildItem  ~\\Docs $env", 26);
    expect(wordLeft(state)).toBe(22);
    expect(wordLeft(at("one two", 7))).toBe(4);
    expect(wordLeft(at("one two", 4))).toBe(0);
    expect(wordRight(at("one two", 0))).toBe(3);
    expect(wordRight(at("one two", 3))).toBe(7);
  });

  it("kills the word before or after the cursor", () => {
    expect(deleteWordBackward(at("cd Documents", 12))).toEqual({ line: "cd ", cursor: 3 });
    expect(deleteWordForward(at("cd Documents tail", 3))).toEqual({ line: "cd  tail", cursor: 3 });
  });

  it("kills to the start or the end of the line", () => {
    expect(deleteToStart(at("abcdef", 3))).toEqual({ line: "def", cursor: 0 });
    expect(deleteToEnd(at("abcdef", 3))).toEqual({ line: "abc", cursor: 3 });
  });
});

describe("history", () => {
  const history = ["ls", "cd Documents", "cat cv.txt", "cd Media"];

  it("walks back and returns to the draft", () => {
    let walk = startHistoryWalk(history);
    const first = historyPrevious(history, walk, "ca");
    expect(first.line).toBe("cd Media");
    walk = first.walk;
    expect(historyPrevious(history, walk, "cd Media").line).toBe("cat cv.txt");

    for (let index = 0; index < 10; index += 1) walk = historyPrevious(history, walk, "").walk;
    expect(walk.index).toBe(0);
    expect(historyPrevious(history, walk, "ls").line).toBe("ls");

    let step = historyNext(history, walk);
    for (let index = 0; index < history.length - 2; index += 1) step = historyNext(history, step.walk);
    expect(step.line).toBe("cd Media");
    step = historyNext(history, step.walk);
    expect(step.line).toBe("ca");
    expect(historyNext(history, step.walk).line).toBeNull();
  });

  it("has nowhere to go with an empty history", () => {
    expect(historyPrevious([], startHistoryWalk([]), "x").line).toBeNull();
  });

  it("searches by the prefix that was typed before the first press", () => {
    let step = historySearch(history, startHistoryWalk(history), "cd", -1);
    expect(step.line).toBe("cd Media");
    step = historySearch(history, step.walk, "cd Media", -1);
    expect(step.line).toBe("cd Documents");
    step = historySearch(history, step.walk, "cd Documents", -1);
    expect(step.line).toBeNull();

    step = historySearch(history, { index: 1, draft: "cd" }, "cd Documents", 1);
    expect(step.line).toBe("cd Media");
    step = historySearch(history, step.walk, "cd Media", 1);
    expect(step.line).toBe("cd");
  });
});

describe("paste", () => {
  it("drops control characters and expands tabs", () => {
    expect(sanitizePaste("a\tb\x03c\x1b[31md\x07")).toBe("a    bc[31md");
    expect(sanitizePaste("one\r\ntwo\nthree")).toBe("one\r\ntwo\nthree");
  });

  it("cuts a paste that is far too large to be typed", () => {
    expect(sanitizePaste("x".repeat(MAX_PASTE_LENGTH * 3))).toHaveLength(MAX_PASTE_LENGTH);
  });

  it("asks first about several lines, or a very large paste", () => {
    expect(reviewPaste("ls")).toEqual({ lines: 1, characters: 2, reason: null });
    expect(reviewPaste("ls\n").reason).toBeNull();
    expect(reviewPaste("ls\r\ncd ..").reason).toBe("multiline");
    expect(reviewPaste("ls\r\ncd ..").lines).toBe(2);
    expect(reviewPaste("x".repeat(LARGE_PASTE_LENGTH + 1)).reason).toBe("large");
    expect(reviewPaste("")).toEqual({ lines: 0, characters: 0, reason: null });
  });
});
