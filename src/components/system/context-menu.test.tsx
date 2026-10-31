// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu } from "@/components/system/context-menu";
import type { ContextMenuState } from "@/types/system";

afterEach(cleanup);

function menu(onSelect = vi.fn()): ContextMenuState {
  return {
    x: 10,
    y: 10,
    title: "Item",
    actions: [
      { id: "open", label: "Open", onSelect },
      { id: "off", label: "Off", disabled: true, onSelect },
      { id: "copy", label: "Copy", onSelect },
      { id: "rename", label: "Rename", onSelect },
    ],
  } as ContextMenuState;
}

describe("context menu keyboard", () => {
  it("focuses the first enabled item and skips disabled ones with the arrows", () => {
    render(<ContextMenu menu={menu()} onClose={() => {}} />);
    const list = screen.getByRole("menu");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Open" }));
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy" }));
    fireEvent.keyDown(list, { key: "ArrowUp" });
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.keyDown(list, { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Open" }));
  });

  it("jumps by first letter and closes on Escape or Tab", () => {
    const onClose = vi.fn();
    render(<ContextMenu menu={menu()} onClose={onClose} />);
    const list = screen.getByRole("menu");
    fireEvent.keyDown(list, { key: "r" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(list, { key: "Tab" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("hands focus back to the opener when it closes", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(<ContextMenu menu={menu()} onClose={() => {}} />);
    expect(document.activeElement).not.toBe(opener);
    unmount();
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });
});
