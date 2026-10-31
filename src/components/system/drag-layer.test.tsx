// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { DragLayer } from "@/components/system/drag-layer";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { armFileDrag, cancelFileDrag } from "@/lib/dnd/controller";
import { registerDesktopPlacement } from "@/lib/dnd/desktop-placement";
import { folderDropProps } from "@/lib/dnd/dom";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const nodes = () => useFileSystemStore.getState().nodes;

function pointer(type: string, init: PointerEventInit = {}) {
  act(() => {
    window.dispatchEvent(
      new PointerEvent(type, { pointerId: 5, pointerType: "mouse", buttons: 1, clientX: 20, clientY: 20, ...init, bubbles: true })
    );
  });
}

/** Drag items from Explorer and release over `target`, as a mouse would. */
function dragOnto(target: Element, paths: string[], button = 0) {
  Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => [target] });
  act(() => {
    armFileDrag({
      event: { clientX: 20, clientY: 20, pointerId: 5, pointerType: "mouse", button, ctrlKey: false, shiftKey: false, altKey: false },
      items: paths.map((path) => ({ id: path, path })),
      origin: "explorer",
    });
  });
  pointer("pointermove", { clientX: 60, clientY: 50, buttons: button === 2 ? 2 : 1 });
  pointer("pointerup", { clientX: 60, clientY: 50, buttons: 0, button });
}

function zone(props: Record<string, string | undefined>) {
  const element = document.createElement("div");
  Object.entries(props).forEach(([name, value]) => {
    if (value !== undefined) element.setAttribute(name, value);
  });
  document.body.append(element);
  return element;
}

beforeEach(async () => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  useShellStore.setState({ selectedIconId: null, selectedIconIds: [], contextMenu: null });
  await useFileSystemStore.getState().writeFile("/Documents/one.txt", "1", { mimeType: "text/plain", extension: "txt" });
  await useFileSystemStore.getState().writeFile("/Documents/two.txt", "2", { mimeType: "text/plain", extension: "txt" });
});

afterEach(() => {
  cancelFileDrag();
  cleanup();
  document.body.innerHTML = "";
});

describe("the menu a right-button drag opens", () => {
  const entries = () =>
    (useShellStore.getState().contextMenu?.actions ?? [])
      .filter((action) => !action.separator)
      .map((action) => [action.label, Boolean(action.disabled)]);

  it("lists Move here, Copy here, Create shortcuts here and Cancel, and does what is picked", async () => {
    render(<DragLayer />);

    dragOnto(zone(folderDropProps("/Desktop", { windowId: "files-1" })), ["/Documents/one.txt"], 2);

    expect(entries()).toEqual([
      ["Move here", false],
      ["Copy here", false],
      ["Create shortcuts here", false],
      ["Cancel", false],
    ]);
    // Nothing happens until an entry is chosen.
    expect(nodes()["/Desktop/one.txt"]).toBeUndefined();

    act(() => useShellStore.getState().contextMenu?.actions.find((action) => action.id === "copy-here")?.onSelect());

    await waitFor(() => expect(nodes()["/Desktop/one.txt"]).toBeTruthy());
    expect(nodes()["/Documents/one.txt"]).toBeTruthy();
  });

  it("dims Move here on the folder the file is already in and offers the copy", async () => {
    render(<DragLayer />);

    dragOnto(zone(folderDropProps("/Documents", { windowId: "files-1" })), ["/Documents/two.txt"], 2);

    expect(entries()).toEqual([
      ["Move here", true],
      ["Copy here", false],
      ["Create shortcuts here", false],
      ["Cancel", false],
    ]);

    act(() => useShellStore.getState().contextMenu?.actions.find((action) => action.id === "copy-here")?.onSelect());

    await waitFor(() => expect(Object.keys(nodes()).filter((path) => path.startsWith("/Documents/two"))).toHaveLength(2));
  });

  it("offers just Move here and Cancel on the Recycle Bin", async () => {
    render(<DragLayer />);

    dragOnto(zone(folderDropProps("/Trash")), ["/Documents/one.txt"], 2);

    expect(entries()).toEqual([
      ["Move here", false],
      ["Cancel", false],
    ]);

    act(() => useShellStore.getState().contextMenu?.actions.find((action) => action.id === "move-here")?.onSelect());

    await waitFor(() => expect(nodes()["/Trash/one.txt"]).toBeTruthy());
    expect(nodes()["/Trash/one.txt"]).toMatchObject({ originalPath: "/Documents/one.txt" });
  });
});

describe("where files dropped on the Desktop folder land", () => {
  it("takes the cell under the pointer when dropped on the desktop itself, and selects them", async () => {
    const placed = vi.fn();
    const unregister = registerDesktopPlacement(placed);
    render(<DragLayer />);

    dragOnto(zone(folderDropProps("/Desktop", { surface: "desktop" })), ["/Documents/one.txt"]);

    await waitFor(() => expect(nodes()["/Desktop/one.txt"]).toBeTruthy());
    expect(placed).toHaveBeenCalledWith(["/Desktop/one.txt"], { x: 60, y: 50 });
    expect(useShellStore.getState().selectedIconIds).toEqual(["desktop-node:/Desktop/one.txt"]);
    unregister();
  });

  it("takes the first free cell when dropped on Explorer's Desktop folder, sidebar or breadcrumb", async () => {
    const placed = vi.fn();
    const unregister = registerDesktopPlacement(placed);
    render(<DragLayer />);

    dragOnto(zone(folderDropProps("/Desktop", { windowId: "files-1" })), ["/Documents/two.txt"]);

    await waitFor(() => expect(nodes()["/Desktop/two.txt"]).toBeTruthy());
    expect(placed).not.toHaveBeenCalled();
    expect(useShellStore.getState().selectedIconIds).toEqual([]);
    unregister();
  });
});
