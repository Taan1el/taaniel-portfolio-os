// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ShortcutCheatsheet } from "@/components/system/shortcut-cheatsheet";
import { TERMINAL_SHORTCUTS } from "@/lib/terminal-keys";

afterEach(cleanup);

describe("shortcut cheatsheet", () => {
  it("has a Terminal group with every terminal shortcut, including the way out of the keyboard trap", async () => {
    render(<ShortcutCheatsheet open onClose={vi.fn()} />);
    const heading = await screen.findByRole("heading", { name: "Terminal" });
    const group = heading.closest("section") as HTMLElement;

    for (const shortcut of TERMINAL_SHORTCUTS) {
      expect(within(group).getByText(shortcut.label)).toBeTruthy();
    }
    expect(within(group).getByText(/Move focus out of the terminal/)).toBeTruthy();
    expect(within(group).getByText("F6")).toBeTruthy();
  });

  it("does not advertise Ctrl+Shift+W, which browsers keep for closing the window", async () => {
    render(<ShortcutCheatsheet open onClose={vi.fn()} />);
    const heading = await screen.findByRole("heading", { name: "Terminal" });
    expect((heading.closest("section") as HTMLElement).textContent).not.toMatch(/Shift\s*\+?\s*W\b/);
  });
});
