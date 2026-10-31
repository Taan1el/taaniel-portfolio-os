/**
 * Runs public/assets/doom/doom.wasm, a WebAssembly build of the GPL Doom engine.
 * The wasm-doom npm wrapper never stops its loop or removes its listeners, so
 * this loader talks to the same binary directly and can pause and shut down.
 */
export const DOOM_WIDTH = 640;
export const DOOM_HEIGHT = 400;

/** The binary expects exactly this much starting memory: 108 pages, about 7 MB. */
const MEMORY_PAGES = 108;

const KEY_DOWN = 0;
const KEY_UP = 1;

interface DoomExports {
  main: () => void;
  doom_loop_step: () => void;
  add_browser_event: (type: number, key: number) => void;
}

export interface DoomEngineOptions {
  wasmUrl: string;
  draw: (pixels: Uint8ClampedArray<ArrayBuffer>) => void;
  /** Injected by tests. */
  instantiate?: (imports: WebAssembly.Imports) => Promise<DoomExports>;
}

/** Translates a browser keyCode to the key numbers Doom uses. */
export function mapDoomKey(keyCode: number) {
  if (keyCode === 8) return 127; // Backspace
  if (keyCode === 17) return 157; // Ctrl: fire
  if (keyCode === 18) return 184; // Alt: strafe
  if (keyCode >= 37 && keyCode <= 40) return [172, 173, 174, 175][keyCode - 37]; // Arrows
  if (keyCode >= 65 && keyCode <= 90) return keyCode + 32; // Letters are lower case
  if (keyCode >= 112 && keyCode <= 123) return keyCode + 75; // F1-F12
  return keyCode;
}

async function loadBinary(url: string, imports: WebAssembly.Imports) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the game (${response.status}).`);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), imports);
  return instance.exports as unknown as DoomExports;
}

export class DoomEngine {
  private game: DoomExports | null = null;
  private frame = 0;
  private stopped = false;
  private paused = false;
  private pausedAt = 0;
  private pausedTotal = 0;
  private readonly held = new Set<number>();

  constructor(private readonly options: DoomEngineOptions) {}

  /** Game time leaves out pauses, so the world does not jump ahead on resume. */
  private clock = () => performance.now() - this.pausedTotal;

  private loop = () => {
    if (this.stopped || this.paused || !this.game) return;
    this.game.doom_loop_step();
    this.frame = requestAnimationFrame(this.loop);
  };

  async start() {
    const memory = new WebAssembly.Memory({ initial: MEMORY_PAGES });
    const quiet = () => {};
    const imports: WebAssembly.Imports = {
      js: {
        js_console_log: quiet,
        js_stdout: quiet,
        js_stderr: quiet,
        js_draw_screen: (pointer: number) =>
          this.options.draw(new Uint8ClampedArray(memory.buffer, pointer, DOOM_WIDTH * DOOM_HEIGHT * 4)),
        js_milliseconds_since_start: this.clock,
      },
      env: { memory },
    };

    const game = await (this.options.instantiate?.(imports) ?? loadBinary(this.options.wasmUrl, imports));
    // The window may have closed during the download.
    if (this.stopped) return;
    this.game = game;
    game.main();
    this.frame = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.paused || this.stopped) return;
    this.paused = true;
    this.pausedAt = performance.now();
    cancelAnimationFrame(this.frame);
    this.releaseKeys();
  }

  resume() {
    if (!this.paused || this.stopped) return;
    this.paused = false;
    this.pausedTotal += performance.now() - this.pausedAt;
    this.frame = requestAnimationFrame(this.loop);
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.game = null;
    this.held.clear();
  }

  key(type: "down" | "up", keyCode: number) {
    if (!this.game) return;
    const key = mapDoomKey(keyCode);
    if (type === "down") this.held.add(key);
    else this.held.delete(key);
    this.game.add_browser_event(type === "down" ? KEY_DOWN : KEY_UP, key);
  }

  /** A key still down when focus leaves would otherwise stay stuck. */
  releaseKeys() {
    for (const key of this.held) this.game?.add_browser_event(KEY_UP, key);
    this.held.clear();
  }
}
