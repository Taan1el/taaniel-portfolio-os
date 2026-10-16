// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickSettingsFlyout } from "@/components/shell/quick-settings/quick-settings-flyout";
import { useDeviceStore } from "@/stores/device-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

function renderFlyout() {
  const onOpenSettings = vi.fn();
  render(<QuickSettingsFlyout onOpenSettings={onOpenSettings} />);

  return { onOpenSettings };
}

const tile = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

beforeEach(() => {
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
  useShellStore.setState({ quickSettingsOpen: true });
});

afterEach(() => {
  cleanup();
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
  useShellStore.setState({ quickSettingsOpen: false });
});

describe("QuickSettingsFlyout tiles", () => {
  it("is a labelled dialog", () => {
    renderFlyout();
    expect(screen.getByRole("dialog", { name: "Quick settings" })).toBeTruthy();
  });

  it("turns Wi-Fi off and on, and says so", () => {
    renderFlyout();
    expect(tile("Wi-Fi").getAttribute("aria-pressed")).toBe("true");
    expect(tile("Wi-Fi").textContent).toContain("Connected");

    fireEvent.click(tile("Wi-Fi"));
    expect(useDeviceStore.getState().wifiEnabled).toBe(false);
    expect(tile("Wi-Fi").getAttribute("aria-pressed")).toBe("false");
    expect(tile("Wi-Fi").textContent).toContain("Off");

    fireEvent.click(tile("Wi-Fi"));
    expect(useDeviceStore.getState().wifiEnabled).toBe(true);
  });

  it("shows no internet while the browser is offline", () => {
    renderFlyout();
    act(() => useDeviceStore.getState().setBrowserOnline(false));
    expect(tile("Wi-Fi").textContent).toContain("No internet");
  });

  it("airplane mode switches the radio off and restores it", () => {
    renderFlyout();
    fireEvent.click(tile("Airplane mode"));
    expect(useDeviceStore.getState().airplaneMode).toBe(true);
    expect(useDeviceStore.getState().wifiEnabled).toBe(false);
    expect(tile("Wi-Fi").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(tile("Airplane mode"));
    expect(useDeviceStore.getState().airplaneMode).toBe(false);
    expect(useDeviceStore.getState().wifiEnabled).toBe(true);
  });

  it("toggles battery saver, night light and reduce motion", () => {
    renderFlyout();

    fireEvent.click(tile("Battery saver"));
    fireEvent.click(tile("Night light"));
    fireEvent.click(tile("Reduce motion"));
    const settings = useSystemSettingsStore.getState();
    expect(settings.batterySaver).toBe(true);
    expect(settings.nightLight).toBe(true);
    expect(settings.reduceMotion).toBe(true);
    expect(tile("Night light").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(tile("Night light"));
    expect(useSystemSettingsStore.getState().nightLight).toBe(false);
  });
});

describe("QuickSettingsFlyout sliders", () => {
  it("moves brightness", () => {
    renderFlyout();
    fireEvent.change(screen.getByRole("slider", { name: "Brightness" }), { target: { value: "40" } });
    expect(useSystemSettingsStore.getState().brightness).toBe(40);
  });

  it("moves the volume and unmutes", () => {
    useSystemSettingsStore.getState().setMuted(true);
    renderFlyout();

    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "35" } });
    expect(useSystemSettingsStore.getState().volume).toBe(35);
    expect(useSystemSettingsStore.getState().muted).toBe(false);
  });

  it("mutes from the speaker button", () => {
    renderFlyout();
    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(mute);
    expect(useSystemSettingsStore.getState().muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("slider", { name: "Volume" }).getAttribute("aria-valuetext")).toBe("Muted");
  });
});

describe("QuickSettingsFlyout footer", () => {
  it("hides the battery on a device without one", () => {
    renderFlyout();
    expect(screen.queryByText(/available \(plugged in\)/)).toBeNull();
  });

  it("shows the battery with Windows wording", () => {
    useDeviceStore.getState().setBatteryReading({
      level: 0.8,
      charging: true,
      chargingTime: 600,
      dischargingTime: Number.POSITIVE_INFINITY,
    });
    renderFlyout();
    expect(screen.getByText("80% available (plugged in)")).toBeTruthy();
  });

  it("opens the matching Settings pages", () => {
    const { onOpenSettings } = renderFlyout();

    fireEvent.click(screen.getByRole("button", { name: "Sound settings" }));
    expect(onOpenSettings).toHaveBeenLastCalledWith("sound");

    fireEvent.click(screen.getByRole("button", { name: "All settings" }));
    expect(onOpenSettings).toHaveBeenLastCalledWith("system");
  });
});

describe("QuickSettingsFlyout behaviour", () => {
  it("closes on Escape and returns focus to the tray button", () => {
    render(
      <>
        <button type="button" data-flyout-trigger="quick-settings">
          Tray
        </button>
        <QuickSettingsFlyout onOpenSettings={vi.fn()} />
      </>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(useShellStore.getState().quickSettingsOpen).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Tray"));
  });
});
