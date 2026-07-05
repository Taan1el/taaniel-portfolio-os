import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalculatorApp } from "@/components/apps/calculator-app";
import type { AppWindow } from "@/types/system";

function buildWindow(focused: boolean): AppWindow {
  return {
    id: "win-calc",
    processId: "proc-calc",
    appId: "calculator",
    title: "Calculator",
    x: 0,
    y: 0,
    width: 320,
    height: 480,
    zIndex: 1,
    minimized: false,
    maximized: false,
    focused,
    createdAt: Date.now(),
    processStatus: focused ? "focused" : "running",
  } as AppWindow;
}

describe("CalculatorApp keyboard handling", () => {
  it("responds to keyboard input while its window is focused", () => {
    render(<CalculatorApp window={buildWindow(true)} />);

    fireEvent.keyDown(window, { key: "7" });

    expect(screen.getByTitle("7")).toBeTruthy();
  });

  it("ignores keyboard input while another window is focused", () => {
    render(<CalculatorApp window={buildWindow(false)} />);

    fireEvent.keyDown(window, { key: "7" });

    expect(screen.getByTitle("0")).toBeTruthy();
  });
});
