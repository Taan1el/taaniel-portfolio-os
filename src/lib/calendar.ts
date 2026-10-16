/** Pure date maths behind the clock flyout's month calendar. Months are 0-11, weekdays 0 (Sunday) to 6. */

export interface CalendarDay {
  date: Date;
  /** Local date as "2026-10-16", stable across months and usable as a key. */
  key: string;
  inMonth: boolean;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
}

/** Windows always draws six weeks, so the flyout never changes height between months. */
const WEEKS_SHOWN = 6;
const DEFAULT_FIRST_DAY = 1;

export function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Midnight at the start of the date, without mutating it. */
export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Same day-of-month one month on, clamped to the end of shorter months (31 Jan + 1 = 28 Feb). */
export function addMonths(date: Date, amount: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export function shiftMonth({ year, month }: CalendarMonth, amount: number): CalendarMonth {
  const shifted = new Date(year, month + amount, 1);

  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

interface WeekInfoLocale {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
}

/**
 * First day of the week for a locale, 0 (Sunday) to 6. Intl reports Monday as 1
 * and Sunday as 7. Browsers without week info get Monday, the Estonian default.
 */
export function getFirstDayOfWeek(locale?: string) {
  try {
    const info = new Intl.Locale(locale ?? (typeof navigator === "undefined" ? "en" : navigator.language)) as
      | Intl.Locale
      | (Intl.Locale & WeekInfoLocale);
    const weekInfo = (info as WeekInfoLocale).getWeekInfo?.() ?? (info as WeekInfoLocale).weekInfo;

    if (weekInfo && Number.isInteger(weekInfo.firstDay)) {
      return weekInfo.firstDay % 7;
    }
  } catch {
    // An unknown locale falls through to the default.
  }

  return DEFAULT_FIRST_DAY;
}

/** Six weeks of days covering the month, padded with the neighbouring months' days. */
export function buildMonthGrid(
  { year, month }: CalendarMonth,
  today: Date,
  firstDayOfWeek = DEFAULT_FIRST_DAY
): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() - firstDayOfWeek + 7) % 7;
  const weeks: CalendarDay[][] = [];

  for (let week = 0; week < WEEKS_SHOWN; week += 1) {
    const days: CalendarDay[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(year, month, 1 - leading + week * 7 + weekday);

      days.push({
        date,
        key: toDateKey(date),
        inMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
      });
    }

    weeks.push(days);
  }

  return weeks;
}

/** Column headings in week order, as short names ("Mon") and long ones ("Monday"). */
export function getWeekdayLabels(firstDayOfWeek = DEFAULT_FIRST_DAY, locale?: string) {
  const short = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const long = new Intl.DateTimeFormat(locale, { weekday: "long" });

  return Array.from({ length: 7 }, (_, index) => {
    // 4 January 2026 is a Sunday.
    const date = new Date(2026, 0, 4 + ((firstDayOfWeek + index) % 7));

    return { short: short.format(date), long: long.format(date) };
  });
}
