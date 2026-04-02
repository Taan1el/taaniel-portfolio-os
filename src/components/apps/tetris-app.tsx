import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Play, RotateCcw } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { useArcadeBoardSize } from "@/hooks/use-arcade-board-size";
import type { AppComponentProps } from "@/types/system";

const TETRIS_COLUMNS = 10;
const TETRIS_ROWS = 18;

const TETROMINOES = [
  { color: "#77c7ff", shape: [[1, 1, 1, 1]] },
  {
    color: "#ffb26a",
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    color: "#8bff9f",
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    color: "#f08dff",
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    color: "#ffd66a",
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  {
    color: "#a79fff",
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  {
    color: "#7db1ff",
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
];

type TetrisBoard = string[][];

interface ActivePiece {
  color: string;
  shape: number[][];
  row: number;
  column: number;
}

function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLUMNS }, () => ""));
}

function createPiece(): ActivePiece {
  const template = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    color: template.color,
    shape: template.shape.map((row) => [...row]),
    row: 0,
    column: Math.floor((TETRIS_COLUMNS - template.shape[0].length) / 2),
  };
}

function rotateShape(shape: number[][]) {
  return shape[0].map((_, columnIndex) => shape.map((row) => row[columnIndex]).reverse());
}

function canPlace(board: TetrisBoard, piece: ActivePiece) {
  return piece.shape.every((row, rowIndex) =>
    row.every((cell, columnIndex) => {
      if (!cell) {
        return true;
      }

      const targetRow = piece.row + rowIndex;
      const targetColumn = piece.column + columnIndex;

      return (
        targetRow >= 0 &&
        targetRow < TETRIS_ROWS &&
        targetColumn >= 0 &&
        targetColumn < TETRIS_COLUMNS &&
        !board[targetRow][targetColumn]
      );
    })
  );
}

function mergePiece(board: TetrisBoard, piece: ActivePiece) {
  const nextBoard = board.map((row) => [...row]);

  piece.shape.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell) {
        nextBoard[piece.row + rowIndex][piece.column + columnIndex] = piece.color;
      }
    });
  });

  return nextBoard;
}

function clearLines(board: TetrisBoard) {
  const remainingRows = board.filter((row) => row.some((cell) => !cell));
  const linesCleared = TETRIS_ROWS - remainingRows.length;

  while (remainingRows.length < TETRIS_ROWS) {
    remainingRows.unshift(Array.from({ length: TETRIS_COLUMNS }, () => ""));
  }

  return {
    board: remainingRows,
    linesCleared,
  };
}

export function TetrisApp({ window: appWindow }: AppComponentProps) {
  void appWindow;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { viewportRef, boardStyle } = useArcadeBoardSize(TETRIS_COLUMNS, TETRIS_ROWS, {
    minCellSize: 16,
    maxCellSize: 34,
  });
  const [board, setBoard] = useState<TetrisBoard>(() => createEmptyBoard());
  const [piece, setPiece] = useState<ActivePiece>(() => createPiece());
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setPiece(createPiece());
    setScore(0);
    setLines(0);
    setRunning(true);
    containerRef.current?.focus();
  };

  useEffect(() => {
    if (!running) {
      return;
    }

    const intervalId = globalThis.window.setInterval(() => {
      setPiece((currentPiece) => {
        const movedPiece = { ...currentPiece, row: currentPiece.row + 1 };

        if (canPlace(board, movedPiece)) {
          return movedPiece;
        }

        const mergedBoard = mergePiece(board, currentPiece);
        const { board: clearedBoard, linesCleared } = clearLines(mergedBoard);
        const nextPiece = createPiece();

        setBoard(clearedBoard);

        if (linesCleared > 0) {
          setLines((currentLines) => currentLines + linesCleared);
          setScore((currentScore) => currentScore + linesCleared * 100);
        }

        if (!canPlace(clearedBoard, nextPiece)) {
          setRunning(false);
          return currentPiece;
        }

        return nextPiece;
      });
    }, 460);

    return () => globalThis.window.clearInterval(intervalId);
  }, [board, running]);

  const renderedBoard = useMemo(() => {
    const nextBoard = board.map((row) => [...row]);

    piece.shape.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        if (cell) {
          const targetRow = piece.row + rowIndex;
          const targetColumn = piece.column + columnIndex;

          if (
            targetRow >= 0 &&
            targetRow < TETRIS_ROWS &&
            targetColumn >= 0 &&
            targetColumn < TETRIS_COLUMNS
          ) {
            nextBoard[targetRow][targetColumn] = piece.color;
          }
        }
      });
    });

    return nextBoard;
  }, [board, piece]);

  const movePiece = (rowDelta: number, columnDelta: number) => {
    setPiece((currentPiece) => {
      const movedPiece = {
        ...currentPiece,
        row: currentPiece.row + rowDelta,
        column: currentPiece.column + columnDelta,
      };

      return canPlace(board, movedPiece) ? movedPiece : currentPiece;
    });
  };

  const rotatePiece = () => {
    setPiece((currentPiece) => {
      const rotatedPiece = {
        ...currentPiece,
        shape: rotateShape(currentPiece.shape),
      };

      return canPlace(board, rotatedPiece) ? rotatedPiece : currentPiece;
    });
  };

  return (
    <ArcadeGameShell
      className="tetris-game"
      title="Tetris"
      subtitle="Arrow keys move, Up rotates, Space pauses."
      actions={
        <>
          <span className="games-hub__chip">Score {score}</span>
          <span className="games-hub__chip">Lines {lines}</span>
          <Button type="button" variant="ghost" onClick={() => setRunning((current) => !current)}>
            <Play size={15} />
            {running ? "Pause" : "Play"}
          </Button>
          <Button type="button" variant="panel" onClick={resetGame}>
            <RotateCcw size={15} />
            Restart
          </Button>
        </>
      }
      footer={
        <>
          <span>{running ? "Keep the stack clean and watch your rotations." : "Press Play to start a stack."}</span>
          <small>Clearing lines adds 100 points per row.</small>
        </>
      }
    >
      <div
        ref={containerRef}
        className="arcade-game-shell__interactive"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            movePiece(0, -1);
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            movePiece(0, 1);
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            movePiece(1, 0);
          }

          if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
            event.preventDefault();
            rotatePiece();
          }

          if (event.key === " ") {
            event.preventDefault();
            setRunning((current) => !current);
          }
        }}
      >
        <div className="tetris-game__layout">
          <div ref={viewportRef} className="arcade-game-shell__viewport tetris-game__viewport">
            <div
              className="tetris-game__board"
              style={
                {
                  ...boardStyle,
                  gridTemplateColumns: `repeat(${TETRIS_COLUMNS}, minmax(0, 1fr))`,
                } as CSSProperties
              }
            >
              {renderedBoard.flat().map((cell, index) => (
                <span
                  key={index}
                  className={`tetris-game__cell ${cell ? "is-filled" : ""}`}
                  style={cell ? ({ "--tetris-cell": cell } as CSSProperties) : undefined}
                />
              ))}
            </div>
          </div>

          <aside className="glass-card tetris-game__aside">
            <strong>Controls</strong>
            <small>Left / Right move the piece, Down drops, Up rotates, Space pauses.</small>
          </aside>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
