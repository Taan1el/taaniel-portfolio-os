import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextStopApp } from "./next-stop-app";
import { useWindowStore } from "@/stores/window-store";
import type { NextStopRuntime } from "@/lib/next-stop";
import type { AppWindow } from "@/types/system";

const appWindow: AppWindow = { id: "next-stop-test", processId: "game-process", appId: "next-stop", title: "Next Stop", x: 0, y: 0, width: 900, height: 700, minimized: false, maximized: false, focused: true, zIndex: 1, createdAt: 0, processStatus: "focused" };
const save = { world: { seed: "MID-JOURNEY" }, time: 81 };
function runtime(started: boolean): NextStopRuntime {
  return { started, running: started, destroyed: false, watching: false, raf: 1, previous: 0, soundVolume: .5, soundMuted: true, tick: vi.fn(), syncAudio: vi.fn(), serialize: vi.fn(() => save), restore: vi.fn(), openMenu: vi.fn(), stopWatching: vi.fn(), destroy: vi.fn() };
}
function frame(game: NextStopRuntime) {
  return { nextStopGame: game, document: document.implementation.createHTMLDocument(), requestAnimationFrame: vi.fn(() => 1), cancelAnimationFrame: vi.fn() } as unknown as Window;
}
beforeEach(() => useWindowStore.setState({ windows: [appWindow], activeWindowId: appWindow.id }));
afterEach(() => { cleanup(); useWindowStore.setState({ windows: [], activeWindowId: null }); vi.restoreAllMocks(); });

describe("Next Stop component persistence", () => {
  it("keeps a minimized journey through StrictMode cleanup before the frame loads", () => {
    const first = runtime(true);
    const contentWindow = vi.spyOn(HTMLIFrameElement.prototype, "contentWindow", "get").mockReturnValue(frame(first));
    const opened = render(<NextStopApp window={appWindow} />);
    fireEvent.load(opened.container.querySelector("iframe")!);
    act(() => useWindowStore.setState({ windows: [{ ...appWindow, minimized: true }], activeWindowId: null }));
    opened.unmount();
    const restored = runtime(false);
    restored.ensureAudio = vi.fn(() => true);
    const restoredFrame = frame(restored);
    contentWindow.mockReturnValue(restoredFrame);
    act(() => useWindowStore.setState({ windows: [appWindow], activeWindowId: appWindow.id }));
    const reopened = render(<StrictMode><NextStopApp window={appWindow} /></StrictMode>);
    fireEvent.load(reopened.container.querySelector("iframe")!);
    expect(restored.restore).toHaveBeenCalledExactlyOnceWith(save);
    expect(restored.openMenu).toHaveBeenCalledWith("pause");
    expect(first.destroy).toHaveBeenCalledTimes(1);
    act(() => restoredFrame.document.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(restored.ensureAudio).toHaveBeenCalledTimes(1);
  });
});
