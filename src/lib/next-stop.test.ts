import { describe, expect, it, vi } from "vitest";
import { connectNextStop, type NextStopRuntime } from "./next-stop";

function fixture(started = true) {
  const game: NextStopRuntime = {
    started, running: started, destroyed: false, watching: false, raf: 7, previous: 12,
    soundVolume: .6, soundMuted: false, audioMaster: { gain: { value: .6 } },
    tick: vi.fn(), syncAudio: vi.fn(), serialize: vi.fn(), restore: vi.fn(),
    openMenu: vi.fn(() => { game.running = false; }), stopWatching: vi.fn(), destroy: vi.fn(),
  };
  const clock = { requestAnimationFrame: vi.fn(() => 8), cancelAnimationFrame: vi.fn() };
  let gain = .5;
  const bridge = connectNextStop(game, clock, () => gain);
  return { game, clock, bridge, master: (value: number) => { gain = value; bridge.syncAudio(); } };
}

describe("Next Stop window lifecycle", () => {
  it("pauses and stops drawing behind another window, then redraws without auto-playing", () => {
    const { game, clock, bridge } = fixture();
    bridge.setActive(false); bridge.setActive(false);
    expect(game.openMenu).toHaveBeenCalledExactlyOnceWith("pause");
    expect(clock.cancelAnimationFrame).toHaveBeenCalledExactlyOnceWith(7);
    bridge.setActive(true); bridge.setActive(true);
    expect(clock.requestAnimationFrame).toHaveBeenCalledExactlyOnceWith(game.tick);
    expect(game.previous).toBe(0);
    expect(game.running).toBe(false);
  });
  it("stops the private title backdrop without starting a journey", () => {
    const { game, clock, bridge } = fixture(false);
    bridge.setActive(false);
    expect(game.openMenu).not.toHaveBeenCalled();
    expect(clock.cancelAnimationFrame).toHaveBeenCalled();
    expect(game.started).toBe(false);
  });
  it("scales local audio by master volume and preserves the game's own mute", () => {
    const { game, master } = fixture();
    expect(game.audioMaster!.gain.value).toBeCloseTo(.3);
    master(0); expect(game.audioMaster!.gain.value).toBe(0);
    master(.8); expect(game.audioMaster!.gain.value).toBeCloseTo(.48);
    game.soundVolume = .2; game.syncAudio();
    expect(game.audioMaster!.gain.value).toBeCloseTo(.16);
    game.soundMuted = true; game.syncAudio();
    expect(game.audioMaster!.gain.value).toBe(0);
  });
  it("applies master audio when the game creates its audio graph later", () => {
    const { game, bridge } = fixture();
    game.audioMaster = undefined;
    bridge.syncAudio();
    game.audioMaster = { gain: { value: 1 } };
    game.syncAudio();
    expect(game.audioMaster.gain.value).toBeCloseTo(.3);
  });
  it("closes resources once and stops accepting lifecycle work", () => {
    const { game, clock, bridge } = fixture();
    bridge.dispose(); bridge.dispose(); bridge.setActive(false);
    expect(game.destroy).toHaveBeenCalledTimes(1);
    expect(clock.cancelAnimationFrame).not.toHaveBeenCalled();
  });
});
