import { useEffect, useState } from "react";
import { profile } from "@/data/portfolio";
import { formatTime, useClockPrefs } from "@/lib/clock-format";
import { formatDateLabel } from "@/lib/utils";

/**
 * Ambient clock card for the empty top-right desktop area on wide screens.
 * Purely decorative: never intercepts pointer events and stays hidden from
 * screen readers (the taskbar already exposes the clock).
 */
export function DesktopWidget() {
  const prefs = useClockPrefs();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="desktop-widget" aria-hidden="true">
      <p className="desktop-widget__clock">{formatTime(now, prefs)}</p>
      <p className="desktop-widget__date">{formatDateLabel(now)}</p>
      <div className="desktop-widget__divider" />
      <p className="desktop-widget__name">{profile.name}</p>
      <p className="desktop-widget__role">{profile.role}</p>
    </div>
  );
}
