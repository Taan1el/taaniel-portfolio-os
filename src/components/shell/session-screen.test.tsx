// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionScreen } from "@/components/shell/session-screen";
import { useSessionScreenStore } from "@/stores/session-screen-store";

function renderScreen() {
  return render(
    <MemoryRouter>
      <SessionScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  useSessionScreenStore.setState({ screen: "boot" });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("session screen", () => {
  it("boots, then waits on the lock screen", () => {
    renderScreen();
    expect(screen.getByRole("status", { name: /starting/ })).toBeTruthy();
    act(() => void vi.advanceTimersByTime(1700));
    expect(useSessionScreenStore.getState().screen).toBe("lock");
  });

  it("signs in on any key, remembers the session and starts the tips once", () => {
    useSessionScreenStore.setState({ screen: "lock" });
    const tips = vi.fn();
    window.addEventListener("portfolio:landing-dismissed", tips);
    renderScreen();
    expect(screen.getByRole("dialog", { name: "Lock screen" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    expect(useSessionScreenStore.getState().screen).toBe("desktop");
    expect(sessionStorage.getItem("taaniel-os-session-started")).toBe("1");
    expect(tips).toHaveBeenCalledTimes(1);
    window.removeEventListener("portfolio:landing-dismissed", tips);
  });

  it("lets Tab reach the plain portfolio link without signing in", () => {
    useSessionScreenStore.setState({ screen: "lock" });
    renderScreen();
    fireEvent.keyDown(window, { key: "Tab" });
    fireEvent.keyDown(window, { key: "Shift" });
    expect(useSessionScreenStore.getState().screen).toBe("lock");
    expect(screen.getByRole("button", { name: "View the plain portfolio" })).toBeTruthy();
  });

  it("locks and restarts on request", () => {
    useSessionScreenStore.setState({ screen: "desktop" });
    useSessionScreenStore.getState().lock();
    expect(useSessionScreenStore.getState().screen).toBe("lock");
    useSessionScreenStore.getState().restart();
    expect(useSessionScreenStore.getState().screen).toBe("boot");
  });
});
