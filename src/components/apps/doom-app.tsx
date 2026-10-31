import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { DOOM_HEIGHT, DOOM_WIDTH, DoomEngine } from "@/lib/doom-engine";
import type { AppComponentProps } from "@/types/system";
import "@/styles/doom.css";

const WASM_URL = `${import.meta.env.BASE_URL}assets/doom/doom.wasm`;
const ENGINE_SOURCE = "https://github.com/diekmann/wasm-fizzbuzz";

/** OS shortcuts keep working while the game has the keyboard. */
function isShellShortcut(event: KeyboardEvent) {
  if (event.altKey && (event.shiftKey || event.key === "[" || event.key === "]")) return true;
  if (event.ctrlKey && event.altKey) return true;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") return true;
  return event.key === "F11";
}

export function DoomApp({ window: appWindow }: AppComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DoomEngine | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const paused = !appWindow.focused;

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return undefined;

    const engine = new DoomEngine({
      wasmUrl: WASM_URL,
      draw: (pixels) => context.putImageData(new ImageData(pixels, DOOM_WIDTH, DOOM_HEIGHT), 0, 0),
    });
    let cancelled = false;
    engineRef.current = engine;
    setStatus("loading");
    engine.start().then(
      () => {
        if (cancelled) return;
        setStatus("ready");
        canvasRef.current?.focus({ preventScroll: true });
      },
      () => {
        if (!cancelled) setStatus("error");
      }
    );

    return () => {
      cancelled = true;
      engine.stop();
      engineRef.current = null;
    };
  }, [attempt]);

  // An unfocused window stops the game, like alt-tabbing away.
  useEffect(() => {
    if (status !== "ready") return;
    if (paused) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.resume();
      canvasRef.current?.focus({ preventScroll: true });
    }
  }, [paused, status]);

  // Clicking the title bar focuses the window frame; hand that straight to the game.
  useEffect(() => {
    const frame = canvasRef.current?.closest(".window-frame");
    const giveFocusToGame = (event: Event) => {
      if (event.target === frame) canvasRef.current?.focus({ preventScroll: true });
    };
    frame?.addEventListener("focusin", giveFocusToGame);
    return () => frame?.removeEventListener("focusin", giveFocusToGame);
  }, []);

  const handleKey = (type: "down" | "up", event: KeyboardEvent<HTMLCanvasElement>) => {
    if (isShellShortcut(event)) return;
    if (event.key === "F6") {
      // The way out for keyboard users, the same key the terminal uses.
      event.preventDefault();
      if (type === "down") {
        event.currentTarget.closest(".window-frame")?.querySelector<HTMLElement>('[aria-label="Minimize"]')?.focus();
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) engineRef.current?.key(type, event.keyCode);
  };

  return (
    <ArcadeGameShell
      className="doom-app"
      title="Doom"
      subtitle="Knee-Deep in the Dead, the shareware episode"
      footer={
        <>
          <span>Arrows move · Ctrl fires · Space opens doors · 1-7 weapons · Esc menu · F6 leaves the game</span>
          <small>
            No sound in this build. Engine:{" "}
            <a href={ENGINE_SOURCE} target="_blank" rel="noreferrer">
              GPL-2.0 source
            </a>
            . Doom © id Software.
          </small>
        </>
      }
    >
      <div className="doom-app__stage">
        <canvas
          ref={canvasRef}
          className="doom-app__screen"
          width={DOOM_WIDTH}
          height={DOOM_HEIGHT}
          tabIndex={0}
          role="application"
          aria-label="Doom. Arrow keys move, Ctrl fires, Space opens doors, Escape opens the menu, F6 leaves the game."
          onKeyDown={(event) => handleKey("down", event)}
          onKeyUp={(event) => handleKey("up", event)}
          onBlur={() => engineRef.current?.releaseKeys()}
        />
        {status === "loading" ? <p className="doom-app__notice">Loading Doom…</p> : null}
        {status === "ready" && paused ? <p className="doom-app__notice">Paused. Click the window to play.</p> : null}
        {status === "error" ? (
          <div className="doom-app__notice">
            <p>Doom could not start.</p>
            <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
          </div>
        ) : null}
      </div>
    </ArcadeGameShell>
  );
}
