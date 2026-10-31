import { useMemo } from "react";
import { CalendarDays, Clock, Globe, Hourglass, Languages, Timer } from "lucide-react";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { getWeekdayLabels } from "@/lib/calendar";
import { formatShortDate, formatTime, resolveFirstDayOfWeek, useClockPrefs } from "@/lib/clock-format";
import { getTimeInfo } from "@/lib/time-info";
import {
  sanitizeClockHourCycle,
  sanitizeDateFormat,
  sanitizeFirstDayOfWeek,
  useSystemSettingsStore,
} from "@/stores/system-settings-store";

/** Time zone and language follow the device; the clock and calendar formats are the visitor's to choose. */
export function TimePage() {
  const now = useMinuteClock();
  const prefs = useClockPrefs();
  const setClockHourCycle = useSystemSettingsStore((state) => state.setClockHourCycle);
  const setClockSeconds = useSystemSettingsStore((state) => state.setClockSeconds);
  const setDateFormat = useSystemSettingsStore((state) => state.setDateFormat);
  const setFirstDayOfWeek = useSystemSettingsStore((state) => state.setFirstDayOfWeek);
  const info = getTimeInfo(now);
  const weekdays = useMemo(() => getWeekdayLabels(0), []);
  const firstDay = getWeekdayLabels(resolveFirstDayOfWeek(prefs))[0].long;

  return (
    <>
      <SettingsGroup title="Date & time">
        <SettingsRow icon={<Clock size={18} />} title="Current date and time" description={info.dateTime} />
        <SettingsRow
          icon={<Globe size={18} />}
          title="Time zone"
          description={`${info.timeZone} (${info.timeZoneName})`}
        />
      </SettingsGroup>

      <SettingsGroup title="Formats">
        <SettingsRow
          icon={<Hourglass size={18} />}
          settingId="hour-cycle"
          title="Clock format"
          description={`Taskbar, calendar and lock screen. Now: ${formatTime(now, prefs)}`}
        >
          <select
            aria-label="Hour format"
            value={prefs.clockHourCycle}
            onChange={(event) => setClockHourCycle(sanitizeClockHourCycle(event.target.value))}
          >
            <option value="auto">Follow my device</option>
            <option value="12">12-hour</option>
            <option value="24">24-hour</option>
          </select>
        </SettingsRow>
        <SettingsRow
          icon={<Timer size={18} />}
          settingId="clock-seconds"
          title="Show seconds in the taskbar clock"
          description="The calendar flyout always shows them."
        >
          <ToggleSwitch label="Show seconds in the taskbar clock" checked={prefs.clockSeconds} onChange={setClockSeconds} />
        </SettingsRow>
        <SettingsRow
          icon={<CalendarDays size={18} />}
          settingId="date-format"
          title="Short date format"
          description={`Under the taskbar clock. Now: ${formatShortDate(now, prefs)}`}
        >
          <select
            aria-label="Short date format"
            value={prefs.dateFormat}
            onChange={(event) => setDateFormat(sanitizeDateFormat(event.target.value))}
          >
            <option value="auto">Follow my device</option>
            <option value="dmy">Day.Month.Year</option>
            <option value="mdy">Month/Day/Year</option>
            <option value="ymd">Year-Month-Day</option>
          </select>
        </SettingsRow>
        <SettingsRow
          icon={<CalendarDays size={18} />}
          settingId="first-day"
          title="First day of the week"
          description={`The calendar starts on ${firstDay}.`}
        >
          <select
            aria-label="First day of the week"
            value={String(prefs.firstDayOfWeek)}
            onChange={(event) =>
              setFirstDayOfWeek(sanitizeFirstDayOfWeek(event.target.value === "auto" ? "auto" : Number(event.target.value)))
            }
          >
            <option value="auto">Follow my device</option>
            {weekdays.map((day, index) => (
              <option key={day.long} value={index}>
                {day.long}
              </option>
            ))}
          </select>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Language & region">
        <SettingsRow icon={<Languages size={18} />} title="Language" description={`${info.languageName} (${info.language})`} />
      </SettingsGroup>

      <p className="w11-settings__note">
        The time zone and language follow your device. The formats above change the taskbar clock, the lock screen and the calendar.
      </p>
    </>
  );
}
