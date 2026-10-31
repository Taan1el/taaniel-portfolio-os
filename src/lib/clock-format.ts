import { useShallow } from "zustand/react/shallow";
import { getFirstDayOfWeek } from "@/lib/calendar";
import {
  getSystemSettings,
  useSystemSettingsStore,
  type ClockHourCycle,
  type DateFormatId,
  type FirstDayOfWeek,
} from "@/stores/system-settings-store";

export interface ClockPrefs {
  clockHourCycle: ClockHourCycle;
  clockSeconds: boolean;
  dateFormat: DateFormatId;
  firstDayOfWeek: FirstDayOfWeek;
}

/** The Date & time settings, for components that must draw again when one changes. */
export function useClockPrefs(): ClockPrefs {
  return useSystemSettingsStore(
    useShallow((state) => ({
      clockHourCycle: state.clockHourCycle,
      clockSeconds: state.clockSeconds,
      dateFormat: state.dateFormat,
      firstDayOfWeek: state.firstDayOfWeek,
    }))
  );
}

function pick(prefs?: Partial<ClockPrefs>): ClockPrefs {
  return { ...getSystemSettings(), ...prefs };
}

/** Time of day. "auto" keeps the device's own style; 12 and 24 force one. */
export function formatTime(date: Date, prefs?: Partial<ClockPrefs>, options: { seconds?: boolean } = {}) {
  const { clockHourCycle } = pick(prefs);
  const seconds = options.seconds ?? false;
  const base: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  if (seconds) base.second = "2-digit";
  if (clockHourCycle === "12") {
    base.hour = "numeric";
    base.hour12 = true;
  } else if (clockHourCycle === "24") {
    base.hourCycle = "h23";
  }

  return new Intl.DateTimeFormat([], base).format(date);
}

/** The short date on the taskbar: the device's own style, or day.month.year, month/day/year, year-month-day. */
export function formatShortDate(date: Date, prefs?: Partial<ClockPrefs>) {
  const { dateFormat } = pick(prefs);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const two = (value: number) => String(value).padStart(2, "0");

  switch (dateFormat) {
    case "dmy":
      return `${day}.${month}.${year}`;
    case "mdy":
      return `${month}/${day}/${year}`;
    case "ymd":
      return `${year}-${two(month)}-${two(day)}`;
    default:
      return new Intl.DateTimeFormat([], { day: "numeric", month: "numeric", year: "numeric" }).format(date);
  }
}

/** 0 (Sunday) to 6, from the setting or else the device's region. */
export function resolveFirstDayOfWeek(prefs?: Partial<ClockPrefs>): number {
  const { firstDayOfWeek } = pick(prefs);
  return firstDayOfWeek === "auto" ? getFirstDayOfWeek() : firstDayOfWeek;
}
