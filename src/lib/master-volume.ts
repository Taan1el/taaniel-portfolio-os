import { getSystemSettings, useSystemSettingsStore } from "@/stores/system-settings-store";

/**
 * The speaker slider in Quick Settings is a master volume: every media player
 * in the OS plays at its own level scaled by it, and muting silences them all.
 * At the default of 100 nothing changes for media that played before the
 * slider existed.
 */

function clampUnit(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** 0-1 gain for a master volume of 0-100; 0 while muted. */
export function getMasterGain(volume: number, muted: boolean) {
  return muted ? 0 : clampUnit(volume / 100);
}

/** An app's own 0-1 level scaled by the master volume. */
export function scaleVolume(local: number, volume: number, muted: boolean) {
  return clampUnit(clampUnit(local) * getMasterGain(volume, muted));
}

export interface MediaVolumeController {
  /** Re-applies the current master volume, e.g. after the app's own slider moved. */
  sync: () => void;
  detach: () => void;
}

type VolumeTarget = Pick<HTMLMediaElement, "volume" | "muted">;

/**
 * Keeps an <audio> or <video> at the master volume. `getLocalVolume` is the
 * app's own slider (1 for players that only have native controls). The element
 * follows every master change, and between changes a native control may still
 * move it, which acts as that player's own level on top of the master.
 */
export function attachMediaVolume(
  element: VolumeTarget,
  getLocalVolume: () => number = () => 1
): MediaVolumeController {
  let applied: { volume: number; muted: boolean } | null = null;

  const apply = (force: boolean) => {
    const { volume, muted } = getSystemSettings();

    if (!force && applied && applied.volume === volume && applied.muted === muted) {
      return;
    }

    applied = { volume, muted };
    element.volume = scaleVolume(getLocalVolume(), volume, false);
    element.muted = muted;
  };

  apply(true);
  const unsubscribe = useSystemSettingsStore.subscribe(() => apply(false));

  return {
    sync: () => apply(true),
    detach: unsubscribe,
  };
}

/** The part of a v86 emulator the volume needs; its speaker is absent when audio is unsupported. */
export interface VolumeControlledEmulator {
  speaker_adapter?: {
    mixer?: {
      set_volume: (value: number, channel?: number) => void;
    };
  } | null;
  add_listener?: (event: string, listener: () => void) => void;
  remove_listener?: (event: string, listener: () => void) => void;
}

/** v86's mixer takes a linear gain; channel 2 sets left and right together. */
const V86_MIXER_BOTH_CHANNELS = 2;

/**
 * v86 creates `speaker_adapter` only after its wasm has loaded, well after the
 * constructor returns, so the first apply usually finds no mixer. These events
 * all fire once it exists; applying again on each is cheap and idempotent.
 */
const V86_SPEAKER_READY_EVENTS = ["emulator-loaded", "emulator-ready", "emulator-started"];

/** Keeps a v86 guest at the master volume, including a mute set before it booted. Returns a detach function. */
export function attachV86Volume(emulator: VolumeControlledEmulator): () => void {
  const apply = () => {
    const { volume, muted } = getSystemSettings();
    emulator.speaker_adapter?.mixer?.set_volume(getMasterGain(volume, muted), V86_MIXER_BOTH_CHANNELS);
  };

  apply();
  const unsubscribe = useSystemSettingsStore.subscribe(apply);
  V86_SPEAKER_READY_EVENTS.forEach((event) => emulator.add_listener?.(event, apply));

  return () => {
    unsubscribe();
    V86_SPEAKER_READY_EVENTS.forEach((event) => emulator.remove_listener?.(event, apply));
  };
}
