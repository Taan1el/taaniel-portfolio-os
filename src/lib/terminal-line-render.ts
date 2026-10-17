/*
 * What to write to the screen when the line being typed changes.
 *
 * The usual repaint rewrites the prompt and the whole line on every keystroke.
 * That is fine to look at, but xterm's screen reader support announces every
 * character that is printed (except the one that was just typed), so with a
 * screen reader each keypress would read out "PS C:\Users\Taaniel>" and the
 * line so far. Screen reader mode therefore writes only what changed: the
 * inserted text, a backspace as "\b \b", or everything from the first changed
 * column on. Pure functions over strings, so the sequences can be tested.
 */

export interface DrawnInput {
  line: string;
  /** Offset within the line. */
  cursor: number;
}

/** Number of leading characters two lines share. */
export function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) index += 1;
  return index;
}

// eslint-disable-next-line no-control-regex
const COLOUR_ESCAPE = /\x1b\[[0-9;]*m/y;
// eslint-disable-next-line no-control-regex
const COLOUR_RESET = /^\x1b\[0*m$/;

/**
 * The part of `highlighted` (a line carrying colour escapes) from visible column
 * `from` on, with the colour that is active at that column put back in front.
 * The highlighter only adds escapes, so one character of the line is one visible column.
 */
export function sliceVisible(highlighted: string, from: number): string {
  let index = 0;
  let visible = 0;
  let active = "";
  while (index < highlighted.length) {
    COLOUR_ESCAPE.lastIndex = index;
    const match = COLOUR_ESCAPE.exec(highlighted);
    if (match) {
      // Escapes right at the cut are folded in too, so a reset there does not leave an empty colour behind.
      active = COLOUR_RESET.test(match[0]) ? "" : `${active}${match[0]}`;
      index += match[0].length;
    } else if (visible < from) {
      visible += 1;
      index += 1;
    } else {
      break;
    }
  }
  return `${active}${highlighted.slice(index)}`;
}

export interface IncrementalRedrawInput {
  /** Visible width of the prompt, which the line starts after. */
  promptWidth: number;
  cols: number;
  /** What is on the screen now, and where the cursor is in it. */
  previous: DrawnInput;
  next: DrawnInput;
  /** Adds colour escapes to a whole line without changing its visible text. */
  highlight: (line: string) => string;
}

/**
 * The escape sequence that turns `previous` into `next` on screen, leaving the
 * prompt and everything left of the first change alone.
 */
export function buildIncrementalRedraw({ promptWidth, cols, previous, next, highlight }: IncrementalRedrawInput): string {
  const at = (column: number) => promptWidth + column;
  const rowOf = (index: number) => Math.floor(index / cols);
  /** Writing exactly to the last column leaves xterm waiting to wrap; step onto the next row. */
  const settle = (end: number) => (end > 0 && end % cols === 0 ? " \b" : "");
  const move = (from: number, to: number) => {
    if (from === to) return "";
    const rows = rowOf(to) - rowOf(from);
    const vertical = rows < 0 ? `\x1b[${-rows}A` : rows > 0 ? `\x1b[${rows}B` : "";
    return `${vertical}\x1b[${(to % cols) + 1}G`;
  };
  const tail = (column: number) => sliceVisible(highlight(next.line), column);

  const prefix = commonPrefixLength(previous.line, next.line);
  const cursorAtEnd = previous.cursor === previous.line.length;

  // Typing or pasting at the end of the line: write just the new text. The first character is
  // the key that was pressed, which the screen reader has been told to expect.
  if (cursorAtEnd && prefix === previous.line.length && next.line.length > previous.line.length) {
    const end = at(next.line.length);
    return `${tail(previous.line.length)}${settle(end)}${move(end, at(next.cursor))}`;
  }

  // Backspace at the end of the line, within one row: back, blank, back. Deleting more than one
  // character (a word, the whole line) clears silently below instead of printing a blank for each.
  if (
    cursorAtEnd &&
    next.cursor === next.line.length &&
    prefix === next.line.length &&
    next.line.length === previous.line.length - 1 &&
    rowOf(at(previous.line.length)) === rowOf(at(next.line.length))
  ) {
    return "\b \b";
  }

  // Nothing but the cursor moved.
  if (prefix === previous.line.length && prefix === next.line.length) return move(at(previous.cursor), at(next.cursor));

  // Anything else: back to the first changed column, clear from there, write the rest.
  let sequence = move(at(previous.cursor), at(prefix));
  const end = at(next.line.length);
  sequence += `\x1b[J${tail(prefix)}${settle(end)}`;
  return `${sequence}${move(end, at(next.cursor))}`;
}
