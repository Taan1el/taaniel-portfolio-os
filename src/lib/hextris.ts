/** The rules of Hextris: blocks fall onto a rotating hexagon, and three touching of one colour clear. */
export const SIDES = 6;
export const COLOURS = 4;
export const MAX_STACK = 8;

export interface HextrisState {
  /** stacks[side][level] is a colour, level 0 touching the hexagon. */
  stacks: number[][];
  rotation: number;
  score: number;
  over: boolean;
}

export function createGame(): HextrisState {
  return { stacks: Array.from({ length: SIDES }, () => []), rotation: 0, score: 0, over: false };
}

export function rotate(state: HextrisState, step: 1 | -1): HextrisState {
  return { ...state, rotation: (state.rotation + step + SIDES) % SIDES };
}

/** The hexagon side currently facing a lane: what a block falling down that lane lands on. */
export function sideForLane(state: HextrisState, lane: number) {
  return (lane - state.rotation + SIDES * 2) % SIDES;
}

/** Same-coloured blocks touching this one, across levels and around neighbouring sides. */
function connected(stacks: number[][], side: number, level: number) {
  const colour = stacks[side][level];
  const seen = new Set<string>();
  const visit = (s: number, l: number) => {
    const key = `${s}:${l}`;
    if (seen.has(key) || stacks[s]?.[l] !== colour) return;
    seen.add(key);
    visit(s, l + 1);
    visit(s, l - 1);
    visit((s + 1) % SIDES, l);
    visit((s + SIDES - 1) % SIDES, l);
  };
  visit(side, level);
  return seen;
}

/** Lands a block. Matches clear and those above drop; chains score more. */
export function land(state: HextrisState, lane: number, colour: number): HextrisState {
  const side = sideForLane(state, lane);
  let stacks = state.stacks.map((stack, index) => (index === side ? [...stack, colour] : stack));
  let score = state.score;
  let chain = 1;
  let check: Array<[number, number]> = [[side, stacks[side].length - 1]];

  while (check.length) {
    const next: Array<[number, number]> = [];
    for (const [s, l] of check) {
      if (stacks[s][l] === undefined) continue;
      const group = connected(stacks, s, l);
      if (group.size < 3) continue;
      score += group.size * 10 * chain;
      const remove = new Set(group);
      stacks = stacks.map((stack, index) => stack.filter((_, level) => !remove.has(`${index}:${level}`)));
      chain += 1;
      stacks.forEach((stack, index) => stack.forEach((_, level) => next.push([index, level])));
      break;
    }
    check = next;
  }

  return { ...state, stacks, score, over: stacks.some((stack) => stack.length >= MAX_STACK) };
}
