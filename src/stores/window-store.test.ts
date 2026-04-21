import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowStore } from "@/stores/window-store";

const BOUNDS = { x: 100, y: 100, width: 800, height: 600 };

function openWindow(processId: string, title = "Test Window") {
  return useWindowStore.getState().openWindow({ processId, title, bounds: BOUNDS });
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  useWindowStore.setState({ windows: [], activeWindowId: null, nextZ: 2 });
  vi.restoreAllMocks();
});

describe("window-store", () => {
  it("opens a window and assigns it focus", () => {
    const id = openWindow("proc-1");
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows).toHaveLength(1);
    expect(windows[0].id).toBe(id);
    expect(windows[0].focused).toBe(true);
    expect(activeWindowId).toBe(id);
  });

  it("removes the window and clears activeWindowId when closed", () => {
    const id = openWindow("proc-1");
    useWindowStore.getState().closeWindow(id);
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows).toHaveLength(0);
    expect(activeWindowId).toBeNull();
  });

  it("minimizes the active window and removes focus", () => {
    const id = openWindow("proc-1");
    useWindowStore.getState().minimizeWindow(id);
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows[0].minimized).toBe(true);
    expect(windows[0].focused).toBe(false);
    expect(activeWindowId).toBeNull();
  });

  it("restores and refocuses a minimized window when focusWindow is called", () => {
    const id = openWindow("proc-1");
    useWindowStore.getState().minimizeWindow(id);
    useWindowStore.getState().focusWindow(id);
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows[0].minimized).toBe(false);
    expect(windows[0].focused).toBe(true);
    expect(activeWindowId).toBe(id);
  });

  it("each new window receives a higher z-index than the previous", () => {
    const id1 = openWindow("proc-1", "A");
    const id2 = openWindow("proc-2", "B");
    const { windows, activeWindowId } = useWindowStore.getState();
    const z1 = windows.find((w) => w.id === id1)!.zIndex;
    const z2 = windows.find((w) => w.id === id2)!.zIndex;
    expect(z2).toBeGreaterThan(z1);
    expect(activeWindowId).toBe(id2);
  });

  it("focusing a background window gives it the highest z-index", () => {
    const id1 = openWindow("proc-1", "A");
    const id2 = openWindow("proc-2", "B");
    useWindowStore.getState().focusWindow(id1);
    const { windows, activeWindowId } = useWindowStore.getState();
    const z1 = windows.find((w) => w.id === id1)!.zIndex;
    const z2 = windows.find((w) => w.id === id2)!.zIndex;
    expect(z1).toBeGreaterThan(z2);
    expect(activeWindowId).toBe(id1);
  });

  it("auto-focuses the remaining window after the active one is closed", () => {
    const id1 = openWindow("proc-1", "A");
    const id2 = openWindow("proc-2", "B"); // now active
    useWindowStore.getState().closeWindow(id2);
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows).toHaveLength(1);
    expect(activeWindowId).toBe(id1);
  });

  it("closing a background window does not change the active window", () => {
    const id1 = openWindow("proc-1", "A");
    const id2 = openWindow("proc-2", "B"); // now active
    useWindowStore.getState().closeWindow(id1);
    const { windows, activeWindowId } = useWindowStore.getState();
    expect(windows).toHaveLength(1);
    expect(activeWindowId).toBe(id2);
  });

  it("showDesktop minimizes all windows; restoreDesktop brings them back", () => {
    openWindow("proc-1", "A");
    openWindow("proc-2", "B");
    useWindowStore.getState().showDesktop();
    expect(useWindowStore.getState().windows.every((w) => w.minimized)).toBe(true);
    expect(useWindowStore.getState().activeWindowId).toBeNull();

    useWindowStore.getState().restoreDesktop();
    expect(useWindowStore.getState().windows.every((w) => !w.minimized)).toBe(true);
    expect(useWindowStore.getState().activeWindowId).not.toBeNull();
  });

  it("second showDesktop call restores windows minimized by the first call", () => {
    openWindow("proc-1", "A");
    openWindow("proc-2", "B");
    useWindowStore.getState().showDesktop(); // minimizes all, marks minimizedByShowDesktop=true
    expect(useWindowStore.getState().windows.every((w) => w.minimized)).toBe(true);

    useWindowStore.getState().showDesktop(); // no visible windows → triggers restoreDesktop
    expect(useWindowStore.getState().windows.every((w) => !w.minimized)).toBe(true);
    expect(useWindowStore.getState().activeWindowId).not.toBeNull();
  });

  it("maximize toggles window bounds to full-screen and back", () => {
    const id = openWindow("proc-1");
    const before = useWindowStore.getState().windows[0];
    useWindowStore.getState().maximizeWindow(id, BOUNDS);
    const maximized = useWindowStore.getState().windows[0];
    expect(maximized.maximized).toBe(true);
    expect(maximized.restoreBounds).toBeDefined();

    useWindowStore.getState().maximizeWindow(id);
    const restored = useWindowStore.getState().windows[0];
    expect(restored.maximized).toBe(false);
    expect(restored.width).toBe(before.width);
    expect(restored.height).toBe(before.height);
  });
});
