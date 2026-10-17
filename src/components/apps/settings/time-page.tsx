import { CalendarDays, Clock, Globe, Languages } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { getTimeInfo } from "@/lib/time-info";

/** Read-only for now: the date, time and region come from the visitor's own device. */
export function TimePage() {
  const now = useMinuteClock();
  const info = getTimeInfo(now);

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

      <SettingsGroup title="Language & region">
        <SettingsRow icon={<Languages size={18} />} title="Language" description={`${info.languageName} (${info.language})`} />
        <SettingsRow icon={<CalendarDays size={18} />} title="First day of the week" description={info.firstDayOfWeek} />
      </SettingsGroup>

      <p className="w11-settings__note">
        These follow your device, so the taskbar clock and the calendar always match the time where you are.
      </p>
    </>
  );
}
