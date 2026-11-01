import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SQUARES = Array.from({ length: 64 }, (_, index) => index);

/** An 8 by 8 board of real buttons: one tab stop, then arrow keys walk the squares. */
export function BoardGrid({
  label,
  isDark,
  labelOf,
  classOf,
  onSelect,
  renderSquare,
}: {
  label: string;
  isDark: (square: number) => boolean;
  labelOf: (square: number) => string;
  classOf?: (square: number) => string | false | undefined;
  onSelect: (square: number) => void;
  renderSquare: (square: number) => ReactNode;
}) {
  const [cursor, setCursor] = useState(52);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent) => {
    const steps: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const row = Math.min(7, Math.max(0, Math.floor(cursor / 8) + step[0]));
    const column = Math.min(7, Math.max(0, (cursor % 8) + step[1]));
    const next = row * 8 + column;
    setCursor(next);
    boardRef.current?.querySelector<HTMLElement>(`[data-square="${next}"]`)?.focus();
  };

  return (
    <div ref={boardRef} className="board-grid" role="group" aria-label={label} onKeyDown={handleKeyDown}>
      {SQUARES.map((square) => (
        <button
          key={square}
          type="button"
          data-square={square}
          tabIndex={square === cursor ? 0 : -1}
          aria-label={labelOf(square)}
          className={cn("board-grid__square", isDark(square) ? "is-dark" : "is-light", classOf?.(square))}
          onFocus={() => setCursor(square)}
          onClick={() => onSelect(square)}
        >
          {renderSquare(square)}
        </button>
      ))}
    </div>
  );
}
