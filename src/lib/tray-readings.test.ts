import { describe, expect, it } from "vitest";
import { buildTrayReadings, type TrayInput } from "@/lib/tray-readings";

const base: TrayInput = {
  networkStatus: "connected",
  effectiveType: null,
  volume: 42,
  muted: false,
  battery: null,
  batterySaver: false,
  nightLight: false,
};

const charging = { level: 0.8, charging: true, chargingTime: 1200, dischargingTime: Number.POSITIVE_INFINITY };
const draining = { level: 0.64, charging: false, chargingTime: Number.POSITIVE_INFINITY, dischargingTime: 3900 };

describe("buildTrayReadings", () => {
  it("uses Windows wording for the speakers", () => {
    expect(buildTrayReadings(base).volume.tooltip).toBe("Speakers: 42%");
    expect(buildTrayReadings({ ...base, muted: true }).volume.tooltip).toBe("Speakers: Muted");
    expect(buildTrayReadings({ ...base, muted: true }).volume.glyph).toBe("muted");
  });

  it("describes each network state", () => {
    expect(buildTrayReadings(base).network.tooltip).toContain("Internet access");
    expect(buildTrayReadings({ ...base, networkStatus: "no-internet" }).network.tooltip).toContain(
      "No internet access"
    );
    expect(buildTrayReadings({ ...base, networkStatus: "airplane" }).network.tooltip).toContain("Airplane mode");
    expect(buildTrayReadings({ ...base, networkStatus: "wifi-off" }).network.strength).toBe(0);
  });

  it("reads signal bars from the connection type while connected", () => {
    expect(buildTrayReadings({ ...base, effectiveType: "2g" }).network.strength).toBe(1);
    expect(buildTrayReadings({ ...base, effectiveType: "4g" }).network.strength).toBe(3);
    expect(buildTrayReadings({ ...base, networkStatus: "no-internet", effectiveType: "4g" }).network.strength).toBe(0);
  });

  it("hides the battery when there is none", () => {
    expect(buildTrayReadings(base).battery).toBeNull();
  });

  it("describes a plugged-in and a draining battery", () => {
    const plugged = buildTrayReadings({ ...base, battery: charging }).battery;
    expect(plugged?.tooltip).toBe("80% available (plugged in)");
    expect(plugged?.glyph).toBe("charging");

    const unplugged = buildTrayReadings({ ...base, battery: draining }).battery;
    expect(unplugged?.tooltip).toBe("1 hr 5 min (64%) remaining");
    expect(unplugged?.glyph).toBe("medium");
  });

  it("adds Battery saver to the battery tooltip while it is on", () => {
    const readings = buildTrayReadings({ ...base, battery: draining, batterySaver: true });
    expect(readings.battery?.tooltip).toBe("1 hr 5 min (64%) remaining\nBattery saver");
    expect(readings.battery?.spoken).toContain("Battery saver on");
    expect(readings.battery?.text).toBe("1 hr 5 min (64%) remaining");
  });

  it("summarises everything for the button's name", () => {
    const summary = buildTrayReadings({ ...base, battery: charging, nightLight: true, batterySaver: true }).summary;
    expect(summary).toContain("Speakers: 42%");
    expect(summary).toContain("80% available (plugged in)");
    expect(summary).toContain("Night light on");
  });

  it("mentions battery saver even without a battery", () => {
    expect(buildTrayReadings({ ...base, batterySaver: true }).summary).toContain("Battery saver on");
  });
});
