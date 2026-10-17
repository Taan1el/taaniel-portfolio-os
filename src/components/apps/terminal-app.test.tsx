// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

/*
 * The screens are stubbed: xterm is covered by terminal-session.test.ts and the
 * integration test next door. Here the point is the app around them, so the
 * stub records the props each tab gets and lets a test play the part of the
 * shell (an action, a key command, a search result).
 */
const mocks = vi.hoisted(() => ({
  panes: new Map<string, { props: Record<string, any>; cwd: string }>(),
  focus: vi.fn(),
  find: vi.fn(() => true),
  clearSearch: vi.fn(),
  pasteText: vi.fn(),
  copySelection: vi.fn(() => true),
  pasteFromClipboard: vi.fn(async () => {}),
  selectAll: vi.fn(),
  selection: { value: false },
}));

vi.mock("@/components/apps/terminal/terminal-pane", async () => {
  const { useImperativeHandle } = await import("react");
  return {
    TerminalPane: function StubPane(props: Record<string, any>) {
      useImperativeHandle(
        props.ref,
        () => ({
          focus: () => mocks.focus(props.tabId),
          getCwd: () => `/cwd-of-${props.tabId}`,
          find: mocks.find,
          clearSearch: mocks.clearSearch,
          hasSelection: () => mocks.selection.value,
          copySelection: mocks.copySelection,
          selectAll: mocks.selectAll,
          pasteFromClipboard: mocks.pasteFromClipboard,
          pasteText: mocks.pasteText,
          isBusy: () => false,
        }),
        []
      );
      mocks.panes.set(props.tabId, { props, cwd: props.startPath });
      return (
        <div id={props.panelId} role="tabpanel" aria-labelledby={props.tabDomId} hidden={!props.active} className="terminal-pane">
          <input aria-label={props.ariaLabel} />
        </div>
      );
    },
  };
});

import { TerminalApp } from "@/components/apps/terminal-app";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { MAX_TABS } from "@/lib/terminal-tabs";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useSystemStore } from "@/stores/system-store";
import { useTerminalSettingsStore } from "@/stores/terminal-settings-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppWindow, WindowPayload } from "@/types/system";

const launchApp = vi.fn();
const closeWindow = vi.fn();
const focusWindow = vi.fn();

function terminalWindow(payload?: WindowPayload): AppWindow {
  return {
    id: "window-terminal",
    processId: "process-terminal",
    appId: "terminal",
    title: "Terminal",
    payload,
    processStatus: "focused",
    x: 0,
    y: 0,
    width: 820,
    height: 520,
    minimized: false,
    maximized: false,
    focused: true,
    zIndex: 1,
    createdAt: 1,
  };
}

/** The props of the screen that was created last, which is the newest tab. */
const newest = () => [...mocks.panes.values()].at(-1)!;
const events = () => newest().props.events as Record<string, (...args: any[]) => void>;
const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);
const selectedTab = () => screen.getByRole("tab", { selected: true });
const key = (element: Element, init: KeyboardEventInit & { key: string }) => fireEvent.keyDown(element, { bubbles: true, ...init });

beforeEach(() => {
  mocks.panes.clear();
  mocks.selection.value = false;
  vi.clearAllMocks();
  window.localStorage.clear();
  useTerminalSettingsStore.getState().reset();
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  useProcessStore.setState({ processes: [] });
  useWindowStore.setState({ windows: [] } as never);
  useSystemStore.setState({ launchApp, closeWindow, focusWindow } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the tab strip", () => {
  it("opens with one selected PowerShell tab that controls a labelled panel", () => {
    render(<TerminalApp window={terminalWindow()} />);
    expect(screen.getByRole("tablist", { name: "Terminal tabs" })).toBeTruthy();
    expect(tabNames()).toEqual(["PowerShell"]);
    const panel = screen.getByRole("tabpanel", { name: "PowerShell" });
    expect(selectedTab().getAttribute("aria-controls")).toBe(panel.id);
    expect(within(panel).getByLabelText("PowerShell terminal input")).toBeTruthy();
  });

  it("starts in the profile and folder a launch asked for", () => {
    render(<TerminalApp window={terminalWindow({ profile: "cmd", directoryPath: "/Documents" })} />);
    expect(tabNames()).toEqual(["Command Prompt"]);
    expect(newest().props.startPath).toBe("/Documents");
    expect(newest().props.profileId).toBe("cmd");
  });

  it("falls back to the saved default profile, and to the home folder for a folder that does not exist", () => {
    useTerminalSettingsStore.getState().update({ defaultProfile: "cmd" });
    render(<TerminalApp window={terminalWindow({ directoryPath: "/nowhere" })} />);
    expect(tabNames()).toEqual(["Command Prompt"]);
    expect(newest().props.startPath).toBe("/");
  });

  it("adds a tab with the New tab button, at the end of the strip", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(tabNames()).toEqual(["PowerShell", "PowerShell"]);
    expect(screen.getAllByRole("tab")[1]).toBe(selectedTab());
    expect(mocks.focus).toHaveBeenCalledWith(newest().props.tabId);
  });

  it("moves between tabs with the arrow keys, Home and End, keeping focus on the strip", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const [first, second, third] = screen.getAllByRole("tab");
    mocks.focus.mockClear();

    third.focus();
    key(third, { key: "ArrowLeft" });
    expect(selectedTab()).toBe(second);
    expect(document.activeElement).toBe(second);

    key(second, { key: "Home" });
    expect(selectedTab()).toBe(first);
    expect(document.activeElement).toBe(first);

    key(first, { key: "ArrowLeft" });
    expect(selectedTab()).toBe(third);
    key(third, { key: "End" });
    expect(selectedTab()).toBe(third);
    expect(mocks.focus).not.toHaveBeenCalled();
  });

  it("clicking a tab brings it to the front and puts the cursor in its screen, not the one it replaced", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const first = newest().props.tabId as string;
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const second = newest().props.tabId as string;
    mocks.focus.mockClear();

    fireEvent.click(screen.getAllByRole("tab")[0]);
    expect(selectedTab()).toBe(screen.getAllByRole("tab")[0]);
    expect(mocks.focus.mock.calls).toEqual([[first]]);

    // A click on the tab that is already in front still returns the cursor to its screen.
    mocks.focus.mockClear();
    fireEvent.click(screen.getAllByRole("tab")[0]);
    expect(mocks.focus.mock.calls).toEqual([[first]]);
    expect(second).not.toBe(first);
  });

  it("does not pull focus away when a shell in a background tab exits", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const first = newest().props.tabId as string;
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    mocks.focus.mockClear();
    const find = screen.getByRole("button", { name: "Terminal settings" });
    find.focus();

    act(() => events().onAction(first, { type: "exit" }));
    expect(tabNames()).toHaveLength(1);
    expect(mocks.focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(find);
  });

  it("gives only the selected tab a tab stop", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const [first, second] = screen.getAllByRole("tab");
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });

  it("closes a tab with Delete and lands on its neighbour; the last tab closes the window", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const [first, second] = screen.getAllByRole("tab");
    second.focus();
    key(second, { key: "Delete" });
    expect(tabNames()).toEqual(["PowerShell"]);
    expect(document.activeElement).toBe(first);

    key(first, { key: "Delete" });
    expect(closeWindow).toHaveBeenCalledWith("window-terminal");
  });

  it("closes with the tab's own button, and on a middle click", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Close PowerShell" })[1]);
    expect(screen.getAllByRole("tab")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent(screen.getAllByRole("tab")[0], new MouseEvent("auxclick", { button: 1, bubbles: true }));
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("stops at the tab limit and says so", () => {
    render(<TerminalApp window={terminalWindow()} />);
    for (let index = 0; index < MAX_TABS + 2; index += 1) fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(screen.getAllByRole("tab")).toHaveLength(MAX_TABS);
    expect(screen.getByRole("status").textContent).toContain(`${MAX_TABS} tabs`);
  });
});

describe("the new tab menu", () => {
  it("lists every profile with its shortcut and opens the one chosen", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const opener = screen.getByRole("button", { name: "New tab menu" });
    fireEvent.click(opener);

    const menu = screen.getByRole("menu", { name: "New tab" });
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "PowerShellCtrl+Shift+1",
      "Command PromptCtrl+Shift+2",
      "Linux (Virtual x86)Ctrl+Shift+3",
      "SettingsCtrl+,",
    ]);
    expect(document.activeElement).toBe(items[0]);

    fireEvent.click(items[1]);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(tabNames()).toEqual(["PowerShell", "Command Prompt"]);
  });

  it("walks the items with the arrow keys and closes on Escape, handing focus back", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const opener = screen.getByRole("button", { name: "New tab menu" });
    opener.focus();
    fireEvent.click(opener);
    const items = screen.getAllByRole("menuitem");

    key(items[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    key(items[1], { key: "ArrowUp" });
    key(items[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[items.length - 1]);
    key(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(items[0]);

    key(items[0], { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes when the pointer goes down outside it", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab menu" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the Linux profile in the x86 emulator and says what to expect, without adding a tab", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Linux/ }));
    expect(launchApp).toHaveBeenCalledWith({ appId: "v86" });
    expect(tabNames()).toEqual(["PowerShell"]);
    expect(screen.getByRole("status").textContent).toContain(".img or .iso");
  });

  it("opens with Ctrl+Shift+Space and a numbered profile with Ctrl+Shift+digit", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const tab = selectedTab();
    tab.focus();
    key(tab, { key: " ", code: "Space", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("menu", { name: "New tab" })).toBeTruthy();
    key(document.activeElement!, { key: "Escape" });

    key(tab, { key: "@", code: "Digit2", ctrlKey: true, shiftKey: true });
    expect(tabNames()).toEqual(["PowerShell", "Command Prompt"]);
  });
});

describe("keyboard", () => {
  it("duplicates a tab into the folder its shell is in", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const source = newest().props.tabId as string;
    key(selectedTab(), { key: "D", code: "KeyD", ctrlKey: true, shiftKey: true });
    expect(tabNames()).toEqual(["PowerShell", "PowerShell"]);
    expect(newest().props.startPath).toBe(`/cwd-of-${source}`);
  });

  it("cycles and jumps between tabs", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const [first, second] = screen.getAllByRole("tab");

    key(selectedTab(), { key: "Tab", ctrlKey: true });
    expect(selectedTab()).toBe(first);
    key(selectedTab(), { key: "Tab", ctrlKey: true, shiftKey: true });
    expect(selectedTab()).toBe(screen.getAllByRole("tab")[2]);
    key(selectedTab(), { key: "2", code: "Digit2", ctrlKey: true, altKey: true });
    expect(selectedTab()).toBe(second);
  });

  it("moves focus out of the terminal to the tab strip with F6 and back", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const input = screen.getByLabelText("PowerShell terminal input");
    input.focus();
    key(input, { key: "F6" });
    expect(document.activeElement).toBe(selectedTab());

    mocks.focus.mockClear();
    key(selectedTab(), { key: "F6", shiftKey: true });
    expect(mocks.focus).toHaveBeenCalled();
  });

  it("runs the same commands when a screen forwards them", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onCommand({ type: "new-tab" }));
    expect(tabNames()).toHaveLength(2);
    act(() => events().onCommand({ type: "previous-tab" }));
    expect(selectedTab()).toBe(screen.getAllByRole("tab")[0]);
    act(() => events().onCommand({ type: "close-tab" }));
    expect(tabNames()).toHaveLength(1);
  });

  it("zooms the text through the settings, within bounds, and resets it", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onCommand({ type: "zoom", delta: 1 }));
    act(() => events().onCommand({ type: "zoom", delta: 1 }));
    expect(useTerminalSettingsStore.getState().fontSize).toBe(16);
    act(() => events().onCommand({ type: "zoom", delta: 0 }));
    expect(useTerminalSettingsStore.getState().fontSize).toBe(14);
  });
});

describe("launches while the terminal is open", () => {
  it("opens a tab when a launch asks for another profile, and not again for the same launch", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow()} />);
    rerender(<TerminalApp window={terminalWindow({ profile: "cmd" })} />);
    expect(tabNames()).toEqual(["PowerShell", "Command Prompt"]);
    rerender(<TerminalApp window={terminalWindow({ profile: "cmd" })} />);
    expect(tabNames()).toHaveLength(2);
  });

  it("opens another tab for a repeated launch that carries a new nonce", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow({ profile: "cmd", launchNonce: "a" })} />);
    expect(tabNames()).toEqual(["Command Prompt"]);
    rerender(<TerminalApp window={terminalWindow({ profile: "cmd", launchNonce: "b" })} />);
    expect(tabNames()).toEqual(["Command Prompt", "Command Prompt"]);
  });

  it("opens a tab in a folder, as Open in Terminal does", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow()} />);
    rerender(<TerminalApp window={terminalWindow({ directoryPath: "/Media" })} />);
    expect(tabNames()).toEqual(["PowerShell", "PowerShell"]);
    expect(newest().props.startPath).toBe("/Media");
  });

  it("hands a Linux launch to the emulator once", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow({ profile: "linux" })} />);
    expect(launchApp).toHaveBeenCalledTimes(1);
    expect(launchApp).toHaveBeenCalledWith({ appId: "v86" });
    rerender(<TerminalApp window={terminalWindow({ profile: "linux" })} />);
    expect(launchApp).toHaveBeenCalledTimes(1);
    expect(tabNames()).toEqual(["PowerShell"]);
  });

  it("opens one emulator, not two, when a Linux launch reaches a terminal that is already open", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow()} />);
    expect(launchApp).not.toHaveBeenCalled();
    rerender(<TerminalApp window={terminalWindow({ profile: "linux" })} />);
    expect(launchApp.mock.calls).toEqual([[{ appId: "v86" }]]);
    expect(screen.getByRole("status").textContent).toContain(".img or .iso");
    expect(tabNames()).toEqual(["PowerShell"]);
  });

  it("brings an emulator that is already open to the front instead of opening a second", () => {
    useProcessStore.setState({ processes: [{ id: "process-v86", appId: "v86", status: "running", createdAt: 1 }] });
    useWindowStore.setState({ windows: [{ id: "window-v86", processId: "process-v86", title: "Virtual x86", minimized: true }] } as never);
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Linux/ }));
    expect(launchApp).not.toHaveBeenCalled();
    expect(focusWindow).toHaveBeenCalledWith("window-v86");
  });

  it("spends a launch request once it has acted on it, so a reload cannot repeat it", () => {
    const requested: WindowPayload = { profile: "linux" };
    useProcessStore.setState({ processes: [{ id: "process-terminal", appId: "terminal", status: "focused", launchPayload: requested, createdAt: 1 }] });
    const first = render(<TerminalApp window={terminalWindow(requested)} />);
    expect(launchApp).toHaveBeenCalledTimes(1);
    // What the process now holds is what a reload restores.
    const restored = useProcessStore.getState().processes[0].launchPayload;
    expect(restored).toEqual({});
    first.unmount();

    render(<TerminalApp window={terminalWindow(restored)} />);
    expect(launchApp).toHaveBeenCalledTimes(1);
  });

  it("opens a tab each time the same profile is asked for, because the request is spent in between", () => {
    const { rerender } = render(<TerminalApp window={terminalWindow()} />);
    rerender(<TerminalApp window={terminalWindow({ profile: "cmd" })} />);
    rerender(<TerminalApp window={terminalWindow({})} />);
    rerender(<TerminalApp window={terminalWindow({ profile: "cmd" })} />);
    expect(tabNames()).toEqual(["PowerShell", "Command Prompt", "Command Prompt"]);
  });

  it("spends the request the window was opened with too, but keeps the tab it made", () => {
    useProcessStore.setState({ processes: [{ id: "process-terminal", appId: "terminal", status: "focused", launchPayload: { profile: "cmd", directoryPath: "/Documents" }, createdAt: 1 }] });
    render(<TerminalApp window={terminalWindow({ profile: "cmd", directoryPath: "/Documents" })} />);
    expect(tabNames()).toEqual(["Command Prompt"]);
    expect(useProcessStore.getState().processes[0].launchPayload).toEqual({});
  });
});

describe("what the shell asks for", () => {
  it("opens a tab for wt, pwsh and cmd, in the folder the asking shell is in", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const asker = newest().props.tabId as string;
    act(() => events().onAction(asker, { type: "open-tab", profile: "cmd" }));
    expect(tabNames()).toEqual(["PowerShell", "Command Prompt"]);
    expect(newest().props.startPath).toBe(`/cwd-of-${asker}`);

    act(() => events().onAction(asker, { type: "open-tab", profile: "pwsh", directoryPath: "/Media" }));
    expect(newest().props.startPath).toBe("/Media");
  });

  it("renames a tab, and cleans what the shell sends", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const id = newest().props.tabId as string;
    act(() => events().onAction(id, { type: "set-title", title: "build \x1b[31mlog" }));
    expect(tabNames()).toEqual(["build [31mlog"]);
    expect(screen.getByLabelText("build [31mlog terminal input")).toBeTruthy();
  });

  it("closes the tab on exit, and the window when it was the last", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const first = newest().props.tabId as string;
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const second = newest().props.tabId as string;
    act(() => events().onAction(second, { type: "exit" }));
    expect(tabNames()).toHaveLength(1);
    expect(closeWindow).not.toHaveBeenCalled();
    act(() => events().onAction(first, { type: "exit" }));
    expect(closeWindow).toHaveBeenCalledWith("window-terminal");
  });

  it("launches apps and opens links in the browser app", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const id = newest().props.tabId as string;
    act(() => events().onAction(id, { type: "launch-app", appId: "settings", payload: { section: "display" } as WindowPayload, title: "Settings" }));
    expect(launchApp).toHaveBeenCalledWith({ appId: "settings", payload: { section: "display" }, title: "Settings" });

    act(() => events().onOpenLink("https://example.com/"));
    expect(launchApp).toHaveBeenCalledWith({ appId: "browser", payload: { externalUrl: "https://example.com/" } });
  });

  it("tells the shell about the browser's offline state", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const host = newest().props.host as { isOffline: () => boolean };
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(host.isOffline()).toBe(true);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(host.isOffline()).toBe(false);
  });
});

describe("find", () => {
  it("opens a labelled search, searches as you type, reports the result and closes on Escape", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const tab = selectedTab();
    tab.focus();
    key(tab, { key: "F", code: "KeyF", ctrlKey: true, shiftKey: true });

    const search = screen.getByRole("search", { name: "Find in terminal" });
    const input = within(search).getByLabelText("Find in terminal");
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "needle" } });
    expect(mocks.find).toHaveBeenLastCalledWith("needle", 1, { caseSensitive: false, regex: false }, true);

    act(() => events().onSearchResults({ index: 1, count: 4 }));
    expect(within(search).getByRole("status").textContent).toBe("2 of 4");
    act(() => events().onSearchResults({ index: -1, count: 0 }));
    expect(within(search).getByRole("status").textContent).toBe("No results");

    key(input, { key: "Enter", shiftKey: true });
    expect(mocks.find).toHaveBeenLastCalledWith("needle", -1, { caseSensitive: false, regex: false }, false);

    fireEvent.click(within(search).getByRole("button", { name: "Match case" }));
    expect(mocks.find).toHaveBeenLastCalledWith("needle", 1, { caseSensitive: true, regex: false }, false);
    expect(within(search).getByRole("button", { name: "Match case" }).getAttribute("aria-pressed")).toBe("true");

    mocks.focus.mockClear();
    key(input, { key: "Escape" });
    expect(screen.queryByRole("search")).toBeNull();
    expect(mocks.clearSearch).toHaveBeenCalled();
    expect(mocks.focus).toHaveBeenCalled();
  });

  it("searches the tab that comes to the front", () => {
    render(<TerminalApp window={terminalWindow()} />);
    key(selectedTab(), { key: "F", code: "KeyF", ctrlKey: true, shiftKey: true });
    fireEvent.change(screen.getByLabelText("Find in terminal", { selector: "input" }), { target: { value: "x" } });
    mocks.find.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(mocks.find).toHaveBeenCalledWith("x", 1, { caseSensitive: false, regex: false }, false);
  });
});

describe("settings", () => {
  it("opens as a dialog, changes the saved settings, and gives focus back on Escape", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const tab = selectedTab();
    tab.focus();
    key(tab, { key: ",", code: "Comma", ctrlKey: true });

    const dialog = screen.getByRole("dialog", { name: "Terminal settings" });
    expect(document.activeElement).toBe(within(dialog).getByLabelText("Colour scheme"));

    fireEvent.change(within(dialog).getByLabelText("Colour scheme"), { target: { value: "one-half-light" } });
    expect(useTerminalSettingsStore.getState().schemeId).toBe("one-half-light");

    fireEvent.click(within(dialog).getByLabelText("Screen reader mode"));
    expect(useTerminalSettingsStore.getState().screenReaderMode).toBe(true);
    fireEvent.click(within(dialog).getByLabelText("Improve text contrast"));
    expect(useTerminalSettingsStore.getState().improveContrast).toBe(true);

    fireEvent.change(within(dialog).getByLabelText("Default profile"), { target: { value: "cmd" } });
    expect(useTerminalSettingsStore.getState().defaultProfile).toBe("cmd");
    expect(within(dialog).queryByRole("option", { name: /Linux/ })).toBeNull();

    key(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(tab);
  });

  it("applies the screen colours to the app, so the active tab matches the scheme", () => {
    render(<TerminalApp window={terminalWindow()} />);
    const root = screen.getByRole("tablist").closest("section") as HTMLElement;
    expect(root.style.getPropertyValue("--terminal-bg")).toBe("#0C0C0C");
    act(() => useTerminalSettingsStore.getState().update({ schemeId: "one-half-light" }));
    expect(root.style.getPropertyValue("--terminal-bg")).toBe("#FAFAFA");
    expect(newest().props.appearance.theme.background).toBe("#FAFAFA");
  });

  it("commits a typed font size when the field is left, instead of clamping each digit", () => {
    render(<TerminalApp window={terminalWindow()} />);
    key(selectedTab(), { key: ",", code: "Comma", ctrlKey: true });
    const size = screen.getByLabelText("Font size in pixels") as HTMLInputElement;
    fireEvent.change(size, { target: { value: "1" } });
    expect(size.value).toBe("1");
    expect(useTerminalSettingsStore.getState().fontSize).toBe(14);
    fireEvent.change(size, { target: { value: "18" } });
    fireEvent.blur(size);
    expect(useTerminalSettingsStore.getState().fontSize).toBe(18);
    fireEvent.change(size, { target: { value: "400" } });
    fireEvent.blur(size);
    expect(size.value).toBe("32");
  });

  it("resets to the defaults", () => {
    useTerminalSettingsStore.getState().update({ fontSize: 22, screenReaderMode: true });
    render(<TerminalApp window={terminalWindow()} />);
    key(selectedTab(), { key: ",", code: "Comma", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Reset to defaults/ }));
    expect(useTerminalSettingsStore.getState().fontSize).toBe(14);
    expect(useTerminalSettingsStore.getState().screenReaderMode).toBe(false);
  });

  it("explains that the cursor will not blink when the system asks for reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<TerminalApp window={terminalWindow()} />);
    key(selectedTab(), { key: ",", code: "Comma", ctrlKey: true });
    expect(screen.getByText(/reduced motion/)).toBeTruthy();
    expect(newest().props.appearance.cursorBlink).toBe(false);
  });

  it("lists the shortcuts, including the way out of the keyboard trap", () => {
    render(<TerminalApp window={terminalWindow()} />);
    key(selectedTab(), { key: ",", code: "Comma", ctrlKey: true });
    expect(screen.getByText(/Move focus out of the terminal/)).toBeTruthy();
  });
});

describe("context menus and paste", () => {
  it("offers copy, paste, select all, find and settings on the terminal, copy only with a selection", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onContextMenu({ x: 60, y: 80 }));
    const menu = screen.getByRole("menu", { name: "Terminal actions" });
    expect((within(menu).getByRole("menuitem", { name: /^Copy/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(menu).getByRole("menuitem", { name: /^Paste/ }));
    expect(mocks.pasteFromClipboard).toHaveBeenCalled();

    mocks.selection.value = true;
    act(() => events().onContextMenu({ x: 60, y: 80 }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Copy/ }));
    expect(mocks.copySelection).toHaveBeenCalled();

    act(() => events().onContextMenu({ x: 60, y: 80 }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Find/ }));
    expect(screen.getByRole("search", { name: "Find in terminal" })).toBeTruthy();
  });

  it("has a tab menu to duplicate or close tabs, reachable with the context menu key", () => {
    render(<TerminalApp window={terminalWindow()} />);
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    const [first] = screen.getAllByRole("tab");
    first.focus();
    key(first, { key: "ContextMenu" });

    const menu = screen.getByRole("menu", { name: "Tab actions" });
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Close other tabs" }));
    expect(tabNames()).toEqual(["PowerShell"]);
    expect(selectedTab()).toBe(screen.getAllByRole("tab")[0]);
  });

  it("asks before pasting several lines, with Cancel focused", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onPasteReview({ text: "ls\ncd ..\nrm x", review: { lines: 3, characters: 13, reason: "multiline" } }));

    const dialog = screen.getByRole("alertdialog", { name: "Paste 3 lines?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(dialog.textContent).toContain("Each line will run as a command");

    key(dialog, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mocks.pasteText).not.toHaveBeenCalled();
  });

  it("pastes once confirmed", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onPasteReview({ text: "ls\ncd ..", review: { lines: 2, characters: 8, reason: "multiline" } }));
    fireEvent.click(screen.getByRole("button", { name: "Paste anyway" }));
    expect(mocks.pasteText).toHaveBeenCalledWith("ls\ncd ..");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("names a very large paste by its size", () => {
    render(<TerminalApp window={terminalWindow()} />);
    act(() => events().onPasteReview({ text: "x".repeat(6000), review: { lines: 1, characters: 6000, reason: "large" } }));
    expect(screen.getByRole("alertdialog", { name: "Paste a large amount of text?" }).textContent).toContain("6,000 characters");
  });
});
