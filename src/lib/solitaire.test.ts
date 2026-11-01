import { describe, expect, it } from "vitest";
import {
  bestMove,
  canFinish,
  canPlace,
  createDeal,
  draw,
  finishStep,
  isValidSolitaire,
  isWon,
  move,
  type Card,
  type SolitaireState,
} from "@/lib/solitaire";

const card = (suit: number, rank: number, up = true): Card => ({ suit, rank, up });
const empty = (): SolitaireState => ({ stock: [], waste: [], tableau: [[], [], [], [], [], [], []], foundations: [0, 0, 0, 0], moves: 0 });

describe("solitaire deal", () => {
  it("deals 28 to the tableau and 24 to the stock, with the top of each column up", () => {
    const deal = createDeal(7);

    expect(deal.stock).toHaveLength(24);
    deal.tableau.forEach((column, index) => {
      expect(column).toHaveLength(index + 1);
      expect(column.filter((entry) => entry.up)).toEqual([column[index]]);
    });
    expect(isValidSolitaire(deal)).toBe(true);
  });

  it("repeats for the same seed", () => {
    expect(createDeal(5)).toEqual(createDeal(5));
    expect(createDeal(5)).not.toEqual(createDeal(6));
  });
});

describe("solitaire moves", () => {
  it("draws one card, then turns the waste back in the same order", () => {
    const start: SolitaireState = { ...empty(), stock: [card(0, 1, false), card(0, 2, false)] };
    const once = draw(start);
    const twice = draw(once);

    expect(once.waste).toEqual([card(0, 2)]);
    expect(twice.stock).toEqual([]);
    expect(draw(twice).stock).toEqual(start.stock);
    expect(draw(empty())).toEqual(empty());
  });

  it("stacks descending in alternating colours", () => {
    const state = { ...empty(), tableau: [[card(1, 8)], [], [], [], [], [], []] };

    expect(canPlace(state, [card(0, 7)], { pile: "tableau", column: 0 })).toBe(true);
    expect(canPlace(state, [card(1, 7)], { pile: "tableau", column: 0 })).toBe(false);
    expect(canPlace(state, [card(0, 6)], { pile: "tableau", column: 0 })).toBe(false);
  });

  it("takes only kings on an empty column", () => {
    expect(canPlace(empty(), [card(0, 13)], { pile: "tableau", column: 3 })).toBe(true);
    expect(canPlace(empty(), [card(0, 12)], { pile: "tableau", column: 3 })).toBe(false);
  });

  it("builds foundations up by suit from the ace", () => {
    expect(canPlace(empty(), [card(2, 1)], { pile: "foundation", suit: 2 })).toBe(true);
    expect(canPlace(empty(), [card(2, 2)], { pile: "foundation", suit: 2 })).toBe(false);
    expect(canPlace(empty(), [card(2, 1)], { pile: "foundation", suit: 1 })).toBe(false);
    expect(canPlace(empty(), [card(2, 1), card(0, 13)], { pile: "foundation", suit: 2 })).toBe(false);
  });

  it("carries a run together and turns over what it uncovers", () => {
    const state = { ...empty(), tableau: [[card(3, 3, false), card(1, 7), card(0, 6)], [card(0, 8)], [], [], [], [], []] };
    const next = move(state, { pile: "tableau", column: 0, index: 1 }, { pile: "tableau", column: 1 }) as SolitaireState;

    expect(next.tableau[0]).toEqual([card(3, 3, true)]);
    expect(next.tableau[1].map((entry) => entry.rank)).toEqual([8, 7, 6]);
    expect(next.moves).toBe(1);
  });

  it("will not lift a face-down card", () => {
    const state = { ...empty(), tableau: [[card(1, 7, false)], [card(0, 8)], [], [], [], [], []] };

    expect(move(state, { pile: "tableau", column: 0, index: 0 }, { pile: "tableau", column: 1 })).toBeNull();
  });

  it("can take a card back off a foundation", () => {
    const state = { ...empty(), foundations: [0, 4, 0, 0], tableau: [[card(0, 5)], [], [], [], [], [], []] };
    const next = move(state, { pile: "foundation", suit: 1 }, { pile: "tableau", column: 0 }) as SolitaireState;

    expect(next.foundations[1]).toBe(3);
    expect(next.tableau[0]).toHaveLength(2);
  });

  it("sends a card to the foundation first when it picks a move", () => {
    const state = { ...empty(), waste: [card(0, 1)], tableau: [[card(1, 2)], [], [], [], [], [], []] };

    expect((bestMove(state, { pile: "waste" }) as SolitaireState).foundations[0]).toBe(1);
  });

  it("finds no move for a card with nowhere to go", () => {
    expect(bestMove({ ...empty(), waste: [card(0, 5)] }, { pile: "waste" })).toBeNull();
  });
});

describe("finishing", () => {
  it("plays out a game with nothing hidden", () => {
    let state: SolitaireState = {
      ...empty(),
      foundations: [13, 13, 12, 11],
      tableau: [[card(3, 13), card(2, 13)], [], [], [], [], [], []],
      waste: [card(3, 12)],
    };

    expect(canFinish(state)).toBe(true);
    for (let step = 0; step < 10 && !isWon(state); step += 1) state = finishStep(state);
    expect(isWon(state)).toBe(true);
  });

  it("waits while cards are hidden", () => {
    expect(canFinish(createDeal(1))).toBe(false);
  });
});

describe("solitaire saves", () => {
  it("rejects missing, repeated or impossible cards", () => {
    const deal = createDeal(3);

    expect(isValidSolitaire({ ...deal, stock: deal.stock.slice(1) })).toBe(false);
    expect(isValidSolitaire({ ...deal, stock: [...deal.stock.slice(1), deal.stock[1]] })).toBe(false);
    expect(isValidSolitaire({ ...deal, tableau: [] })).toBe(false);
    expect(isValidSolitaire({ ...deal, foundations: [99, 0, 0, 0] })).toBe(false);
    expect(isValidSolitaire(null)).toBe(false);
  });

  it("counts cards on the foundations", () => {
    const deal = createDeal(3);
    const spade = deal.tableau.flat().concat(deal.stock).find((entry) => entry.suit === 0 && entry.rank === 1) as Card;
    const removed = { ...deal, foundations: [1, 0, 0, 0], stock: deal.stock.filter((entry) => entry !== spade), tableau: deal.tableau.map((column) => column.filter((entry) => entry !== spade)) };

    expect(isValidSolitaire(removed)).toBe(true);
  });
});
