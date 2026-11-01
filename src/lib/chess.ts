/**
 * Chess rules. Squares run 0 (a8) to 63 (h1). White pieces are capitals, black are lower case, empty is "".
 * The move generator is checked against published perft counts in chess.test.ts.
 */
export interface ChessState {
  board: string[];
  whiteToMove: boolean;
  /** Any of K, Q, k, q. */
  castling: string;
  /** The square a pawn may capture en passant on, or -1. */
  enPassant: number;
  /** Half moves since a capture or pawn move, for the fifty-move rule. */
  quiet: number;
  fullMove: number;
}

export interface ChessMove {
  from: number;
  to: number;
  promotion?: string;
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const PROMOTIONS = ["q", "r", "b", "n"];

const rowOf = (square: number) => Math.floor(square / 8);
const columnOf = (square: number) => square % 8;
export const isDarkSquare = (square: number) => (rowOf(square) + columnOf(square)) % 2 === 1;
export const squareName = (square: number) => `${"abcdefgh"[columnOf(square)]}${8 - rowOf(square)}`;
const parseSquare = (name: string) => "abcdefgh".indexOf(name[0]) + (8 - Number(name[1])) * 8;
const isWhite = (piece: string) => piece !== "" && piece === piece.toUpperCase();
const isOwn = (piece: string, white: boolean) => piece !== "" && isWhite(piece) === white;

export function parseFen(fen: string): ChessState {
  const [placement, side, castling, enPassant, quiet, fullMove] = fen.split(" ");
  const board: string[] = [];
  for (const character of placement.replace(/\//g, "")) {
    if (/\d/.test(character)) board.push(...new Array<string>(Number(character)).fill(""));
    else board.push(character);
  }
  return {
    board,
    whiteToMove: side === "w",
    castling: castling === "-" ? "" : castling,
    enPassant: enPassant === "-" ? -1 : parseSquare(enPassant),
    quiet: Number(quiet ?? 0),
    fullMove: Number(fullMove ?? 1),
  };
}

export const createChess = () => parseFen(START_FEN);

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ALL = [...DIAGONAL, ...STRAIGHT];

/** Is a square attacked by the given side? Looks outward from the square, so nothing is generated. */
export function isAttacked(board: string[], square: number, byWhite: boolean) {
  const row = rowOf(square);
  const column = columnOf(square);
  const at = (r: number, c: number) => (r >= 0 && r < 8 && c >= 0 && c < 8 ? board[r * 8 + c] : "");
  const piece = (letter: string) => (byWhite ? letter.toUpperCase() : letter);

  // A white pawn attacks upward, so it sits below the square it attacks.
  const pawnRow = byWhite ? row + 1 : row - 1;
  if (at(pawnRow, column - 1) === piece("p") || at(pawnRow, column + 1) === piece("p")) return true;
  if (KNIGHT.some(([r, c]) => at(row + r, column + c) === piece("n"))) return true;
  if (ALL.some(([r, c]) => at(row + r, column + c) === piece("k"))) return true;

  const slides = (directions: number[][], letters: string[]) =>
    directions.some(([dr, dc]) => {
      for (let r = row + dr, c = column + dc; r >= 0 && r < 8 && c >= 0 && c < 8; r += dr, c += dc) {
        const found = board[r * 8 + c];
        if (found) return letters.includes(found);
      }
      return false;
    });

  return slides(DIAGONAL, [piece("b"), piece("q")]) || slides(STRAIGHT, [piece("r"), piece("q")]);
}

export function inCheck(state: ChessState, white = state.whiteToMove) {
  const king = state.board.indexOf(white ? "K" : "k");
  return king >= 0 && isAttacked(state.board, king, !white);
}

function pseudoMoves(state: ChessState) {
  const { board, whiteToMove: white, castling, enPassant } = state;
  const moves: ChessMove[] = [];

  const addPawn = (from: number, to: number) => {
    if (rowOf(to) === 0 || rowOf(to) === 7) for (const promotion of PROMOTIONS) moves.push({ from, to, promotion });
    else moves.push({ from, to });
  };

  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (!isOwn(piece, white)) continue;
    const kind = piece.toLowerCase();
    const row = rowOf(from);
    const column = columnOf(from);

    if (kind === "p") {
      const step = white ? -1 : 1;
      const ahead = (row + step) * 8 + column;
      if (!board[ahead]) {
        addPawn(from, ahead);
        const twoAhead = (row + 2 * step) * 8 + column;
        if (row === (white ? 6 : 1) && !board[twoAhead]) moves.push({ from, to: twoAhead });
      }
      for (const side of [-1, 1]) {
        const c = column + side;
        if (c < 0 || c > 7) continue;
        const to = (row + step) * 8 + c;
        if (to === enPassant || (board[to] && !isOwn(board[to], white))) addPawn(from, to);
      }
      continue;
    }

    if (kind === "n" || kind === "k") {
      for (const [dr, dc] of kind === "n" ? KNIGHT : ALL) {
        const r = row + dr;
        const c = column + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8 && !isOwn(board[r * 8 + c], white)) moves.push({ from, to: r * 8 + c });
      }
      continue;
    }

    const directions = kind === "b" ? DIAGONAL : kind === "r" ? STRAIGHT : ALL;
    for (const [dr, dc] of directions) {
      for (let r = row + dr, c = column + dc; r >= 0 && r < 8 && c >= 0 && c < 8; r += dr, c += dc) {
        const to = r * 8 + c;
        if (isOwn(board[to], white)) break;
        moves.push({ from, to });
        if (board[to]) break;
      }
    }
  }

  // Castling: the rights held, the squares between empty, and the king not moving through check.
  const home = white ? 60 : 4;
  if (board[home] === (white ? "K" : "k") && !isAttacked(board, home, !white)) {
    const rook = white ? "R" : "r";
    if (castling.includes(white ? "K" : "k") && board[home + 3] === rook && !board[home + 1] && !board[home + 2] && !isAttacked(board, home + 1, !white)) {
      moves.push({ from: home, to: home + 2 });
    }
    if (castling.includes(white ? "Q" : "q") && board[home - 4] === rook && !board[home - 1] && !board[home - 2] && !board[home - 3] && !isAttacked(board, home - 1, !white)) {
      moves.push({ from: home, to: home - 2 });
    }
  }

  return moves;
}

export function applyMove(state: ChessState, move: ChessMove): ChessState {
  const board = [...state.board];
  const { from, to } = move;
  const piece = board[from];
  const kind = piece.toLowerCase();
  const white = state.whiteToMove;
  const capture = board[to] !== "" || (kind === "p" && to === state.enPassant);

  board[to] = move.promotion ? (white ? move.promotion.toUpperCase() : move.promotion) : piece;
  board[from] = "";

  if (kind === "p" && to === state.enPassant) board[to + (white ? 8 : -8)] = "";
  if (kind === "k" && Math.abs(to - from) === 2) {
    const short = to > from;
    board[short ? to - 1 : to + 1] = board[short ? to + 1 : to - 2];
    board[short ? to + 1 : to - 2] = "";
  }

  // A right goes when the king or rook moves, or when anything lands on the rook's square.
  const lost: Record<number, string> = { 60: "KQ", 4: "kq", 63: "K", 56: "Q", 7: "k", 0: "q" };
  let castling = state.castling;
  for (const square of [from, to]) {
    for (const right of lost[square] ?? "") castling = castling.replace(right, "");
  }

  return {
    board,
    whiteToMove: !white,
    castling,
    enPassant: kind === "p" && Math.abs(to - from) === 16 ? (from + to) / 2 : -1,
    quiet: capture || kind === "p" ? 0 : state.quiet + 1,
    fullMove: state.fullMove + (white ? 0 : 1),
  };
}

export function legalMoves(state: ChessState) {
  return pseudoMoves(state).filter((move) => !inCheck(applyMove(state, move), state.whiteToMove));
}

export function perft(state: ChessState, depth: number): number {
  if (depth === 0) return 1;
  return legalMoves(state).reduce((nodes, move) => nodes + perft(applyMove(state, move), depth - 1), 0);
}

function insufficientMaterial(board: string[]) {
  const pieces = board.flatMap((piece, square) => (piece && piece.toLowerCase() !== "k" ? [{ piece: piece.toLowerCase(), square }] : []));
  if (pieces.length === 0) return true;
  if (pieces.length === 1) return pieces[0].piece === "b" || pieces[0].piece === "n";
  return pieces.every((entry) => entry.piece === "b") && new Set(pieces.map((entry) => isDarkSquare(entry.square))).size === 1;
}

/** Everything that decides whether a position has repeated, per the threefold rule. */
export const positionKey = (state: ChessState) => `${state.board.map((piece) => piece || ".").join("")}|${state.whiteToMove}|${state.castling}|${state.enPassant}`;

export type ChessResult =
  | { over: false; check: boolean }
  | { over: true; reason: "checkmate"; winner: "white" | "black" }
  | { over: true; reason: "stalemate" | "fifty moves" | "repetition" | "insufficient material"; winner: null };

export function resultOf(state: ChessState, history: string[] = []): ChessResult {
  const check = inCheck(state);
  if (legalMoves(state).length === 0) {
    return check ? { over: true, reason: "checkmate", winner: state.whiteToMove ? "black" : "white" } : { over: true, reason: "stalemate", winner: null };
  }
  if (state.quiet >= 100) return { over: true, reason: "fifty moves", winner: null };
  if (insufficientMaterial(state.board)) return { over: true, reason: "insufficient material", winner: null };
  const key = positionKey(state);
  if (history.filter((entry) => entry === key).length >= 3) return { over: true, reason: "repetition", winner: null };
  return { over: false, check };
}

/** Standard algebraic notation for a legal move, such as Nbd7, exd5, O-O or e8=Q+. */
export function moveName(state: ChessState, move: ChessMove) {
  const piece = state.board[move.from];
  const kind = piece.toLowerCase();
  const next = applyMove(state, move);
  const after = legalMoves(next).length === 0 && inCheck(next) ? "#" : inCheck(next) ? "+" : "";

  if (kind === "k" && Math.abs(move.to - move.from) === 2) return `${move.to > move.from ? "O-O" : "O-O-O"}${after}`;

  const capture = state.board[move.to] !== "" || (kind === "p" && move.to === state.enPassant);
  if (kind === "p") {
    const from = capture ? `${"abcdefgh"[columnOf(move.from)]}x` : "";
    return `${from}${squareName(move.to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ""}${after}`;
  }

  const rivals = legalMoves(state).filter((other) => other.to === move.to && other.from !== move.from && state.board[other.from] === piece);
  let origin = "";
  if (rivals.length) {
    const sameColumn = rivals.some((other) => columnOf(other.from) === columnOf(move.from));
    const sameRow = rivals.some((other) => rowOf(other.from) === rowOf(move.from));
    if (!sameColumn) origin = "abcdefgh"[columnOf(move.from)];
    else if (!sameRow) origin = String(8 - rowOf(move.from));
    else origin = squareName(move.from);
  }
  return `${kind.toUpperCase()}${origin}${capture ? "x" : ""}${squareName(move.to)}${after}`;
}

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/** Encourages pawns forward and pieces to the centre. Written for white, a8 first. */
const CENTRE = [
  -30, -20, -10, -10, -10, -10, -20, -30,
  -20, -5, 0, 5, 5, 0, -5, -20,
  -10, 0, 10, 15, 15, 10, 0, -10,
  -10, 5, 15, 25, 25, 15, 5, -10,
  -10, 5, 15, 25, 25, 15, 5, -10,
  -10, 0, 10, 15, 15, 10, 0, -10,
  -20, -5, 0, 5, 5, 0, -5, -20,
  -30, -20, -10, -10, -10, -10, -20, -30,
];

function pieceValue(piece: string, square: number) {
  const kind = piece.toLowerCase();
  const mirrored = isWhite(piece) ? square : 63 - square;
  if (kind === "p") return 100 + (6 - rowOf(mirrored)) * 8 + (columnOf(square) === 3 || columnOf(square) === 4 ? 6 : 0);
  if (kind === "k") return rowOf(mirrored) === 7 ? 20 : -20;
  return VALUES[kind] + CENTRE[square] / (kind === "n" ? 1 : 2);
}

function evaluate(board: string[], whiteToMove: boolean) {
  let score = 0;
  board.forEach((piece, square) => {
    if (piece) score += (isWhite(piece) ? 1 : -1) * pieceValue(piece, square);
  });
  return whiteToMove ? score : -score;
}

const MATE = 100000;

/** Likely-good moves first, which makes alpha-beta cut far more of the tree. */
function ordered(state: ChessState, moves: ChessMove[]) {
  const worth = (move: ChessMove) => {
    const victim = state.board[move.to].toLowerCase();
    return (victim ? 10 * VALUES[victim] - VALUES[state.board[move.from].toLowerCase()] : 0) + (move.promotion === "q" ? 800 : 0);
  };
  return [...moves].sort((a, b) => worth(b) - worth(a));
}

/** Keeps searching captures, so the depth limit does not stop halfway through an exchange. */
function quiesce(state: ChessState, alpha: number, beta: number, depth: number): number {
  const stand = evaluate(state.board, state.whiteToMove);
  if (depth <= 0 || stand >= beta) return stand;
  let floor = Math.max(alpha, stand);
  for (const move of ordered(state, legalMoves(state).filter((entry) => state.board[entry.to] !== ""))) {
    const score = -quiesce(applyMove(state, move), -beta, -floor, depth - 1);
    if (score >= beta) return score;
    floor = Math.max(floor, score);
  }
  return floor;
}

function search(state: ChessState, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(state);
  if (moves.length === 0) return inCheck(state) ? -MATE - depth : 0;
  if (state.quiet >= 100) return 0;
  if (depth === 0) return quiesce(state, alpha, beta, 3);

  let floor = alpha;
  for (const move of ordered(state, moves)) {
    const score = -search(applyMove(state, move), depth - 1, -beta, -floor);
    if (score >= beta) return score;
    floor = Math.max(floor, score);
  }
  return floor;
}

/** The computer's move. `noise` makes the easier levels human by picking among near-equal moves. */
export function chooseMove(state: ChessState, depth: number, noise = 0, random: () => number = Math.random): ChessMove | null {
  let best: ChessMove | null = null;
  let bestScore = -Infinity;

  for (const move of ordered(state, legalMoves(state))) {
    // Anything that cannot beat the best so far, even with the noise added, can be cut short.
    const score = -search(applyMove(state, move), depth - 1, -Infinity, -(bestScore - noise)) + random() * noise;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

export interface ReplayedGame {
  state: ChessState;
  positions: string[];
  names: string[];
}

/** Rebuilds a game from its moves. Saves are only moves, so an illegal one simply ends the replay. */
export function replay(moves: unknown): ReplayedGame & { moves: ChessMove[] } {
  let state = createChess();
  const positions = [positionKey(state)];
  const names: string[] = [];
  const played: ChessMove[] = [];

  if (Array.isArray(moves)) {
    for (const entry of moves.slice(0, 2000)) {
      const move = entry as Partial<ChessMove> | null;
      const legal = legalMoves(state).find((option) => option.from === move?.from && option.to === move?.to && option.promotion === (move?.promotion ?? undefined));
      if (!legal) break;
      names.push(moveName(state, legal));
      state = applyMove(state, legal);
      positions.push(positionKey(state));
      played.push(legal);
    }
  }

  return { state, positions, names, moves: played };
}
