// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DesktopManager } from "@/components/shell/desktop-manager";
import { desktopShortcutSeeds, initialDesktopIconPositions } from "@/data/desktop-seed";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { cancelFileDrag } from "@/lib/dnd/controller";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import type { DesktopEntry } from "@/types/system";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Desktop({ onActivateEntry }: { onActivateEntry: (entry: DesktopEntry) => void }) {
  const nodes = useFileSystemStore((state) => state.nodes);

  return (
    <DesktopManager
      nodes={nodes}
      onActivateEntry={onActivateEntry}
      onDesktopContextMenu={vi.fn()}
      onEntryContextMenu={vi.fn()}
      onImportFiles={vi.fn(async () => {})}
    />
  );
}

const icon = (name: string) => screen.getByRole("option", { name });
const press = (name: string, pointerType = "mouse", init: PointerEventInit = {}) =>
  fireEvent.pointerDown(icon(name), { pointerId: 1, pointerType, button: 0, ...init });

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  useShellStore.setState({
    selectedIconId: null,
    selectedIconIds: [],
    renamingIconId: null,
    clipboard: null,
    desktopIconPositions: { ...initialDesktopIconPositions },
  });
});

afterEach(() => {
  cancelFileDrag();
  cleanup();
  vi.unstubAllGlobals();
});

describe("the desktop", () => {
  it("shows the shortcuts in the Desktop folder, without .lnk, and the Recycle Bin", () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    const labels = screen.getAllByRole("option").map((option) => option.getAttribute("aria-label"));

    expect(labels).toHaveLength(desktopShortcutSeeds.length + 1);
    expect(labels).toEqual(
      expect.arrayContaining(["About", "Projects", "Contact", "Resume.pdf", "OS Case Study.md", "Photos", "Browser", "Portfolio", "Recycle Bin"])
    );
    expect(labels.some((label) => label?.endsWith(".lnk"))).toBe(false);
  });

  it("takes drops on the Recycle Bin, on folders and on app shortcuts only", async () => {
    await useFileSystemStore.getState().mkdir("/Desktop/Stuff");
    render(<Desktop onActivateEntry={vi.fn()} />);

    expect(icon("Recycle Bin").getAttribute("data-drop-folder")).toBe(TRASH_PATH);
    expect(icon("Stuff").getAttribute("data-drop-folder")).toBe("/Desktop/Stuff");
    expect(icon("Photos").getAttribute("data-drop-app")).toBe("photos");
    expect(icon("Resume.pdf").hasAttribute("data-drop-folder")).toBe(false);
    expect(icon("Resume.pdf").hasAttribute("data-drop-app")).toBe(false);
  });

  it("selects on a mouse click and opens on a double-click", () => {
    const onActivate = vi.fn();
    render(<Desktop onActivateEntry={onActivate} />);

    press("About");
    fireEvent.click(icon("About"));

    expect(icon("About").getAttribute("aria-selected")).toBe("true");
    expect(onActivate).not.toHaveBeenCalled();

    fireEvent.doubleClick(icon("About"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0]).toMatchObject({ label: "About", path: "/Desktop/About.lnk" });
  });

  it("opens on a single tap with a finger", () => {
    const onActivate = vi.fn();
    render(<Desktop onActivateEntry={onActivate} />);

    press("Photos", "touch");
    fireEvent.click(icon("Photos"));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0]).toMatchObject({ label: "Photos" });
  });

  it("opens the selection with Enter", () => {
    const onActivate = vi.fn();
    render(<Desktop onActivateEntry={onActivate} />);

    press("About");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Desktop" }), { key: "Enter" });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("adds to the selection with Ctrl and selects everything with Ctrl+A", () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    press("About");
    cancelFileDrag();
    press("Contact", "mouse", { ctrlKey: true });

    expect(useShellStore.getState().selectedIconIds).toEqual([
      "desktop-node:/Desktop/About.lnk",
      "desktop-node:/Desktop/Contact.lnk",
    ]);

    fireEvent.keyDown(screen.getByRole("listbox", { name: "Desktop" }), { key: "a", ctrlKey: true });
    expect(useShellStore.getState().selectedIconIds).toHaveLength(desktopShortcutSeeds.length + 1);
  });

  it("clears the selection when the bare desktop is pressed", () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    press("About");
    cancelFileDrag();
    fireEvent.pointerDown(screen.getByRole("listbox", { name: "Desktop" }), { pointerId: 2, pointerType: "mouse", button: 0 });

    expect(useShellStore.getState().selectedIconIds).toEqual([]);
  });

  it("moves the selection to the Recycle Bin with Delete", async () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    press("About");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Desktop" }), { key: "Delete" });

    await waitFor(() => expect(screen.queryByRole("option", { name: "About" })).toBeNull());
    expect(useFileSystemStore.getState().nodes[`${TRASH_PATH}/About.lnk`]).toMatchObject({ originalPath: "/Desktop/About.lnk" });
  });

  it("renames in place with F2 and keeps the shortcut's hidden .lnk and its place", async () => {
    render(<Desktop onActivateEntry={vi.fn()} />);
    const oldId = "desktop-node:/Desktop/About.lnk";
    const place = useShellStore.getState().desktopIconPositions[oldId];

    press("About");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Desktop" }), { key: "F2" });

    const field = (await screen.findByRole("textbox", { name: "Rename" })) as HTMLTextAreaElement;
    expect(field.value).toBe("About");

    fireEvent.change(field, { target: { value: "About me" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() => expect(useFileSystemStore.getState().nodes["/Desktop/About me.lnk"]).toBeTruthy());
    expect(useFileSystemStore.getState().nodes["/Desktop/About.lnk"]).toBeUndefined();
    expect(await screen.findByRole("option", { name: "About me" })).toBeTruthy();
    expect(useShellStore.getState().desktopIconPositions["desktop-node:/Desktop/About me.lnk"]).toEqual(place);
  });

  it("does not offer to rename a protected item or several at once", () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    press("Recycle Bin");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Desktop" }), { key: "F2" });

    expect(useShellStore.getState().renamingIconId).toBeNull();
  });

  it("copies and pastes through the clipboard", async () => {
    render(<Desktop onActivateEntry={vi.fn()} />);

    press("About");
    const desktop = screen.getByRole("listbox", { name: "Desktop" });
    fireEvent.keyDown(desktop, { key: "c", ctrlKey: true });
    expect(useShellStore.getState().clipboard).toMatchObject({ paths: ["/Desktop/About.lnk"], operation: "copy" });

    fireEvent.keyDown(desktop, { key: "v", ctrlKey: true });
    await waitFor(() => expect(screen.getByRole("option", { name: "About - Copy" })).toBeTruthy());
  });
});
