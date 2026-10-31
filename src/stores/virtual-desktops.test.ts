// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_DESKTOPS, desktopOf, useWindowStore } from "@/stores/window-store";

const bounds = { x: 10, y: 10, width: 400, height: 300 };
const store = () => useWindowStore.getState();
const open = (processId: string) => store().openWindow({ processId, title: processId, bounds });
const onDesktop = (id: string) => desktopOf(store().windows.find((entry) => entry.id === id)!);

beforeEach(() => store().resetWindows());

describe("virtual desktops", () => {
  it("opens windows on the desktop on screen and focuses within it", () => {
    const first = open("a");
    store().addDesktop();
    expect(store().activeDesktop).toBe(2);
    expect(store().activeWindowId).toBeNull();
    const second = open("b");
    expect(onDesktop(first)).toBe(1);
    expect(onDesktop(second)).toBe(2);
    store().switchDesktop(1);
    expect(store().activeWindowId).toBe(first);
  });

  it("does not focus another desktop's window when the last one here closes", () => {
    open("a");
    store().addDesktop();
    const here = open("b");
    store().closeWindow(here);
    expect(store().activeWindowId).toBeNull();
  });

  it("follows a window that is brought forward from another desktop", () => {
    const first = open("a");
    store().addDesktop();
    store().bringToFront(first);
    expect(store().activeDesktop).toBe(1);
    expect(store().activeWindowId).toBe(first);
  });

  it("caps the count and moves windows when a desktop closes", () => {
    open("a");
    store().addDesktop();
    const second = open("b");
    store().addDesktop();
    const third = open("c");
    store().addDesktop();
    store().addDesktop();
    expect(store().desktopCount).toBe(MAX_DESKTOPS);
    store().removeDesktop(2);
    expect(store().desktopCount).toBe(3);
    expect(onDesktop(second)).toBe(1);
    expect(onDesktop(third)).toBe(2);
  });

  it("keeps at least one desktop and ignores desktops that do not exist", () => {
    store().removeDesktop(1);
    store().switchDesktop(3);
    expect(store().desktopCount).toBe(1);
    expect(store().activeDesktop).toBe(1);
  });

  it("moves a window away and focuses what is left", () => {
    const first = open("a");
    const second = open("b");
    store().addDesktop();
    store().switchDesktop(1);
    store().moveWindowToDesktop(second, 2);
    expect(onDesktop(second)).toBe(2);
    expect(store().activeWindowId).toBe(first);
  });

  it("show desktop only touches the desktop on screen", () => {
    const first = open("a");
    store().addDesktop();
    const second = open("b");
    store().showDesktop();
    expect(store().windows.find((entry) => entry.id === second)?.minimized).toBe(true);
    expect(store().windows.find((entry) => entry.id === first)?.minimized).toBe(false);
  });

  it("snaps a window and remembers the size to restore", () => {
    const id = open("a");
    store().snapWindow(id, { x: 0, y: 0, width: 600, height: 700 });
    const snapped = store().windows.find((entry) => entry.id === id);
    expect(snapped?.width).toBe(600);
    expect(snapped?.maximized).toBe(false);
    expect(snapped?.restoreBounds?.width).toBe(400);
  });
});
