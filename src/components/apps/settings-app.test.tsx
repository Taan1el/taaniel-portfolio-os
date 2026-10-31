// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsApp } from "@/components/apps/settings-app";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { useDeviceStore } from "@/stores/device-store";
import { useProcessStore } from "@/stores/process-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import type { AppWindow } from "@/types/system";

const playTestTone = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/test-tone", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/test-tone")>()),
  playTestTone,
}));

function buildWindow(section?: unknown, processId = "proc-settings"): AppWindow {
  return {
    id: "win-settings",
    processId,
    appId: "settings",
    title: "Settings",
    x: 0,
    y: 0,
    width: 780,
    height: 560,
    zIndex: 1,
    minimized: false,
    maximized: false,
    focused: true,
    createdAt: 0,
    processStatus: "focused",
    payload: section === undefined ? undefined : { section: section as SettingsSectionId },
  };
}

const heading = () => screen.getByRole("heading", { level: 1, name: /.+/ }).textContent;
const nav = () => within(screen.getByRole("navigation", { name: "Settings" }));

beforeEach(() => {
  playTestTone.mockClear();
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
  useProcessStore.setState({ processes: [] });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
  useProcessStore.setState({ processes: [] });
});

describe("Settings navigation", () => {
  it("opens on the System overview by default", () => {
    render(<SettingsApp window={buildWindow()} />);

    expect(heading()).toBe("System");
    expect(nav().getByRole("button", { name: "System" }).getAttribute("aria-current")).toBe("page");
  });

  it("lists every page in the navigation pane", () => {
    render(<SettingsApp window={buildWindow()} />);

    const names = nav()
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual([
      "System",
      "Display",
      "Sound",
      "Notifications",
      "Power & battery",
      "Storage",
      "Network & internet",
      "Personalization",
      "Apps",
      "Accessibility",
      "Privacy",
      "Time & language",
      "Keyboard & input",
      "About",
    ]);
  });

  it.each([
    ["display", "Display", "Display"],
    ["sound", "Sound", "Sound"],
    ["power", "Power & battery", "Power & battery"],
    ["network", "Network & internet", "Network & internet"],
    // Personalization keeps the hero heading it always had.
    ["personalization", "Personalization", "Theme the desktop"],
    ["accessibility", "Accessibility", "Accessibility"],
    ["time", "Time & language", "Time & language"],
  ])("deep-links to %s", (section, navName, title) => {
    render(<SettingsApp window={buildWindow(section)} />);

    expect(heading()).toBe(title);
    expect(nav().getByRole("button", { name: navName }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("region", { name: navName })).toBeTruthy();
  });

  it("falls back to System for an unknown page", () => {
    render(<SettingsApp window={buildWindow("not-a-page")} />);
    expect(heading()).toBe("System");
  });

  it("switches pages from the navigation pane", () => {
    render(<SettingsApp window={buildWindow()} />);

    fireEvent.click(nav().getByRole("button", { name: "Sound" }));
    expect(heading()).toBe("Sound");
    expect(nav().getByRole("button", { name: "System" }).getAttribute("aria-current")).toBeNull();
  });

  it("follows a deep link that arrives while Settings is open", () => {
    const view = render(<SettingsApp window={buildWindow()} />);
    expect(heading()).toBe("System");

    view.rerender(<SettingsApp window={buildWindow("network")} />);
    expect(heading()).toBe("Network & internet");
  });

  it("keeps the browsed page in the window's payload so the same deep link works again", () => {
    const process = useProcessStore.getState().createProcess("settings", { section: "sound" });
    const view = render(<SettingsApp window={buildWindow("sound", process.id)} />);

    fireEvent.click(nav().getByRole("button", { name: "Display" }));
    const stored = useProcessStore.getState().processes.find((candidate) => candidate.id === process.id);
    expect(stored?.launchPayload?.section).toBe("display");

    // Asking for Sound again is a change from Display, so it navigates.
    view.rerender(<SettingsApp window={buildWindow("display", process.id)} />);
    view.rerender(<SettingsApp window={buildWindow("sound", process.id)} />);
    expect(heading()).toBe("Sound");
  });

  it("opens a page from the overview", () => {
    render(<SettingsApp window={buildWindow()} />);

    fireEvent.click(within(screen.getByRole("region")).getByRole("button", { name: /^Network & internet/ }));
    expect(heading()).toBe("Network & internet");
  });

  it("shows live status on the overview", () => {
    useSystemSettingsStore.getState().setVolume(42);
    useSystemSettingsStore.getState().setBrightness(60);
    render(<SettingsApp window={buildWindow()} />);

    expect(screen.getByText("Speakers: 42%")).toBeTruthy();
    expect(screen.getByText("Brightness 60%")).toBeTruthy();
    expect(screen.getByText("Wi-Fi, Internet access")).toBeTruthy();

    act(() => useDeviceStore.getState().setAirplaneMode(true));
    expect(screen.getByText("Airplane mode, Wi-Fi is turned off")).toBeTruthy();
  });
});

describe("Display page", () => {
  it("moves brightness", () => {
    render(<SettingsApp window={buildWindow("display")} />);

    fireEvent.change(screen.getByRole("slider", { name: "Brightness" }), { target: { value: "45" } });
    expect(useSystemSettingsStore.getState().brightness).toBe(45);
  });

  it("turns night light on and only then lets its strength change", () => {
    render(<SettingsApp window={buildWindow("display")} />);
    const strength = screen.getByRole("slider", { name: "Night light strength" }) as HTMLInputElement;
    expect(strength.disabled).toBe(true);

    fireEvent.click(screen.getByRole("switch", { name: "Night light" }));
    expect(useSystemSettingsStore.getState().nightLight).toBe(true);
    expect(strength.disabled).toBe(false);

    fireEvent.change(strength, { target: { value: "80" } });
    expect(useSystemSettingsStore.getState().nightLightStrength).toBe(80);
  });

  it("resets to the defaults", () => {
    useSystemSettingsStore.getState().setBrightness(30);
    useSystemSettingsStore.getState().setNightLight(true);
    render(<SettingsApp window={buildWindow("display")} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useSystemSettingsStore.getState().brightness).toBe(100);
    expect(useSystemSettingsStore.getState().nightLight).toBe(false);
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Sound page", () => {
  it("moves the master volume", () => {
    render(<SettingsApp window={buildWindow("sound")} />);

    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "30" } });
    expect(useSystemSettingsStore.getState().volume).toBe(30);
  });

  it("mutes and unmutes with the switch", () => {
    render(<SettingsApp window={buildWindow("sound")} />);
    const mute = screen.getByRole("switch", { name: "Mute" });

    fireEvent.click(mute);
    expect(useSystemSettingsStore.getState().muted).toBe(true);
    expect(mute.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(mute);
    expect(useSystemSettingsStore.getState().muted).toBe(false);
  });

  it("plays the test tone at the master gain", () => {
    useSystemSettingsStore.getState().setVolume(50);
    render(<SettingsApp window={buildWindow("sound")} />);

    fireEvent.click(screen.getByRole("button", { name: "Play tone" }));
    expect(playTestTone).toHaveBeenCalledWith(0.5);
  });

  it("says when the tone cannot play", () => {
    playTestTone.mockReturnValueOnce(false);
    render(<SettingsApp window={buildWindow("sound")} />);

    fireEvent.click(screen.getByRole("button", { name: "Play tone" }));
    expect(screen.getByText("This browser cannot play the test tone.")).toBeTruthy();
  });
});

describe("Power & battery page", () => {
  it("says there is no battery on a desktop", () => {
    render(<SettingsApp window={buildWindow("power")} />);
    expect(screen.getByText("No battery detected")).toBeTruthy();
  });

  it("shows the battery in Windows wording", () => {
    useDeviceStore.getState().setBatteryReading({
      level: 0.8,
      charging: true,
      chargingTime: 600,
      dischargingTime: Number.POSITIVE_INFINITY,
    });
    render(<SettingsApp window={buildWindow("power")} />);

    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("80% available (plugged in)")).toBeTruthy();
  });

  it("switches battery saver", () => {
    render(<SettingsApp window={buildWindow("power")} />);

    fireEvent.click(screen.getByRole("switch", { name: "Battery saver" }));
    expect(useSystemSettingsStore.getState().batterySaver).toBe(true);
  });
});

describe("Network & internet page", () => {
  it("turns Wi-Fi off and on", () => {
    render(<SettingsApp window={buildWindow("network")} />);

    fireEvent.click(screen.getByRole("switch", { name: "Wi-Fi" }));
    expect(useDeviceStore.getState().wifiEnabled).toBe(false);
    expect(screen.getByText("Wi-Fi is turned off")).toBeTruthy();
  });

  it("turns airplane mode on and off", () => {
    render(<SettingsApp window={buildWindow("network")} />);

    fireEvent.click(screen.getByRole("switch", { name: "Airplane mode" }));
    expect(useDeviceStore.getState().airplaneMode).toBe(true);
    expect(screen.getByRole("switch", { name: "Wi-Fi" }).getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByRole("switch", { name: "Airplane mode" }));
    expect(useDeviceStore.getState().airplaneMode).toBe(false);
    expect(screen.getByRole("switch", { name: "Wi-Fi" }).getAttribute("aria-checked")).toBe("true");
  });

  it("reports an outage the browser sees", () => {
    useDeviceStore.getState().setBrowserOnline(false);
    render(<SettingsApp window={buildWindow("network")} />);

    expect(screen.getByText("No internet access")).toBeTruthy();
  });
});

describe("Accessibility page", () => {
  it("reads animation effects as the opposite of reduce motion", () => {
    render(<SettingsApp window={buildWindow("accessibility")} />);
    const effects = screen.getByRole("switch", { name: "Animation effects" });
    expect(effects.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(effects);
    expect(useSystemSettingsStore.getState().reduceMotion).toBe(true);
    expect(effects.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(effects);
    expect(useSystemSettingsStore.getState().reduceMotion).toBe(false);
  });

  it("follows a Quick Settings change made elsewhere", () => {
    render(<SettingsApp window={buildWindow("accessibility")} />);

    act(() => useSystemSettingsStore.getState().setReduceMotion(true));
    expect(screen.getByRole("switch", { name: "Animation effects" }).getAttribute("aria-checked")).toBe("false");
  });
});

describe("Time & language page", () => {
  it("shows the device's time zone and language", () => {
    render(<SettingsApp window={buildWindow("time")} />);

    expect(screen.getByText("Time zone")).toBeTruthy();
    expect(screen.getByText(navigator.language, { exact: false })).toBeTruthy();
  });
});

describe("Personalization page", () => {
  it("keeps the theme and wallpaper pickers", () => {
    render(<SettingsApp window={buildWindow("personalization")} />);

    expect(screen.getByRole("heading", { name: "Theme the desktop" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Use theme wallpaper/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reset windows/ })).toBeTruthy();
  });
});
