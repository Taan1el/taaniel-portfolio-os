// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  armFileDrag,
  cancelFileDrag,
  configureDragEnvironment,
  isFileDragActive,
  SPRING_OPEN_MS,
  TASKBAR_HOVER_MS,
  TOUCH_HOLD_MS,
} from "@/lib/dnd/controller";
import { folderDropProps, taskbarDropProps } from "@/lib/dnd/dom";
import { useDragStore } from "@/lib/dnd/drag-store";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path.split("/").filter(Boolean).at(-1) ?? "/",
  createdAt: 1,
  updatedAt: 1,
});
const file = (path: string): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").filter(Boolean).at(-1) ?? path,
  extension: "txt",
  mimeType: "text/plain",
  content: "",
  createdAt: 1,
  updatedAt: 1,
});

const nodes: FileSystemRecord = Object.fromEntries(
  [dir("/"), dir("/Desktop"), dir("/Documents"), file("/Desktop/todo.txt")].map((node) => [node.path, node])
);

const env = {
  getNodes: () => nodes,
  explorerPathOf: vi.fn(),
  transfer: vi.fn(),
  openWith: vi.fn(),
  springOpen: vi.fn(),
  activateWindow: vi.fn(),
  reposition: vi.fn(),
  chooseOperation: vi.fn(),
};

let underPointer: Element[] = [];
let restoreEnvironment = () => {};

function zone(props: Record<string, string | undefined>) {
  const element = document.createElement("div");
  Object.entries(props).forEach(([name, value]) => {
    if (value !== undefined) element.setAttribute(name, value);
  });
  document.body.append(element);
  return element;
}

function pointer(type: string, init: PointerEventInit = {}) {
  window.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, pointerType: "mouse", buttons: 1, clientX: 10, clientY: 10, ...init, bubbles: true })
  );
}

function press(options: { button?: number; pointerType?: string; items?: string[] } = {}) {
  armFileDrag({
    event: {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pointerType: options.pointerType ?? "mouse",
      button: options.button ?? 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
    },
    items: (options.items ?? ["/Desktop/todo.txt"]).map((path) => ({ id: path, path })),
    origin: "explorer",
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(env).forEach((fn) => typeof fn === "function" && "mockReset" in fn && fn.mockReset());
  restoreEnvironment = configureDragEnvironment(env);
  underPointer = [];
  Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => underPointer });
});

afterEach(() => {
  cancelFileDrag();
  restoreEnvironment();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("mouse drags", () => {
  it("waits for a few pixels of movement before it is a drag", () => {
    press();
    pointer("pointermove", { clientX: 12, clientY: 11 });
    expect(isFileDragActive()).toBe(false);

    pointer("pointermove", { clientX: 30, clientY: 10 });
    expect(isFileDragActive()).toBe(true);
    expect(document.body.classList.contains("is-file-dragging")).toBe(true);
    expect(useDragStore.getState().session?.items).toEqual([{ id: "/Desktop/todo.txt", path: "/Desktop/todo.txt" }]);
  });

  it("moves into the folder under the pointer on release", () => {
    const target = zone(folderDropProps("/Documents"));
    underPointer = [target];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    expect(target.getAttribute("data-drop-active")).toBe("true");
    expect(useDragStore.getState().session?.plan).toMatchObject({ kind: "transfer", label: "Move to Documents" });

    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0 });
    expect(env.transfer).toHaveBeenCalledWith(["/Desktop/todo.txt"], "/Documents", "move", { x: 40, y: 40 });
    expect(target.hasAttribute("data-drop-active")).toBe(false);
    expect(isFileDragActive()).toBe(false);
    expect(useDragStore.getState().session).toBeNull();
    expect(document.body.classList.contains("is-file-dragging")).toBe(false);
  });

  it("copies when Ctrl is held on release", () => {
    underPointer = [zone(folderDropProps("/Documents"))];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0, ctrlKey: true });

    expect(env.transfer).toHaveBeenCalledWith(["/Desktop/todo.txt"], "/Documents", "copy", expect.anything());
  });

  it("switches to creating links when Alt goes down mid-drag", () => {
    underPointer = [zone(folderDropProps("/Documents"))];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt", altKey: true, bubbles: true }));

    expect(useDragStore.getState().session?.plan).toMatchObject({ operation: "link", label: "Create link in Documents" });
  });

  it("does nothing on release over empty space", () => {
    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0 });

    expect(env.transfer).not.toHaveBeenCalled();
    expect(env.openWith).not.toHaveBeenCalled();
  });

  it("is cancelled by Escape and drops nothing", () => {
    underPointer = [zone(folderDropProps("/Documents"))];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0 });

    expect(isFileDragActive()).toBe(false);
    expect(env.transfer).not.toHaveBeenCalled();
  });

  it("a press that never moves is just a click", () => {
    press();
    pointer("pointerup", { buttons: 0 });

    expect(isFileDragActive()).toBe(false);
    expect(env.transfer).not.toHaveBeenCalled();
  });

  it("gives up when the button was released outside the window", () => {
    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    pointer("pointermove", { clientX: 50, clientY: 40, buttons: 0 });

    expect(isFileDragActive()).toBe(false);
  });
});

describe("right-button drags", () => {
  it("asks what to do instead of acting", () => {
    underPointer = [zone(folderDropProps("/Documents"))];

    press({ button: 2 });
    pointer("pointermove", { clientX: 40, clientY: 40, buttons: 2 });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0, button: 2 });

    expect(env.transfer).not.toHaveBeenCalled();
    expect(env.chooseOperation).toHaveBeenCalledWith({
      x: 40,
      y: 40,
      destination: "/Documents",
      paths: ["/Desktop/todo.txt"],
    });
  });

  it("swallows the context menu the browser opens on release", () => {
    underPointer = [zone(folderDropProps("/Documents"))];
    const listener = vi.fn();
    window.addEventListener("contextmenu", listener);

    press({ button: 2 });
    pointer("pointermove", { clientX: 40, clientY: 40, buttons: 2 });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0, button: 2 });
    document.body.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener("contextmenu", listener);
  });
});

describe("touch drags", () => {
  it("start after a long press", () => {
    underPointer = [zone(folderDropProps("/Documents"))];

    press({ pointerType: "touch" });
    expect(isFileDragActive()).toBe(false);

    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10);
    expect(isFileDragActive()).toBe(true);

    pointer("pointermove", { pointerType: "touch", clientX: 60, clientY: 60 });
    pointer("pointerup", { pointerType: "touch", clientX: 60, clientY: 60, buttons: 0 });
    expect(env.transfer).toHaveBeenCalledWith(["/Desktop/todo.txt"], "/Documents", "move", expect.anything());
  });

  it("leave scrolling alone when the finger moves first", () => {
    press({ pointerType: "touch" });
    pointer("pointermove", { pointerType: "touch", clientX: 10, clientY: 80 });
    vi.advanceTimersByTime(TOUCH_HOLD_MS + 10);

    expect(isFileDragActive()).toBe(false);
  });
});

describe("hover actions", () => {
  it("brings a window forward after hovering its taskbar button", () => {
    underPointer = [zone(taskbarDropProps("window-7"))];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    vi.advanceTimersByTime(TASKBAR_HOVER_MS - 50);
    expect(env.activateWindow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(80);
    expect(env.activateWindow).toHaveBeenCalledWith("window-7");
  });

  it("forgets the hover when the pointer moves to something else", () => {
    const taskbar = zone(taskbarDropProps("window-7"));
    const folder = zone(folderDropProps("/Documents"));
    underPointer = [taskbar];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    underPointer = [folder];
    pointer("pointermove", { clientX: 44, clientY: 44 });
    vi.advanceTimersByTime(32);
    vi.advanceTimersByTime(TASKBAR_HOVER_MS + 100);

    expect(env.activateWindow).not.toHaveBeenCalled();
  });

  it("opens a spring-loaded folder in its Explorer window after a second", () => {
    underPointer = [zone(folderDropProps("/Documents", { windowId: "files-2", spring: true }))];

    press();
    pointer("pointermove", { clientX: 40, clientY: 40 });
    vi.advanceTimersByTime(SPRING_OPEN_MS + 20);

    expect(env.springOpen).toHaveBeenCalledWith("files-2", "/Documents");
  });
});

describe("open with", () => {
  it("opens the file in the window it was dropped on", () => {
    nodes["/Desktop/pic.png"] = { ...file("/Desktop/pic.png"), extension: "png", mimeType: "image/png" };
    underPointer = [zone({ "data-drop-window-id": "w1", "data-drop-window-app": "photos" })];

    press({ items: ["/Desktop/pic.png"] });
    pointer("pointermove", { clientX: 40, clientY: 40 });
    pointer("pointerup", { clientX: 40, clientY: 40, buttons: 0 });

    expect(env.openWith).toHaveBeenCalledWith({ appId: "photos", windowId: "w1", paths: ["/Desktop/pic.png"] });
    delete nodes["/Desktop/pic.png"];
  });
});
