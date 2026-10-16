import { useEffect, useState } from "react";

/** Milliseconds until the next whole second. */
export function msUntilNextSecond(now = Date.now()) {
  return 1000 - (now % 1000);
}

/**
 * The current time, re-rendered on every second boundary. Only for UI that is
 * on screen briefly, such as the clock flyout's big clock; the taskbar uses the
 * far cheaper useMinuteClock.
 */
export function useSecondClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number | undefined;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msUntilNextSecond());
    };

    // The flyout may have been open since a render ago; catch up before the first tick.
    setNow(new Date());
    schedule();

    return () => window.clearTimeout(timeoutId);
  }, []);

  return now;
}
