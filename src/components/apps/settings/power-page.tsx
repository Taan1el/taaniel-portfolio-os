import { Leaf } from "lucide-react";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { BatteryIcon } from "@/components/shell/tray-glyphs";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

export function PowerPage() {
  const { battery } = useTrayReadings();
  const batterySaver = useSystemSettingsStore((state) => state.batterySaver);
  const setBatterySaver = useSystemSettingsStore((state) => state.setBatterySaver);

  return (
    <>
      <SettingsGroup title="Battery">
        {battery ? (
          <SettingsRow
            icon={<BatteryIcon glyph={battery.glyph} size={18} />}
            title={`${battery.percent}%`}
            description={battery.text}
          />
        ) : (
          <SettingsRow
            title="No battery detected"
            description="This device is plugged in, or your browser does not report a battery."
          />
        )}
      </SettingsGroup>

      <SettingsGroup title="Battery saver">
        <SettingsRow
          icon={<Leaf size={18} />}
          settingId="battery-saver"
          title="Battery saver"
          description="Dims the screen, stops the animated wallpaper, turns off blur effects and pauses AI-assisted search."
        >
          <ToggleSwitch label="Battery saver" checked={batterySaver} onChange={setBatterySaver} />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
