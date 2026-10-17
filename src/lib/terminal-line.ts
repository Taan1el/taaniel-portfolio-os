/*
 * Line editing for the terminal, the part PSReadLine does: a line of text, a
 * cursor, word movement and history. Pure functions over a small state, so the
 * keyboard behaviour can be tested without a terminal on screen.
 */

export interface LineState {
  line: string;
  cursor: number;
}

/** The longest line the editor takes. A paste past it is cut, so a runaway paste cannot freeze the repaint. */
export const MAX_LINE_LENGTH = 32_768;

/** Pastes longer than this ask first, as Windows Terminal does (it warns past 5 KiB). */
export const LARGE_PASTE_LENGTH = 5120;

/** The most a single paste (or the input typed ahead while a command runs) can carry. The rest is dropped. */
export const MAX_PASTE_LENGTH = 65_536;

const isWordChar = (char: string | undefined) => Boolean(char && /[\w.\-~$]/.test(char));

const clampCursor = (state: LineState): LineState => ({
  line: state.line,
  cursor: Math.min(state.line.length, Math.max(0, state.cursor)),
});

export function insertText(state: LineState, text: string): LineState {
  const room = MAX_LINE_LENGTH - state.line.length;
  if (room <= 0 || !text) return state;
  const piece = text.length > room ? text.slice(0, room) : text;
  return {
    line: `${state.line.slice(0, state.cursor)}${piece}${state.line.slice(state.cursor)}`,
    cursor: state.cursor + piece.length,
  };
}

export function wordLeft(state: LineState): number {
  let index = state.cursor;
  while (index > 0 && !isWordChar(state.line[index - 1])) index -= 1;
  while (index > 0 && isWordChar(state.line[index - 1])) index -= 1;
  return index;
}

export function wordRight(state: LineState): number {
  let index = state.cursor;
  while (index < state.line.length && !isWordChar(state.line[index])) index += 1;
  while (index < state.line.length && isWordChar(state.line[index])) index += 1;
  return index;
}

export function moveTo(state: LineState, cursor: number): LineState {
  return clampCursor({ line: state.line, cursor });
}

export function deleteBackward(state: LineState): LineState {
  if (state.cursor <= 0) return state;
  return { line: `${state.line.slice(0, state.cursor - 1)}${state.line.slice(state.cursor)}`, cursor: state.cursor - 1 };
}

export function deleteForward(state: LineState): LineState {
  if (state.cursor >= state.line.length) return state;
  return { line: `${state.line.slice(0, state.cursor)}${state.line.slice(state.cursor + 1)}`, cursor: state.cursor };
}

/** Ctrl+W and Ctrl+Backspace: PSReadLine's BackwardKillWord. */
export function deleteWordBackward(state: LineState): LineState {
  const start = wordLeft(state);
  return { line: `${state.line.slice(0, start)}${state.line.slice(state.cursor)}`, cursor: start };
}

/** Ctrl+Delete: KillWord. */
export function deleteWordForward(state: LineState): LineState {
  const end = wordRight(state);
  return { line: `${state.line.slice(0, state.cursor)}${state.line.slice(end)}`, cursor: state.cursor };
}

/** Ctrl+Home: BackwardDeleteLine. */
export function deleteToStart(state: LineState): LineState {
  return { line: state.line.slice(state.cursor), cursor: 0 };
}

/** Ctrl+End: ForwardDeleteLine. */
export function deleteToEnd(state: LineState): LineState {
  return { line: state.line.slice(0, state.cursor), cursor: state.cursor };
}

// ------------------------------------------------------------------- history

/**
 * Walks the command history the way the up and down arrows do. `index` equals
 * history.length while the person is on the line they are typing (the draft).
 */
export interface HistoryWalk {
  index: number;
  draft: string;
}

export function startHistoryWalk(history: string[]): HistoryWalk {
  return { index: history.length, draft: "" };
}

export interface HistoryStep {
  walk: HistoryWalk;
  /** The line to show now, or null when there is nowhere to go. */
  line: string | null;
}

/** Up arrow: the previous entry. The first step remembers what was typed so Down can bring it back. */
export function historyPrevious(history: string[], walk: HistoryWalk, current: string): HistoryStep {
  if (!history.length) return { walk, line: null };
  const draft = walk.index === history.length ? current : walk.draft;
  const index = Math.max(0, walk.index - 1);
  return { walk: { index, draft }, line: history[index] ?? "" };
}

/** Down arrow: the next entry, ending on the draft. */
export function historyNext(history: string[], walk: HistoryWalk): HistoryStep {
  if (walk.index >= history.length) return { walk, line: null };
  const index = walk.index + 1;
  return { walk: { index, draft: walk.draft }, line: index === history.length ? walk.draft : history[index] ?? "" };
}

/**
 * F8 / Shift+F8: the previous or next entry that starts with what was typed
 * before the first press (PSReadLine's HistorySearchBackward and Forward).
 */
export function historySearch(history: string[], walk: HistoryWalk, current: string, direction: -1 | 1): HistoryStep {
  const prefix = walk.index === history.length ? current : walk.draft;
  const draft = walk.index === history.length ? current : walk.draft;
  for (let index = walk.index + direction; index >= 0 && index < history.length; index += direction) {
    if (history[index].startsWith(prefix)) return { walk: { index, draft }, line: history[index] };
  }
  if (direction === 1 && walk.index < history.length) return { walk: { index: history.length, draft }, line: draft };
  return { walk, line: null };
}

// --------------------------------------------------------------------- paste

/** Text that arrives by paste is data: control characters would drive the line editor as if typed. */
export function sanitizePaste(text: string): string {
  return (
    text
      .slice(0, MAX_PASTE_LENGTH)
      .replace(/\t/g, "    ")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
      .slice(0, MAX_PASTE_LENGTH)
  );
}

export interface PasteReview {
  lines: number;
  characters: number;
  /** Why the person should be asked first, if they should. */
  reason: "multiline" | "large" | null;
}

/** What Windows Terminal checks before it pastes: more than one line, or a very large amount of text. */
export function reviewPaste(text: string): PasteReview {
  const trimmed = text.replace(/[\r\n]+$/, "");
  const lines = trimmed === "" ? 0 : trimmed.split(/\r\n|\r|\n/).length;
  const reason = lines > 1 ? "multiline" : text.length > LARGE_PASTE_LENGTH ? "large" : null;
  return { lines, characters: text.length, reason };
}
