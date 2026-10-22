import type { SystemSettings } from "@/stores/system-settings-store";

/**
 * How the brightness and night light settings turn into screen layers.
 *
 * A web page cannot change the real backlight, so brightness is a black layer
 * over the desktop and night light is a warm multiply layer. The black layer
 * is capped, so no setting can leave a visitor staring at a black screen.
 */

/** The brightness slider can dim the screen this far and no further. */
export const MAX_DIM_ALPHA = 0.7;

/** Battery saver lowers the screen to this share of the chosen brightness. */
export const BATTERY_SAVER_BRIGHTNESS_FACTOR = 0.7;

export type DisplayFilterSettings = Pick<
  SystemSettings,
  "brightness" | "nightLight" | "nightLightStrength" | "batterySaver"
>;

export interface DisplayFilter {
  /** Opacity of the black layer, 0 to MAX_DIM_ALPHA. 0 means no layer at all. */
  dimAlpha: number;
  /** Colour of the warm multiply layer, or null while night light is off. */
  warmColor: string | null;
}

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 100;
}

/** Brightness after battery saver, 0-100. */
export function resolveEffectiveBrightness(brightness: number, batterySaver: boolean) {
  const clamped = clampPercent(brightness);
  return batterySaver ? clamped * BATTERY_SAVER_BRIGHTNESS_FACTOR : clamped;
}

/** 100 is no dimming, 0 is the strongest dimming the cap allows. */
export function resolveDimAlpha(brightness: number, batterySaver = false) {
  const effective = resolveEffectiveBrightness(brightness, batterySaver);
  const alpha = (1 - effective / 100) * MAX_DIM_ALPHA;

  return Math.round(Math.min(MAX_DIM_ALPHA, Math.max(0, alpha)) * 1000) / 1000;
}

/** Warmer with strength: red stays full, green and blue fall away. */
export function resolveNightLightColor(strength: number) {
  const amount = clampPercent(strength) / 100;

  if (amount === 0) {
    return null;
  }

  const green = Math.round(255 - 70 * amount);
  const blue = Math.round(255 - 190 * amount);

  return `rgb(255, ${green}, ${blue})`;
}

export function resolveDisplayFilter(settings: DisplayFilterSettings): DisplayFilter {
  return {
    dimAlpha: resolveDimAlpha(settings.brightness, settings.batterySaver),
    warmColor: settings.nightLight ? resolveNightLightColor(settings.nightLightStrength) : null,
  };
}
