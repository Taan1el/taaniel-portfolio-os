// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransferDialog } from "@/components/system/transfer-dialog";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useTransferDialogStore } from "@/stores/transfer-dialog-store";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const nodes = () => useFileSystemStore.getState().nodes;
const open = (paths: string[], operation: "move" | "copy") => act(() => useTransferDialogStore.getState().open(paths, operation));

beforeEach(async () => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  await useFileSystemStore.getState().writeFile("/Desktop/note.txt", "hello", { mimeType: "text/plain", extension: "txt" });
  useTransferDialogStore.getState().close();
});

afterEach(() => {
  cleanup();
});

describe("Move to… and Copy to…", () => {
  it("names the item and the action, and offers the folders as a list", () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "move");

    expect(screen.getByRole("dialog", { name: 'Move "note.txt" to…' })).toBeTruthy();
    const folders = screen.getAllByRole("option").map((option) => option.textContent);
    expect(folders).toEqual(expect.arrayContaining(["Taaniel", "Desktop", "Documents", "Notes"]));
    expect(folders).not.toContain("Trash");
  });

  it("names a shortcut without its .lnk", () => {
    render(<TransferDialog />);
    open(["/Desktop/About.lnk"], "copy");

    expect(screen.getByRole("dialog", { name: 'Copy "About" to…' })).toBeTruthy();
  });

  it("disables the folder the item is already in when moving, but not when copying", () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "move");
    expect(screen.getByRole("option", { name: "Desktop" }).getAttribute("aria-disabled")).toBe("true");

    act(() => useTransferDialogStore.getState().close());
    open(["/Desktop/note.txt"], "copy");
    expect(screen.getByRole("option", { name: "Desktop" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("moves the item into the chosen folder", async () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "move");

    fireEvent.click(screen.getByRole("option", { name: "Documents" }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(nodes()["/Documents/note.txt"]).toBeTruthy());
    expect(nodes()["/Desktop/note.txt"]).toBeUndefined();
    // The title keeps naming the item while the dialog fades out.
    expect(screen.queryByRole("dialog", { name: /note\.txt/ }) ?? screen.queryByRole("dialog")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("copies with the keyboard: arrows choose, Enter confirms", async () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "copy");

    const selected = () => screen.getAllByRole("option").find((option) => option.getAttribute("aria-selected") === "true");
    // The Desktop is where files usually go from here, so it starts selected.
    expect(selected()?.textContent).toBe("Desktop");

    fireEvent.keyDown(selected() as HTMLElement, { key: "ArrowDown" });
    const chosen = selected()?.textContent;
    expect(chosen).not.toBe("Desktop");

    fireEvent.keyDown(selected() as HTMLElement, { key: "Enter" });

    await waitFor(() => expect(Object.keys(nodes()).filter((path) => path.endsWith("/note.txt")).length).toBe(2));
    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
  });

  it("closes with Escape and leaves everything where it was", () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "move");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(useTransferDialogStore.getState().request).toBeNull();
    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
  });

  it("keeps Tab and Shift+Tab inside the dialog", () => {
    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "copy");

    const selected = screen.getAllByRole("option").find((option) => option.getAttribute("aria-selected") === "true") as HTMLElement;
    const copyButton = screen.getByRole("button", { name: "Copy" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const press = (shiftKey: boolean) => fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab", shiftKey });

    expect(document.activeElement).toBe(selected);
    // The selected option is not the first folder, yet it is the first thing Tab reaches: Shift+Tab must wrap.
    expect(screen.getAllByRole("option")[0]).not.toBe(selected);
    expect(press(true)).toBe(false);
    expect(document.activeElement).toBe(cancelButton);

    expect(press(false)).toBe(false);
    expect(document.activeElement).toBe(selected);

    // Moving inside the dialog is left to the browser.
    selected.focus();
    expect(press(false)).toBe(true);
    copyButton.focus();
    expect(press(false)).toBe(true);
  });

  it("gives the focus back to the item it was about", async () => {
    const item = document.createElement("div");
    item.tabIndex = -1;
    item.dataset.path = "/Desktop/note.txt";
    document.body.append(item);

    render(<TransferDialog />);
    open(["/Desktop/note.txt"], "copy");
    expect(document.activeElement).not.toBe(item);

    act(() => useTransferDialogStore.getState().close());

    await waitFor(() => expect(document.activeElement).toBe(item));
    item.remove();
  });
});
