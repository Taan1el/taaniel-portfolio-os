import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { AppComponentProps } from "@/types/system";

const SNAKE_COLUMNS = 18;
const SNAKE_ROWS = 14;
const START_DIRECTION = { x: 1, y: 0 };
const START_SNAKE = [
  { x: 4, y: 6 },
  { x: 3, y: 6 },
  { x: 2, y: 6 },
];

function createFood(snake: Array<{ x: number; y: number }>) {
  const occupied = new Set(snake.map((segment) => `${segment.x}:${segment.y}`));
  const availableCells: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < SNAKE_ROWS; y += 1) {
    for (let x = 0; x < SNAKE_COLUMNS; x += 1) {
      if (!occupied.has(`${x}:${y}`)) {
        availableCells.push({ x, y });
      }
    }
  }

  return availableCells[Math.floor(Math.random() * availableCells.length)] ?? { x: 8, y: 6 };
}

function isOppositeDirection(
  current: { x: number; y: number },
  next: { x: number; y: number }
) {
  return current.x + next.x === 0 && current.y + next.y === 0;
}

export function SnakeApp({ window: appWindow }: AppComponentProps) {
  void appWindow;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [snake, setSnake] = useState(START_SNAKE);
  const [direction, setDirection] = useState(START_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState(START_DIRECTION);
  const [food, setFood] = useState(() => createFood(START_SNAKE));
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("taaniel-os-snake-best") ?? 0));

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem("taaniel-os-snake-best", String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const intervalId = globalThis.window.setInterval(() => {
      setSnake((currentSnake) => {
        const nextDirection = queuedDirection;
        const nextHead = {
          x: currentSnake[0].x + nextDirection.x,
          y: currentSnake[0].y + nextDirection.y,
        };

        const collidedWithWall =
          nextHead.x < 0 ||
          nextHead.x >= SNAKE_COLUMNS ||
          nextHead.y < 0 ||
          nextHead.y >= SNAKE_ROWS;
        const collidedWithSelf = currentSnake.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );

        if (collidedWithWall || collidedWithSelf) {
          setRunning(false);
          setBestScore((currentBest) => Math.max(currentBest, score));
          return currentSnake;
        }

        const willEat = nextHead.x === food.x && nextHead.y === food.y;
        const nextSnake = [nextHead, ...currentSnake];

        if (!willEat) {
          nextSnake.pop();
        } else {
          const nextScore = score + 10;
          setScore(nextScore);
          setBestScore((currentBest) => Math.max(currentBest, nextScore));
          setFood(createFood(nextSnake));
        }

        setDirection(nextDirection);
        return nextSnake;
      });
    }, 140);

    return () => globalThis.window.clearInterval(intervalId);
  }, [food, queuedDirection, running, score]);

  const snakeCells = useMemo(
    () => new Set(snake.map((segment) => `${segment.x}:${segment.y}`)),
    [snake]
  );

  const resetGame = () => {
    setSnake(START_SNAKE);
    setDirection(START_DIRECTION);
    setQueuedDirection(START_DIRECTION);
    setFood(createFood(START_SNAKE));
    setScore(0);
    setRunning(true);
    containerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="arcade-game snake-game"
      tabIndex={0}
      onKeyDown={(event) => {
        const nextDirection =
          event.key === "ArrowUp" || event.key.toLowerCase() === "w"
            ? { x: 0, y: -1 }
            : event.key === "ArrowDown" || event.key.toLowerCase() === "s"
              ? { x: 0, y: 1 }
              : event.key === "ArrowLeft" || event.key.toLowerCase() === "a"
                ? { x: -1, y: 0 }
                : event.key === "ArrowRight" || event.key.toLowerCase() === "d"
                  ? { x: 1, y: 0 }
                  : null;

        if (!nextDirection) {
          if (event.key === " ") {
            event.preventDefault();
            setRunning((current) => !current);
          }

          return;
        }

        event.preventDefault();

        if (!isOppositeDirection(direction, nextDirection)) {
          setQueuedDirection(nextDirection);
        }
      }}
    >
      <header className="arcade-game__header">
        <div>
          <p className="eyebrow">Snake</p>
          <h1>{score} pts</h1>
        </div>
        <div className="arcade-game__header-actions">
          <span>Best {bestScore}</span>
          <button type="button" className="ghost-button" onClick={resetGame}>
            <RotateCcw size={15} />
            Restart
          </button>
          <button type="button" className="ghost-button" onClick={() => setRunning((current) => !current)}>
            <Play size={15} />
            {running ? "Pause" : "Play"}
          </button>
        </div>
      </header>

      <div
        className="snake-game__board"
        style={
          {
            gridTemplateColumns: `repeat(${SNAKE_COLUMNS}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {Array.from({ length: SNAKE_COLUMNS * SNAKE_ROWS }).map((_, index) => {
          const x = index % SNAKE_COLUMNS;
          const y = Math.floor(index / SNAKE_COLUMNS);
          const key = `${x}:${y}`;
          const isHead = snake[0].x === x && snake[0].y === y;
          const isFood = food.x === x && food.y === y;

          return (
            <span
              key={key}
              className={`snake-game__cell ${snakeCells.has(key) ? "is-snake" : ""} ${isHead ? "is-head" : ""} ${isFood ? "is-food" : ""}`}
            />
          );
        })}
      </div>

      <footer className="arcade-game__footer">
        <small>Arrow keys or WASD to steer. Space pauses. Avoid walls and your own tail.</small>
      </footer>
    </div>
  );
}
