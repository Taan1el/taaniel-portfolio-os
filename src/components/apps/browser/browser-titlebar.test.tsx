// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Browser } from "@/components/apps/browser/Browser";
import { TitlebarSlotContext } from "@/components/shell/titlebar-slot";
import type { AppWindow } from "@/types/system";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const browserWindow: AppWindow = {
  id: "window-browser",
  processId: "process-browser",
  appId: "browser",
  title: "Browser",
  processStatus: "focused",
  x: 0,
  y: 0,
  width: 940,
  height: 660,
  minimized: false,
  maximized: false,
  focused: true,
  zIndex: 3,
  createdAt: 1,
};

afterEach(cleanup);

describe("Browser tab strip placement", () => {
  it("renders the tabs inline when there is no title bar to draw in", () => {
    const { container } = render(<Browser window={browserWindow} />);
    expect(container.querySelector(".w11-browser [role='tablist']")).not.toBeNull();
  });

  it("moves the tabs into the window title bar and keeps them working there", () => {
    const slot = document.createElement("div");
    document.body.append(slot);

    const { container } = render(
      <TitlebarSlotContext.Provider value={slot}>
        <Browser window={browserWindow} />
      </TitlebarSlotContext.Provider>
    );

    expect(container.querySelector("[role='tablist']")).toBeNull();
    const strip = within(slot).getByRole("tablist");
    expect(within(strip).getAllByRole("tab")).toHaveLength(1);

    fireEvent.click(within(strip).getByRole("button", { name: "New tab" }));
    expect(within(strip).getAllByRole("tab")).toHaveLength(2);

    // Shortcuts pressed on a tab still reach the browser through the portal.
    fireEvent.keyDown(screen.getAllByRole("tab")[1], { key: "w", ctrlKey: true });
    expect(within(strip).getAllByRole("tab")).toHaveLength(1);

    slot.remove();
  });
});
