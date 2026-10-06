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
  sanitizeForTerminal,
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

describe("expressions (no eval)", () => {
  it.each([
    ["2 + 3 * 4", "14"],
    ["(2 + 3) * 4", "20"],
    ["10 / 4", "2.5"],
    ["1 / 3", "0.333333333333333"],
    ["-5 + 2", "-3"],
    ["'ab' * 3", "ababab"],
    ["5 -gt 3", "True"],
    ["'Hello' -eq 'hello'", "True"],
    ["'report.md' -like '*.md'", "True"],
    ["1kb", "1024"],
  ])("%s = %s", async (input, expected) => {
    expect((await run(input)).text).toBe(expected);
  });

  it("reports division by zero like PowerShell", async () => {
    const { text, success } = await run("1 / 0");
    expect(success).toBe(false);
    expect(text).toContain("Attempted to divide by zero.");
  });

  it("does not execute JavaScript", async () => {
    const { text } = await run("(globalThis.pwned = 1)");
    expect((globalThis as { pwned?: number }).pwned).toBeUndefined();
    expect(text).not.toBe("1");
  });
});

describe("variables", () => {
  it("assigns, interpolates and updates", async () => {
    await run('$name = "Taaniel"');
    expect((await run('"Hello $name"')).text).toBe("Hello Taaniel");

    await run("$x = 5");
    await run("$x += 2");
    expect((await run("$x")).text).toBe("7");
    expect((await run("echo $x")).text).toBe("7");
  });

  it("captures command output", async () => {
    await run("$greeting = echo hi");
    expect(session.variables.greeting).toBe("hi");
  });

  it("protects automatic variables", async () => {
    const { success, text } = await run("$true = 1");
    expect(success).toBe(false);
    expect(text).toContain("read-only");
  });

  it("prints $PSVersionTable as a table", async () => {
    expect((await run("$PSVersionTable")).text).toMatch(/PSVersion\s+7\.4\.5/);
  });
});

describe("host commands", () => {
  it("colours Write-Host output", async () => {
    const { lines } = await run("Write-Host hi -ForegroundColor Red");
    expect(lines[0]).toBe("\x1b[91mhi\x1b[0m");
  });

  it("lists and stops real processes through the host", async () => {
    const stopProcess = vi.fn();
    const host: ShellHost = {
      listProcesses: () => [
        { id: "process-a", name: "notes", title: "Notes", minimized: false },
        { id: "process-b", name: "terminal", title: "Terminal", minimized: false },
      ],
      stopProcess,
    };

    const listing = await run("Get-Process", host);
    expect(listing.text).toMatch(/notes\s+Running\s+Notes/);

    await run("kill -Name notes", host);
    expect(stopProcess).toHaveBeenCalledWith("process-a");

    const missing = await run("Stop-Process -Name nope", host);
    expect(missing.text).toContain('Cannot find a process with the name "nope"');
  });

  it("hashes files with real SHA-256", async () => {
    await run("Set-Content abc.txt abc");
    const { text } = await run("Get-FileHash abc.txt");
    expect(text).toContain("BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
  });

  it("checks paths and keeps a location stack", async () => {
    expect((await run("Test-Path ..\\Documents")).text).toBe("True");
    expect((await run("Test-Path nope")).text).toBe("False");
    await run("pushd /Media");
    expect(session.cwd).toBe("/Media");
    await run("popd");
    expect(session.cwd).toBe("/Desktop");
  });

  it("boots the Linux VM for wsl", async () => {
    expect((await run("wsl")).actions[0]).toMatchObject({ type: "launch-app", appId: "v86" });
  });
});

describe("web requests are anonymous and bounded", () => {
  it("never sends cookies or a referrer", async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ login: "Taan1el", public_repos: 12 }), { status: 200 }));
    const { text } = await run("irm api.github.com/users/Taan1el", { fetch: fetchSpy as unknown as typeof fetch });

    expect(text).toMatch(/login\s+: Taan1el/);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/users/Taan1el");
    expect(init.credentials).toBe("omit");
    expect(init.referrerPolicy).toBe("no-referrer");
  });

  it("refuses non-web schemes and write methods", async () => {
    const fetchSpy = vi.fn();
    expect((await run("iwr file:///C:/secrets.txt", { fetch: fetchSpy })).success).toBe(false);
    expect((await run("iwr https://example.com -Method POST", { fetch: fetchSpy })).success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("explains CORS failures", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { text } = await run("curl example.com", { fetch: fetchSpy as unknown as typeof fetch });
    expect(text).toContain("CORS");
  });

  it("strips escape sequences from responses", async () => {
    const fetchSpy = vi.fn(async () => new Response("safe\x1b]0;pwned\x07text", { status: 200 }));
    const { lines } = await run("irm example.com/raw", { fetch: fetchSpy as unknown as typeof fetch });
    expect(lines.join("")).not.toContain("\x1b]");
    expect(lines.join("")).not.toContain("\x07");
  });
});

describe("terminal hardening", () => {
  it("removes control characters but keeps text, tabs and newlines", () => {
    expect(sanitizeForTerminal("a\x1b[31mb\tc\nd\x07\x9b")).toBe("a[31mb\tc\nd");
  });

  it("does not let file contents drive the terminal", async () => {
    await useFileSystemStore.getState().writeFile("/Desktop/evil.txt", "hello\x1b]52;c;cHduZWQ=\x07world");
    const { lines } = await run("cat evil.txt");
    expect(lines.join("")).not.toMatch(/[\x1b\x07]/);
  });

  it("runs .ps1 scripts and stops runaway recursion", async () => {
    await useFileSystemStore.getState().writeFile("/Desktop/hello.ps1", "# greeting\necho one\necho two");
    expect((await run(".\\hello.ps1")).text).toBe("one\ntwo");

    await useFileSystemStore.getState().writeFile("/Desktop/loop.ps1", ".\\loop.ps1");
    const looped = await run(".\\loop.ps1");
    expect(looped.success).toBe(false);
    expect(looped.text).toContain("call depth overflow");
  });
});
