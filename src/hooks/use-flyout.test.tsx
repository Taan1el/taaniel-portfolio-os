// @vitest-environment jsdom
import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFlyout } from "@/hooks/use-flyout";
import { msUntilNextMinute, useMinuteClock } from "@/hooks/use-minute-clock";

function FlyoutHarness() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFlyout({ open, triggerId: "test", panelRef, onClose: () => setOpen(false) });

  return (
    <div>
      <button type="button" data-flyout-trigger="test" onClick={() => setOpen((value) => !value)}>
        Trigger
      </button>
      <button type="button">Elsewhere</button>
      {open ? (
        <div ref={panelRef} role="dialog" aria-label="Panel">
          <button type="button">First</button>
          <button type="button">Last</button>
        </div>
      ) : null}
    </div>
  );
}

async function openHarness() {
  render(<FlyoutHarness />);
  fireEvent.click(screen.getByText("Trigger"));
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("useFlyout", () => {
  afterEach(cleanup);

  it("moves focus in and returns it to the trigger on Escape", async () => {
    await openHarness();
    expect(document.activeElement).toBe(screen.getByText("First"));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Trigger"));
  });

  it("keeps Tab inside the panel", async () => {
    await openHarness();
    screen.getByText("Last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("First"));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText("Last"));
  });

  it("closes on a press outside but not on the trigger", async () => {
    await openHarness();
    fireEvent.pointerDown(screen.getByText("Trigger"));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

function ClockHarness() {
  const now = useMinuteClock();
  return <span>{now.toISOString()}</span>;
}

describe("useMinuteClock", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("waits for the next whole minute", () => {
    expect(msUntilNextMinute(Date.UTC(2026, 9, 16, 8, 0, 45))).toBe(15_000);
    expect(msUntilNextMinute(Date.UTC(2026, 9, 16, 8, 0, 0))).toBe(60_000);
  });

  it("ticks on minute boundaries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 16, 8, 0, 50)));
    render(<ClockHarness />);
    expect(screen.getByText("2026-10-16T08:00:50.000Z")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("2026-10-16T08:01:00.000Z")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("2026-10-16T08:02:00.000Z")).toBeTruthy();
  });
});
