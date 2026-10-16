import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import {
  completeShellInput,
  createShellSession,
  formatPrompt,
  getPowerShellBanner,
  MAX_OUTPUT_LINES,
  runShellCommand,
  stripAnsi,
  type ShellFileSystem,
  type ShellHost,
  type ShellSession,
} from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";

const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

let session: ShellSession;

async function run(input: string, host: ShellHost = {}) {
  const result = await runShellCommand(input, session, fileSystem, host);
  return { ...result, text: result.lines.map(stripAnsi).join("\n") };
}

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/Desktop");
});

describe("Ctrl+C", () => {
  it("ends a sleeping command at once and prints nothing", async () => {
    const controller = new AbortController();
    const pending = run("Start-Sleep 30", { signal: controller.signal });
    controller.abort();
    const result = await pending;
    expect(result.interrupted).toBe(true);
    expect(result.success).toBe(false);
    expect(result.lines).toEqual([]);
  });

  it("does not start a command once the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = vi.fn();
    const result = await run("irm example.com", { signal: controller.signal, fetch: fetchSpy as unknown as typeof fetch });
    expect(result.interrupted).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cancels a web request that is waiting", async () => {
    const controller = new AbortController();
    const fetchSpy = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        })
    );
    const pending = run("iwr example.com", { signal: controller.signal, fetch: fetchSpy as unknown as typeof fetch });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    controller.abort();
    expect((await pending).interrupted).toBe(true);
  });

  it("stops a script between lines", async () => {
    await fileSystem.writeFile("/Desktop/two.ps1", "Start-Sleep 30\necho never");
    const controller = new AbortController();
    const pending = run(".\\two.ps1", { signal: controller.signal });
    controller.abort();
    const result = await pending;
    expect(result.interrupted).toBe(true);
    expect(result.text).not.toContain("never");
  });
});

describe("lookups never reach Object.prototype", () => {
  it.each(["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"])("%s is just an unknown command", async (word) => {
    const { success, actions, text } = await run(word);
    expect(success).toBe(false);
    expect(actions).toEqual([]);
    expect(text).toContain("is not recognized");
  });

  it("does not read variables, environment or settings pages from the prototype", async () => {
    expect((await run("echo $constructor")).text).toBe("");
    expect((await run("echo $env:constructor")).text).toBe("");
    expect((await run("start ms-settings:constructor")).actions[0]).toEqual({
      type: "launch-app",
      appId: "settings",
      payload: { section: "system" },
    });
    expect((await run("Write-Host hi -ForegroundColor constructor")).success).toBe(false);
    expect((await run("Get-FileHash nope -Algorithm constructor")).success).toBe(false);
  });

  it("keeps a variable called __proto__ as an ordinary variable", async () => {
    await run("$__proto__ = 'x'");
    expect(Object.getPrototypeOf(session.variables)).toBeNull();
    expect((await run("$__proto__")).text).toBe("x");
  });
});

describe("output and prompt", () => {
  it("stops printing after a fixed number of lines", async () => {
    const lines = Array.from({ length: MAX_OUTPUT_LINES + 50 }, (_, index) => `line ${index}`).join("\n");
    await fileSystem.writeFile("/Desktop/huge.txt", lines);
    const result = await run("cat huge.txt");
    expect(result.lines).toHaveLength(MAX_OUTPUT_LINES + 1);
    expect(stripAnsi(result.lines.at(-1) ?? "")).toContain(`stopped after ${MAX_OUTPUT_LINES} lines`);
  });

  it("keeps escape sequences in folder names out of the prompt", () => {
    expect(formatPrompt("/a\x1b]0;pwned\x07b")).toBe("PS C:\\Users\\Taaniel\\a]0;pwnedb> ");
  });

  it("keeps escape sequences in history out of Get-History", async () => {
    session.history.push("echo \x1b]52;c;cHduZWQ=\x07hi");
    expect((await run("history")).text).not.toMatch(/[\x1b\x07]/);
  });

  it("does not let a failing command name drive the terminal", async () => {
    const { lines } = await run("bad\x1b[31mname");
    expect(lines.join("")).not.toContain("\x1b[31mname");
  });
});

describe("tabs", () => {
  it("opens a PowerShell or Command Prompt tab for pwsh, powershell and cmd", async () => {
    expect((await run("pwsh")).actions).toEqual([{ type: "open-tab", profile: "pwsh", directoryPath: undefined }]);
    expect((await run("powershell.exe")).actions[0]).toMatchObject({ type: "open-tab", profile: "pwsh" });
    expect((await run("cmd")).actions[0]).toMatchObject({ type: "open-tab", profile: "cmd" });
    expect((await run("Start-Process cmd")).actions[0]).toMatchObject({ type: "open-tab", profile: "cmd" });
  });

  it("reads Windows Terminal's -p and -d options", async () => {
    expect((await run("wt")).actions[0]).toMatchObject({ type: "open-tab", profile: undefined });
    expect((await run("wt -p cmd")).actions[0]).toMatchObject({ type: "open-tab", profile: "cmd" });
    expect((await run("wt -p 'PowerShell' -d ..\\Documents")).actions[0]).toMatchObject({
      type: "open-tab",
      profile: "pwsh",
      directoryPath: "/Documents",
    });
    expect((await run("wt -d nowhere")).success).toBe(false);
  });

  it("hands the Linux profile to the emulator, accurately", async () => {
    const { actions, text } = await run("wt -p wsl");
    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "v86" });
    expect(text).toContain(".img or .iso");
  });
});

describe("banner", () => {
  it("names Taaniel OS and never the Windows brand", () => {
    const banner = getPowerShellBanner().join("\n");
    expect(banner).toContain("Taaniel OS");
    expect(banner).not.toMatch(/Windows|Microsoft/);
  });
});

describe("completion options", () => {
  it("completes a custom command set after a custom separator", () => {
    const options = { commands: ["dir", "date", "del"], separators: "|&" };
    const nodes = useFileSystemStore.getState().nodes;
    expect(completeShellInput("dir & dat", 9, session, nodes, options).line).toBe("dir & date ");
    expect(completeShellInput("Get-Chi", 7, session, nodes, options).candidates).toEqual([]);
  });
});
