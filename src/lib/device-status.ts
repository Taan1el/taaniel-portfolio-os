/**
 * Pure helpers behind the tray's network and battery indicators.
 *
 * The OS is virtual but the readings are not: online/offline comes from the
 * browser, signal strength from the Network Information API where it exists,
 * and the battery from the Battery Status API. The visitor's own Wi-Fi and
 * airplane mode switches sit on top, as session-only state.
 */

export type NetworkStatus = "connected" | "no-internet" | "wifi-off" | "airplane";

/** Signal bars, 0-3, as the Wi-Fi glyph draws them. */
export type SignalStrength = 0 | 1 | 2 | 3;

export interface NetworkReadings {
  browserOnline: boolean;
  wifiEnabled: boolean;
  airplaneMode: boolean;
}

export interface BatteryReading {
  /** 0-1, as the Battery Status API reports it. */
  level: number;
  charging: boolean;
  /** Seconds until full; 0 when full, Infinity when unknown. */
  chargingTime: number;
  /** Seconds until empty; Infinity while charging or unknown. */
  dischargingTime: number;
}

/**
 * Airplane mode switches the Wi-Fi radio off. As in Windows, Wi-Fi can then be
 * switched back on by hand while airplane mode stays on.
 */
export function resolveNetworkStatus({ browserOnline, wifiEnabled, airplaneMode }: NetworkReadings): NetworkStatus {
  if (!wifiEnabled) {
    return airplaneMode ? "airplane" : "wifi-off";
  }

  return browserOnline ? "connected" : "no-internet";
}

export function isNetworkBlocked(readings: NetworkReadings): boolean {
  return resolveNetworkStatus(readings) !== "connected";
}

/**
 * The search reranker downloads a model and then keeps it in memory, so it
 * only runs with a network to fetch it and while battery saver is off.
 */
export function isAiSearchAllowed({
  networkBlocked,
  batterySaver,
}: {
  networkBlocked: boolean;
  batterySaver: boolean;
}): boolean {
  return !networkBlocked && !batterySaver;
}

/** Maps navigator.connection.effectiveType onto Wi-Fi bars; unknown reads as full. */
export function resolveSignalStrength(effectiveType: string | null | undefined): SignalStrength {
  switch (effectiveType) {
    case "slow-2g":
      return 0;
    case "2g":
      return 1;
    case "3g":
      return 2;
    default:
      return 3;
  }
}

/**
 * Desktops without a battery still answer the Battery Status API, with a
 * fixed "full and charging" reading. That reading is treated as no battery,
 * so the tray hides the icon the way Windows does on a desktop PC. Laptops
 * that are full and plugged in give the same reading; resolveBatteryState
 * keeps their battery once a real one has been seen.
 */
export function isLikelyBatteryPresent(reading: BatteryReading | null | undefined): reading is BatteryReading {
  if (!reading || !Number.isFinite(reading.level)) {
    return false;
  }

  const desktopReading =
    reading.charging &&
    reading.level >= 1 &&
    reading.chargingTime === 0 &&
    !Number.isFinite(reading.dischargingTime);

  return !desktopReading;
}

/**
 * A laptop that is full and plugged in answers exactly like a desktop, so the
 * heuristic alone would drop its battery the moment it reaches 100%. Once a
 * reading only a real battery gives has been seen, `latched` stays true for the
 * session and full-and-charging readings keep the battery on show, as Windows
 * does with "Fully charged (plugged in)".
 */
export function resolveBatteryState(
  reading: BatteryReading | null | undefined,
  latched: boolean
): { battery: BatteryReading | null; latched: boolean } {
  if (!reading || !Number.isFinite(reading.level)) {
    return { battery: null, latched };
  }

  const copy: BatteryReading = { ...reading };

  if (isLikelyBatteryPresent(copy)) {
    return { battery: copy, latched: true };
  }

  return { battery: latched ? copy : null, latched };
}

export function toBatteryPercent(level: number): number {
  return Math.round(Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0)) * 100);
}

export type BatteryGlyph = "charging" | "full" | "medium" | "low" | "warning";

export function resolveBatteryGlyph(reading: BatteryReading): BatteryGlyph {
  if (reading.charging) {
    return "charging";
  }

  const percent = toBatteryPercent(reading.level);

  if (percent <= 10) return "warning";
  if (percent <= 35) return "low";
  if (percent <= 75) return "medium";
  return "full";
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

/** Windows wording: "80% available (plugged in)", "1 hr 5 min (64%) remaining". */
export function describeBattery(reading: BatteryReading): string {
  const percent = toBatteryPercent(reading.level);

  if (reading.charging) {
    return `${percent}% available (plugged in)`;
  }

  if (Number.isFinite(reading.dischargingTime) && reading.dischargingTime > 0) {
    return `${formatDuration(reading.dischargingTime)} (${percent}%) remaining`;
  }

  return `${percent}% remaining`;
}

/** Tray tooltip and status line for the network icon. */
export function describeNetwork(status: NetworkStatus): { title: string; detail: string } {
  switch (status) {
    case "connected":
      return { title: "Wi-Fi", detail: "Internet access" };
    case "no-internet":
      return { title: "Wi-Fi", detail: "No internet access" };
    case "wifi-off":
      return { title: "Not connected", detail: "Wi-Fi is turned off" };
    case "airplane":
      return { title: "Airplane mode", detail: "Wi-Fi is turned off" };
  }
}

/** The short status under "Wi-Fi" on its Quick Settings tile. */
export function describeWifiTile(status: NetworkStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "no-internet":
      return "No internet";
    default:
      return "Off";
  }
}

/** The desktop's offline banner; null while connected. */
export function describeOfflineBanner(status: NetworkStatus): string | null {
  switch (status) {
    case "connected":
      return null;
    case "no-internet":
      return "Offline — some previews and embeds may fail to load.";
    case "wifi-off":
      return "Wi-Fi is off — web pages, previews and embeds are unavailable.";
    case "airplane":
      return "Airplane mode is on — web pages, previews and embeds are unavailable.";
  }
}

export function describeVolume(volume: number, muted: boolean): string {
  return muted ? "Speakers: Muted" : `Speakers: ${Math.round(volume)}%`;
}

export type VolumeGlyph = "muted" | "low" | "medium" | "high";

export function resolveVolumeGlyph(volume: number, muted: boolean): VolumeGlyph {
  if (muted || volume <= 0) return "muted";
  if (volume < 34) return "low";
  if (volume < 67) return "medium";
  return "high";
}
