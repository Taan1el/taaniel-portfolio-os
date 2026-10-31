// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmDialog } from "@/components/system/confirm-dialog";
import { confirmInOs, useConfirmDialogStore } from "@/stores/confirm-dialog-store";

const request = { title: "Delete File", message: 'Are you sure you want to permanently delete "a.txt"?', confirmLabel: "Delete" };

/** Ask, and hold on to what the visitor answers. */
function ask() {
  const answers: boolean[] = [];
  act(() => {
    void confirmInOs(request).then((accepted) => answers.push(accepted));
  });
  return answers;
}

beforeEach(() => {
  useConfirmDialogStore.setState({ request: null });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("the Are you sure? dialog", () => {
  it("is an alert dialog named by its title and described by the question", () => {
    render(<ConfirmDialog />);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    ask();

    const dialog = screen.getByRole("alertdialog", { name: "Delete File" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText(request.message)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  it("puts the focus on Cancel, so a stray Enter deletes nothing", () => {
    render(<ConfirmDialog />);
    ask();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("answers yes from the confirm button and no from Cancel", async () => {
    render(<ConfirmDialog />);

    const accepted = ask();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(accepted).toEqual([true]));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    const declined = ask();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(declined).toEqual([false]));
  });

  it("answers no on Escape, and a click outside the dialog", async () => {
    render(<ConfirmDialog />);

    const escaped = ask();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(escaped).toEqual([false]));
    expect(useConfirmDialogStore.getState().request).toBeNull();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    const clickedOut = ask();
    const overlay = screen.getByRole("alertdialog").parentElement as HTMLElement;
    fireEvent.pointerDown(screen.getByRole("alertdialog"));
    expect(clickedOut).toEqual([]);
    fireEvent.pointerDown(overlay);
    await waitFor(() => expect(clickedOut).toEqual([false]));
  });

  it("gives the focus back to what had it before", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    render(<ConfirmDialog />);
    ask();
    expect(document.activeElement).not.toBe(trigger);

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("falls back to the desktop when what had the focus is gone", async () => {
    const desktop = document.createElement("div");
    desktop.className = "desktop-surface";
    desktop.tabIndex = -1;
    document.body.append(desktop);

    render(<ConfirmDialog />);
    ask();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });

    await waitFor(() => expect(document.activeElement).toBe(desktop));
  });

  it("keeps Tab and Shift+Tab inside the dialog", () => {
    render(<ConfirmDialog />);
    ask();

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const press = (shiftKey: boolean) => fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab", shiftKey });

    expect(document.activeElement).toBe(cancelButton);
    // Past the last button Tab comes round to the first, and Shift+Tab from the first goes to the last.
    expect(press(false)).toBe(false);
    expect(document.activeElement).toBe(confirmButton);
    expect(press(true)).toBe(false);
    expect(document.activeElement).toBe(cancelButton);
    expect(press(true)).toBe(false);
    expect(document.activeElement).toBe(confirmButton);
  });

  it("drops a question that is still open when another is asked", async () => {
    render(<ConfirmDialog />);

    const first = ask();
    const second = ask();

    await waitFor(() => expect(first).toEqual([false]));
    expect(second).toEqual([]);
    await waitFor(() => expect(screen.getAllByRole("alertdialog")).toHaveLength(1));
  });
});
