import { describe, expect, it } from "vitest";
import { getTimeInfo } from "@/lib/time-info";

// 16 October 2026, 07:42 UTC, which is 10:42 in Tallinn (UTC+3) and 03:42 in New York (UTC-4).
const NOW = new Date(Date.UTC(2026, 9, 16, 7, 42, 0));

describe("getTimeInfo", () => {
  it("formats the date and time in the given zone and language", () => {
    const info = getTimeInfo(NOW, { locale: "en-US", timeZone: "Europe/Tallinn" });

    expect(info.dateTime).toContain("Friday, October 16, 2026");
    expect(info.dateTime).toContain("10:42");
    expect(info.timeZone).toBe("Europe/Tallinn");
    expect(info.timeZoneName).toBe("GMT+3");
  });

  it("follows the zone, not the machine", () => {
    const info = getTimeInfo(NOW, { locale: "en-US", timeZone: "America/New_York" });

    expect(info.dateTime).toContain("3:42");
    expect(info.timeZoneName).toBe("EDT");
  });

  it("names the language and the first weekday", () => {
    const us = getTimeInfo(NOW, { locale: "en-US", timeZone: "UTC" });
    expect(us.language).toBe("en-US");
    expect(us.languageName).toMatch(/English/);
    expect(us.firstDayOfWeek).toBe("Sunday");

    const estonia = getTimeInfo(NOW, { locale: "et-EE", timeZone: "UTC" });
    expect(estonia.firstDayOfWeek).toMatch(/esmaspäev/i);
  });

  it("falls back to the device's own zone", () => {
    const info = getTimeInfo(NOW, { locale: "en-US" });

    expect(info.timeZone).toBeTruthy();
  });
});
