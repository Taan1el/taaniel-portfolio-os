// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskbarTray } from "@/components/shell/taskbar-tray";
import { useDeviceStore } from "@/stores/device-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

function renderTray(overrides: Partial<Parameters<typeof TaskbarTray>[0]> = {}) {
  const props = {
    calendarOpen: false,
    onToggleCalendar: vi.fn(),
    onShowDesktop: vi.fn(),
    onLaunchApp: vi.fn(),
    ...overrides,
  };
  const view = render(<TaskbarTray {...props} />);

  return { ...props, ...view };
}

const glyph = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-tray-glyph="${name}"]`);

beforeEach(() => {
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
  useShellStore.setState({ quickSettingsOpen: false, calendarOpen: false, contextMenu: null });
});

afterEach(() => {
  cleanup();
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
});

describe("TaskbarTray glyphs", () => {
  it("gives every icon its own tooltip in Windows wording", () => {
    useSystemSettingsStore.getState().setVolume(42);
    useDeviceStore.getState().setBatteryReading({
      level: 0.8,
      charging: true,
      chargingTime: 600,
      dischargingTime: Number.POSITIVE_INFINITY,
    });
    const { container } = renderTray();

    expect(glyph(container, "network")?.title).toContain("Internet access");
    expect(glyph(container, "volume")?.title).toBe("Speakers: 42%");
    expect(glyph(container, "battery")?.title).toBe("80% available (plugged in)");
  });

  it("follows the network state", () => {
    const { container } = renderTray();

    act(() => useDeviceStore.getState().setBrowserOnline(false));
    expect(glyph(container, "network")?.title).toContain("No internet access");
    expect(glyph(container, "network")?.dataset.warning).toBe("true");

    act(() => useDeviceStore.getState().setAirplaneMode(true));
    expect(glyph(container, "network")?.title).toContain("Airplane mode");
    expect(glyph(container, "network")?.dataset.warning).toBeUndefined();
  });

  it("hides the battery on a device without one", () => {
    const { container } = renderTray();
    expect(glyph(container, "battery")).toBeNull();

    act(() =>
      useDeviceStore.getState().setBatteryReading({
        level: 1,
        charging: true,
        chargingTime: 0,
        dischargingTime: Number.POSITIVE_INFINITY,
      })
    );
    expect(glyph(container, "battery")).toBeNull();
  });

  it("shows Battery saver and Night light while they are on", () => {
    const { container } = renderTray();
    expect(glyph(container, "battery-saver")).toBeNull();
    expect(glyph(container, "night-light")).toBeNull();

    act(() => {
      useSystemSettingsStore.getState().setBatterySaver(true);
      useSystemSettingsStore.getState().setNightLight(true);
    });
    expect(glyph(container, "battery-saver")?.title).toBe("Battery saver");
    expect(glyph(container, "night-light")?.title).toBe("Night light");
  });

  it("names the quick settings button after what it shows", () => {
    renderTray();
    expect(screen.getByRole("button", { name: /^Quick settings: .*Speakers: 100%/ })).toBeTruthy();
  });
});

describe("TaskbarTray volume", () => {
  it("raises and lowers the volume 2% a wheel notch", () => {
    useSystemSettingsStore.getState().setVolume(50);
    const { container } = renderTray();
    const speaker = glyph(container, "volume")!;

    fireEvent.wheel(speaker, { deltaY: -100 });
    expect(useSystemSettingsStore.getState().volume).toBe(52);

    fireEvent.wheel(speaker, { deltaY: 100 });
    fireEvent.wheel(speaker, { deltaY: 100 });
    expect(useSystemSettingsStore.getState().volume).toBe(48);
  });

  it("cancels the page scroll while it adjusts", () => {
    const { container } = renderTray();
    const event = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });

    glyph(container, "volume")!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("mutes on a middle click", () => {
    const { container } = renderTray();

    fireEvent(glyph(container, "volume")!, new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }));
    expect(useSystemSettingsStore.getState().muted).toBe(true);
    expect(glyph(container, "volume")?.title).toBe("Speakers: Muted");
  });

  it("offers sound settings and mute from the right-click menu", () => {
    const { container, onLaunchApp } = renderTray();

    fireEvent.contextMenu(glyph(container, "volume")!, { clientX: 900, clientY: 700 });
    const menu = useShellStore.getState().contextMenu;
    expect(menu?.actions.map((action) => action.label)).toEqual(["Sound settings", "Mute"]);

    menu?.actions[0].onSelect();
    expect(onLaunchApp).toHaveBeenCalledWith("settings", { section: "sound" });

    menu?.actions[1].onSelect();
    expect(useSystemSettingsStore.getState().muted).toBe(true);
  });
});

describe("TaskbarTray buttons", () => {
  it("opens and closes quick settings from its button", () => {
    renderTray();
    const button = screen.getByRole("button", { name: /^Quick settings/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(useShellStore.getState().quickSettingsOpen).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(button);
    expect(useShellStore.getState().quickSettingsOpen).toBe(false);
  });

  it("toggles the calendar from the clock and shows the desktop from the sliver", () => {
    const { onToggleCalendar, onShowDesktop } = renderTray({ calendarOpen: true });
    const clock = screen.getByRole("button", { name: /open calendar$/ });
    expect(clock.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(clock);
    expect(onToggleCalendar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Show desktop" }));
    expect(onShowDesktop).toHaveBeenCalledTimes(1);
  });

  it("offers date and time settings from the clock's right-click menu", () => {
    const { onLaunchApp } = renderTray();

    fireEvent.contextMenu(screen.getByRole("button", { name: /open calendar$/ }), { clientX: 10, clientY: 10 });
    useShellStore.getState().contextMenu?.actions[0].onSelect();
    expect(onLaunchApp).toHaveBeenCalledWith("settings", { section: "time" });
  });
});
