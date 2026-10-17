// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { TerminalSession, type TerminalSessionCallbacks } from "@/components/apps/terminal/terminal-session";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { buildAppearance } from "@/lib/terminal-appearance";
import { getShellEngine } from "@/lib/terminal-engines";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import type { ShellFileSystem, ShellHost } from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { DEFAULT_TERMINAL_SETTINGS } from "@/stores/terminal-settings-store";

const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

let sessions: TerminalSession[] = [];
let callbacks: { [K in keyof TerminalSessionCallbacks]: ReturnType<typeof vi.fn> };

function create(options: { engine?: "pwsh" | "cmd"; host?: ShellHost; behaviour?: { copyOnSelect: boolean; multiLinePasteWarning: boolean } } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const session = new TerminalSession({
    engine: getShellEngine(options.engine ?? "pwsh"),
    startPath: "/Documents",
    fileSystem,
    host: options.host ?? {},
    appearance: buildAppearance(DEFAULT_TERMINAL_SETTINGS, false),
    ariaLabel: "PowerShell terminal input",
    getBehaviour: () => options.behaviour ?? { copyOnSelect: false, multiLinePasteWarning: true },
    callbacks: callbacks as unknown as TerminalSessionCallbacks,
  });
  session.open(container);
  sessions.push(session);
  return session;
}

/** Everything on screen, one string per row, trailing blanks trimmed. */
async function screen(session: TerminalSession) {
  await new Promise<void>((resolve) => session.terminal.write("", resolve));
  const buffer = session.terminal.buffer.active;
  const rows: string[] = [];
  for (let index = 0; index < buffer.length; index += 1) rows.push(buffer.getLine(index)?.translateToString(true) ?? "");
  return rows.join("\n").trimEnd();
}

/** Send keys one at a time, as xterm does: an escape sequence always arrives in a chunk of its own. */
async function type(session: TerminalSession, ...keys: string[]) {
  keys.forEach((key) => session.terminal.input(key, true));
  // Commands run on a microtask; give them and xterm's write queue time to settle.
  await vi.waitFor(async () => {
    expect(session.isBusy()).toBe(false);
  });
  return screen(session);
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
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  callbacks = {
    onAction: vi.fn(),
    onCommand: vi.fn(),
    onOpenLink: vi.fn(),
    onPasteReview: vi.fn(),
    onContextMenu: vi.fn(),
    onSearchResults: vi.fn(),
  };
});

afterEach(() => {
  sessions.forEach((session) => session.dispose());
  sessions = [];
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("a PowerShell tab", () => {
  it("greets with the banner, the focus hint and a prompt", async () => {
    const text = await screen(create());
    expect(text).toContain("PowerShell 7.4.5 on Taaniel OS");
    expect(text).toContain("F6 moves focus out of the terminal");
    expect(text).toMatch(/PS C:\\Users\\Taaniel\\Documents>$/);
  });

  it("runs a line and prints its output above a fresh prompt", async () => {
    const session = create();
    const text = await type(session, "echo 'hello world'\r");
    expect(text).toMatch(/PS C:\\Users\\Taaniel\\Documents> echo 'hello world'\nhello world\nPS C:\\Users\\Taaniel\\Documents>$/);
  });

  it("edits the line before it runs: cursor keys, Delete, Home and word kills", async () => {
    const session = create();
    // "echo helo", two left puts the cursor between "he" and "lo".
    await type(session, "echo helo", "\x1b[D", "\x1b[D", "l", "\r");
    expect(await screen(session)).toMatch(/^hello$/m);

    // Ctrl+W kills the word before the cursor.
    await type(session, "echo abc def", "\x17", "\r");
    expect(await screen(session)).toMatch(/^abc$/m);

    // Home, then Delete removes the first character.
    await type(session, "xecho hi", "\x1b[H", "\x1b[3~", "\r");
    expect(await screen(session)).toMatch(/^hi$/m);
  });

  it("walks back through history with the up arrow, and keeps history per shell", async () => {
    const session = create();
    await type(session, "echo one\r");
    await type(session, "echo two\r");
    await type(session, "\x1b[A", "\x1b[A");
    const text = await screen(session);
    expect(text.split("\n").at(-1)).toMatch(/> echo one$/);
    expect(JSON.parse(window.localStorage.getItem("taaniel-os-terminal-history") ?? "[]")).toEqual(["echo one", "echo two"]);
    expect(window.localStorage.getItem("taaniel-os-terminal-history-cmd")).toBeNull();
  });

  it("saves history on top of what other tabs saved while a command was running", async () => {
    const first = create();
    const second = create();
    first.terminal.input("Start-Sleep -Milliseconds 150\r", true);
    await vi.waitFor(() => expect(first.isBusy()).toBe(true));
    await type(second, "echo from second\r");
    await vi.waitFor(() => expect(first.isBusy()).toBe(false), { timeout: 3000 });
    const stored = JSON.parse(window.localStorage.getItem("taaniel-os-terminal-history") ?? "[]");
    expect(stored).toEqual(["echo from second", "Start-Sleep -Milliseconds 150"]);
    // The tab that was waiting takes up the merged list, so the up arrow finds the other tab's command too.
    expect(first.shell.history).toEqual(stored);
  });

  it("lets Clear-History empty the saved list as well", async () => {
    const session = create();
    await type(session, "echo a\r");
    await type(session, "Clear-History\r");
    expect(JSON.parse(window.localStorage.getItem("taaniel-os-terminal-history") ?? "[]")).toEqual(["Clear-History"]);
  });

  it("completes a command with Tab", async () => {
    const session = create();
    const text = await type(session, "Get-Chil\t");
    expect(text.split("\n").at(-1)).toMatch(/> Get-ChildItem$/);
  });

  it("stops a running command with Ctrl+C and prints ^C", async () => {
    const session = create();
    session.terminal.input("Start-Sleep 30\r", true);
    await vi.waitFor(() => expect(session.isBusy()).toBe(true));
    session.terminal.input("\x03", true);
    await vi.waitFor(() => expect(session.isBusy()).toBe(false));
    const text = await screen(session);
    expect(text).toContain("^C");
    expect(text.split("\n").at(-1)).toMatch(/>$/);
  });

  it("keeps what is typed while a command runs, and runs it afterwards", async () => {
    const session = create();
    session.terminal.input("Start-Sleep -Milliseconds 150\r", true);
    await vi.waitFor(() => expect(session.isBusy()).toBe(true));
    session.terminal.input("echo later\r", true);
    await vi.waitFor(async () => expect(await screen(session)).toMatch(/^later$/m), { timeout: 3000 });
  });

  it("drops typed-ahead input when Ctrl+C stops the command", async () => {
    const session = create();
    session.terminal.input("Start-Sleep 30\r", true);
    await vi.waitFor(() => expect(session.isBusy()).toBe(true));
    session.terminal.input("echo never\r", true);
    session.terminal.input("\x03", true);
    await vi.waitFor(() => expect(session.isBusy()).toBe(false));
    expect(await screen(session)).not.toMatch(/^never$/m);
  });

  it("hands actions the shell returns to the app", async () => {
    const session = create();
    await type(session, "wt -p cmd\r");
    expect(callbacks.onAction).toHaveBeenCalledWith({ type: "open-tab", profile: "cmd", directoryPath: undefined });
    await type(session, "exit\r");
    expect(callbacks.onAction).toHaveBeenCalledWith({ type: "exit" });
  });

  it("cleans a paste, and asks before pasting several lines", async () => {
    const session = create();
    const paste = (text: string) => {
      const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
      event.clipboardData = { getData: () => text };
      session.terminal.element?.parentElement?.dispatchEvent(event);
      return event;
    };

    const event = paste("echo a\x1b[31m\necho b");
    expect(event.defaultPrevented).toBe(true);
    expect(callbacks.onPasteReview).toHaveBeenCalledTimes(1);
    const { text, review } = callbacks.onPasteReview.mock.calls[0][0] as { text: string; review: { reason: string; lines: number } };
    expect(text).toBe("echo a[31m\necho b");
    expect(review).toMatchObject({ reason: "multiline", lines: 2 });

    // Confirmed: it is typed in, each line running as it would from the keyboard.
    session.pasteText(text);
    await vi.waitFor(async () => {
      const text = await screen(session);
      expect(text).toMatch(/^a\[31m$/m);
      // The last line has no newline after it, so it waits at the prompt for Enter.
      expect(text.split("\n").at(-1)).toMatch(/> echo b$/);
    });
  });

  it("pastes a single line without asking", async () => {
    const session = create();
    const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    event.clipboardData = { getData: () => "echo solo" };
    session.terminal.element?.parentElement?.dispatchEvent(event);
    expect(callbacks.onPasteReview).not.toHaveBeenCalled();
    expect(await screen(session)).toMatch(/> echo solo$/);
  });

  it("can switch the multi-line warning off", async () => {
    const session = create({ behaviour: { copyOnSelect: false, multiLinePasteWarning: false } });
    const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    event.clipboardData = { getData: () => "echo a\necho b" };
    session.terminal.element?.parentElement?.dispatchEvent(event);
    expect(callbacks.onPasteReview).not.toHaveBeenCalled();
  });
});

describe("keys", () => {
  const press = (session: TerminalSession, init: KeyboardEventInit & { key: string }) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    session.terminal.textarea?.dispatchEvent(event);
    return event;
  };

  it("forwards tab and focus commands to the app and swallows the key", async () => {
    const session = create();
    const event = press(session, { key: "F6" });
    expect(callbacks.onCommand).toHaveBeenCalledWith({ type: "move-focus", direction: 1 });
    expect(event.defaultPrevented).toBe(true);

    press(session, { key: "D", code: "KeyD", ctrlKey: true, shiftKey: true });
    expect(callbacks.onCommand).toHaveBeenCalledWith({ type: "duplicate-tab" });
  });

  it("leaves desktop shortcuts alone so they bubble to the shell", () => {
    const session = create();
    const onWindow = vi.fn();
    window.addEventListener("keydown", onWindow);
    const event = press(session, { key: "k", code: "KeyK", ctrlKey: true });
    window.removeEventListener("keydown", onWindow);
    expect(event.defaultPrevented).toBe(false);
    expect(onWindow).toHaveBeenCalled();
    expect(callbacks.onCommand).not.toHaveBeenCalled();
  });

  it("does not turn Alt+[ into input for the shell", async () => {
    const session = create();
    press(session, { key: "[", code: "BracketLeft", altKey: true });
    expect(await screen(session)).not.toMatch(/> \[/);
  });
});

describe("a Command Prompt tab", () => {
  it("has its own banner, prompt and history", async () => {
    const session = create({ engine: "cmd" });
    let text = await screen(session);
    expect(text).toContain("Taaniel OS [Version");
    expect(text.split("\n").at(-1)).toBe("C:\\Users\\Taaniel\\Documents>");

    text = await type(session, "echo hi there\r");
    expect(text).toContain("hi there");
    expect(window.localStorage.getItem("taaniel-os-terminal-history-cmd")).toContain("echo hi there");
    expect(window.localStorage.getItem("taaniel-os-terminal-history")).toBeNull();
  });
});

describe("links", () => {
  const range = { start: { x: 1, y: 1 }, end: { x: 2, y: 1 } };

  it("sends escape-sequence hyperlinks through the same address check as plain links", () => {
    const session = create();
    const handler = session.terminal.options.linkHandler;
    expect(handler).toBeTruthy();
    const ctrl = new MouseEvent("click", { ctrlKey: true });

    // xterm's own handler would confirm and window.open anything, javascript: included.
    handler?.activate(ctrl, "javascript:alert(1)", range);
    handler?.activate(ctrl, "data:text/html,<script>1</script>", range);
    handler?.activate(ctrl, "https://user:secret@example.com/", range);
    expect(callbacks.onOpenLink).not.toHaveBeenCalled();

    handler?.activate(ctrl, "https://example.com/page", range);
    expect(callbacks.onOpenLink).toHaveBeenCalledWith("https://example.com/page");
  });

  it("needs Ctrl for a mouse, like Windows Terminal", () => {
    const session = create();
    session.terminal.options.linkHandler?.activate(new MouseEvent("click"), "https://example.com/", range);
    expect(callbacks.onOpenLink).not.toHaveBeenCalled();
  });
});

describe("find", () => {
  it("highlights matches and reports how many there were", async () => {
    const session = create();
    await type(session, "echo needle\r");
    await screen(session);
    session.find("needle", 1, { caseSensitive: false, regex: false });
    await vi.waitFor(() => expect(callbacks.onSearchResults).toHaveBeenCalled());
    const last = callbacks.onSearchResults.mock.calls.at(-1)?.[0] as { count: number };
    expect(last.count).toBeGreaterThanOrEqual(1);
  });

  it("treats a half-typed regular expression as no match", () => {
    const session = create();
    expect(session.find("(", 1, { caseSensitive: false, regex: true })).toBe(false);
    expect(callbacks.onSearchResults).toHaveBeenCalledWith({ index: -1, count: 0 });
  });
});

describe("appearance", () => {
  it("applies new settings to the live terminal", () => {
    const session = create();
    session.setAppearance(
      buildAppearance({ ...DEFAULT_TERMINAL_SETTINGS, schemeId: "one-half-light", fontSize: 20, screenReaderMode: true, improveContrast: true }, true)
    );
    expect(session.terminal.options.fontSize).toBe(20);
    expect(session.terminal.options.theme?.background).toBe("#FAFAFA");
    expect(session.terminal.options.screenReaderMode).toBe(true);
    expect(session.terminal.options.cursorBlink).toBe(false);
    expect(session.terminal.options.minimumContrastRatio).toBe(4.5);
  });

  it("labels the input for screen readers, per tab", () => {
    const session = create();
    expect(session.terminal.textarea?.getAttribute("aria-label")).toBe("PowerShell terminal input");
    session.setLabel("build output terminal input");
    expect(session.terminal.textarea?.getAttribute("aria-label")).toBe("build output terminal input");
  });
});

