export const CELLS = 81;
export const LEVELS = { easy: 40, medium: 33, hard: 28 } as const;
export type Level = keyof typeof LEVELS;

const ALL_DIGITS = 0b111111111;

export interface Puzzle {
  /** 81 digits with 0 for a blank. */
  givens: number[];
  solution: number[];
  level: Level;
}

/** Small seeded generator, so a puzzle can be reproduced in a test. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const boxOf = (index: number) => Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3);

/** The cells that share a row, column or box with this one. */
export function peersOf(index: number) {
  const row = Math.floor(index / 9);
  const column = index % 9;
  const peers: number[] = [];
  for (let other = 0; other < CELLS; other += 1) {
    if (other !== index && (Math.floor(other / 9) === row || other % 9 === column || boxOf(other) === boxOf(index))) {
      peers.push(other);
    }
  }
  return peers;
}

const PEERS = Array.from({ length: CELLS }, (_, index) => peersOf(index));

function allowedAt(grid: number[], index: number) {
  let mask = ALL_DIGITS;
  for (const peer of PEERS[index]) {
    if (grid[peer]) mask &= ~(1 << (grid[peer] - 1));
  }
  return mask;
}

const bitCount = (mask: number) => {
  let count = 0;
  for (let rest = mask; rest; rest &= rest - 1) count += 1;
  return count;
};

/** The blank with the fewest options: search is far smaller when the tightest cell goes first. */
function tightestBlank(grid: number[]) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let index = 0; index < CELLS; index += 1) {
    if (grid[index]) continue;
    const mask = allowedAt(grid, index);
    const count = bitCount(mask);
    if (count < bestCount) {
      best = index;
      bestMask = mask;
      bestCount = count;
      if (count <= 1) break;
    }
  }
  return { index: best, mask: bestMask };
}

/** Counts solutions, giving up once it reaches `limit`. */
export function countSolutions(grid: number[], limit = 2) {
  const work = [...grid];
  let found = 0;

  const search = () => {
    const { index, mask } = tightestBlank(work);
    if (index < 0) {
      found += 1;
      return;
    }
    for (let digit = 1; digit <= 9 && found < limit; digit += 1) {
      if (mask & (1 << (digit - 1))) {
        work[index] = digit;
        search();
      }
    }
    work[index] = 0;
  };

  search();
  return found;
}

function fill(grid: number[], random: () => number): boolean {
  const { index, mask } = tightestBlank(grid);
  if (index < 0) return true;
  for (const digit of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random)) {
    if (mask & (1 << (digit - 1))) {
      grid[index] = digit;
      if (fill(grid, random)) return true;
    }
  }
  grid[index] = 0;
  return false;
}

/** A full grid with cells removed one at a time, keeping exactly one solution. */
export function generatePuzzle(level: Level, seed = Date.now()): Puzzle {
  const random = createRandom(seed);
  const solution = new Array<number>(CELLS).fill(0);
  fill(solution, random);

  const givens = [...solution];
  let clues = CELLS;
  for (const index of shuffled(Array.from({ length: CELLS }, (_, cell) => cell), random)) {
    if (clues <= LEVELS[level]) break;
    const kept = givens[index];
    givens[index] = 0;
    if (countSolutions(givens) === 1) clues -= 1;
    else givens[index] = kept;
  }

  return { givens, solution, level };
}

/** Cells whose digit repeats in their row, column or box. */
export function findConflicts(grid: number[]) {
  const conflicts = new Set<number>();
  for (let index = 0; index < CELLS; index += 1) {
    if (grid[index] && PEERS[index].some((peer) => grid[peer] === grid[index])) conflicts.add(index);
  }
  return conflicts;
}

export const isSolved = (grid: number[], solution: number[]) => grid.every((digit, index) => digit === solution[index]);

const isDigits = (value: unknown, min: number): value is number[] =>
  Array.isArray(value) && value.length === CELLS && value.every((digit) => Number.isInteger(digit) && digit >= min && digit <= 9);

/** Checks a saved game before it is trusted: shape, and that the clues fit the solution. */
export function isValidSave(value: unknown): value is { level: Level; givens: number[]; solution: number[]; cells: number[] } {
  const save = value as { level?: unknown; givens?: unknown; solution?: unknown; cells?: unknown } | null;
  if (!save || typeof save.level !== "string" || !(save.level in LEVELS)) return false;
  if (!isDigits(save.givens, 0) || !isDigits(save.solution, 1) || !isDigits(save.cells, 0)) return false;
  const solution = save.solution;
  const cells = save.cells;
  return save.givens.every((digit, index) => digit === 0 || (digit === solution[index] && digit === cells[index]));
}
