import { getFirstDayOfWeek, getWeekdayLabels } from "@/lib/calendar";

export interface TimeInfo {
  /** "Friday, 16 October 2026 at 10:42", in the device's own format. */
  dateTime: string;
  /** IANA name, "Europe/Tallinn". */
  timeZone: string;
  /** Offset as the device prints it, "GMT+3". */
  timeZoneName: string;
  /** BCP 47 tag, "en-US". */
  language: string;
  /** The language in its own words, "English (United States)". */
  languageName: string;
  /** "Monday" or "Sunday", whichever the region starts its week on. */
  firstDayOfWeek: string;
}

interface TimeInfoOptions {
  locale?: string;
  timeZone?: string;
}

function readTimeZone(locale: string | undefined) {
  try {
    return new Intl.DateTimeFormat(locale).resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function describeLanguage(language: string) {
  try {
    return new Intl.DisplayNames([language], { type: "language" }).of(language) ?? language;
  } catch {
    return language;
  }
}

/** What the Time & language page shows. Read from the device, never invented. */
export function getTimeInfo(now: Date, { locale, timeZone }: TimeInfoOptions = {}): TimeInfo {
  const language = locale ?? (typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US");
  const zone = timeZone ?? readTimeZone(language);
  const firstDay = getFirstDayOfWeek(language);

  return {
    dateTime: new Intl.DateTimeFormat(language, { dateStyle: "full", timeStyle: "short", timeZone: zone }).format(now),
    timeZone: zone,
    timeZoneName:
      new Intl.DateTimeFormat(language, { timeZone: zone, timeZoneName: "short" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? zone,
    language,
    languageName: describeLanguage(language),
    firstDayOfWeek: getWeekdayLabels(firstDay, language)[0].long,
  };
}
