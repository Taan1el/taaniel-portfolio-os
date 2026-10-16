import {
  describeBattery,
  describeNetwork,
  describeVolume,
  resolveBatteryGlyph,
  resolveSignalStrength,
  resolveVolumeGlyph,
  toBatteryPercent,
  type BatteryGlyph,
  type BatteryReading,
  type NetworkStatus,
  type SignalStrength,
  type VolumeGlyph,
} from "@/lib/device-status";

export interface TrayInput {
  networkStatus: NetworkStatus;
  effectiveType: string | null;
  volume: number;
  muted: boolean;
  battery: BatteryReading | null;
  batterySaver: boolean;
  nightLight: boolean;
}

export interface NetworkTray {
  status: NetworkStatus;
  strength: SignalStrength;
  /** Hover text, in Windows wording: "Wi-Fi" over "No internet access". */
  tooltip: string;
  /** One line for screen readers. */
  spoken: string;
}

export interface VolumeTray {
  value: number;
  muted: boolean;
  glyph: VolumeGlyph;
  tooltip: string;
}

export interface BatteryTray {
  percent: number;
  glyph: BatteryGlyph;
  tooltip: string;
  spoken: string;
}

export interface TrayReadings {
  network: NetworkTray;
  volume: VolumeTray;
  /** Null when the browser has no Battery API or the device has no battery. */
  battery: BatteryTray | null;
  batterySaver: boolean;
  nightLight: boolean;
  /** Spoken name for the whole quick settings button. */
  summary: string;
}

export function buildTrayReadings(input: TrayInput): TrayReadings {
  const description = describeNetwork(input.networkStatus);
  const network: NetworkTray = {
    status: input.networkStatus,
    strength: input.networkStatus === "connected" ? resolveSignalStrength(input.effectiveType) : 0,
    tooltip: `${description.title}\n${description.detail}`,
    spoken: `${description.title}, ${description.detail}`,
  };

  const volumeText = describeVolume(input.volume, input.muted);
  const volume: VolumeTray = {
    value: input.volume,
    muted: input.muted,
    glyph: resolveVolumeGlyph(input.volume, input.muted),
    tooltip: volumeText,
  };

  let battery: BatteryTray | null = null;

  if (input.battery) {
    const batteryText = describeBattery(input.battery);

    battery = {
      percent: toBatteryPercent(input.battery.level),
      glyph: resolveBatteryGlyph(input.battery),
      tooltip: input.batterySaver ? `${batteryText}\nBattery saver` : batteryText,
      spoken: input.batterySaver ? `${batteryText}, Battery saver on` : batteryText,
    };
  }

  const parts = [network.spoken, volumeText];

  if (battery) {
    parts.push(battery.spoken);
  } else if (input.batterySaver) {
    parts.push("Battery saver on");
  }

  if (input.nightLight) {
    parts.push("Night light on");
  }

  return {
    network,
    volume,
    battery,
    batterySaver: input.batterySaver,
    nightLight: input.nightLight,
    summary: `Quick settings: ${parts.join("; ")}`,
  };
}
