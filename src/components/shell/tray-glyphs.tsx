import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Plane,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiHigh,
  WifiLow,
  WifiOff,
  WifiZero,
} from "lucide-react";
import type { BatteryGlyph, NetworkStatus, SignalStrength, VolumeGlyph } from "@/lib/device-status";

interface GlyphProps {
  size?: number;
}

const SIGNAL_ICONS = { 0: WifiZero, 1: WifiLow, 2: WifiHigh, 3: Wifi } as const;

/** The Wi-Fi glyph for a network state, drawn from lucide so it follows the text colour. */
export function NetworkGlyph({ status, strength, size = 16 }: GlyphProps & { status: NetworkStatus; strength: SignalStrength }) {
  if (status === "airplane") {
    return <Plane size={size} aria-hidden="true" />;
  }

  if (status === "wifi-off") {
    return <WifiOff size={size} aria-hidden="true" />;
  }

  const Icon = SIGNAL_ICONS[strength];

  return <Icon size={size} aria-hidden="true" />;
}

export function VolumeIcon({ glyph, size = 16 }: GlyphProps & { glyph: VolumeGlyph }) {
  if (glyph === "muted") {
    return <VolumeX size={size} aria-hidden="true" />;
  }

  return glyph === "low" ? <Volume1 size={size} aria-hidden="true" /> : <Volume2 size={size} aria-hidden="true" />;
}

export function BatteryIcon({ glyph, size = 16 }: GlyphProps & { glyph: BatteryGlyph }) {
  switch (glyph) {
    case "charging":
      return <BatteryCharging size={size} aria-hidden="true" />;
    case "medium":
      return <BatteryMedium size={size} aria-hidden="true" />;
    case "low":
      return <BatteryLow size={size} aria-hidden="true" />;
    case "warning":
      return <BatteryWarning size={size} aria-hidden="true" />;
    default:
      return <BatteryFull size={size} aria-hidden="true" />;
  }
}
