import type { AppId, AppProcess, WindowRecord } from "@/types/system";

export const HISTORY_SECONDS = 60;

export interface TaskRow {
  windowId: string;
  appId: AppId;
  title: string;
  status: "Active" | "Running" | "Minimized";
  desktop: number;
  startedAt: number;
}

/** One row per open window, joined to its process. Windows without a process are left out. */
export function buildTaskRows(
  windows: (WindowRecord & { desktop?: number })[],
  processes: AppProcess[],
  focusedWindowId: string | null
): TaskRow[] {
  return windows
    .flatMap((window): TaskRow[] => {
      const process = processes.find((entry) => entry.id === window.processId);
      if (!process) return [];
      return [
        {
          windowId: window.id,
          appId: process.appId,
          title: window.title,
          status: window.minimized ? "Minimized" : window.id === focusedWindowId ? "Active" : "Running",
          desktop: (window.desktop ?? 0) + 1,
          startedAt: process.createdAt,
        },
      ];
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function formatDuration(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours ? `${hours}:${clock}` : clock;
}

/** Keeps the last minute of samples, oldest first. */
export const pushSample = (history: number[], sample: number) => [...history, sample].slice(-HISTORY_SECONDS);

/** SVG polyline points for a history, drawn right to left across a 0-100 by 0-100 box. */
export function chartPoints(history: number[], peak: number) {
  const scale = Math.max(peak, ...history, 1);
  return history
    .map((value, index) => {
      const x = 100 - ((history.length - 1 - index) * 100) / (HISTORY_SECONDS - 1);
      const y = 100 - (Math.max(0, value) / scale) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Counts animation frames and reports them once a second. Stops counting while the page is hidden. */
export function startFrameMeter(onSample: (framesPerSecond: number) => void) {
  let frames = 0;
  let windowStart = performance.now();
  let handle = requestAnimationFrame(function tick(now) {
    frames += 1;
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      onSample(Math.round((frames * 1000) / elapsed));
      frames = 0;
      windowStart = now;
    }
    handle = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(handle);
}

/** Chromium-only and rounded by the browser. Other browsers return null, and the row is left out. */
export function readHeapBytes() {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  return typeof memory?.usedJSHeapSize === "number" ? memory.usedJSHeapSize : null;
}
