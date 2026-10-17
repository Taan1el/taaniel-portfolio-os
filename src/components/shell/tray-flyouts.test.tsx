// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrayFlyouts } from "@/components/shell/tray-flyouts";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useWindowStore } from "@/stores/window-store";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

function renderTray() {
  render(
    <>
      <button type="button" data-flyout-trigger="quick-settings">
        Quick settings button
      </button>
      <button type="button" data-flyout-trigger="clock">
        Clock button
      </button>
      <TrayFlyouts />
    </>
  );
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

beforeEach(() => {
  useShellStore.getState().closeOverlays();
});

afterEach(() => {
  cleanup();
  useShellStore.getState().closeOverlays();
  useProcessStore.setState({ processes: [] });
  useWindowStore.setState({ windows: [], activeWindowId: null, nextZ: 2 });
});

describe("TrayFlyouts", () => {
  it("opens Settings on the right page and keeps keyboard focus on the tray button", async () => {
    renderTray();
    act(() => useShellStore.getState().setQuickSettingsOpen(true));
    await flushFrame();

    const sound = screen.getByRole("button", { name: "Sound settings" });
    sound.focus();
    fireEvent.click(sound);

    expect(useShellStore.getState().quickSettingsOpen).toBe(false);
    expect(useProcessStore.getState().processes[0]?.launchPayload).toMatchObject({ section: "sound" });
    // The panel is still fading out here, but focus has already left it.
    expect(document.activeElement).toBe(screen.getByText("Quick settings button"));
  });

  it("does the same from the clock flyout", async () => {
    renderTray();
    act(() => useShellStore.getState().setCalendarOpen(true));
    await flushFrame();

    const settings = screen.getByRole("button", { name: /Date and time settings/ });
    settings.focus();
    fireEvent.click(settings);

    expect(useShellStore.getState().calendarOpen).toBe(false);
    expect(useProcessStore.getState().processes[0]?.launchPayload).toMatchObject({ section: "time" });
    expect(document.activeElement).toBe(screen.getByText("Clock button"));
  });
});
