/** A short, soft tone for Settings > Sound, so the volume can be heard rather than guessed. */

const TONE_HZ = 660;
const TONE_SECONDS = 0.45;
const FADE_IN_SECONDS = 0.02;
/** Full master volume plays the tone at this level, which is already comfortable. */
const PEAK_AT_FULL_VOLUME = 0.25;

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  const scope = globalThis as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };

  return scope.AudioContext ?? scope.webkitAudioContext;
}

/** The tone's loudness for a master gain of 0-1. */
export function resolveTonePeak(gain: number) {
  const clamped = Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 0;

  return clamped * PEAK_AT_FULL_VOLUME;
}

/** Plays the tone at the given master gain (0-1). Returns false where Web Audio is unavailable. */
export function playTestTone(gain: number): boolean {
  const Context = getAudioContextConstructor();

  if (!Context) {
    return false;
  }

  try {
    const context = new Context();
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.value = TONE_HZ;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(resolveTonePeak(gain), start + FADE_IN_SECONDS);
    envelope.gain.linearRampToValueAtTime(0, start + TONE_SECONDS);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.onended = () => {
      void context.close();
    };
    oscillator.start(start);
    oscillator.stop(start + TONE_SECONDS + 0.05);

    return true;
  } catch {
    return false;
  }
}
