import { describe, expect, it } from "vitest";
import { describeSettingsStatus, type SettingsOverviewInput } from "@/lib/settings-overview";
import { buildTrayReadings } from "@/lib/tray-readings";

function input(overrides: Partial<Parameters<typeof buildTrayReadings>[0]> = {}, rest: Partial<SettingsOverviewInput> = {}) {
  return {
    readings: buildTrayReadings({
      networkStatus: "connected",
      effectiveType: null,
      volume: 42,
      muted: false,
      battery: null,
      batterySaver: false,
      nightLight: false,
      ...overrides,
    }),
    brightness: 100,
    reduceMotion: false,
    themeName: "Windows Bloom Dark",
    timeZone: "Europe/Tallinn",
    ...rest,
  };
}

describe("describeSettingsStatus", () => {
  it("reports display brightness and night light", () => {
    expect(describeSettingsStatus("display", input())).toBe("Brightness 100%");
    expect(describeSettingsStatus("display", input({ nightLight: true }, { brightness: 60 }))).toBe(
      "Brightness 60%, Night light on"
    );
  });

  it("reports the speakers in Windows wording", () => {
    expect(describeSettingsStatus("sound", input())).toBe("Speakers: 42%");
    expect(describeSettingsStatus("sound", input({ muted: true }))).toBe("Speakers: Muted");
  });

  it("reports power with and without a battery", () => {
    expect(describeSettingsStatus("power", input())).toBe("No battery detected");
    expect(describeSettingsStatus("power", input({ batterySaver: true }))).toBe(
      "No battery detected, Battery saver on"
    );

    const withBattery = input({
      battery: { level: 0.8, charging: true, chargingTime: 600, dischargingTime: Number.POSITIVE_INFINITY },
    });
    expect(describeSettingsStatus("power", withBattery)).toBe("80% available (plugged in)");
  });

  it("reports the network state", () => {
    expect(describeSettingsStatus("network", input())).toBe("Wi-Fi, Internet access");
    expect(describeSettingsStatus("network", input({ networkStatus: "airplane" }))).toBe(
      "Airplane mode, Wi-Fi is turned off"
    );
  });

  it("reports theme, animation effects and time zone", () => {
    expect(describeSettingsStatus("personalization", input())).toBe("Windows Bloom Dark");
    expect(describeSettingsStatus("accessibility", input())).toBe("Animation effects on");
    expect(describeSettingsStatus("accessibility", input({}, { reduceMotion: true }))).toBe("Animation effects off");
    expect(describeSettingsStatus("time", input())).toBe("Europe/Tallinn");
  });

  it("has nothing to say for the overview itself", () => {
    expect(describeSettingsStatus("system", input())).toBe("");
  });
});
