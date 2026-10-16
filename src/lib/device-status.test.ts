import { describe, expect, it } from "vitest";
import {
  describeBattery,
  describeNetwork,
  describeOfflineBanner,
  describeVolume,
  describeWifiTile,
  isLikelyBatteryPresent,
  isNetworkBlocked,
  resolveBatteryGlyph,
  resolveNetworkStatus,
  resolveSignalStrength,
  resolveVolumeGlyph,
} from "@/lib/device-status";

const online = { browserOnline: true, wifiEnabled: true, airplaneMode: false };

describe("network status", () => {
  it("is connected only with Wi-Fi on and the browser online", () => {
    expect(resolveNetworkStatus(online)).toBe("connected");
    expect(isNetworkBlocked(online)).toBe(false);
  });

  it("reports a real outage as no internet access", () => {
    expect(resolveNetworkStatus({ ...online, browserOnline: false })).toBe("no-internet");
    expect(describeNetwork("no-internet").detail).toBe("No internet access");
  });

  it("separates airplane mode from Wi-Fi switched off", () => {
    expect(resolveNetworkStatus({ ...online, wifiEnabled: false })).toBe("wifi-off");
    expect(resolveNetworkStatus({ ...online, wifiEnabled: false, airplaneMode: true })).toBe("airplane");
    expect(describeNetwork("airplane").title).toBe("Airplane mode");
  });

  it("lets Wi-Fi back on during airplane mode, as Windows does", () => {
    expect(resolveNetworkStatus({ ...online, airplaneMode: true })).toBe("connected");
  });

  it("words the Wi-Fi tile and the offline banner per state", () => {
    expect(describeWifiTile("connected")).toBe("Connected");
    expect(describeWifiTile("no-internet")).toBe("No internet");
    expect(describeWifiTile("wifi-off")).toBe("Off");
    expect(describeWifiTile("airplane")).toBe("Off");

    expect(describeOfflineBanner("connected")).toBeNull();
    expect(describeOfflineBanner("no-internet")).toContain("Offline");
    expect(describeOfflineBanner("wifi-off")).toContain("Wi-Fi is off");
    expect(describeOfflineBanner("airplane")).toContain("Airplane mode");
  });

  it("maps effective connection types to signal bars", () => {
    expect(resolveSignalStrength("4g")).toBe(3);
    expect(resolveSignalStrength("3g")).toBe(2);
    expect(resolveSignalStrength("2g")).toBe(1);
    expect(resolveSignalStrength("slow-2g")).toBe(0);
    expect(resolveSignalStrength(undefined)).toBe(3);
  });
});

describe("battery status", () => {
  it("treats the fixed full-and-charging desktop reading as no battery", () => {
    expect(
      isLikelyBatteryPresent({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity })
    ).toBe(false);
    expect(isLikelyBatteryPresent(null)).toBe(false);
  });

  it("keeps real laptop readings", () => {
    expect(
      isLikelyBatteryPresent({ level: 0.8, charging: true, chargingTime: 1200, dischargingTime: Infinity })
    ).toBe(true);
    expect(
      isLikelyBatteryPresent({ level: 1, charging: false, chargingTime: Infinity, dischargingTime: 9000 })
    ).toBe(true);
  });

  it("uses Windows wording", () => {
    expect(describeBattery({ level: 0.8, charging: true, chargingTime: 600, dischargingTime: Infinity })).toBe(
      "80% available (plugged in)"
    );
    expect(describeBattery({ level: 0.64, charging: false, chargingTime: Infinity, dischargingTime: 3900 })).toBe(
      "1 hr 5 min (64%) remaining"
    );
    expect(describeBattery({ level: 0.5, charging: false, chargingTime: Infinity, dischargingTime: Infinity })).toBe(
      "50% remaining"
    );
  });

  it("picks a glyph by charge", () => {
    const reading = { charging: false, chargingTime: Infinity, dischargingTime: Infinity };
    expect(resolveBatteryGlyph({ ...reading, level: 0.05 })).toBe("warning");
    expect(resolveBatteryGlyph({ ...reading, level: 0.3 })).toBe("low");
    expect(resolveBatteryGlyph({ ...reading, level: 0.6 })).toBe("medium");
    expect(resolveBatteryGlyph({ ...reading, level: 0.9 })).toBe("full");
    expect(resolveBatteryGlyph({ ...reading, level: 0.9, charging: true })).toBe("charging");
  });
});

describe("volume status", () => {
  it("uses the speaker wording", () => {
    expect(describeVolume(42, false)).toBe("Speakers: 42%");
    expect(describeVolume(42, true)).toBe("Speakers: Muted");
  });

  it("shows the muted glyph at zero", () => {
    expect(resolveVolumeGlyph(0, false)).toBe("muted");
    expect(resolveVolumeGlyph(20, false)).toBe("low");
    expect(resolveVolumeGlyph(50, false)).toBe("medium");
    expect(resolveVolumeGlyph(90, false)).toBe("high");
    expect(resolveVolumeGlyph(90, true)).toBe("muted");
  });
});
