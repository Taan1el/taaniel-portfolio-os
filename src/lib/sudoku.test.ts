import { describe, expect, it } from "vitest";
import { CELLS, LEVELS, countSolutions, findConflicts, generatePuzzle, isSolved, isValidSave, peersOf, type Level } from "@/lib/sudoku";

const digitsOfLine = (grid: number[], cells: number[]) => cells.map((cell) => grid[cell]).sort().join("");

describe("sudoku", () => {
  it.each(Object.keys(LEVELS) as Level[])("makes a %s puzzle with one solution", (level) => {
    for (const seed of [1, 2, 3]) {
      const puzzle = generatePuzzle(level, seed);
      const clues = puzzle.givens.filter(Boolean).length;

      expect(clues).toBeGreaterThanOrEqual(LEVELS[level]);
      expect(clues).toBeLessThanOrEqual(LEVELS[level] + 6);
      expect(countSolutions(puzzle.givens)).toBe(1);
      puzzle.givens.forEach((digit, index) => digit && expect(puzzle.solution[index]).toBe(digit));
    }
  });

  it("builds a legal finished grid", () => {
    const { solution } = generatePuzzle("easy", 9);

    for (let line = 0; line < 9; line += 1) {
      expect(digitsOfLine(solution, Array.from({ length: 9 }, (_, cell) => line * 9 + cell))).toBe("123456789");
      expect(digitsOfLine(solution, Array.from({ length: 9 }, (_, cell) => cell * 9 + line))).toBe("123456789");
    }
    expect(findConflicts(solution).size).toBe(0);
  });

  it("repeats the same puzzle for the same seed", () => {
    expect(generatePuzzle("medium", 42)).toEqual(generatePuzzle("medium", 42));
    expect(generatePuzzle("medium", 42).givens).not.toEqual(generatePuzzle("medium", 43).givens);
  });

  it("gives each cell 20 peers", () => {
    expect(peersOf(0)).toHaveLength(20);
    expect(peersOf(40)).toContain(30);
    expect(peersOf(40)).not.toContain(0);
  });

  it("finds repeats in a row, a column and a box", () => {
    const grid = new Array<number>(CELLS).fill(0);
    grid[0] = 5; // Shares a row with cell 8.
    grid[8] = 5;
    grid[80] = 5; // Shares a column with cell 8.
    grid[40] = 7;
    grid[50] = 7; // Shares a box with cell 40.
    grid[13] = 3; // Clashes with nothing.

    expect([...findConflicts(grid)].sort((a, b) => a - b)).toEqual([0, 8, 40, 50, 80]);
  });

  it("knows when a grid is finished", () => {
    const { givens, solution } = generatePuzzle("easy", 5);

    expect(isSolved(solution, solution)).toBe(true);
    expect(isSolved(givens, solution)).toBe(false);
  });

  it("rejects a saved game that does not add up", () => {
    const { givens, solution } = generatePuzzle("easy", 5);
    const good = { level: "easy", givens, solution, cells: givens };
    const wrongClue = [...givens];
    wrongClue[givens.findIndex(Boolean)] = (givens[givens.findIndex(Boolean)] % 9) + 1;

    expect(isValidSave(good)).toBe(true);
    expect(isValidSave({ ...good, level: "impossible" })).toBe(false);
    expect(isValidSave({ ...good, cells: [1, 2] })).toBe(false);
    expect(isValidSave({ ...good, givens: wrongClue })).toBe(false);
    expect(isValidSave({ ...good, solution: solution.map(() => 12) })).toBe(false);
    expect(isValidSave(null)).toBe(false);
  });
});
