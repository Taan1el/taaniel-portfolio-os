import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import {
  SUITS,
  bestMove,
  canFinish,
  cardsAt,
  createDeal,
  draw,
  finishStep,
  isRed,
  isValidSolitaire,
  isWon,
  move,
  type Card,
  type SolitaireState,
  type Source,
  type Target,
} from "@/lib/solitaire";
import { cn } from "@/lib/utils";
import type { AppComponentProps } from "@/types/system";
import "@/styles/solitaire.css";

const SAVE_KEY = "taaniel-os-solitaire";
const GLYPHS = ["♠", "♥", "♦", "♣"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const DRAG_THRESHOLD = 6;
const FINISH_STEP_MS = 70;

interface Drag {
  source: Source;
  cards: Card[];
  startX: number;
  startY: number;
  x: number;
  y: number;
  moving: boolean;
}

function loadGame() {
  try {
    const saved: unknown = JSON.parse(readLocalStorage(SAVE_KEY) ?? "null");
    if (isValidSolitaire(saved)) return saved;
  } catch {
    // A broken save just means a new deal.
  }
  return createDeal();
}

const cardName = (card: Card) => `${RANKS[card.rank]} of ${SUITS[card.suit]}`;
const sameSource = (a: Source | null, b: Source) => JSON.stringify(a) === JSON.stringify(b);

function CardFace({ card }: { card: Card }) {
  return (
    <span className={cn("solitaire__face", isRed(card) && "is-red")} aria-hidden="true">
      <span className="solitaire__corner">
        {RANKS[card.rank]}
        <span>{GLYPHS[card.suit]}</span>
      </span>
      <span className="solitaire__pip">{GLYPHS[card.suit]}</span>
    </span>
  );
}

export function SolitaireApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [game, setGame] = useState<SolitaireState>(loadGame);
  const [history, setHistory] = useState<SolitaireState[]>([]);
  const [picked, setPicked] = useState<Source | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [finishing, setFinishing] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const won = isWon(game);

  useEffect(() => {
    writeLocalStorage(SAVE_KEY, JSON.stringify(game));
  }, [game]);

  const commit = (next: SolitaireState | null) => {
    if (!next) return false;
    setHistory((list) => [...list.slice(-299), game]);
    setGame(next);
    setPicked(null);
    return true;
  };

  useEffect(() => {
    if (!finishing) return undefined;
    if (won) {
      setFinishing(false);
      return undefined;
    }
    const timer = globalThis.setTimeout(() => setGame((current) => finishStep(current)), FINISH_STEP_MS);
    return () => globalThis.clearTimeout(timer);
  }, [finishing, game, won]);

  const placeOn = (target: Target) => {
    if (picked) commit(move(game, picked, target)) || setPicked(null);
  };

  const pick = (source: Source, placeTarget?: Target) => {
    if (suppressClick.current) return;
    if (picked && placeTarget) {
      if (sameSource(picked, source)) {
        setPicked(null);
        return;
      }
      if (commit(move(game, picked, placeTarget))) return;
    }
    setPicked(cardsAt(game, source) ? source : null);
  };

  const beginDrag = (event: ReactPointerEvent, source: Source) => {
    const cards = cardsAt(game, source);
    if (!cards || event.button !== 0) return;
    dragRef.current = { source, cards, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moving: false };
  };

  // Listening on the window keeps a drag alive when the pointer leaves the card.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const moving = current.moving || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD;
      dragRef.current = { ...current, x: event.clientX, y: event.clientY, moving };
      if (moving) setDrag(dragRef.current);
    };

    const onUp = (event: PointerEvent) => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current?.moving) return;

      suppressClick.current = true;
      globalThis.setTimeout(() => {
        suppressClick.current = false;
      }, 0);

      const pile = document.elementsFromPoint(event.clientX, event.clientY).map((element) => element.closest<HTMLElement>("[data-pile]")).find(Boolean);
      if (!pile) return;
      const target: Target = pile.dataset.pile === "foundation" ? { pile: "foundation", suit: Number(pile.dataset.index) } : { pile: "tableau", column: Number(pile.dataset.index) };
      const state = gameRef.current;
      const next = move(state, current.source, target);
      if (next) {
        setHistory((list) => [...list.slice(-299), state]);
        setGame(next);
      }
      setPicked(null);
    };

    globalThis.window.addEventListener("pointermove", onMove);
    globalThis.window.addEventListener("pointerup", onUp);
    return () => {
      globalThis.window.removeEventListener("pointermove", onMove);
      globalThis.window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFinishing(false);
    setHistory((list) => list.slice(0, -1));
    setGame(previous);
    setPicked(null);
  };

  const newGame = () => {
    setFinishing(false);
    setGame(createDeal());
    setHistory([]);
    setPicked(null);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && picked) {
      event.stopPropagation();
      setPicked(null);
    } else if (event.key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      undo();
    }
  };

  const isDragged = (source: Source) => {
    if (!drag?.moving) return false;
    if (drag.source.pile !== source.pile) return false;
    if (source.pile === "tableau" && drag.source.pile === "tableau") return source.column === drag.source.column && source.index >= drag.source.index;
    return true;
  };

  const wasteCard = game.waste.at(-1);
  const wasteSource: Source = { pile: "waste" };
  const pickedCards = picked ? cardsAt(game, picked) : null;

  return (
    <ArcadeGameShell
      className="solitaire"
      title="Solitaire"
      subtitle={won ? `Won in ${game.moves} moves` : `${game.moves} moves`}
      actions={
        <Button type="button" variant="ghost" onClick={newGame}>
          New game
        </Button>
      }
      footer={<span>Drag cards, or pick one then its destination. Double-click sends a card home. Esc cancels, Ctrl+Z undoes.</span>}
    >
      <div ref={tableRef} className="solitaire__table" onKeyDown={handleKeyDown}>
        <div className="solitaire__top">
          <button
            type="button"
            className={cn("solitaire__slot", game.stock.length > 0 && "solitaire__back")}
            aria-label={game.stock.length ? `Stock, ${game.stock.length} cards. Draw one` : "Turn the waste back over"}
            onClick={() => {
              setPicked(null);
              commit(draw(game));
            }}
          >
            {game.stock.length === 0 ? <RotateCcw size={18} aria-hidden="true" /> : null}
          </button>

          {wasteCard ? (
            <button
              type="button"
              className={cn("solitaire__card", sameSource(picked, wasteSource) && "is-picked", isDragged(wasteSource) && "is-dragged")}
              aria-label={`Waste, ${cardName(wasteCard)}`}
              aria-pressed={sameSource(picked, wasteSource)}
              onPointerDown={(event) => beginDrag(event, wasteSource)}
              onClick={() => pick(wasteSource)}
              onDoubleClick={() => commit(bestMove(game, wasteSource))}
            >
              <CardFace card={wasteCard} />
            </button>
          ) : (
            <span className="solitaire__slot" aria-hidden="true" />
          )}

          <span className="solitaire__tools">
            <button type="button" aria-label="Undo" title="Undo" disabled={history.length === 0} onClick={undo}>
              <Undo2 size={16} />
            </button>
            {canFinish(game) ? (
              <button type="button" aria-label="Finish the game" title="Finish the game" onClick={() => setFinishing(true)}>
                <Sparkles size={16} />
              </button>
            ) : null}
          </span>

          {game.foundations.map((rank, suit) => {
            const source: Source = { pile: "foundation", suit };
            const card = { suit, rank, up: true };

            return (
              <button
                key={suit}
                type="button"
                data-pile="foundation"
                data-index={suit}
                className={cn(rank ? "solitaire__card" : "solitaire__slot", sameSource(picked, source) && "is-picked")}
                aria-label={rank ? `${SUITS[suit]} foundation, ${cardName(card)}` : `Empty ${SUITS[suit]} foundation`}
                onPointerDown={(event) => beginDrag(event, source)}
                onClick={() => {
                  if (picked && pickedCards) placeOn({ pile: "foundation", suit });
                  else pick(source);
                }}
              >
                {rank ? <CardFace card={card} /> : <span className="solitaire__suit" aria-hidden="true">{GLYPHS[suit]}</span>}
              </button>
            );
          })}
        </div>

        <div className="solitaire__columns">
          {game.tableau.map((column, columnIndex) => (
            <div key={columnIndex} className="solitaire__column" data-pile="tableau" data-index={columnIndex} style={{ "--count": Math.max(column.length, 1) } as React.CSSProperties}>
              {column.length === 0 ? (
                <button type="button" className="solitaire__slot" aria-label={`Empty column ${columnIndex + 1}`} onClick={() => placeOn({ pile: "tableau", column: columnIndex })} />
              ) : null}
              {column.map((card, index) => {
                const source: Source = { pile: "tableau", column: columnIndex, index };
                const target: Target = { pile: "tableau", column: columnIndex };

                return card.up ? (
                  <button
                    key={`${card.suit}-${card.rank}`}
                    type="button"
                    className={cn(
                      "solitaire__card",
                      picked?.pile === "tableau" && picked.column === columnIndex && index >= picked.index && "is-picked",
                      isDragged(source) && "is-dragged"
                    )}
                    style={{ "--index": index } as React.CSSProperties}
                    aria-label={`${cardName(card)}, column ${columnIndex + 1}`}
                    onPointerDown={(event) => beginDrag(event, source)}
                    onClick={() => pick(source, target)}
                    onDoubleClick={() => commit(bestMove(game, source))}
                  >
                    <CardFace card={card} />
                  </button>
                ) : (
                  <span key={`${card.suit}-${card.rank}`} className="solitaire__card solitaire__back" style={{ "--index": index } as React.CSSProperties} aria-hidden="true" />
                );
              })}
            </div>
          ))}
        </div>

        {won ? <p className="board-game__result solitaire__won">You won in {game.moves} moves.</p> : null}

        {drag?.moving ? (
          // Windows are transformed, so the ghost is placed inside the table rather than against the page.
          <div
            className="solitaire__ghost"
            style={{ left: drag.x - (tableRef.current?.getBoundingClientRect().left ?? 0), top: drag.y - (tableRef.current?.getBoundingClientRect().top ?? 0) }}
            aria-hidden="true"
          >
            {drag.cards.map((card, index) => (
              <span key={`${card.suit}-${card.rank}`} className="solitaire__card" style={{ "--index": index } as React.CSSProperties}>
                <CardFace card={card} />
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </ArcadeGameShell>
  );
}
