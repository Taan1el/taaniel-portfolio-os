import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Eraser, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { CELLS, LEVELS, findConflicts, generatePuzzle, isSolved, isValidSave, peersOf, type Level, type Puzzle } from "@/lib/sudoku";
import { cn } from "@/lib/utils";
import type { AppComponentProps } from "@/types/system";
import "@/styles/board-games.css";

const SAVE_KEY = "taaniel-os-sudoku";
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEVEL_NAMES = Object.keys(LEVELS) as Level[];

interface Snapshot {
  cells: number[];
  notes: number[];
}

interface Game extends Snapshot {
  puzzle: Puzzle;
  seconds: number;
}

function newGame(level: Level): Game {
  const puzzle = generatePuzzle(level);
  return { puzzle, cells: [...puzzle.givens], notes: new Array<number>(CELLS).fill(0), seconds: 0 };
}

function loadGame(): Game {
  try {
    const saved: unknown = JSON.parse(readLocalStorage(SAVE_KEY) ?? "null");
    if (isValidSave(saved)) {
      const extra = saved as unknown as { notes?: unknown; seconds?: unknown };
      const notes = Array.isArray(extra.notes) && extra.notes.length === CELLS && extra.notes.every((mask) => Number.isInteger(mask) && mask >= 0 && mask < 512);
      return {
        puzzle: { level: saved.level, givens: saved.givens, solution: saved.solution },
        cells: saved.cells,
        notes: notes ? (extra.notes as number[]) : new Array<number>(CELLS).fill(0),
        seconds: typeof extra.seconds === "number" && extra.seconds >= 0 ? Math.floor(extra.seconds) : 0,
      };
    }
  } catch {
    // A broken save just means a new game.
  }
  return newGame("easy");
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function SudokuApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [game, setGame] = useState(loadGame);
  const [selected, setSelected] = useState(0);
  const [noting, setNoting] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { puzzle, cells, notes, seconds } = game;

  const conflicts = useMemo(() => findConflicts(cells), [cells]);
  const peers = useMemo(() => new Set(peersOf(selected)), [selected]);
  const solved = isSolved(cells, puzzle.solution);

  useEffect(() => {
    writeLocalStorage(SAVE_KEY, JSON.stringify({ ...puzzle, cells, notes, seconds }));
  }, [cells, notes, puzzle, seconds]);

  useEffect(() => {
    if (solved) return undefined;
    const timer = globalThis.setInterval(() => {
      if (!document.hidden) setGame((current) => ({ ...current, seconds: current.seconds + 1 }));
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, [solved]);

  const remember = () => setHistory((list) => [...list.slice(-199), { cells, notes }]);

  const enter = (digit: number) => {
    if (puzzle.givens[selected] || solved) return;

    if (noting && digit) {
      if (cells[selected]) return;
      remember();
      setGame((current) => ({ ...current, notes: current.notes.map((mask, index) => (index === selected ? mask ^ (1 << (digit - 1)) : mask)) }));
      return;
    }

    if (cells[selected] === digit) return;
    remember();
    setGame((current) => ({
      ...current,
      cells: current.cells.map((value, index) => (index === selected ? digit : value)),
      // A placed digit clears itself from the notes it rules out.
      notes: current.notes.map((mask, index) => {
        if (index === selected) return 0;
        return digit && peers.has(index) ? mask & ~(1 << (digit - 1)) : mask;
      }),
    }));
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((list) => list.slice(0, -1));
    setGame((current) => ({ ...current, ...last }));
  };

  const start = (level: Level) => {
    setGame(newGame(level));
    setHistory([]);
    setNoting(false);
    setSelected(0);
  };

  const restart = () => {
    remember();
    setGame((current) => ({ ...current, cells: [...puzzle.givens], notes: new Array<number>(CELLS).fill(0) }));
  };

  const move = (next: number) => {
    setSelected(next);
    boardRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const row = Math.floor(selected / 9);
    const column = selected % 9;
    const key = event.key;

    if (key === "ArrowUp") move(((row + 8) % 9) * 9 + column);
    else if (key === "ArrowDown") move(((row + 1) % 9) * 9 + column);
    else if (key === "ArrowLeft") move(row * 9 + (column + 8) % 9);
    else if (key === "ArrowRight") move(row * 9 + (column + 1) % 9);
    else if (/^[1-9]$/.test(key)) enter(Number(key));
    else if (key === "Backspace" || key === "Delete" || key === "0") enter(0);
    else if (key.toLowerCase() === "n") setNoting((value) => !value);
    else if (key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey)) undo();
    else return;
    event.preventDefault();
  };

  const remaining = (digit: number) => 9 - cells.filter((value) => value === digit).length;

  return (
    <ArcadeGameShell
      className="board-game"
      title="Sudoku"
      subtitle={solved ? `Solved in ${clock(seconds)}` : `${puzzle.level[0].toUpperCase()}${puzzle.level.slice(1)} · ${clock(seconds)}`}
      actions={
        <>
          <label className="board-game__select">
            <span className="sr-only">Level</span>
            <select value={puzzle.level} aria-label="Level" onChange={(event) => start(event.target.value as Level)}>
              {LEVEL_NAMES.map((level) => (
                <option key={level} value={level}>
                  {level[0].toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="ghost" onClick={() => start(puzzle.level)}>
            New puzzle
          </Button>
        </>
      }
      footer={<span>Arrow keys move, numbers fill in, N switches to pencil notes, Ctrl+Z undoes.</span>}
    >
      <div className="board-game__layout">
        <div ref={boardRef} className="sudoku__board" role="grid" aria-label="Sudoku board" onKeyDown={handleKeyDown}>
          {Array.from({ length: 9 }, (_, row) => (
            <div key={row} role="row" className="sudoku__row">
              {Array.from({ length: 9 }, (_, column) => {
                const index = row * 9 + column;
                const digit = cells[index];
                const given = Boolean(puzzle.givens[index]);

                return (
                  <button
                    key={index}
                    type="button"
                    role="gridcell"
                    data-cell={index}
                    tabIndex={index === selected ? 0 : -1}
                    aria-selected={index === selected}
                    aria-label={`Row ${row + 1}, column ${column + 1}, ${digit || "empty"}${given ? ", given" : ""}${conflicts.has(index) ? ", clashes" : ""}`}
                    className={cn(
                      "sudoku__cell",
                      given && "is-given",
                      index === selected && "is-selected",
                      peers.has(index) && "is-peer",
                      Boolean(digit) && digit === cells[selected] && "is-match",
                      conflicts.has(index) && "is-clash"
                    )}
                    onFocus={() => setSelected(index)}
                    onClick={() => setSelected(index)}
                  >
                    {digit ? (
                      digit
                    ) : notes[index] ? (
                      <span className="sudoku__notes" aria-hidden="true">
                        {DIGITS.map((note) => (
                          <span key={note}>{notes[index] & (1 << (note - 1)) ? note : ""}</span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="board-game__side">
          {solved ? <p className="board-game__result">Solved in {clock(seconds)}. Well played.</p> : null}
          <div className="sudoku__pad" role="group" aria-label="Numbers">
            {DIGITS.map((digit) => (
              <button key={digit} type="button" disabled={remaining(digit) <= 0} aria-label={`Enter ${digit}`} onClick={() => enter(digit)}>
                {digit}
                <small aria-hidden="true">{Math.max(0, remaining(digit))}</small>
              </button>
            ))}
          </div>
          <div className="board-game__tools">
            <button type="button" className={cn(noting && "is-on")} aria-pressed={noting} onClick={() => setNoting((value) => !value)}>
              <Pencil size={15} aria-hidden="true" />
              Notes
            </button>
            <button type="button" onClick={() => enter(0)}>
              <Eraser size={15} aria-hidden="true" />
              Erase
            </button>
            <button type="button" disabled={history.length === 0} onClick={undo}>
              <Undo2 size={15} aria-hidden="true" />
              Undo
            </button>
            <button type="button" onClick={restart}>
              <RotateCcw size={15} aria-hidden="true" />
              Restart
            </button>
          </div>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
