// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClockFlyout } from "@/components/shell/clock-flyout";
import { useShellStore } from "@/stores/shell-store";

// 16 October 2026 is a Friday.
const NOW = new Date(2026, 9, 16, 10, 42, 31);

async function renderFlyout() {
  const onOpenSettings = vi.fn();
  render(
    <>
      <button type="button" data-flyout-trigger="clock">
        Clock
      </button>
      <ClockFlyout onOpenSettings={onOpenSettings} />
    </>
  );
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });

  return { onOpenSettings };
}

const day = (key: string) => document.querySelector<HTMLButtonElement>(`[data-date="${key}"]`);
const keyDown = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement as Element, { key, ...init });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  useShellStore.setState({ calendarOpen: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useShellStore.setState({ calendarOpen: false });
});

describe("ClockFlyout calendar", () => {
  it("is a labelled dialog with today's date marked", async () => {
    await renderFlyout();
    expect(screen.getByRole("dialog", { name: "Calendar" })).toBeTruthy();

    const marked = document.querySelectorAll('[aria-current="date"]');
    expect(marked).toHaveLength(1);
    expect((marked[0] as HTMLElement).dataset.date).toBe("2026-10-16");
  });

  it("always draws six weeks of days", async () => {
    await renderFlyout();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(document.querySelectorAll("[data-date]")).toHaveLength(42);
  });

  it("starts with focus on today and one tab stop", async () => {
    await renderFlyout();
    expect(document.activeElement).toBe(day("2026-10-16"));
    expect(document.querySelectorAll('[data-date][tabindex="0"]')).toHaveLength(1);
  });

  it("pages through months and returns to today", async () => {
    await renderFlyout();
    const heading = screen.getByRole("heading", { level: 2 });
    const october = heading.textContent;

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(heading.textContent).not.toBe(october);
    expect(day("2026-11-15")?.classList.contains("is-outside")).toBe(false);
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(day("2026-09-15")?.classList.contains("is-outside")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(heading.textContent).toBe(october);
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
    expect(document.activeElement).toBe(day("2026-10-16"));
  });

  it("selects a day and moves to the month of a leading day", async () => {
    await renderFlyout();
    fireEvent.click(day("2026-10-20")!);
    expect(day("2026-10-20")!.closest("td")?.getAttribute("aria-selected")).toBe("true");
    expect(day("2026-10-16")!.closest("td")?.getAttribute("aria-selected")).toBe("false");

    const trailing = [...document.querySelectorAll<HTMLButtonElement>(".is-outside")].find((button) =>
      button.dataset.date?.startsWith("2026-11")
    );
    fireEvent.click(trailing!);
    expect(day("2026-11-15")?.classList.contains("is-outside")).toBe(false);
  });
});

describe("ClockFlyout keyboard", () => {
  it("moves by day and week with the arrow keys", async () => {
    await renderFlyout();

    keyDown("ArrowRight");
    expect(document.activeElement).toBe(day("2026-10-17"));
    keyDown("ArrowDown");
    expect(document.activeElement).toBe(day("2026-10-24"));
    keyDown("ArrowLeft");
    expect(document.activeElement).toBe(day("2026-10-23"));
    keyDown("ArrowUp");
    expect(document.activeElement).toBe(day("2026-10-16"));
  });

  it("crosses into the next month and back", async () => {
    await renderFlyout();
    const heading = screen.getByRole("heading", { level: 2 });
    const october = heading.textContent;

    for (let step = 0; step < 16; step += 1) keyDown("ArrowRight");
    expect(document.activeElement).toBe(day("2026-11-01"));
    expect(heading.textContent).not.toBe(october);

    keyDown("ArrowLeft");
    expect(document.activeElement).toBe(day("2026-10-31"));
    expect(heading.textContent).toBe(october);
  });

  it("pages by month with Page Up and Page Down", async () => {
    await renderFlyout();
    keyDown("PageDown");
    expect(document.activeElement).toBe(day("2026-11-16"));
    keyDown("PageUp");
    keyDown("PageUp");
    expect(document.activeElement).toBe(day("2026-09-16"));
    keyDown("PageDown", { shiftKey: true });
    expect(document.activeElement).toBe(day("2027-09-16"));
  });

  it("jumps to the ends of the week with Home and End", async () => {
    await renderFlyout();
    const first = [...document.querySelectorAll<HTMLButtonElement>("tbody tr")]
      .find((row) => row.querySelector('[data-date="2026-10-16"]'))!
      .querySelectorAll<HTMLButtonElement>("[data-date]");

    keyDown("Home");
    expect(document.activeElement).toBe(first[0]);
    keyDown("End");
    expect(document.activeElement).toBe(first[6]);
  });
});

describe("ClockFlyout behaviour", () => {
  it("closes on Escape and hands focus back to the clock", async () => {
    await renderFlyout();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(useShellStore.getState().calendarOpen).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Clock"));
  });

  it("opens the date and time settings", async () => {
    const { onOpenSettings } = await renderFlyout();
    fireEvent.click(screen.getByRole("button", { name: /Date and time settings/ }));
    expect(onOpenSettings).toHaveBeenCalledWith("time");
  });

  it("shows a ticking clock with the date", async () => {
    await renderFlyout();
    const time = document.querySelector("time");
    expect(time?.getAttribute("datetime")).toBe(NOW.toISOString());
  });
});
