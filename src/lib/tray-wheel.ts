/** One notch of a mouse wheel reports about 100 pixels of scrolling. */
const PIXELS_PER_NOTCH = 100;
/** Firefox and some mice report lines, usually three per notch. */
const PIXELS_PER_LINE = 40;
const PIXELS_PER_PAGE = 400;

export interface WheelSteps {
  /** Whole notches to apply: positive for wheel up (louder), negative for down. */
  steps: number;
  /** Scrolling carried over to the next event, so a trackpad's many small events still add up. */
  remainder: number;
}

/**
 * Turns wheel events into notches. A mouse gives one notch per click, a
 * trackpad gives a notch for every 100 pixels it scrolls.
 */
export function consumeWheel(remainder: number, deltaY: number, deltaMode = 0): WheelSteps {
  const pixels = deltaMode === 1 ? deltaY * PIXELS_PER_LINE : deltaMode === 2 ? deltaY * PIXELS_PER_PAGE : deltaY;
  const total = remainder + (Number.isFinite(pixels) ? pixels : 0);
  const notches = Math.trunc(total / PIXELS_PER_NOTCH);

  return {
    steps: notches === 0 ? 0 : -notches,
    remainder: total - notches * PIXELS_PER_NOTCH,
  };
}
