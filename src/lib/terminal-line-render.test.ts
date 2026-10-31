import { describe, expect, it } from "vitest";
import { buildIncrementalRedraw, commonPrefixLength, sliceVisible } from "@/lib/terminal-line-render";

const PROMPT_WIDTH = 20;
const plain = (line: string) => line;
const redraw = (previous: { line: string; cursor: number }, next: { line: string; cursor: number }, options: { cols?: number; highlight?: (line: string) => string } = {}) =>
  buildIncrementalRedraw({ promptWidth: PROMPT_WIDTH, cols: options.cols ?? 80, previous, next, highlight: options.highlight ?? plain });

describe("commonPrefixLength", () => {
  it("counts the shared start", () => {
    expect(commonPrefixLength("echo hi", "echo ho")).toBe(6);
    expect(commonPrefixLength("", "x")).toBe(0);
    expect(commonPrefixLength("same", "same")).toBe(4);
    expect(commonPrefixLength("ab", "abc")).toBe(2);
  });
});

describe("sliceVisible", () => {
  const painted = "\x1b[93mGet-Date\x1b[0m \x1b[90m-Format\x1b[0m";

  it("returns everything from column 0", () => {
    expect(sliceVisible(painted, 0)).toBe(painted);
  });

  it("puts the colour that is active at the cut back in front", () => {
    expect(sliceVisible(painted, 4)).toBe("\x1b[93mDate\x1b[0m \x1b[90m-Format\x1b[0m");
  });

  it("starts clean after a reset", () => {
    expect(sliceVisible(painted, 8)).toBe(" \x1b[90m-Format\x1b[0m");
    expect(sliceVisible(painted, 9)).toBe("\x1b[90m-Format\x1b[0m");
  });

  it("copes with a cut past the end and with plain text", () => {
    expect(sliceVisible(painted, 99)).toBe("");
    expect(sliceVisible("abc", 1)).toBe("bc");
  });
});

describe("incremental redraw for screen readers", () => {
  it("writes only the typed character, never the prompt or the line so far", () => {
    expect(redraw({ line: "l", cursor: 1 }, { line: "ls", cursor: 2 })).toBe("s");
    expect(redraw({ line: "", cursor: 0 }, { line: "l", cursor: 1 })).toBe("l");
  });

  it("writes a whole pasted run, and nothing else", () => {
    expect(redraw({ line: "echo ", cursor: 5 }, { line: "echo hello world", cursor: 16 })).toBe("hello world");
  });

  it("colours the new text the way the whole line is coloured", () => {
    const highlight = (line: string) => (line.startsWith("ls") ? `\x1b[93mls\x1b[0m${line.slice(2)}` : line);
    expect(redraw({ line: "l", cursor: 1 }, { line: "ls", cursor: 2 }, { highlight })).toBe("\x1b[93ms\x1b[0m");
    expect(redraw({ line: "ls", cursor: 2 }, { line: "ls -a", cursor: 5 }, { highlight })).toBe(" -a");
  });

  it("erases a backspaced character as back, blank, back", () => {
    expect(redraw({ line: "lsx", cursor: 3 }, { line: "ls", cursor: 2 })).toBe("\b \b");
    // More than one character at once (Ctrl+W) clears silently instead of printing a blank for each.
    expect(redraw({ line: "abcd", cursor: 4 }, { line: "ab", cursor: 2 })).toBe(`\x1b[${PROMPT_WIDTH + 2 + 1}G` + "\x1b[J");
  });

  it("only moves the cursor for the arrow keys, Home and End", () => {
    const line = "echo hello";
    expect(redraw({ line, cursor: 10 }, { line, cursor: 4 })).toBe(`\x1b[${PROMPT_WIDTH + 4 + 1}G`);
    expect(redraw({ line, cursor: 4 }, { line, cursor: 10 })).toBe(`\x1b[${PROMPT_WIDTH + 10 + 1}G`);
    expect(redraw({ line, cursor: 4 }, { line, cursor: 4 })).toBe("");
  });

  it("redraws from the first changed column when a character is inserted in the middle", () => {
    // "abcd" with the cursor after "ab", then X typed: everything from the X on is written again.
    const sequence = redraw({ line: "abcd", cursor: 2 }, { line: "abXcd", cursor: 3 });
    expect(sequence).toBe(`\x1b[J` + "Xcd" + `\x1b[${PROMPT_WIDTH + 3 + 1}G`);
  });

  it("starts at the first column that really differs, even if the typed key matches the old text", () => {
    const sequence = redraw({ line: "echo helo", cursor: 7 }, { line: "echo hello", cursor: 8 });
    expect(sequence).toBe(`\x1b[${PROMPT_WIDTH + 8 + 1}G` + `\x1b[J` + "lo" + `\x1b[${PROMPT_WIDTH + 8 + 1}G`);
    expect(sequence).not.toContain("echo");
  });

  it("redraws from the first changed column for a forward delete", () => {
    expect(redraw({ line: "abcd", cursor: 1 }, { line: "acd", cursor: 1 })).toBe("\x1b[J" + "cd" + `\x1b[${PROMPT_WIDTH + 1 + 1}G`);
  });

  it("writes a recalled history line from where it differs, without the prompt", () => {
    expect(redraw({ line: "echo two", cursor: 8 }, { line: "echo one", cursor: 8 })).toBe(
      `\x1b[${PROMPT_WIDTH + 5 + 1}G` + "\x1b[J" + "one"
    );
    // A completely different line starts at the first column.
    expect(redraw({ line: "ls", cursor: 2 }, { line: "pwd", cursor: 3 })).toBe(`\x1b[${PROMPT_WIDTH + 1}G` + "\x1b[J" + "pwd");
  });

  it("clears the line, without writing, when it is reverted with Escape", () => {
    expect(redraw({ line: "echo hi", cursor: 7 }, { line: "", cursor: 0 })).toBe(`\x1b[${PROMPT_WIDTH + 1}G` + "\x1b[J");
  });

  it("steps onto the next row after text that ends exactly at the last column", () => {
    // 20 prompt columns + 4 typed = 24 columns: an 24-column screen is full.
    const sequence = redraw({ line: "abc", cursor: 3 }, { line: "abcd", cursor: 4 }, { cols: 24 });
    expect(sequence).toBe("d \b");
  });

  it("goes back up a row when the first change is on an earlier row", () => {
    const cols = 24;
    const previous = { line: "x".repeat(10), cursor: 10 }; // 20 + 10 = 30 -> second row
    const next = { line: `y${"x".repeat(9)}`, cursor: 10 };
    const sequence = redraw(previous, next, { cols });
    expect(sequence.startsWith("\x1b[1A\x1b[21G")).toBe(true);
    expect(sequence).toContain("\x1b[J");
    expect(sequence).not.toMatch(/PS|C:/);
  });

  it("uses the backspace shortcut inside a row, and not across a row boundary", () => {
    const cols = 24;
    // 20 + 5 = 25 columns and 20 + 4 = 24 are both on the second row.
    expect(redraw({ line: "abcde", cursor: 5 }, { line: "abcd", cursor: 4 }, { cols })).toBe("\b \b");
    // 20 + 4 = 24 is the second row's start, and 20 + 3 = 23 is the first row's end: \b cannot wrap back.
    const sequence = redraw({ line: "abcd", cursor: 4 }, { line: "abc", cursor: 3 }, { cols });
    expect(sequence).not.toBe("\b \b");
    expect(sequence.startsWith("\x1b[1A")).toBe(true);
  });

  it("never contains the prompt, whatever the edit", () => {
    const edits: Array<[string, string]> = [
      ["", "a"],
      ["a", ""],
      ["abc", "abcdef"],
      ["abcdef", "abc"],
      ["abc", "xyz"],
      ["abc", "aXc"],
    ];
    for (const [from, to] of edits) {
      expect(redraw({ line: from, cursor: from.length }, { line: to, cursor: to.length })).not.toContain("PS ");
    }
  });
});
