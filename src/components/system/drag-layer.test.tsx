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
