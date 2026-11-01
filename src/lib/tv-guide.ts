import { useEffect, useState } from "react";

export interface TvProgramme {
  start: number;
  stop: number;
  title: string;
}

export type TvGuideData = Record<string, TvProgramme[]>;

const MAX_TITLE = 120;
const SAFE_ID = /^[a-z0-9-]{1,80}$/;

/** The file is built from outside listings, so nothing in it is trusted. Bad rows go; a bad file is an empty guide. */
export function sanitizeGuide(raw: unknown): TvGuideData {
  const channels = (raw as { channels?: unknown } | null)?.channels;
  if (!channels || typeof channels !== "object" || Array.isArray(channels)) return {};

  const guide: TvGuideData = Object.create(null);

  for (const [id, rows] of Object.entries(channels)) {
    if (!SAFE_ID.test(id) || !Array.isArray(rows)) continue;
    const programmes: TvProgramme[] = [];

    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const [start, stop, title] = row as unknown[];
      if (typeof start !== "number" || typeof stop !== "number" || typeof title !== "string" || !title.trim() || !(stop > start)) continue;
      programmes.push({ start, stop, title: title.trim().slice(0, MAX_TITLE) });
    }

    if (programmes.length) guide[id] = programmes;
  }

  return guide;
}

/** What is on at this moment and what comes straight after. Null when the listing does not cover now. */
export function programmeAt(programmes: TvProgramme[] | undefined, now: number) {
  const index = programmes?.findIndex((programme) => programme.start <= now && now < programme.stop) ?? -1;
  if (!programmes || index === -1) return null;
  return { current: programmes[index], next: programmes[index + 1] ?? null };
}

/** Loads the guide once and ticks so what is on moves along. No file means no programme names. */
export function useTvGuide() {
  const [guide, setGuide] = useState<TvGuideData>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    fetch(`${import.meta.env.BASE_URL}tv-guide.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setGuide(sanitizeGuide(data));
      })
      .catch(() => {});

    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, []);

  return { guide, now };
}
