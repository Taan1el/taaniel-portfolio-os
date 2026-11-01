import { createRandom } from "@/lib/sudoku";

/** Klondike, drawing one card at a time. Suits 0 and 3 are black, 1 and 2 are red. */
export interface Card {
  suit: number;
  rank: number;
  up: boolean;
}

export interface SolitaireState {
  stock: Card[];
  waste: Card[];
  tableau: Card[][];
  /** The highest rank built so far on each suit. */
  foundations: number[];
  moves: number;
}

export type Source =
  | { pile: "waste" }
  | { pile: "tableau"; column: number; index: number }
  | { pile: "foundation"; suit: number };

export type Target = { pile: "tableau"; column: number } | { pile: "foundation"; suit: number };

export const SUITS = ["spades", "hearts", "diamonds", "clubs"];
export const isRed = (card: Pick<Card, "suit">) => card.suit === 1 || card.suit === 2;

export function createDeal(seed = Date.now()): SolitaireState {
  const random = createRandom(seed);
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit += 1) {
    for (let rank = 1; rank <= 13; rank += 1) deck.push({ suit, rank, up: false });
  }
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }

  const tableau = Array.from({ length: 7 }, (_, column) =>
    deck.splice(0, column + 1).map((card, index) => ({ ...card, up: index === column }))
  );

  return { stock: deck, waste: [], tableau, foundations: [0, 0, 0, 0], moves: 0 };
}

/** Turns one card from the stock, or turns the waste back over when the stock is empty. */
export function draw(state: SolitaireState): SolitaireState {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    return { ...state, stock: [...state.waste].reverse().map((card) => ({ ...card, up: false })), waste: [], moves: state.moves + 1 };
  }
  const card = state.stock[state.stock.length - 1];
  return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, { ...card, up: true }], moves: state.moves + 1 };
}

/** The cards a source would carry, top first; null if they cannot be picked up. */
export function cardsAt(state: SolitaireState, source: Source): Card[] | null {
  if (source.pile === "waste") {
    const card = state.waste[state.waste.length - 1];
    return card ? [card] : null;
  }
  if (source.pile === "foundation") {
    const rank = state.foundations[source.suit];
    return rank ? [{ suit: source.suit, rank, up: true }] : null;
  }
  const cards = state.tableau[source.column]?.slice(source.index) ?? [];
  return cards.length && cards.every((card) => card.up) ? cards : null;
}

export function canPlace(state: SolitaireState, cards: Card[], target: Target) {
  const card = cards[0];
  if (target.pile === "foundation") {
    return cards.length === 1 && card.suit === target.suit && card.rank === state.foundations[target.suit] + 1;
  }
  const column = state.tableau[target.column];
  const top = column?.[column.length - 1];
  if (!column) return false;
  if (!top) return card.rank === 13;
  return top.up && top.rank === card.rank + 1 && isRed(top) !== isRed(card);
}

export function move(state: SolitaireState, source: Source, target: Target): SolitaireState | null {
  const cards = cardsAt(state, source);
  if (!cards || !canPlace(state, cards, target)) return null;
  if (source.pile === "tableau" && target.pile === "tableau" && source.column === target.column) return null;
  if (source.pile === "foundation" && target.pile === "foundation") return null;

  const waste = source.pile === "waste" ? state.waste.slice(0, -1) : state.waste;
  const foundations = [...state.foundations];
  const tableau = state.tableau.map((column) => column);

  if (source.pile === "foundation") foundations[source.suit] -= 1;
  if (source.pile === "tableau") {
    const left = tableau[source.column].slice(0, source.index);
    // The card a move uncovers turns face up.
    tableau[source.column] = left.map((card, index) => (index === left.length - 1 ? { ...card, up: true } : card));
  }

  if (target.pile === "foundation") foundations[target.suit] += 1;
  else tableau[target.column] = [...tableau[target.column], ...cards];

  return { ...state, waste, tableau, foundations, moves: state.moves + 1 };
}

/** Double click and tap-to-send: the foundation first, then the first column that fits. */
export function bestMove(state: SolitaireState, source: Source): SolitaireState | null {
  const cards = cardsAt(state, source);
  if (!cards) return null;
  if (cards.length === 1 && source.pile !== "foundation") {
    const placed = move(state, source, { pile: "foundation", suit: cards[0].suit });
    if (placed) return placed;
  }
  for (let column = 0; column < 7; column += 1) {
    if (source.pile === "tableau" && source.column === column) continue;
    const placed = move(state, source, { pile: "tableau", column });
    if (placed) return placed;
  }
  return null;
}

export const isWon = (state: SolitaireState) => state.foundations.every((rank) => rank === 13);

/** Once nothing is hidden, the rest of the game plays itself. */
export const canFinish = (state: SolitaireState) =>
  !isWon(state) && state.tableau.every((column) => column.every((card) => card.up));

export function finishStep(state: SolitaireState): SolitaireState {
  for (let column = 0; column < 7; column += 1) {
    const index = state.tableau[column].length - 1;
    if (index >= 0) {
      const placed = move(state, { pile: "tableau", column, index }, { pile: "foundation", suit: state.tableau[column][index].suit });
      if (placed) return placed;
    }
  }
  const fromWaste = state.waste.length ? move(state, { pile: "waste" }, { pile: "foundation", suit: state.waste[state.waste.length - 1].suit }) : null;
  return fromWaste ?? draw(state);
}

const isCard = (value: unknown): value is Card => {
  const card = value as Partial<Card> | null;
  return Number.isInteger(card?.suit) && Number.isInteger(card?.rank) && typeof card?.up === "boolean" && (card?.suit as number) >= 0 && (card?.suit as number) < 4 && (card?.rank as number) >= 1 && (card?.rank as number) <= 13;
};

/** Checks a saved game before it is trusted: all 52 cards, each exactly once. */
export function isValidSolitaire(value: unknown): value is SolitaireState {
  const state = value as Partial<SolitaireState> | null;
  if (!state || !Array.isArray(state.stock) || !Array.isArray(state.waste) || !Array.isArray(state.tableau) || !Array.isArray(state.foundations)) return false;
  if (state.tableau.length !== 7 || !state.tableau.every(Array.isArray) || state.foundations.length !== 4) return false;
  if (!state.foundations.every((rank) => Number.isInteger(rank) && rank >= 0 && rank <= 13) || !Number.isInteger(state.moves)) return false;

  const cards = [...state.stock, ...state.waste, ...state.tableau.flat()];
  if (!cards.every(isCard)) return false;
  const seen = new Set(cards.map((card) => card.suit * 13 + card.rank));
  state.foundations.forEach((top, suit) => {
    for (let rank = 1; rank <= top; rank += 1) seen.add(suit * 13 + rank);
  });
  return seen.size === 52 && cards.length + state.foundations.reduce((sum, top) => sum + top, 0) === 52;
}
