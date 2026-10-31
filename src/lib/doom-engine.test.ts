// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DoomEngine, mapDoomKey } from "@/lib/doom-engine";

function fakeGame() {
  return { main: vi.fn(), doom_loop_step: vi.fn(), add_browser_event: vi.fn() };
}

function engineWith(game = fakeGame()) {
  const engine = new DoomEngine({ wasmUrl: "doom.wasm", draw: vi.fn(), instantiate: async () => game });
  return { engine, game };
}

let frames: FrameRequestCallback[] = [];
const tick = () => frames.splice(0).forEach((frame) => frame(0));

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("Doom keys", () => {
  it("maps browser key codes to Doom's", () => {
    expect(mapDoomKey(37)).toBe(172);
    expect(mapDoomKey(40)).toBe(175);
    expect(mapDoomKey(17)).toBe(157);
    expect(mapDoomKey(65)).toBe(97);
    expect(mapDoomKey(13)).toBe(13);
    expect(mapDoomKey(112)).toBe(187);
  });
});

describe("Doom engine", () => {
  it("runs a step each frame until stopped", async () => {
    const { engine, game } = engineWith();
    await engine.start();
    expect(game.main).toHaveBeenCalledOnce();
    tick();
    tick();
    expect(game.doom_loop_step).toHaveBeenCalledTimes(2);
    engine.stop();
    tick();
    expect(game.doom_loop_step).toHaveBeenCalledTimes(2);
  });

  it("does not start if the window closed during the download", async () => {
    const { engine, game } = engineWith();
    const starting = engine.start();
    engine.stop();
    await starting;
    expect(game.main).not.toHaveBeenCalled();
  });

  it("pauses, resumes and lets go of held keys", async () => {
    const { engine, game } = engineWith();
    await engine.start();
    engine.key("down", 38);
    engine.pause();
    expect(game.add_browser_event).toHaveBeenLastCalledWith(1, 173);
    tick();
    expect(game.doom_loop_step).not.toHaveBeenCalled();
    engine.resume();
    tick();
    expect(game.doom_loop_step).toHaveBeenCalledOnce();
    engine.stop();
  });

  it("leaves paused time out of the game clock", async () => {
    let imports: WebAssembly.Imports | undefined;
    const game = fakeGame();
    const engine = new DoomEngine({
      wasmUrl: "doom.wasm",
      draw: vi.fn(),
      instantiate: async (value) => {
        imports = value;
        return game;
      },
    });
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    await engine.start();
    engine.pause();
    now.mockReturnValue(9000);
    engine.resume();
    const clock = imports?.js.js_milliseconds_since_start as () => number;
    expect(clock()).toBe(1000);
    engine.stop();
    now.mockRestore();
  });
});
