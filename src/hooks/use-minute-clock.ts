import { useEffect, useState } from "react";

/** Milliseconds until the next whole minute. */
export function msUntilNextMinute(now = Date.now()) {
  return 60_000 - (now % 60_000);
}

/**
 * The current time, re-rendered on each minute boundary so a clock never lags
 * a real one. Background tabs throttle timers, so it also re-syncs whenever
 * the tab becomes visible again.
 */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId: number | undefined;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msUntilNextMinute());
    };

    const resync = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      window.clearTimeout(timeoutId);
      setNow(new Date());
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", resync);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  return now;
}
