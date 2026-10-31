import { describe, expect, it } from "vitest";
import { MAX_STACK, createGame, land, rotate, sideForLane } from "@/lib/hextris";

describe("hextris", () => {
  it("lands on the side facing the lane after rotating", () => {
    const turned = rotate(createGame(), 1);
    expect(sideForLane(turned, 0)).toBe(5);
    expect(land(turned, 0, 2).stacks[5]).toEqual([2]);
    expect(rotate(rotate(turned, -1), -1).rotation).toBe(5);
  });

  it("clears three of a colour stacked on one side", () => {
    let game = createGame();
    game = land(game, 0, 1);
    game = land(game, 0, 1);
    expect(game.score).toBe(0);
    game = land(game, 0, 1);
    expect(game.stacks[0]).toEqual([]);
    expect(game.score).toBe(30);
  });

  it("clears across neighbouring sides, including the wrap-around", () => {
    let game = createGame();
    game = land(game, 5, 3);
    game = land(game, 0, 3);
    game = land(game, 1, 3);
    expect(game.stacks.every((stack) => stack.length === 0)).toBe(true);
  });

  it("drops the blocks above a match", () => {
    let game = createGame();
    for (const colour of [1, 1, 2]) game = land(game, 0, colour);
    game = land(game, 1, 3);
    game = land(game, 1, 1);
    expect(game.stacks[0]).toEqual([2]);
    expect(game.stacks[1]).toEqual([3]);
    expect(game.score).toBe(30);
  });

  it("ends when a stack reaches the top", () => {
    let game = createGame();
    for (let level = 0; level < MAX_STACK; level += 1) game = land(game, 0, level % 2);
    expect(game.over).toBe(true);
  });
});
