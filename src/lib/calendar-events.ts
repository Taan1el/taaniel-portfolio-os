export const REPEATS = ["none", "weekly", "monthly", "yearly"] as const;
export type Repeat = (typeof REPEATS)[number];

const MAX_EVENTS = 1000;
const MAX_TITLE = 120;
const MAX_NOTES = 1000;

export interface CalendarEvent {
  id: string;
  title: string;
  /** The first day, as YYYY-MM-DD. */
  date: string;
  /** HH:MM, or empty for an all-day event. */
  time: string;
  notes: string;
  repeat: Repeat;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A date key as a local date, or null if it is not a real day (such as 2026-02-30). */
export function parseDateKey(key: string) {
  const match = DATE.exec(key);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Does this event fall on this day? Monthly on the 31st skips the shorter months. */
export function occursOn(event: CalendarEvent, key: string) {
  if (event.date === key) return true;
  if (event.repeat === "none" || key < event.date) return false;

  const start = parseDateKey(event.date);
  const day = parseDateKey(key);
  if (!start || !day) return false;

  if (event.repeat === "weekly") return start.getDay() === day.getDay();
  if (event.repeat === "monthly") return start.getDate() === day.getDate();
  return start.getDate() === day.getDate() && start.getMonth() === day.getMonth();
}

/** All-day events first, then by time, then by title. */
export function eventsOn(events: CalendarEvent[], key: string) {
  return events
    .filter((event) => occursOn(event, key))
    .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function sanitizeEvents(value: unknown): CalendarEvent[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_EVENTS).flatMap((entry): CalendarEvent[] => {
    const event = entry as Partial<CalendarEvent> | null;
    if (!event || typeof event.id !== "string" || typeof event.title !== "string" || typeof event.date !== "string") return [];
    if (!event.title.trim() || !parseDateKey(event.date)) return [];

    return [
      {
        id: event.id.slice(0, 60),
        title: event.title.slice(0, MAX_TITLE),
        date: event.date,
        time: typeof event.time === "string" && TIME.test(event.time) ? event.time : "",
        notes: typeof event.notes === "string" ? event.notes.slice(0, MAX_NOTES) : "",
        repeat: REPEATS.includes(event.repeat as Repeat) ? (event.repeat as Repeat) : "none",
      },
    ];
  });
}

/** The time as the clock settings would show it, built on a local date. */
export function eventTimeAsDate(event: CalendarEvent, key: string) {
  const day = parseDateKey(key);
  if (!day || !event.time) return null;
  const [hours, minutes] = event.time.split(":").map(Number);
  day.setHours(hours, minutes);
  return day;
}
