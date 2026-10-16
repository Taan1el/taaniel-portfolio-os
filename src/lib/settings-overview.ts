import { describeNetwork } from "@/lib/device-status";
import type { SettingsSectionId } from "@/lib/settings-sections";
import type { TrayReadings } from "@/lib/tray-readings";

export interface SettingsOverviewInput {
  readings: TrayReadings;
  brightness: number;
  reduceMotion: boolean;
  /** Name of the active theme, for the Personalization line. */
  themeName: string;
  timeZone: string;
}

/** One live line under each page's name on the System overview, like Windows' Settings home. */
export function describeSettingsStatus(id: SettingsSectionId, input: SettingsOverviewInput): string {
  const { readings } = input;

  switch (id) {
    case "display": {
      const parts = [`Brightness ${Math.round(input.brightness)}%`];

      if (readings.nightLight) {
        parts.push("Night light on");
      }

      return parts.join(", ");
    }
    case "sound":
      return readings.volume.tooltip;
    case "power": {
      const parts = [readings.battery ? readings.battery.text : "No battery detected"];

      if (readings.batterySaver) {
        parts.push("Battery saver on");
      }

      return parts.join(", ");
    }
    case "network": {
      const { title, detail } = describeNetwork(readings.network.status);

      return `${title}, ${detail}`;
    }
    case "personalization":
      return input.themeName;
    case "accessibility":
      return input.reduceMotion ? "Animation effects off" : "Animation effects on";
    case "time":
      return input.timeZone;
    default:
      return "";
  }
}
