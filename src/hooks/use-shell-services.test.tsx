// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShellServices } from "@/hooks/use-shell-services";
import { prefersStaticWallpaper } from "@/lib/device-capabilities";
import { useDeviceStore } from "@/stores/device-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/** Stands in for the desktop: calls the hook and reads the wallpaper rule during render. */
function Harness() {
  useShellServices();
  return <span data-testid="static-wallpaper">{String(prefersStaticWallpaper())}</span>;
}

const root = document.documentElement;

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
  useDeviceStore.getState().resetDevice();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useSystemSettingsStore.getState().resetSettings();
  useDeviceStore.getState().resetDevice();
});

describe("useShellServices", () => {
  it("mirrors the settings that CSS reacts to onto <html>", () => {
    render(<Harness />);
    expect(root.hasAttribute("data-reduce-motion")).toBe(false);
    expect(root.hasAttribute("data-battery-saver")).toBe(false);
    expect(root.hasAttribute("data-night-light")).toBe(false);

    act(() => {
      useSystemSettingsStore.getState().setReduceMotion(true);
      useSystemSettingsStore.getState().setBatterySaver(true);
      useSystemSettingsStore.getState().setNightLight(true);
    });
    expect(root.getAttribute("data-reduce-motion")).toBe("true");
    expect(root.getAttribute("data-battery-saver")).toBe("true");
    expect(root.getAttribute("data-night-light")).toBe("true");

    act(() => useSystemSettingsStore.getState().setBatterySaver(false));
    expect(root.hasAttribute("data-battery-saver")).toBe(false);
    expect(root.getAttribute("data-reduce-motion")).toBe("true");
  });

  it("removes the attributes when the desktop goes away", () => {
    useSystemSettingsStore.getState().setReduceMotion(true);
    const view = render(<Harness />);
    expect(root.getAttribute("data-reduce-motion")).toBe("true");

    view.unmount();
    expect(root.hasAttribute("data-reduce-motion")).toBe(false);
  });

  it("renders the desktop again when battery saver changes, so its wallpaper rule follows", () => {
    vi.spyOn(window.navigator, "hardwareConcurrency", "get").mockReturnValue(8);
    const view = render(<Harness />);
    expect(view.getByTestId("static-wallpaper").textContent).toBe("false");

    act(() => useSystemSettingsStore.getState().setBatterySaver(true));
    expect(view.getByTestId("static-wallpaper").textContent).toBe("true");

    act(() => useSystemSettingsStore.getState().setBatterySaver(false));
    expect(view.getByTestId("static-wallpaper").textContent).toBe("false");
  });

  it("starts the device watchers and stops them on unmount", () => {
    const onLine = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const view = render(<Harness />);
    expect(useDeviceStore.getState().browserOnline).toBe(true);

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(useDeviceStore.getState().browserOnline).toBe(false);

    view.unmount();
    onLine.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    expect(useDeviceStore.getState().browserOnline).toBe(false);
  });
});
