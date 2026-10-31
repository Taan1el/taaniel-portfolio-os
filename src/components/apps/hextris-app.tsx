import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { COLOURS, MAX_STACK, SIDES, createGame, land, rotate, type HextrisState } from "@/lib/hextris";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import type { AppComponentProps } from "@/types/system";
import "@/styles/arcade-canvas.css";

const SIZE = 480;
const CORE = 46;
const BLOCK = 18;
const PALETTE = ["#ff5d6c", "#ffc24b", "#46d39a", "#58a6ff"];
const BEST_KEY = "taaniel-os-hextris-best";

interface Falling {
  lane: number;
  colour: number;
  distance: number;
}

function readBest() {
  const best = Number(readLocalStorage(BEST_KEY) ?? 0);
  return Number.isFinite(best) && best > 0 ? best : 0;
}

function draw(context: CanvasRenderingContext2D, game: HextrisState, falling: Falling[]) {
  const centre = SIZE / 2;
  context.clearRect(0, 0, SIZE, SIZE);
  context.fillStyle = "#10141f";
  context.fillRect(0, 0, SIZE, SIZE);

  const wedge = (side: number, inner: number, thickness: number, colour: string) => {
    const angle = (side * Math.PI) / 3 - Math.PI / 2;
    const half = Math.PI / SIDES;
    const point = (radius: number, offset: number) => [centre + Math.cos(angle + offset) * radius, centre + Math.sin(angle + offset) * radius];
    const corners = [point(inner, -half), point(inner + thickness, -half), point(inner + thickness, half), point(inner, half)];
    context.beginPath();
    corners.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
    context.fillStyle = colour;
    context.fill();
    context.strokeStyle = "#10141f";
    context.lineWidth = 2;
    context.stroke();
  };

  // The danger ring: stacks that reach it end the game.
  wedge(0, CORE + MAX_STACK * BLOCK, 0, "transparent");
  for (let side = 0; side < SIDES; side += 1) {
    wedge(side, CORE - 16, 16, "#2a3247");
    game.stacks[(side - game.rotation + SIDES * 2) % SIDES].forEach((colour, level) => {
      wedge(side, CORE + level * BLOCK, BLOCK, PALETTE[colour]);
    });
  }
  for (const block of falling) wedge(block.lane, CORE + block.distance, BLOCK, PALETTE[block.colour]);
}

export function HextrisApp({ window: appWindow }: AppComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createGame());
  const fallingRef = useRef<Falling[]>([]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [over, setOver] = useState(false);
  const paused = !appWindow.focused;

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return undefined;
    draw(context, gameRef.current, fallingRef.current);
    if (!running || paused) return undefined;

    let frame = 0;
    let previous = performance.now();
    let spawn = 0;

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const game = gameRef.current;
      // It speeds up with the score, slowly enough to stay fair.
      const speed = 90 + Math.min(120, game.score / 12);
      spawn -= seconds;
      if (spawn <= 0) {
        spawn = Math.max(0.7, 1.5 - game.score / 2500);
        fallingRef.current.push({ lane: Math.floor(Math.random() * SIDES), colour: Math.floor(Math.random() * COLOURS), distance: SIZE / 2 });
      }

      fallingRef.current = fallingRef.current.filter((block) => {
        block.distance -= speed * seconds;
        const side = (block.lane - gameRef.current.rotation + SIDES * 2) % SIDES;
        if (block.distance > gameRef.current.stacks[side].length * BLOCK) return true;
        gameRef.current = land(gameRef.current, block.lane, block.colour);
        return false;
      });

      draw(context, gameRef.current, fallingRef.current);
      setScore(gameRef.current.score);
      if (gameRef.current.over) {
        setRunning(false);
        setOver(true);
        setBest((value) => {
          const next = Math.max(value, gameRef.current.score);
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
    gameRef.current = createGame();
    fallingRef.current = [];
    setScore(0);
    setOver(false);
    setRunning(true);
    canvasRef.current?.focus();
  };

  const turn = (step: 1 | -1) => {
    if (running && !paused) gameRef.current = rotate(gameRef.current, step);
  };

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      turn(event.key === "ArrowRight" ? 1 : -1);
    } else if ((event.key === " " || event.key === "Enter") && !running) {
      event.preventDefault();
      start();
    }
  };

  return (
    <ArcadeGameShell
      className="arcade-canvas"
      title="Hextris"
      subtitle="Match three colours around the hexagon"
      actions={<span className="games-hub__chip">Score {score} · Best {Math.max(best, score)}</span>}
      footer={<span>Left and Right rotate the hexagon, or tap either side. Three touching of one colour clear.</span>}
    >
      <div className="arcade-canvas__stage">
        <canvas
          ref={canvasRef}
          className="arcade-canvas__screen arcade-canvas__screen--square"
          width={SIZE}
          height={SIZE}
          tabIndex={0}
          role="application"
          aria-label="Hextris. Left and Right arrows rotate the hexagon."
          onKeyDown={handleKey}
          onPointerDown={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            turn(event.clientX - box.left > box.width / 2 ? 1 : -1);
          }}
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
