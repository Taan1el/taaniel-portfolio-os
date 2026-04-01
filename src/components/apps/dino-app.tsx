import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { AppComponentProps } from "@/types/system";

const TRACK_HEIGHT = 220;
const DINO_SIZE = 42;
const GROUND_OFFSET = 28;
const GRAVITY = 0.75;
const JUMP_FORCE = -11.5;

interface DinoObstacle {
  id: number;
  width: number;
  height: number;
  x: number;
}

export function DinoApp({ window }: AppComponentProps) {
  void window;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const dinoYRef = useRef(0);
  const velocityYRef = useRef(0);
  const scoreRef = useRef(0);
  const obstaclesRef = useRef<DinoObstacle[]>([]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("taaniel-os-dino-best") ?? 0));
  const [dinoY, setDinoY] = useState(0);
  const [obstacles, setObstacles] = useState<DinoObstacle[]>([]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem("taaniel-os-dino-best", String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    if (!running) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      return;
    }

    const tick = () => {
      const speed = 6 + scoreRef.current / 180;
      let nextVelocity = velocityYRef.current + GRAVITY;
      let nextDinoY = Math.min(0, dinoYRef.current + nextVelocity);

      if (nextDinoY >= 0) {
        nextDinoY = 0;
        nextVelocity = 0;
      }

      spawnTimerRef.current += 1;
      const nextObstacles = obstaclesRef.current
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed }))
        .filter((obstacle) => obstacle.x + obstacle.width > -24);

      if (spawnTimerRef.current > 70 + Math.max(0, 30 - scoreRef.current / 20)) {
        spawnTimerRef.current = 0;
        nextObstacles.push({
          id: obstacleIdRef.current += 1,
          width: 18 + Math.floor(Math.random() * 18),
          height: 32 + Math.floor(Math.random() * 24),
          x: 620,
        });
      }

      const dinoBottom = TRACK_HEIGHT - GROUND_OFFSET + nextDinoY;
      const dinoLeft = 64;
      const dinoRight = dinoLeft + DINO_SIZE;
      const dinoTop = dinoBottom - DINO_SIZE;
      const collided = nextObstacles.some((obstacle) => {
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleBottom = TRACK_HEIGHT - GROUND_OFFSET;
        const obstacleTop = obstacleBottom - obstacle.height;

        return (
          dinoRight > obstacleLeft &&
          dinoLeft < obstacleRight &&
          dinoBottom > obstacleTop &&
          dinoTop < obstacleBottom
        );
      });

      if (collided) {
        setRunning(false);
        setBestScore((currentBest) => Math.max(currentBest, scoreRef.current));
        return;
      }

      const nextScore = scoreRef.current + 1;
      velocityYRef.current = nextVelocity;
      dinoYRef.current = nextDinoY;
      obstaclesRef.current = nextObstacles;
      scoreRef.current = nextScore;

      setDinoY(nextDinoY);
      setObstacles(nextObstacles);
      setScore(nextScore);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [running]);

  const jump = () => {
    if (dinoYRef.current !== 0) {
      return;
    }

    velocityYRef.current = JUMP_FORCE;
    dinoYRef.current = -1;
    setDinoY(-1);
  };

  const resetGame = () => {
    scoreRef.current = 0;
    dinoYRef.current = 0;
    velocityYRef.current = 0;
    obstaclesRef.current = [];
    spawnTimerRef.current = 0;
    setScore(0);
    setDinoY(0);
    setObstacles([]);
    setRunning(true);
    containerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="arcade-game dino-game"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "ArrowUp") {
          event.preventDefault();
          jump();
        }

        if (event.key.toLowerCase() === "p") {
          event.preventDefault();
          setRunning((current) => !current);
        }
      }}
    >
      <header className="arcade-game__header">
        <div>
          <p className="eyebrow">Dino</p>
          <h1>{score}</h1>
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

      <div className="dino-game__track" onClick={jump}>
        <div className="dino-game__runner" style={{ transform: `translate3d(0, ${dinoY}px, 0)` }} />
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className="dino-game__obstacle"
            style={{
              width: obstacle.width,
              height: obstacle.height,
              transform: `translate3d(${obstacle.x}px, 0, 0)`,
            }}
          />
        ))}
        <div className="dino-game__ground" />
      </div>

      <footer className="arcade-game__footer">
        <small>Jump with Space or Up Arrow. Click the track if you want mouse-friendly controls.</small>
      </footer>
    </div>
  );
}
