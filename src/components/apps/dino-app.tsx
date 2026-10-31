import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import type { AppComponentProps } from "@/types/system";
import "@/styles/arcade-canvas.css";

const WIDTH = 720;
const HEIGHT = 240;
const GROUND = 200;
const GRAVITY = 1900;
const JUMP = 640;
const RUNNER = { x: 70, width: 30, height: 44 };
const BEST_KEY = "taaniel-os-dino-best";

interface Obstacle {
  x: number;
  width: number;
  height: number;
}

function readBest() {
  const best = Number(readLocalStorage(BEST_KEY) ?? 0);
  return Number.isFinite(best) && best > 0 ? best : 0;
}

function draw(context: CanvasRenderingContext2D, height: number, obstacles: Obstacle[], stride: boolean) {
  context.fillStyle = "#10141f";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#3a445c";
  context.fillRect(0, GROUND, WIDTH, 2);

  const top = GROUND - RUNNER.height - height;
  context.fillStyle = "#ffd27d";
  context.fillRect(RUNNER.x, top + 12, RUNNER.width - 8, RUNNER.height - 20); // body
  context.fillRect(RUNNER.x + 10, top, RUNNER.width - 6, 18); // head
  context.fillRect(RUNNER.x - 8, top + 18, 10, 8); // tail
  context.fillRect(RUNNER.x + 2, top + RUNNER.height - 8, 7, stride || height > 0 ? 8 : 4); // legs
  context.fillRect(RUNNER.x + 13, top + RUNNER.height - 8, 7, stride && height === 0 ? 4 : 8);
  context.fillStyle = "#10141f";
  context.fillRect(RUNNER.x + 26, top + 5, 3, 3); // eye

  context.fillStyle = "#46d39a";
  for (const obstacle of obstacles) {
    context.fillRect(obstacle.x, GROUND - obstacle.height, obstacle.width, obstacle.height);
    context.fillRect(obstacle.x - 6, GROUND - obstacle.height + 12, 6, 10);
    context.fillRect(obstacle.x + obstacle.width, GROUND - obstacle.height + 8, 6, 10);
  }
}

export function DinoApp({ window: appWindow }: AppComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const velocityRef = useRef(0);
  const heightRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [over, setOver] = useState(false);
  const paused = !appWindow.focused;
  const runRef = useRef({ distance: 0, obstacles: [] as Obstacle[], nextGap: 360 });

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return undefined;
    draw(context, heightRef.current, runRef.current.obstacles, false);
    if (!running || paused) return undefined;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const run = runRef.current;
      const speed = 300 + Math.min(320, run.distance / 45);
      run.distance += speed * seconds;

      velocityRef.current -= GRAVITY * seconds;
      heightRef.current = Math.max(0, heightRef.current + velocityRef.current * seconds);
      if (heightRef.current === 0) velocityRef.current = 0;

      run.nextGap -= speed * seconds;
      if (run.nextGap <= 0) {
        run.obstacles.push({ x: WIDTH, width: 14 + Math.floor(Math.random() * 14), height: 30 + Math.floor(Math.random() * 26) });
        run.nextGap = 260 + Math.random() * 300 + speed / 3;
      }
      run.obstacles = run.obstacles.filter((obstacle) => (obstacle.x -= speed * seconds) > -40);

      const hit = run.obstacles.some(
        (obstacle) =>
          obstacle.x < RUNNER.x + RUNNER.width - 8 && obstacle.x + obstacle.width > RUNNER.x + 4 && heightRef.current < obstacle.height - 6
      );
      draw(context, heightRef.current, run.obstacles, Math.floor(run.distance / 40) % 2 === 0);
      const points = Math.floor(run.distance / 30);
      setScore(points);

      if (hit) {
        setRunning(false);
        setOver(true);
        setBest((value) => {
          const next = Math.max(value, points);
          writeLocalStorage(BEST_KEY, String(next));
          return next;
        });
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, running]);

  const start = () => {
    runRef.current = { distance: 0, obstacles: [], nextGap: 360 };
    heightRef.current = 0;
    velocityRef.current = 0;
    setScore(0);
    setOver(false);
    setRunning(true);
    canvasRef.current?.focus();
  };

  const jump = () => {
    if (!running) start();
    else if (heightRef.current === 0) velocityRef.current = JUMP;
  };

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === " " || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) jump();
    }
  };

  return (
    <ArcadeGameShell
      className="arcade-canvas"
      title="Dino"
      subtitle="Run, jump, repeat"
      actions={<span className="games-hub__chip">Score {score} · Best {Math.max(best, score)}</span>}
      footer={<span>Space, Up or a tap jumps. It speeds up the further you get.</span>}
    >
      <div className="arcade-canvas__stage">
        <canvas
          ref={canvasRef}
          className="arcade-canvas__screen"
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          role="application"
          aria-label="Dino runner. Space or Up jumps."
          onKeyDown={handleKey}
          onPointerDown={jump}
        />
        {!running ? (
          <div className="arcade-canvas__notice">
            {over ? <p>Game over · {score} points</p> : null}
            <Button onClick={start}>{over ? "Play again" : "Start"}</Button>
          </div>
        ) : null}
      </div>
    </ArcadeGameShell>
  );
}
