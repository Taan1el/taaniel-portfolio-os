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
  settingsSectionFromUri,
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

describe("offline", () => {
  const offline = (fetchSpy = vi.fn()): ShellHost => ({ isOffline: () => true, fetch: fetchSpy as unknown as typeof fetch });

  it("fails web requests with PowerShell's wording and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    for (const command of ["irm api.github.com/users/Taan1el", "iwr https://example.com", "curl example.com", "wget http://example.com:8080/x"]) {
      const { success, text } = await run(command, offline(fetchSpy));
      expect(success).toBe(false);
      expect(text).toContain("No such host is known.");
    }
    expect((await run("iwr http://example.com:8080/x", offline(fetchSpy))).text).toContain("(example.com:8080)");
    expect((await run("irm api.github.com", offline(fetchSpy))).text).toContain("(api.github.com:443)");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports that ping and Test-Connection cannot find the host", async () => {
    const fetchSpy = vi.fn();
    const pinged = await run("ping github.com", offline(fetchSpy));
    expect(pinged.success).toBe(false);
    expect(pinged.text).toBe("Ping request could not find host github.com. Please check the name and try again.");

    const tested = await run("Test-Connection github.com", offline(fetchSpy));
    expect(tested.text).toContain("Testing connection to computer 'github.com' failed: No such host is known.");
    expect((await run("Test-Connection github.com -Quiet", offline(fetchSpy))).text).toBe("False");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the network as offline in systeminfo", async () => {
    expect((await run("systeminfo", offline())).text).toMatch(/NetworkStatus\s+: Offline/);
    expect((await run("Get-ComputerInfo", { isOffline: () => false })).text).toMatch(/NetworkStatus\s+: Online/);
  });
});

describe("ms-settings: URIs", () => {
  it.each([
    ["ms-settings:display", "display"],
    ["ms-settings:sound", "sound"],
    ["ms-settings:network", "network"],
    ["ms-settings:network-status", "network"],
    ["ms-settings:network-wifi", "network"],
    ["ms-settings:batterysaver", "power"],
    ["ms-settings:powersleep", "power"],
    ["ms-settings:easeofaccess", "accessibility"],
    ["MS-SETTINGS:Personalization", "personalization"],
    ["ms-settings:windowsupdate", "system"],
  ])("%s opens %s", (uri, section) => {
    expect(settingsSectionFromUri(uri)).toBe(section);
  });

  it("launches Settings on that section from start or by name", async () => {
    expect((await run("start ms-settings:display")).actions[0]).toEqual({
      type: "launch-app",
      appId: "settings",
      payload: { section: "display" },
    });
    expect((await run("ms-settings:sound")).actions[0]).toMatchObject({ appId: "settings", payload: { section: "sound" } });
    expect((await run("Start-Process ms-settings:")).actions[0]).toEqual({ type: "launch-app", appId: "settings" });
  });
});

describe("the Linux profile", () => {
  it("says plainly that it opens the emulator, not a Linux install", async () => {
    const { text, actions } = await run("wsl");
    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "v86" });
    expect(text).toContain("Virtual x86");
    expect(text).toContain(".img or .iso");
    expect(text).not.toMatch(/Windows|Microsoft/);
  });
});
