// @vitest-environment jsdom
import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnimatePresence, motion } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFlyout } from "@/hooks/use-flyout";
import { msUntilNextMinute, useMinuteClock } from "@/hooks/use-minute-clock";

function FlyoutHarness({ stopsPointerDown = false }: { stopsPointerDown?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFlyout({ open, triggerId: "test", panelRef, onClose: () => setOpen(false) });

  return (
    <div>
      <button type="button" data-flyout-trigger="test" onClick={() => setOpen((value) => !value)}>
        Trigger
      </button>
      <button type="button" onPointerDown={stopsPointerDown ? (event) => event.stopPropagation() : undefined}>
        Elsewhere
      </button>
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

  it("closes on a press that the pressed element stops from bubbling", async () => {
    render(<FlyoutHarness stopsPointerDown />);
    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByRole("dialog")).toBeTruthy();

    // React forwards a synthetic stopPropagation to the native event, as a desktop icon's handler does.
    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

function PresencePanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFlyout({ open: true, triggerId: "test", panelRef, onClose });

  return (
    <motion.div ref={panelRef} role="dialog" aria-label="Panel" exit={{ opacity: 0 }}>
      <button type="button" onClick={onClose}>
        Action
      </button>
    </motion.div>
  );
}

/** A flyout the way the tray mounts it: through AnimatePresence, so it outlives its close for the exit. */
function PresenceHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" data-flyout-trigger="test" onClick={() => setOpen((value) => !value)}>
        Trigger
      </button>
      <button type="button">Elsewhere</button>
      <AnimatePresence>{open ? <PresencePanel key="panel" onClose={() => setOpen(false)} /> : null}</AnimatePresence>
    </div>
  );
}

describe("useFlyout focus when closed by an action", () => {
  afterEach(cleanup);

  async function openPresenceHarness() {
    render(<PresenceHarness />);
    fireEvent.click(screen.getByText("Trigger"));
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    expect(document.activeElement).toBe(screen.getByText("Action"));
  }

  it("hands focus to the trigger before the panel goes away", async () => {
    await openPresenceHarness();

    // Pressing Enter on a button inside, which closes the flyout as launching an app does.
    fireEvent.click(screen.getByText("Action"));
    expect(document.activeElement).toBe(screen.getByText("Trigger"));
  });

  it("does not pull focus back to the trigger after a press elsewhere", async () => {
    await openPresenceHarness();

    screen.getByText("Elsewhere").focus();
    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(document.activeElement).toBe(screen.getByText("Elsewhere"));
  });

  it("leaves focus alone when it was not inside the panel", async () => {
    await openPresenceHarness();

    screen.getByText("Elsewhere").focus();
    fireEvent.click(screen.getByText("Action"));
    expect(document.activeElement).toBe(screen.getByText("Elsewhere"));
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
