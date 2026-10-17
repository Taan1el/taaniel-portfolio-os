import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import {
  createShellSession,
  runShellCommand,
  stripAnsi,
  type ShellFileSystem,
  type ShellHost,
  type ShellSession,
} from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";

/*
 * PowerShell realism: the everyday things a visitor who knows PowerShell types
 * and expects to work - $PSVersionTable.PSVersion, cmd1 && cmd2, Join-Path,
 * Get-Help -Examples and so on.
 */

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
  const lines = result.lines.map(stripAnsi);
  return { ...result, lines, text: lines.join("\n") };
}

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/Desktop");
});

describe("member access on automatic variables", () => {
  it("prints $PSVersionTable.PSVersion as a table", async () => {
    const { lines } = await run("$PSVersionTable.PSVersion");
    expect(lines.filter(Boolean)[0]).toMatch(/^Major\s+Minor\s+Patch\s+PreReleaseLabel\s+BuildLabel$/);
    expect(lines.filter(Boolean)[2]).toMatch(/^\s*7\s+4\s+5$/);
  });

  it("reads single members of the version table", async () => {
    expect((await run("$PSVersionTable.PSVersion.Major")).text).toBe("7");
    expect((await run("$PSVersionTable.PSEdition")).text).toBe("Core");
    expect((await run("$PSVersionTable.PSVersion.Minor + 1")).text).toBe("5");
  });

  it("names Taaniel OS in the OS row, not the browser", async () => {
    const { text } = await run("$PSVersionTable");
    expect(text).toMatch(/OS\s+Taaniel OS 11\.0/);
    expect(text).not.toMatch(/Mozilla/);
    expect((await run("$PSVersionTable.OS")).text).toBe("Taaniel OS 11.0");
  });

  it("gives $PWD a Path and keeps printing it as plain text", async () => {
    expect((await run("$PWD.Path")).text).toBe("C:\\Users\\Taaniel\\Desktop");
    expect((await run("$PWD")).text).toBe("C:\\Users\\Taaniel\\Desktop");
    expect((await run('"here: $pwd"')).text).toBe("here: C:\\Users\\Taaniel\\Desktop");
  });

  it("describes the host", async () => {
    expect((await run("$Host.Version")).text).toBe("7.4.5");
    expect((await run("$Host.Name")).text).toBe("ConsoleHost");
    expect((await run("$host")).text).toBe("Taaniel OS terminal (PowerShell 7.4.5)");
  });

  it("does not let a script overwrite $PSVersionTable", async () => {
    const result = await run("$PSVersionTable = 1");
    expect(result.success).toBe(false);
    expect(result.text).toContain("read-only");
  });

  it("reads members of environment variables through the evaluator, not the prototype", async () => {
    expect((await run("$env:USERNAME")).text).toBe("Taaniel");
    expect((await run("$PSVersionTable.constructor")).text).toBe("");
  });
});
