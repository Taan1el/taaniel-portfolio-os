/** Adapter for the bundled, first-party Next Stop HTML. No game engine enters the shell. */
export interface NextStopRuntime {
  started: boolean;
  running: boolean;
  destroyed: boolean;
  watching: boolean;
  raf: number;
  previous: number;
  soundVolume: number;
  soundMuted: boolean;
  audioMaster?: { gain: { value: number } };
  tick: FrameRequestCallback;
  syncAudio: () => void;
  ensureAudio?: () => boolean;
  serialize: () => unknown;
  restore: (save: unknown) => void;
  openMenu: (view: string) => void;
  stopWatching: () => void;
  destroy: () => void;
}

type FrameClock = Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">;

export function connectNextStop(game: NextStopRuntime, clock: FrameClock, getMasterGain: () => number) {
  let suspended = false;
  let disposed = false;
  const originalSync = game.syncAudio;
  const syncAudio = () => {
    originalSync.call(game);
    if (game.audioMaster) {
      game.audioMaster.gain.value = game.soundMuted ? 0 : game.soundVolume * getMasterGain();
    }
  };
  game.syncAudio = syncAudio;
  syncAudio();

  return {
    syncAudio,
    setActive(active: boolean) {
      if (disposed || game.destroyed) return;
      if (!active && !suspended) {
        if (game.watching) game.stopWatching();
        if (game.started && game.running) game.openMenu("pause");
        clock.cancelAnimationFrame(game.raf);
        suspended = true;
      } else if (active && suspended) {
        // Draw again, but leave the paused journey for the player to resume.
        game.previous = 0;
        game.raf = clock.requestAnimationFrame(game.tick);
        suspended = false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      game.syncAudio = originalSync;
      game.destroy();
    },
  };
}
