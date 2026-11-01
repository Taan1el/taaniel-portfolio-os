import { describe, expect, it } from "vitest";
import {
  DRAW_AFTER_QUIET_MOVES,
  RED,
  WHITE,
  applyMove,
  chooseMove,
  createCheckers,
  isDark,
  isValidCheckers,
  legalMoves,
  resultOf,
  type CheckersState,
} from "@/lib/checkers";

const square = (row: number, column: number) => row * 8 + column;

function position(pieces: [number, number, number][], turn = RED): CheckersState {
  const board = new Array<number>(64).fill(0);
  for (const [row, column, piece] of pieces) board[square(row, column)] = piece;
  return { board, turn, quiet: 0 };
}

describe("checkers rules", () => {
  it("starts with 12 pieces a side and 7 opening moves", () => {
    const game = createCheckers();

    expect(game.board.filter((piece) => piece > 0)).toHaveLength(12);
    expect(game.board.filter((piece) => piece < 0)).toHaveLength(12);
    expect(game.board.every((piece, index) => !piece || isDark(index))).toBe(true);
    expect(legalMoves(game)).toHaveLength(7);
  });

  it("moves men forward only", () => {
    const moves = legalMoves(position([[4, 3, 1]]));

    expect(moves.map((move) => move.path[1]).sort((a, b) => a - b)).toEqual([square(3, 2), square(3, 4)]);
  });

  it("moves kings both ways", () => {
    expect(legalMoves(position([[4, 3, 2]]))).toHaveLength(4);
  });

  it("makes capturing compulsory", () => {
    const moves = legalMoves(position([[5, 2, 1], [4, 3, -1], [5, 6, 1]]));

    expect(moves).toEqual([{ path: [square(5, 2), square(3, 4)], captured: [square(4, 3)] }]);
  });

  it("must finish a chain of jumps", () => {
    const moves = legalMoves(position([[5, 0, 1], [4, 1, -1], [2, 3, -1]]));

    expect(moves).toHaveLength(1);
    expect(moves[0].path).toEqual([square(5, 0), square(3, 2), square(1, 4)]);
    expect(moves[0].captured).toHaveLength(2);
  });

  it("offers each branch of a jump", () => {
    const moves = legalMoves(position([[5, 2, 1], [4, 3, -1], [2, 3, -1], [2, 5, -1]]));

    expect(moves).toHaveLength(2);
  });

  it("does not jump the same piece twice", () => {
    const moves = legalMoves(position([[3, 2, 2], [2, 3, -1]]));

    expect(moves).toHaveLength(1);
    expect(moves[0].captured).toEqual([square(2, 3)]);
  });

  it("crowns a man and ends its turn there", () => {
    const state = position([[2, 1, 1], [1, 2, -1], [1, 4, -1]]);
    const moves = legalMoves(state);

    expect(moves).toHaveLength(1);
    expect(moves[0].path).toHaveLength(2);
    expect(applyMove(state, moves[0]).board[square(0, 3)]).toBe(2);
  });

  it("removes captured pieces and passes the turn", () => {
    const state = position([[5, 2, 1], [4, 3, -1]]);
    const next = applyMove(state, legalMoves(state)[0]);

    expect(next.board[square(4, 3)]).toBe(0);
    expect(next.turn).toBe(WHITE);
    expect(next.quiet).toBe(0);
  });

  it("is lost with no moves left, and drawn after a long quiet spell", () => {
    expect(resultOf(position([[0, 1, -2]]))).toEqual({ over: true, winner: WHITE });
    expect(resultOf(position([[7, 0, 1], [6, 1, -1], [5, 2, -1]]))).toEqual({ over: true, winner: WHITE });
    expect(resultOf({ ...position([[5, 2, 2], [2, 3, -2]]), quiet: DRAW_AFTER_QUIET_MOVES })).toEqual({ over: true, winner: null });
    expect(resultOf(createCheckers())).toEqual({ over: false });
  });
});

describe("checkers AI", () => {
  it("takes a free win", () => {
    const state = position([[5, 2, 1], [4, 3, -1]]);

    expect(chooseMove(state, 3)?.captured).toEqual([square(4, 3)]);
  });

  it("avoids walking into a capture when it can", () => {
    // Moving to (3,6) would be taken by the man on (2,5); (3,4) would not... both are checked by search.
    const state = position([[4, 5, 1], [2, 7, -1], [7, 0, 1]]);
    const move = chooseMove(state, 4, () => 0);

    expect(move).not.toBeNull();
    const after = applyMove(state, move as NonNullable<typeof move>);
    expect(legalMoves(after).every((reply) => reply.captured.length === 0)).toBe(true);
  });

  it("plays a whole game with only legal moves", () => {
    let game = createCheckers();
    let plies = 0;

    while (!resultOf(game).over && plies < 400) {
      const move = chooseMove(game, 2, () => 0.5);
      expect(legalMoves(game)).toContainEqual(move);
      game = applyMove(game, move as NonNullable<typeof move>);
      plies += 1;
    }

    expect(resultOf(game).over).toBe(true);
  });
});

describe("checkers saves", () => {
  it("rejects anything that is not a real position", () => {
    expect(isValidCheckers(createCheckers())).toBe(true);
    expect(isValidCheckers({ ...createCheckers(), board: [1, 2] })).toBe(false);
    expect(isValidCheckers({ ...createCheckers(), turn: 3 })).toBe(false);
    const onLight = createCheckers();
    onLight.board[0] = 1;
    expect(isValidCheckers(onLight)).toBe(false);
    expect(isValidCheckers(null)).toBe(false);
  });
});
