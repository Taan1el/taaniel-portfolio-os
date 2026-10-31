// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FileExplorerApp } from "@/components/apps/file-explorer-app";
import { DragLayer } from "@/components/system/drag-layer";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { buildDesktopEntries } from "@/lib/desktop-entries";
import { cancelFileDrag } from "@/lib/dnd/controller";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import type { AppWindow } from "@/types/system";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const WINDOW_ID = "window-files";

function buildWindow(directoryPath: string): AppWindow {
  return {
    id: WINDOW_ID,
    processId: "process-files",
    appId: "files",
    title: "File Explorer",
    payload: { directoryPath },
    processStatus: "focused",
    x: 0,
    y: 0,
    width: 900,
    height: 640,
    minimized: false,
    maximized: false,
    focused: true,
    zIndex: 3,
    createdAt: 1,
  };
}

const nodes = () => useFileSystemStore.getState().nodes;
const option = (name: string) => screen.getByRole("option", { name });

function pointer(type: string, init: PointerEventInit = {}) {
  act(() => {
    window.dispatchEvent(
      new PointerEvent(type, { pointerId: 5, pointerType: "mouse", buttons: 1, clientX: 20, clientY: 20, ...init, bubbles: true })
    );
  });
}

/** Drag an Explorer item and drop it on another element, as the pointer would. */
function dragOnto(source: HTMLElement, target: Element, modifiers: PointerEventInit = {}) {
  Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => [target] });
  fireEvent.pointerDown(source, { pointerId: 5, pointerType: "mouse", button: 0, clientX: 20, clientY: 20 });
  pointer("pointermove", { clientX: 40, clientY: 40, ...modifiers });
  pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0, ...modifiers });
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  useExplorerStore.setState({ sessions: {} });
  useShellStore.setState({ clipboard: null, contextMenu: null });
});

afterEach(() => {
  cancelFileDrag();
  cleanup();
});

describe("File Explorer and the Desktop folder", () => {
  it("lists the same items the desktop shows, with shortcut names unchanged", () => {
    render(<FileExplorerApp window={buildWindow("/Desktop")} />);

    const shown = screen.getAllByRole("option").map((item) => item.getAttribute("aria-label"));
    const onDesktop = buildDesktopEntries(nodes())
      .filter((entry) => entry.kind === "node")
      .map((entry) => entry.label);

    expect([...shown].sort()).toEqual([...onDesktop].sort());
    expect(shown).toEqual(expect.arrayContaining(["About", "Resume.pdf", "OS Case Study.md", "Portfolio"]));
  });

  it("calls them shortcuts in Details view", () => {
    render(<FileExplorerApp window={buildWindow("/Desktop")} />);
    act(() => useExplorerStore.getState().setViewMode(WINDOW_ID, "list"));

    const row = screen.getByRole("row", { name: /^Resume\.pdf/ });
    expect(within(row).getByText("Shortcut")).toBeTruthy();
  });

  it("moves focus to the item the arrow keys land on", () => {
    render(<FileExplorerApp window={buildWindow("/Desktop")} />);
    const list = screen.getByRole("listbox");

    fireEvent.keyDown(list, { key: "Home" });
    fireEvent.keyDown(list, { key: "End" });

    const items = screen.getAllByRole("option");
    expect(document.activeElement).toBe(items[items.length - 1]);
    expect(items[items.length - 1].getAttribute("aria-selected")).toBe("true");
  });

  it("opens a focused folder once and keeps the keyboard in the window", () => {
    render(<FileExplorerApp window={buildWindow("/")} />);
    const documents = option("Documents");

    fireEvent.pointerDown(documents, { pointerId: 1, pointerType: "mouse", button: 0 });
    documents.focus();
    fireEvent.keyDown(documents, { key: "Enter" });

    expect(useExplorerStore.getState().sessions[WINDOW_ID].history).toHaveLength(2);
    expect(document.activeElement).toBe(screen.getByRole("region", { name: /Documents folder/ }));
  });

  it("announces the folder and how much is selected", () => {
    render(<FileExplorerApp window={buildWindow("/Desktop")} />);
    const count = screen.getAllByRole("option").length;
    expect(screen.getByRole("status").textContent).toBe(`Desktop, ${count} items`);

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "a", ctrlKey: true });
    expect(screen.getByRole("status").textContent).toBe(`${count} items selected`);
  });

  it("keeps the Recycle Bin out of the profile folder", () => {
    render(<FileExplorerApp window={buildWindow("/")} />);

    const shown = screen.getAllByRole("option").map((item) => item.getAttribute("aria-label"));

    expect(shown).toEqual(expect.arrayContaining(["Desktop", "Documents"]));
    expect(shown).not.toContain("Trash");
    expect(screen.getAllByRole("button", { name: /Recycle Bin/ }).length).toBeGreaterThan(0);
  });

  it("opens a folder by double-clicking it", async () => {
    render(<FileExplorerApp window={buildWindow("/")} />);

    fireEvent.pointerDown(option("Documents"), { pointerId: 1, pointerType: "mouse", button: 0 });
    fireEvent.doubleClick(option("Documents"));

    await waitFor(() => expect(useExplorerStore.getState().sessions[WINDOW_ID].currentPath).toBe("/Documents"));
  });
});

describe("the Recycle Bin in File Explorer", () => {
  beforeEach(async () => {
    await useFileSystemStore.getState().mkdir("/Desktop/Old");
    await useFileSystemStore.getState().writeFile("/Desktop/Old/inner.txt", "hi", { mimeType: "text/plain", extension: "txt" });
    await useFileSystemStore.getState().transferNodes(["/Desktop/Old"], TRASH_PATH, "move", { quiet: true });
  });

  it("gives a deleted folder no drop target and no spring-loading", () => {
    render(<FileExplorerApp window={buildWindow(TRASH_PATH)} />);

    const deleted = option("Old");
    expect(deleted.hasAttribute("data-drop-folder")).toBe(false);
    expect(deleted.hasAttribute("data-drop-spring")).toBe(false);
  });

  it("makes dropping anywhere in a deleted folder's window a drop on the bin", () => {
    render(<FileExplorerApp window={buildWindow(`${TRASH_PATH}/Old`)} />);

    const content = document.querySelector<HTMLElement>(".explorer-window__content") as HTMLElement;
    expect(content.dataset.dropFolder).toBe(TRASH_PATH);
    expect(option("inner.txt").hasAttribute("data-drop-folder")).toBe(false);
  });
});

describe("dragging in File Explorer", () => {
  beforeEach(async () => {
    await useFileSystemStore.getState().mkdir("/Desktop/Folder");
    await useFileSystemStore.getState().writeFile("/Desktop/note.txt", "hello", { mimeType: "text/plain", extension: "txt" });
  });

  it("moves an item into the folder it is dropped on", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );

    dragOnto(option("note.txt"), option("Folder"));

    await waitFor(() => expect(nodes()["/Desktop/Folder/note.txt"]).toBeTruthy());
    expect(nodes()["/Desktop/note.txt"]).toBeUndefined();
  });

  it("copies when Ctrl is held", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );

    dragOnto(option("note.txt"), option("Folder"), { ctrlKey: true });

    await waitFor(() => expect(nodes()["/Desktop/Folder/note.txt"]).toBeTruthy());
    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
  });

  it("makes a shortcut when Alt is held", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );

    dragOnto(option("note.txt"), option("Folder"), { altKey: true });

    await waitFor(() => expect(nodes()["/Desktop/Folder/note.txt - Shortcut.lnk"]).toMatchObject({ shortcut: { type: "path", path: "/Desktop/note.txt" } }));
    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
  });

  it("puts a dropped item in the Recycle Bin with the place it came from", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );
    const bin = screen.getAllByRole("button", { name: /Recycle Bin/ })[0];

    dragOnto(option("note.txt"), bin);

    await waitFor(() => expect(nodes()[`${TRASH_PATH}/note.txt`]).toMatchObject({ originalPath: "/Desktop/note.txt" }));
    expect(nodes()["/Desktop/note.txt"]).toBeUndefined();
  });

  it("does nothing when an item is dropped where it already is", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );
    const content = document.querySelector<HTMLElement>(".explorer-window__content") as HTMLElement;

    dragOnto(option("note.txt"), content);
    await act(async () => {});

    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
    expect(Object.keys(nodes()).filter((path) => path.includes("note.txt"))).toEqual(["/Desktop/note.txt"]);
  });

  it("leaves the item alone when Escape cancels the drag", async () => {
    render(
      <>
        <FileExplorerApp window={buildWindow("/Desktop")} />
        <DragLayer />
      </>
    );

    Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => [option("Folder")] });
    fireEvent.pointerDown(option("note.txt"), { pointerId: 5, pointerType: "mouse", button: 0, clientX: 20, clientY: 20 });
    pointer("pointermove", { clientX: 40, clientY: 40 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0 });
    await act(async () => {});

    expect(nodes()["/Desktop/note.txt"]).toBeTruthy();
    expect(nodes()["/Desktop/Folder/note.txt"]).toBeUndefined();
  });
});
