// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { TerminalApp } from "@/components/apps/terminal-app";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import { useTerminalSettingsStore } from "@/stores/terminal-settings-store";
import type { AppWindow } from "@/types/system";

/* The whole app with real xterm screens, driven the way a browser drives them: through paste events and keys. */

const launchApp = vi.fn();
const closeWindow = vi.fn();

const terminalWindow = (): AppWindow => ({
  id: "window-terminal",
  processId: "process-terminal",
  appId: "terminal",
  title: "Terminal",
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
});

/** What the person pasted, as the screen in front receives it. */
function paste(text: string) {
  const screenElement = document.querySelector(".terminal-pane.is-active .terminal-pane__screen") as HTMLElement;
  fireEvent.paste(screenElement, { clipboardData: { getData: () => text } });
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.clearAllMocks();
  useTerminalSettingsStore.getState().reset();
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  useSystemStore.setState({ launchApp, closeWindow } as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the terminal app with real screens", () => {
  it("labels each tab's input for screen readers", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    expect(await screen.findByLabelText("PowerShell terminal input")).toBeTruthy();
  });

  it("opens a Command Prompt tab when a command in the shell asks for one", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    paste("wt -p cmd\r");
    await waitFor(() => expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["PowerShell", "Command Prompt"]));
    expect(screen.getByRole("tab", { selected: true }).textContent).toBe("Command Prompt");
    expect(screen.getAllByLabelText("Command Prompt terminal input")).toHaveLength(1);
    // The PowerShell screen keeps running behind it, hidden.
    expect(document.querySelectorAll(".terminal-pane[hidden]")).toHaveLength(1);
    // And the new tab is ready to type in.
    expect(document.activeElement).toBe(screen.getByLabelText("Command Prompt terminal input"));
  });

  it("closes the window when the last shell exits", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    paste("exit\r");
    await waitFor(() => expect(closeWindow).toHaveBeenCalledWith("window-terminal"));
  });

  it("hands Linux to the emulator instead of opening a tab", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    paste("wt -p wsl\r");
    await waitFor(() => expect(launchApp).toHaveBeenCalledWith(expect.objectContaining({ appId: "v86" })));
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("turns on the screen reader layer from the settings, and off again", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    expect(document.querySelector(".xterm-accessibility")).toBeNull();
    act(() => useTerminalSettingsStore.getState().update({ screenReaderMode: true }));
    await waitFor(() => expect(document.querySelector(".xterm-accessibility")).not.toBeNull());
    act(() => useTerminalSettingsStore.getState().update({ screenReaderMode: false }));
    await waitFor(() => expect(document.querySelector(".xterm-accessibility")).toBeNull());
  });

  it("asks before pasting two lines, and runs both once confirmed", async () => {
    render(<TerminalApp window={terminalWindow()} />);
    paste("wt -p cmd\rwt -p pwsh\r");
    await screen.findByRole("alertdialog", { name: "Paste 2 lines?" });
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Paste anyway" }));
    // Both lines ran in the PowerShell tab that was in front, each opening a tab of its own at the end.
    await waitFor(() => expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["PowerShell", "Command Prompt", "PowerShell"]));
  });
});
