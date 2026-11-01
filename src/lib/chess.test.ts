import { describe, expect, it } from "vitest";
import { START_FEN, applyMove, chooseMove, createChess, inCheck, isDarkSquare, legalMoves, moveName, parseFen, perft, positionKey, replay, resultOf, squareName, type ChessMove, type ChessState } from "@/lib/chess";

const square = (name: string) => "abcdefgh".indexOf(name[0]) + (8 - Number(name[1])) * 8;
const move = (from: string, to: string, promotion?: string): ChessMove => ({ from: square(from), to: square(to), ...(promotion ? { promotion } : {}) });
const named = (state: ChessState) => legalMoves(state).map((entry) => moveName(state, entry));
function play(names: string[], state = createChess()) {
  return names.reduce((current, name) => {
    const found = legalMoves(current).find((entry) => moveName(current, entry) === name);
    if (!found) throw new Error(`Illegal: ${name}`);
    return applyMove(current, found);
  }, state);
}

describe("move generation, against published perft counts", () => {
  // Node counts from the Chess Programming Wiki's Perft Results page.
  it.each([
    ["the start", START_FEN, [20, 400, 8902, 197281]],
    ["Kiwipete, which stresses castling and pins", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", [48, 2039, 97862]],
    ["position 3, with en passant pins", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238]],
    ["position 4, with promotions", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467]],
    ["position 5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]],
    ["position 6", "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", [46, 2079, 89890]],
  ])("%s", (_name, fen, counts) => {
    counts.forEach((count, index) => expect(perft(parseFen(fen), index + 1)).toBe(count));
  });
});

describe("special moves", () => {
  it("captures en passant, only straight after the double step", () => {
    const state = play(["e4", "a6", "e5", "d5"]);

    expect(named(state)).toContain("exd6");
    expect(applyMove(state, move("e5", "d6")).board[square("d5")]).toBe("");
    expect(named(play(["h3", "h6"], state))).not.toContain("exd6");
  });

  it("castles both ways and moves the rook", () => {
    const short = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const after = applyMove(short, move("e1", "g1"));

    expect(named(short)).toEqual(expect.arrayContaining(["O-O", "O-O-O"]));
    expect(after.board[square("f1")]).toBe("R");
    expect(after.board[square("h1")]).toBe("");
    expect(after.castling).toBe("kq");
    expect(applyMove(short, move("e1", "c1")).board[square("d1")]).toBe("R");
  });

  it("will not castle out of, through or into check", () => {
    const named_ = (fen: string) => named(parseFen(fen));

    expect(named_("4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1")).not.toContain("O-O");
    expect(named_("5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1")).not.toContain("O-O");
    expect(named_("6r1/8/8/8/8/8/8/R3K2R w KQ - 0 1")).not.toContain("O-O");
    expect(named_("1r6/8/8/8/8/8/8/R3K2R w KQ - 0 1")).toContain("O-O-O");
  });

  it("loses castling rights when the rook is captured", () => {
    const state = parseFen("r3k2r/8/8/8/8/8/6n1/R3K2R b KQkq - 0 1");

    // The white rook leaves h1 and takes the one on h8, so each side loses its king-side right.
    expect(applyMove(applyMove(state, move("g2", "e3")), move("h1", "h8")).castling).toBe("Qq");
  });

  it("offers all four promotions", () => {
    expect(named(parseFen("8/P7/8/8/8/8/8/k1K5 w - - 0 1")).filter((name) => name.startsWith("a8"))).toEqual(["a8=Q#", "a8=R#", "a8=B", "a8=N"]);
    expect(applyMove(parseFen("8/P7/8/8/8/8/8/k1K5 w - - 0 1"), move("a7", "a8", "n")).board[square("a8")]).toBe("N");
  });

  it("will not leave the king in check", () => {
    const pinned = parseFen("4r2k/8/8/8/8/4N3/8/4K3 w - - 0 1");

    expect(legalMoves(pinned).filter((entry) => entry.from === square("e3"))).toEqual([]);
  });
});

describe("how games end", () => {
  it("knows fool's mate", () => {
    expect(resultOf(play(["f3", "e5", "g4", "Qh4#"]))).toEqual({ over: true, reason: "checkmate", winner: "black" });
  });

  it("knows stalemate", () => {
    expect(resultOf(parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))).toEqual({ over: true, reason: "stalemate", winner: null });
  });

  it("knows the fifty-move rule", () => {
    expect(resultOf(parseFen("4k3/8/8/8/8/8/4P3/4K3 w - - 100 80"))).toMatchObject({ reason: "fifty moves" });
  });

  it("knows when nobody can mate", () => {
    expect(resultOf(parseFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1"))).toMatchObject({ reason: "insufficient material" });
    expect(resultOf(parseFen("4k3/8/8/8/8/8/8/4KB2 w - - 0 1"))).toMatchObject({ reason: "insufficient material" });
    expect(resultOf(parseFen("4k3/8/8/8/8/8/8/4KR2 w - - 0 1"))).toMatchObject({ over: false });
  });

  it("knows threefold repetition", () => {
    let state = createChess();
    const positions = [positionKey(state)];
    for (const name of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
      state = play([name], state);
      positions.push(positionKey(state));
    }

    expect(resultOf(state, positions)).toMatchObject({ reason: "repetition" });
  });

  it("reports check", () => {
    expect(resultOf(play(["e4", "f5", "Qh5+"]))).toEqual({ over: false, check: true });
  });
});

describe("move names", () => {
  it("disambiguates", () => {
    const state = parseFen("7k/8/8/8/8/8/8/KN3N2 w - - 0 1");

    expect(moveName(state, move("b1", "d2"))).toBe("Nbd2");
    expect(moveName(state, move("f1", "d2"))).toBe("Nfd2");
  });

  it("marks captures, check and mate", () => {
    expect(moveName(play(["e4", "d5"]), move("e4", "d5"))).toBe("exd5");
    expect(moveName(play(["f3", "e5", "g4"]), move("d8", "h4"))).toBe("Qh4#");
  });
});

describe("the computer", () => {
  it("takes a free queen", () => {
    expect(chooseMove(parseFen("4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1"), 2)).toEqual(move("e4", "d5"));
  });

  it("finds mate in one", () => {
    expect(chooseMove(parseFen("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1"), 2)).toEqual(move("a1", "a8"));
  });

  it("sees a mate coming and avoids it", () => {
    const best = chooseMove(play(["e4", "e5", "Bc4", "Nc6", "Qh5"]), 3);

    expect(best).not.toBeNull();
    const after = applyMove(play(["e4", "e5", "Bc4", "Nc6", "Qh5"]), best as ChessMove);
    expect(legalMoves(after).some((reply) => moveName(after, reply).endsWith("#"))).toBe(false);
  });

  it("only ever plays legal moves", () => {
    let state = createChess();
    for (let turn = 0; turn < 30 && !resultOf(state).over; turn += 1) {
      const chosen = chooseMove(state, 2, 30, () => 0.5);
      expect(legalMoves(state)).toContainEqual(chosen);
      state = applyMove(state, chosen as ChessMove);
    }
  }, 30000);

  it("picks the same move with the search cut short as a full one would value", () => {
    // Mate in two on the back rank: the cut must not hide it.
    expect(chooseMove(parseFen("6k1/5ppp/8/8/8/8/R7/1R4K1 w - - 0 1"), 3, 0)?.to).toBe(square("a8"));
  });

  it("gives up with no moves", () => {
    expect(chooseMove(play(["f3", "e5", "g4", "Qh4#"]), 2)).toBeNull();
  });
});

describe("saves", () => {
  it("rebuilds a game from its moves", () => {
    const game = replay([move("e2", "e4"), move("e7", "e5")]);

    expect(game.names).toEqual(["e4", "e5"]);
    expect(game.state.whiteToMove).toBe(true);
    expect(game.positions).toHaveLength(3);
  });

  it("stops at an illegal move", () => {
    const game = replay([move("e2", "e4"), move("e7", "e2"), move("e7", "e5")]);

    expect(game.moves).toHaveLength(1);
  });

  it("shrugs off junk", () => {
    expect(replay("nope").moves).toEqual([]);
    expect(replay([null, 5]).moves).toEqual([]);
  });
});

describe("board helpers", () => {
  it("names squares and colours", () => {
    expect(squareName(0)).toBe("a8");
    expect(squareName(63)).toBe("h1");
    expect(isDarkSquare(square("a1"))).toBe(true);
    expect(isDarkSquare(square("h1"))).toBe(false);
  });

  it("sees check", () => {
    expect(inCheck(play(["e4", "f5", "Qh5+"]))).toBe(true);
    expect(inCheck(createChess())).toBe(false);
  });
});
