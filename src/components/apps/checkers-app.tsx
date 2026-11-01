import { useEffect, useMemo, useState } from "react";
import { Crown, RotateCcw, Undo2 } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { BoardGrid } from "@/components/apps/board-grid";
import { RED, WHITE, applyMove, chooseMove, createCheckers, isDark, isValidCheckers, legalMoves, resultOf, type CheckersMove, type CheckersState } from "@/lib/checkers";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import type { AppComponentProps } from "@/types/system";
import "@/styles/board-games.css";

const SAVE_KEY = "taaniel-os-checkers";
const LEVELS = { Easy: 2, Medium: 4, Hard: 7 };
type Level = keyof typeof LEVELS;
const COMPUTER_DELAY_MS = 420;

function loadSaved() {
  try {
    const saved = JSON.parse(readLocalStorage(SAVE_KEY) ?? "null") as { game?: unknown; level?: unknown } | null;
    return {
      game: isValidCheckers(saved?.game) ? saved.game : createCheckers(),
      level: typeof saved?.level === "string" && saved.level in LEVELS ? (saved.level as Level) : ("Medium" as Level),
    };
  } catch {
    return { game: createCheckers(), level: "Medium" as Level };
  }
}

const squareName = (square: number) => `${"abcdefgh"[square % 8]}${8 - Math.floor(square / 8)}`;

export function CheckersApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [saved] = useState(loadSaved);
  const [game, setGame] = useState<CheckersState>(saved.game);
  const [level, setLevel] = useState<Level>(saved.level);
  const [history, setHistory] = useState<CheckersState[]>([]);
  /** The squares chosen so far: the piece, then each landing of a jump. */
  const [path, setPath] = useState<number[]>([]);
  const [last, setLast] = useState<number[]>([]);

  const moves = useMemo(() => (game.turn === RED ? legalMoves(game) : []), [game]);
  const result = useMemo(() => resultOf(game), [game]);
  const startsWith = (move: CheckersMove) => path.every((square, index) => move.path[index] === square);
  const matching = path.length ? moves.filter(startsWith) : moves;
  const movable = new Set(moves.map((move) => move.path[0]));
  const targets = new Set(path.length ? matching.map((move) => move.path[path.length]).filter((square) => square !== undefined) : []);
  const mustTake = moves.some((move) => move.captured.length > 0);

  useEffect(() => {
    writeLocalStorage(SAVE_KEY, JSON.stringify({ game, level }));
  }, [game, level]);

  useEffect(() => {
    if (game.turn !== WHITE || result.over) return undefined;
    const timer = globalThis.setTimeout(() => {
      const move = chooseMove(game, LEVELS[level]);
      if (!move) return;
      setLast(move.path);
      setGame(applyMove(game, move));
    }, COMPUTER_DELAY_MS);
    return () => globalThis.clearTimeout(timer);
  }, [game, level, result.over]);

  const select = (square: number) => {
    if (game.turn !== RED || result.over) return;

    if (targets.has(square)) {
      const nextPath = [...path, square];
      const finished = matching.find((move) => move.path.length === nextPath.length && nextPath.every((step, index) => move.path[index] === step));
      if (finished) {
        setHistory((list) => [...list, game]);
        setLast(finished.path);
        setGame(applyMove(game, finished));
        setPath([]);
      } else {
        setPath(nextPath);
      }
      return;
    }

    setPath(movable.has(square) ? [square] : []);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((list) => list.slice(0, -1));
    setGame(previous);
    setPath([]);
    setLast([]);
  };

  const restart = () => {
    setGame(createCheckers());
    setHistory([]);
    setPath([]);
    setLast([]);
  };

  const status = result.over
    ? result.winner === RED
      ? "You won."
      : result.winner === WHITE
        ? "The computer won."
        : "A draw."
    : game.turn === RED
      ? "Your move."
      : "The computer is thinking.";
  const count = (side: number) => game.board.filter((piece) => Math.sign(piece) === side).length;

  const describe = (square: number) => {
    const piece = game.board[square];
    const name = piece ? `${piece > 0 ? "red" : "white"} ${Math.abs(piece) === 2 ? "king" : "man"}` : isDark(square) ? "empty" : "light square";
    return `${squareName(square)}, ${name}${targets.has(square) ? ", can move here" : ""}${path[0] === square ? ", selected" : ""}`;
  };

  return (
    <ArcadeGameShell
      className="board-game"
      title="Checkers"
      subtitle={status}
      actions={
        <>
          <label className="board-game__select">
            <span className="sr-only">Level</span>
            <select value={level} aria-label="Level" onChange={(event) => setLevel(event.target.value as Level)}>
              {Object.keys(LEVELS).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <Button type="button" variant="ghost" onClick={restart}>
            New game
          </Button>
        </>
      }
      footer={<span>You are red. Taking is compulsory, and men reaching the far row become kings.</span>}
    >
      <div className="board-game__layout">
        <BoardGrid
          label="Checkers board"
          isDark={isDark}
          labelOf={describe}
          classOf={(square) =>
            cn(
              movable.has(square) && !result.over && !path.length && "is-movable",
              path.includes(square) && "is-picked",
              targets.has(square) && "is-target",
              last.includes(square) && "is-last"
            )
          }
          onSelect={select}
          renderSquare={(square) => {
            const piece = game.board[square];
            if (!piece) return null;
            return (
              <span className={cn("checkers__piece", piece > 0 ? "is-red" : "is-white")} aria-hidden="true">
                {Math.abs(piece) === 2 ? <Crown size="58%" /> : null}
              </span>
            );
          }}
        />

        <div className="board-game__side">
          <p className={result.over ? "board-game__result" : "board-game__status"}>{status}</p>
          {mustTake && !result.over ? <p className="board-game__hint">You have a jump, so you must take it.</p> : null}
          <p className="board-game__hint">
            Red {count(RED)} · White {count(WHITE)}
          </p>
          <div className="board-game__tools">
            <button type="button" disabled={history.length === 0 || game.turn !== RED} onClick={undo}>
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
