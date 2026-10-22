// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserFallbackPanel } from "@/components/apps/browser/browser-fallback-panel";
import { buildOfflineFallback } from "@/lib/browser/offline";
import { useDeviceStore } from "@/stores/device-store";
import { useSystemStore } from "@/stores/system-store";

const URL = "https://example.com/page";
const originalLaunchApp = useSystemStore.getState().launchApp;

function renderOffline(status: Parameters<typeof buildOfflineFallback>[1]) {
  render(
    <BrowserFallbackPanel
      fallback={buildOfflineFallback(URL, status)}
      canOpenExternally
      onOpenInNewTab={vi.fn()}
      onRetryWithProxy={vi.fn()}
    />
  );
}

beforeEach(() => {
  useDeviceStore.getState().resetDevice();
});

afterEach(() => {
  cleanup();
  useSystemStore.setState({ launchApp: originalLaunchApp });
  useDeviceStore.getState().resetDevice();
});

describe("BrowserFallbackPanel offline page", () => {
  it("says there is no internet and why", () => {
    renderOffline("airplane");

    expect(screen.getByRole("heading", { name: "No internet" })).toBeTruthy();
    expect(screen.getByText("Airplane mode is on")).toBeTruthy();
    expect(screen.getByText(URL)).toBeTruthy();
  });

  it("turns airplane mode off from the page", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    renderOffline("airplane");

    fireEvent.click(screen.getByRole("button", { name: "Turn off airplane mode" }));
    expect(useDeviceStore.getState().airplaneMode).toBe(false);
    expect(useDeviceStore.getState().wifiEnabled).toBe(true);
  });

  it("turns Wi-Fi back on from the page", () => {
    useDeviceStore.getState().setWifiEnabled(false);
    renderOffline("wifi-off");

    fireEvent.click(screen.getByRole("button", { name: "Turn Wi-Fi on" }));
    expect(useDeviceStore.getState().wifiEnabled).toBe(true);
  });

  it("offers only the network settings in a real outage", () => {
    renderOffline("no-internet");

    expect(screen.queryByRole("button", { name: "Turn Wi-Fi on" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Turn off airplane mode" })).toBeNull();
    expect(screen.getByRole("button", { name: "Network settings" })).toBeTruthy();
  });

  it("opens the Network settings page", () => {
    const launchApp = vi.fn();
    useSystemStore.setState({ launchApp });
    renderOffline("wifi-off");

    fireEvent.click(screen.getByRole("button", { name: "Network settings" }));
    expect(launchApp).toHaveBeenCalledWith({ appId: "settings", payload: { section: "network" } });
  });

  it("does not offer to open the site elsewhere while offline", () => {
    renderOffline("airplane");
    expect(screen.queryByRole("button", { name: "Open in your browser" })).toBeNull();
  });

  it("keeps the usual page for a site that refuses to embed", () => {
    render(
      <BrowserFallbackPanel
        fallback={{ title: "Blocked", url: "https://example.com", message: "Refused" }}
        canOpenExternally
        onOpenInNewTab={vi.fn()}
        onRetryWithProxy={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Open in your browser" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Network settings" })).toBeNull();
  });
});
