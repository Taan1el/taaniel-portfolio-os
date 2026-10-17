import { MoonStar, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import {
  SettingsGroup,
  SettingsRow,
  SliderControl,
  ToggleSwitch,
} from "@/components/apps/settings/settings-controls";
import { DEFAULT_SYSTEM_SETTINGS, useSystemSettingsStore } from "@/stores/system-settings-store";

export function DisplayPage() {
  const brightness = useSystemSettingsStore((state) => state.brightness);
  const nightLight = useSystemSettingsStore((state) => state.nightLight);
  const nightLightStrength = useSystemSettingsStore((state) => state.nightLightStrength);
  const setBrightness = useSystemSettingsStore((state) => state.setBrightness);
  const setNightLight = useSystemSettingsStore((state) => state.setNightLight);
  const setNightLightStrength = useSystemSettingsStore((state) => state.setNightLightStrength);

  const isDefault =
    brightness === DEFAULT_SYSTEM_SETTINGS.brightness &&
    nightLight === DEFAULT_SYSTEM_SETTINGS.nightLight &&
    nightLightStrength === DEFAULT_SYSTEM_SETTINGS.nightLightStrength;

  return (
    <>
      <SettingsGroup title="Brightness & color">
        <SettingsRow
          icon={<Sun size={18} />}
          title="Brightness"
          description="Dims this page. It does not change your screen's own backlight."
        >
          <SliderControl label="Brightness" value={brightness} valueText={`${brightness}%`} onChange={setBrightness} />
        </SettingsRow>
        <SettingsRow
          icon={<MoonStar size={18} />}
          title="Night light"
          description="Warms the colors to ease your eyes in the evening."
        >
          <ToggleSwitch label="Night light" checked={nightLight} onChange={setNightLight} />
        </SettingsRow>
        <SettingsRow title="Strength" description="Cooler on the left, warmer on the right." className="is-nested">
          <SliderControl
            label="Night light strength"
            value={nightLightStrength}
            valueText={`${nightLightStrength}%`}
            onChange={setNightLightStrength}
            disabled={!nightLight}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow title="Reset display settings" description="Back to full brightness with night light off.">
          <Button
            type="button"
            variant="panel"
            disabled={isDefault}
            onClick={() => {
              setBrightness(DEFAULT_SYSTEM_SETTINGS.brightness);
              setNightLight(DEFAULT_SYSTEM_SETTINGS.nightLight);
              setNightLightStrength(DEFAULT_SYSTEM_SETTINGS.nightLightStrength);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
