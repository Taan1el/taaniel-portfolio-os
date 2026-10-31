// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { appendHistory, HISTORY_LIMIT, loadHistory, parseHistory, recordHistory, saveHistory } from "@/lib/terminal-history";

beforeEach(() => {
  window.localStorage.clear();
});

describe("terminal history", () => {
  it("reads only strings back, and survives garbage", () => {
    expect(parseHistory('["ls", 4, null, "cd .."]')).toEqual(["ls", "cd .."]);
    expect(parseHistory("{not json")).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    expect(parseHistory(null)).toEqual([]);
  });

  it("drops entries that hold control characters, which a typed command never does", () => {
    const stored = JSON.stringify(["ls", "echo \u001b]52;c;cHduZWQ=\u0007hi", "cd ..", "x\u009b2Jy", "a\tb", "ok"]);
    expect(parseHistory(stored)).toEqual(["ls", "cd ..", "ok"]);
  });

  it("drops absurdly long saved entries and keeps only the newest", () => {
    const many = Array.from({ length: HISTORY_LIMIT + 30 }, (_, index) => `cmd ${index}`);
    const read = parseHistory(JSON.stringify([...many, "x".repeat(20_000)]));
    expect(read).toHaveLength(HISTORY_LIMIT);
    expect(read.at(-1)).toBe(`cmd ${HISTORY_LIMIT + 29}`);
  });

  it("records a command once in a row and trims the list", () => {
    const history = ["a"];
    recordHistory(history, "a");
    recordHistory(history, "b");
    expect(history).toEqual(["a", "b"]);

    const long = Array.from({ length: HISTORY_LIMIT }, (_, index) => `c${index}`);
    recordHistory(long, "newest");
    expect(long).toHaveLength(HISTORY_LIMIT);
    expect(long.at(-1)).toBe("newest");
    expect(long[0]).toBe("c1");
  });

  it("appends to what is stored, so a tab's old list cannot erase what other tabs saved", () => {
    saveHistory("shared", ["ls", "pwd"]);
    // A background tab that only remembers "old" finishes a command after the others saved theirs.
    const saved = appendHistory("shared", "Start-Sleep 30", ["old"]);
    expect(saved).toEqual(["ls", "pwd", "Start-Sleep 30"]);
    expect(loadHistory("shared")).toEqual(["ls", "pwd", "Start-Sleep 30"]);
  });

  it("does not repeat the last saved command, and keeps to the limit", () => {
    saveHistory("shared", ["same"]);
    expect(appendHistory("shared", "same")).toEqual(["same"]);
    saveHistory("shared", Array.from({ length: HISTORY_LIMIT }, (_, index) => `c${index}`));
    const saved = appendHistory("shared", "newest");
    expect(saved).toHaveLength(HISTORY_LIMIT);
    expect(saved.at(-1)).toBe("newest");
  });

  it("falls back to the tab's own list when nothing can be read from storage", () => {
    expect(appendHistory("empty", "two", ["one"])).toEqual(["one", "two"]);
    expect(loadHistory("empty")).toEqual(["one", "two"]);
  });

  it("starts the saved list over after Clear-History", () => {
    saveHistory("shared", ["a", "b", "c"]);
    expect(appendHistory("shared", "Clear-History", [], true)).toEqual(["Clear-History"]);
    expect(loadHistory("shared")).toEqual(["Clear-History"]);
  });

  it("saves and loads through localStorage", () => {
    saveHistory("test-history", ["one", "two"]);
    expect(loadHistory("test-history")).toEqual(["one", "two"]);
    expect(loadHistory("another-key")).toEqual([]);
  });
});
