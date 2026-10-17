import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { runCmdCommand } from "@/lib/terminal-cmd";
import { createShellSession, runShellCommand, stripAnsi, type ShellFileSystem, type ShellSession } from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";

/*
 * This is the owner's own OS: a visitor reading the terminal must never see
 * the Windows or Microsoft name. (Product names like "PowerShell", "Command
 * Prompt" and "File Explorer" are fine, and so are the C:\Users\... paths.)
 */

const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

const BRAND = /microsoft|\bwindows\b/i;

let session: ShellSession;

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/");
});

const POWERSHELL_COMMANDS = [
  "help",
  "Get-Help",
  "Get-Command",
  "$PSVersionTable",
  "Get-ComputerInfo",
  "systeminfo",
  "hostname",
  "whoami",
  "ver",
  "winver",
  "Get-Process",
  "Get-Date",
  "Get-Location",
  "about",
  "neofetch",
  "Get-Alias",
  "Get-Service",
  "Get-Variable",
  "Get-ChildItem Env:",
  "$env:OS",
  "echo $env:COMPUTERNAME",
  "Get-Volume",
  "Get-PSDrive",
  "Get-ItemProperty .",
  "ls | Format-List",
  "tree",
];

const CMD_COMMANDS = ["help", "ver", "systeminfo", "hostname", "whoami", "set", "vol", "dir", "date /t", "echo %OS%", "tasklist", "path"];

describe("no Windows or Microsoft branding in what the shells print", () => {
  it.each(POWERSHELL_COMMANDS)("PowerShell: %s", async (command) => {
    const result = await runShellCommand(command, session, fileSystem, {});
    expect(result.lines.map(stripAnsi).join("\n")).not.toMatch(BRAND);
  });

  it.each(CMD_COMMANDS)("Command Prompt: %s", async (command) => {
    const result = await runCmdCommand(command, session, fileSystem, {});
    expect(result.lines.map(stripAnsi).join("\n")).not.toMatch(BRAND);
  });
});
