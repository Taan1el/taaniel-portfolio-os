import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { BoardGrid } from "@/components/apps/board-grid";
import { PROMOTIONS, inCheck, isDarkSquare, legalMoves, replay, resultOf, squareName, type ChessMove } from "@/lib/chess";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import type { ChessRequest, ChessResponse } from "@/workers/chess.worker";
import type { AppComponentProps } from "@/types/system";
import "@/styles/board-games.css";

const SAVE_KEY = "taaniel-os-chess";
const LEVELS = {
  Easy: { depth: 1, noise: 120 },
  Medium: { depth: 2, noise: 30 },
  Hard: { depth: 4, noise: 0 },
};
type Level = keyof typeof LEVELS;

const GLYPHS: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const NAMES: Record<string, string> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
/** Asks for the plain glyph, not an emoji pawn. */
const TEXT_STYLE = "︎";

function loadSaved() {
  try {
    const saved = JSON.parse(readLocalStorage(SAVE_KEY) ?? "null") as { moves?: unknown; level?: unknown; playerWhite?: unknown } | null;
    return {
      moves: replay(saved?.moves).moves,
      level: typeof saved?.level === "string" && saved.level in LEVELS ? (saved.level as Level) : ("Medium" as Level),
      playerWhite: saved?.playerWhite !== false,
    };
  } catch {
    return { moves: [] as ChessMove[], level: "Medium" as Level, playerWhite: true };
  }
}

function resultText(result: ReturnType<typeof resultOf>, playerWhite: boolean, thinking: boolean, ownTurn: boolean) {
  if (result.over) {
    if (result.reason !== "checkmate") return `A draw by ${result.reason}.`;
    return (result.winner === "white") === playerWhite ? "Checkmate. You won." : "Checkmate. The computer won.";
  }
  if (thinking || !ownTurn) return "The computer is thinking.";
  return result.check ? "You are in check." : "Your move.";
}

export function ChessApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [saved] = useState(loadSaved);
  const [moves, setMoves] = useState<ChessMove[]>(saved.moves);
  const [level, setLevel] = useState<Level>(saved.level);
  const [playerWhite, setPlayerWhite] = useState(saved.playerWhite);
  const [picked, setPicked] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<{ from: number; to: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);

  const game = useMemo(() => replay(moves), [moves]);
  const { state } = game;
  const result = useMemo(() => resultOf(state, game.positions), [game.positions, state]);
  const legal = useMemo(() => legalMoves(state), [state]);
  const ownTurn = state.whiteToMove === playerWhite;
  const targets = useMemo(() => new Set(picked === null ? [] : legal.filter((move) => move.from === picked).map((move) => move.to)), [legal, picked]);
  const last = moves.at(-1);
  const checkedKing = inCheck(state) ? state.board.indexOf(state.whiteToMove ? "K" : "k") : -1;

  useEffect(() => {
    writeLocalStorage(SAVE_KEY, JSON.stringify({ moves, level, playerWhite }));
  }, [level, moves, playerWhite]);

  useEffect(() => {
    const worker = new Worker(new URL("../../workers/chess.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = ({ data }: MessageEvent<ChessResponse>) => {
      if (data.id !== requestId.current) return;
      setThinking(false);
      if (data.move) setMoves((list) => [...list, data.move as ChessMove]);
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (ownTurn || result.over) return;
    setThinking(true);
    const request: ChessRequest = { id: (requestId.current += 1), state, ...LEVELS[level] };
    workerRef.current?.postMessage(request);
  }, [level, ownTurn, result.over, state]);

  // Black sees the board from their own side.
  const toSquare = (shown: number) => (playerWhite ? shown : 63 - shown);

  const play = (move: ChessMove) => {
    setMoves((list) => [...list, move]);
    setPicked(null);
    setPromotion(null);
  };

  const select = (shown: number) => {
    const square = toSquare(shown);
    if (!ownTurn || result.over || thinking) return;

    if (picked !== null && targets.has(square)) {
      const options = legal.filter((move) => move.from === picked && move.to === square);
      if (options[0].promotion) setPromotion({ from: picked, to: square });
      else play(options[0]);
      return;
    }

    setPromotion(null);
    setPicked(legal.some((move) => move.from === square) ? square : null);
  };

  /** Stale replies from the computer are dropped by bumping the request id. */
  const cancelSearch = () => {
    requestId.current += 1;
    setThinking(false);
  };

  const restart = (white = playerWhite) => {
    cancelSearch();
    setPlayerWhite(white);
    setMoves([]);
    setPicked(null);
    setPromotion(null);
  };

  const undo = () => {
    cancelSearch();
    setPicked(null);
    setPromotion(null);
    // Back to the last position that was the player's turn.
    setMoves((list) => list.slice(0, Math.max(0, list.length - (ownTurn ? 2 : 1))));
  };

  const status = resultText(result, playerWhite, thinking, ownTurn);
  const rows = Array.from({ length: Math.ceil(game.names.length / 2) }, (_, index) => ({ number: index + 1, white: game.names[index * 2], black: game.names[index * 2 + 1] }));
  const movesRef = useRef<HTMLDListElement | null>(null);

  useEffect(() => {
    movesRef.current?.scrollTo({ top: movesRef.current.scrollHeight });
  }, [moves.length]);

  const describe = (shown: number) => {
    const square = toSquare(shown);
    const piece = state.board[square];
    const name = piece ? `${piece === piece.toUpperCase() ? "white" : "black"} ${NAMES[piece.toLowerCase()]}` : "empty";
    return `${squareName(square)}, ${name}${targets.has(square) ? ", can move here" : ""}${picked === square ? ", selected" : ""}`;
  };

  return (
    <ArcadeGameShell
      className="board-game"
      title="Chess"
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
          <Button type="button" variant="ghost" onClick={() => restart()}>
            New game
          </Button>
        </>
      }
      footer={<span>Pick a piece, then its square. Arrow keys and Enter work too.</span>}
    >
      <div className="board-game__layout">
        <BoardGrid
          label="Chess board"
          isDark={(shown) => isDarkSquare(toSquare(shown))}
          labelOf={describe}
          classOf={(shown) => {
            const square = toSquare(shown);
            return cn(
              picked === square && "is-picked",
              targets.has(square) && (state.board[square] ? "is-capture" : "is-target"),
              last && (last.from === square || last.to === square) && "is-last",
              checkedKing === square && "is-check"
            );
          }}
          onSelect={select}
          renderSquare={(shown) => {
            const piece = state.board[toSquare(shown)];
            if (!piece) return null;
            return (
              <span className={cn("chess__piece", piece === piece.toUpperCase() ? "is-white" : "is-black")} aria-hidden="true">
                {GLYPHS[piece.toLowerCase()]}
                {TEXT_STYLE}
              </span>
            );
          }}
        />

        <div className="board-game__side">
          <p className={result.over ? "board-game__result" : "board-game__status"}>{status}</p>
          {promotion ? (
            <div className="chess__promotion" role="group" aria-label="Promote to">
              {PROMOTIONS.map((piece) => (
                <button key={piece} type="button" aria-label={NAMES[piece]} onClick={() => play({ ...promotion, promotion: piece })}>
                  {GLYPHS[piece]}
                  {TEXT_STYLE}
                </button>
              ))}
            </div>
          ) : null}
          <div className="board-game__tools">
            <button type="button" disabled={moves.length === 0} onClick={undo}>
              <Undo2 size={15} aria-hidden="true" />
              Undo
            </button>
            <button type="button" onClick={() => restart()}>
              <RotateCcw size={15} aria-hidden="true" />
              Restart
            </button>
            <button type="button" onClick={() => restart(!playerWhite)}>
              <RefreshCw size={15} aria-hidden="true" />
              {playerWhite ? "Play black" : "Play white"}
            </button>
          </div>
          <dl ref={movesRef} className="chess__moves" aria-label="Moves">
            {rows.map((row) => (
              <div key={row.number} style={{ display: "contents" }}>
                <dt>{row.number}.</dt>
                <dd>{row.white}</dd>
                <dd>{row.black ?? ""}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
