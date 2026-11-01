/** English draughts on an 8 by 8 board. Squares run 0-63 from the top left; only dark ones are used. */
export type Side = 1 | -1;
export const RED: Side = 1;
export const WHITE: Side = -1;
const MAN = 1;
const KING = 2;
export const DRAW_AFTER_QUIET_MOVES = 80;

export interface CheckersState {
  /** Positive is red (moves up), negative is white. 1 is a man and 2 a king. */
  board: number[];
  turn: Side;
  /** Plies since the last capture or crowning. */
  quiet: number;
}

export interface CheckersMove {
  /** Squares landed on, starting with the piece's own. */
  path: number[];
  captured: number[];
}

const rowOf = (square: number) => Math.floor(square / 8);
const columnOf = (square: number) => square % 8;
export const isDark = (square: number) => (rowOf(square) + columnOf(square)) % 2 === 1;

export function createCheckers(): CheckersState {
  const board = new Array<number>(64).fill(0);
  for (let square = 0; square < 64; square += 1) {
    if (!isDark(square)) continue;
    if (rowOf(square) < 3) board[square] = WHITE * MAN;
    else if (rowOf(square) > 4) board[square] = RED * MAN;
  }
  return { board, turn: RED, quiet: 0 };
}

function directions(piece: number) {
  if (Math.abs(piece) === KING) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return piece > 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

const inside = (row: number, column: number) => row >= 0 && row < 8 && column >= 0 && column < 8;
const crownRow = (piece: number) => (piece > 0 ? 0 : 7);

function slides(board: number[], from: number): CheckersMove[] {
  const moves: CheckersMove[] = [];
  for (const [down, across] of directions(board[from])) {
    const row = rowOf(from) + down;
    const column = columnOf(from) + across;
    if (inside(row, column) && !board[row * 8 + column]) {
      moves.push({ path: [from, row * 8 + column], captured: [] });
    }
  }
  return moves;
}

/** Every full chain of jumps from a square. A man that reaches the far row stops there. */
function jumps(board: number[], from: number, piece: number, path: number[], captured: number[]): CheckersMove[] {
  const chains: CheckersMove[] = [];

  for (const [down, across] of directions(piece)) {
    const overRow = rowOf(from) + down;
    const overColumn = columnOf(from) + across;
    const landRow = overRow + down;
    const landColumn = overColumn + across;
    if (!inside(landRow, landColumn)) continue;

    const over = overRow * 8 + overColumn;
    const land = landRow * 8 + landColumn;
    const enemy = Math.sign(board[over]) === -Math.sign(piece);
    if (!enemy || captured.includes(over) || (board[land] && land !== path[0])) continue;

    const nextPath = [...path, land];
    const nextCaptured = [...captured, over];
    const crowned = Math.abs(piece) === MAN && landRow === crownRow(piece);
    const further = crowned ? [] : jumps(board, land, piece, nextPath, nextCaptured);
    chains.push(...(further.length ? further : [{ path: nextPath, captured: nextCaptured }]));
  }

  return chains;
}

export function legalMoves(state: CheckersState): CheckersMove[] {
  const { board, turn } = state;
  const captures: CheckersMove[] = [];
  const quiet: CheckersMove[] = [];

  for (let square = 0; square < 64; square += 1) {
    if (Math.sign(board[square]) !== turn) continue;
    captures.push(...jumps(board, square, board[square], [square], []));
    quiet.push(...slides(board, square));
  }

  // Taking is compulsory.
  return captures.length ? captures : quiet;
}

export function applyMove(state: CheckersState, move: CheckersMove): CheckersState {
  const board = [...state.board];
  const from = move.path[0];
  const to = move.path[move.path.length - 1];
  const piece = board[from];
  const crowned = Math.abs(piece) === MAN && rowOf(to) === crownRow(piece);

  board[from] = 0;
  for (const square of move.captured) board[square] = 0;
  board[to] = crowned ? Math.sign(piece) * KING : piece;

  return { board, turn: -state.turn as Side, quiet: move.captured.length || crowned ? 0 : state.quiet + 1 };
}

export type CheckersResult = { over: false } | { over: true; winner: Side | null };

export function resultOf(state: CheckersState): CheckersResult {
  if (legalMoves(state).length === 0) return { over: true, winner: -state.turn as Side };
  if (state.quiet >= DRAW_AFTER_QUIET_MOVES) return { over: true, winner: null };
  return { over: false };
}

/** Material, plus a small reward for advancing men and holding the centre. */
function evaluate(state: CheckersState) {
  let score = 0;
  state.board.forEach((piece, square) => {
    if (!piece) return;
    const owner = Math.sign(piece);
    const advance = owner > 0 ? 7 - rowOf(square) : rowOf(square);
    const centre = 3.5 - Math.abs(columnOf(square) - 3.5);
    const value = Math.abs(piece) === KING ? 170 + centre * 2 : 100 + advance * 3 + centre;
    score += owner * value;
  });
  return score * state.turn;
}

function search(state: CheckersState, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(state);
  if (moves.length === 0) return -100000 - depth;
  if (depth <= 0 && !moves[0].captured.length) return evaluate(state);
  // Captures keep searching a little, so the AI does not stop mid-exchange.
  if (depth < -6) return evaluate(state);

  let best = -Infinity;
  let floor = alpha;
  for (const move of moves) {
    const score = -search(applyMove(state, move), depth - 1, -beta, -floor);
    best = Math.max(best, score);
    floor = Math.max(floor, score);
    if (floor >= beta) break;
  }
  return best;
}

export function chooseMove(state: CheckersState, depth: number, random: () => number = Math.random) {
  const moves = legalMoves(state);
  let best: CheckersMove[] = [];
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = -search(applyMove(state, move), depth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }

  return best[Math.floor(random() * best.length)] ?? null;
}

/** Checks a saved game before it is trusted. */
export function isValidCheckers(value: unknown): value is CheckersState {
  const state = value as Partial<CheckersState> | null;
  return (
    Array.isArray(state?.board) &&
    state.board.length === 64 &&
    state.board.every((piece, square) => [0, 1, 2, -1, -2].includes(piece) && (piece === 0 || isDark(square))) &&
    (state.turn === RED || state.turn === WHITE) &&
    Number.isInteger(state.quiet) &&
    (state.quiet as number) >= 0
  );
}
