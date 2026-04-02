import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useArcadeBoardSize(
  columns: number,
  rows: number,
  options?: { minCellSize?: number; maxCellSize?: number }
) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(() => ({
    width: columns * 24,
    height: rows * 24,
  }));

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateBoardSize = () => {
      const rect = viewport.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const minCellSize = options?.minCellSize ?? 14;
      const maxCellSize = options?.maxCellSize ?? 42;
      const nextCellSize = clamp(
        Math.floor(Math.min(rect.width / columns, rect.height / rows)),
        minCellSize,
        maxCellSize
      );
      const nextWidth = nextCellSize * columns;
      const nextHeight = nextCellSize * rows;

      setBoardSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateBoardSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateBoardSize();
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [columns, rows, options?.maxCellSize, options?.minCellSize]);

  return {
    viewportRef,
    boardStyle: {
      width: `${boardSize.width}px`,
      height: `${boardSize.height}px`,
    },
  };
}
