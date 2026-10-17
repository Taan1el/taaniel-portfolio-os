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
  highlightShellInput,
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

describe("pipeline chain operators && and ||", () => {
  it("runs the second command only after the first worked", async () => {
    expect((await run("echo one && echo two")).lines).toEqual(["one", "two"]);
    const failed = await run("Get-Content nope.txt && echo two");
    expect(failed.text).toContain("Cannot find path");
    expect(failed.text).not.toContain("two");
    expect(failed.success).toBe(false);
  });

  it("runs the second command only after the first failed with ||", async () => {
    expect((await run("echo one || echo two")).lines).toEqual(["one"]);
    const recovered = await run("Get-Content nope.txt || echo fallback");
    expect(recovered.lines.at(-1)).toBe("fallback");
    // The chain ends on the command that last ran, and that one worked.
    expect(recovered.success).toBe(true);
  });

  it("chains left to right", async () => {
    expect((await run("Get-Content nope.txt && echo a || echo b")).lines.at(-1)).toBe("b");
    const second = await run("echo a && Get-Content nope.txt || echo b");
    expect(second.lines[0]).toBe("a");
    expect(second.lines.at(-1)).toBe("b");
  });

  it("changes folder and shows it in one line", async () => {
    const { lines } = await run("cd ..\\Documents && pwd");
    expect(lines).toContain("C:\\Users\\Taaniel\\Documents");
    expect(session.cwd).toBe("/Documents");
  });

  it("keeps ; and | working beside it", async () => {
    expect((await run("echo a; echo b && echo c")).lines).toEqual(["a", "b", "c"]);
    expect((await run("echo hello && echo hello | sls ell")).lines.at(-1)).toContain("hello");
  });

  it("is not tripped by quotes, a lone & or a || inside a string", async () => {
    expect((await run("echo 'a && b'")).text).toBe("a && b");
    expect((await run('echo "x || y"')).text).toBe("x || y");
    expect((await run("& echo called")).text).toBe("called");
  });

  it("reports operators with nothing to run", async () => {
    expect((await run("&& echo a")).text).toContain("Unexpected token '&&'");
    expect((await run("echo a &&")).text).toContain("Missing statement after '&&'");
    expect((await run("echo a ||; echo b")).success).toBe(false);
  });

  it("colours the operator and the command after it", () => {
    const line = "cd .. && ls";
    const painted = highlightShellInput(line);
    expect(stripAnsi(painted)).toBe(line);
    expect(painted).toMatch(/\x1b\[90m&&\x1b\[0m \x1b\[93mls/);
  });

  it("completes a command after &&", () => {
    const nodes = useFileSystemStore.getState().nodes;
    expect(completeShellInput("cd .. && Get-Loc", 16, session, nodes).line).toBe("cd .. && Get-Location ");
  });
});

describe("$? and $LASTEXITCODE", () => {
  it("starts as True and 0", async () => {
    expect((await run("$?")).text).toBe("True");
    expect((await run("$LASTEXITCODE")).text).toBe("0");
  });

  it("follows the last command", async () => {
    await run("Get-Content nope.txt");
    expect((await run("$?")).text).toBe("False");
    // Reading $? is itself a statement that worked; expressions leave $LASTEXITCODE alone.
    expect((await run("$?")).text).toBe("True");
    expect((await run("$LASTEXITCODE")).text).toBe("1");
    await run("echo fine");
    expect((await run("$LASTEXITCODE")).text).toBe("0");
  });

  it("is seen by the next statement on the same line", async () => {
    expect((await run("echo fine; echo $LASTEXITCODE")).lines).toEqual(["fine", "0"]);
    expect((await run('Get-Content nope.txt; echo "exit: $LASTEXITCODE"')).lines.at(-1)).toBe("exit: 1");
  });

  it("works inside expressions", async () => {
    await run("Get-Content nope.txt");
    expect((await run("$? -eq $false")).text).toBe("True");
  });

  it("is expanded when its statement runs, not before the line starts", async () => {
    const { lines } = await run("Get-Content nope.txt; echo $?");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Cannot find path");
    expect(lines[1]).toBe("False");
  });

  it("can be assigned over for $LASTEXITCODE only", async () => {
    await run("$LASTEXITCODE = 5");
    expect((await run("$LASTEXITCODE")).text).toBe("5");
  });
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

describe("Join-Path, Split-Path and Resolve-Path", () => {
  it("joins paths with the Windows rules, without needing them to exist", async () => {
    expect((await run("Join-Path C:\\Users\\Taaniel Documents")).text).toBe("C:\\Users\\Taaniel\\Documents");
    expect((await run("Join-Path -Path C:\\a\\ -ChildPath \\b")).text).toBe("C:\\a\\b");
    expect((await run("Join-Path a b c d")).text).toBe("a\\b\\c\\d");
    expect((await run("Join-Path $HOME Documents")).text).toBe("C:\\Users\\Taaniel\\Documents");
    expect((await run("Join-Path $PWD notes.txt")).text).toBe("C:\\Users\\Taaniel\\Desktop\\notes.txt");
  });

  it("joins every piped path, and reports what is missing", async () => {
    expect((await run("echo a b | Join-Path -ChildPath x")).lines).toEqual(["a\\x", "b\\x"]);
    expect((await run("Join-Path a")).success).toBe(false);
    expect((await run("Join-Path")).text).toContain("'Path'");
    expect((await run("Join-Path ~ Documents -Resolve")).success).toBe(true);
    const missing = await run("Join-Path ~ Nope -Resolve");
    expect(missing.success).toBe(false);
    expect(missing.text).toContain("does not exist");
  });

  it("splits a path into its parts", async () => {
    const file = "C:\\Users\\Taaniel\\Documents\\CV.pdf";
    expect((await run(`Split-Path ${file}`)).text).toBe("C:\\Users\\Taaniel\\Documents");
    expect((await run(`Split-Path ${file} -Parent`)).text).toBe("C:\\Users\\Taaniel\\Documents");
    expect((await run(`Split-Path ${file} -Leaf`)).text).toBe("CV.pdf");
    expect((await run(`Split-Path ${file} -LeafBase`)).text).toBe("CV");
    expect((await run(`Split-Path ${file} -Extension`)).text).toBe(".pdf");
    expect((await run(`Split-Path ${file} -Qualifier`)).text).toBe("C:");
    expect((await run(`Split-Path ${file} -NoQualifier`)).text).toBe("\\Users\\Taaniel\\Documents\\CV.pdf");
    expect((await run(`Split-Path ${file} -IsAbsolute`)).text).toBe("True");
    expect((await run("Split-Path Documents -IsAbsolute")).text).toBe("False");
  });

  it("pipes into Split-Path and rejects a path with no drive for -Qualifier", async () => {
    expect((await run("Get-Location | Split-Path -Leaf")).lines.filter(Boolean).at(-1)).toBe("Desktop");
    expect((await run("pwd | Split-Path -Leaf")).lines.filter(Boolean).at(-1)).toBe("Desktop");
    const none = await run("Split-Path Documents\\x -Qualifier");
    expect(none.success).toBe(false);
    expect(none.text).toContain("does not have a qualifier");
    expect((await run("Split-Path a -Leaf -Parent")).success).toBe(false);
  });

  it("takes the parent of $PWD", async () => {
    expect((await run("Split-Path $PWD")).text).toBe("C:\\Users\\Taaniel");
  });

  it("resolves relative paths and wildcards to full paths in a table", async () => {
    const { lines } = await run("Resolve-Path ..\\Documents");
    expect(lines.filter(Boolean)).toEqual(["Path", "----", "C:\\Users\\Taaniel\\Documents"]);
    const wild = await run("Resolve-Path ..\\Doc*");
    expect(wild.text).toContain("C:\\Users\\Taaniel\\Documents");
  });

  it("gives back just the path to a variable", async () => {
    await run("$here = Resolve-Path .");
    expect((await run("$here")).text).toBe("C:\\Users\\Taaniel\\Desktop");
  });

  it("prints relative paths with -Relative and reports a missing one", async () => {
    session = createShellSession("/");
    expect((await run("Resolve-Path Documents -Relative")).lines).toEqual([".\\Documents"]);
    expect((await run("Resolve-Path . -Relative")).lines).toEqual(["."]);
    const missing = await run("Resolve-Path nope");
    expect(missing.success).toBe(false);
    expect(missing.text).toContain("Cannot find path 'C:\\Users\\Taaniel\\nope' because it does not exist.");
    expect((await run("Resolve-Path nope*")).success).toBe(false);
  });
});

describe("ConvertTo-Json and ConvertFrom-Json", () => {
  it("writes piped objects as JSON", async () => {
    const { text } = await run("ls ~ | select Name, PSIsContainer -First 1 | ConvertTo-Json");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(["Name", "PSIsContainer"]);
    expect(typeof parsed.Name).toBe("string");
  });

  it("writes several items as an array, and -Compress on one line", async () => {
    const compact = await run("ls ~ | select Name | ConvertTo-Json -Compress");
    expect(compact.lines).toHaveLength(1);
    expect(Array.isArray(JSON.parse(compact.text))).toBe(true);
    expect((await run("echo hi | ConvertTo-Json -AsArray -Compress")).text).toBe('["hi"]');
  });

  it("writes an argument and rejects a bad depth", async () => {
    expect((await run("ConvertTo-Json 'a b' -Compress")).text).toBe('"a b"');
    const bad = await run("ConvertTo-Json x -Depth 500");
    expect(bad.success).toBe(false);
    expect(bad.text).toContain("valid range");
    expect((await run("ConvertTo-Json")).success).toBe(false);
  });

  it("reads JSON into objects whose members can be piped on", async () => {
    const { text } = await run(`'{"name": "Ada", "age": 36}' | ConvertFrom-Json`);
    expect(text).toMatch(/name\s+age/);
    expect(text).toMatch(/Ada\s+36/);
    expect((await run(`'[{"id": 2}, {"id": 1}]' | ConvertFrom-Json | sort id | % id`)).lines.filter(Boolean)).toEqual(["1", "2"]);
    expect((await run(`'[{"id": 2}, {"id": 1}]' | ConvertFrom-Json | where id -gt 1 | select -ExpandProperty id`)).lines.filter(Boolean)).toEqual(["2"]);
  });

  it("reads JSON from a file", async () => {
    await run(`echo '{"title": "Hello"}' > data.json`);
    expect((await run("cat data.json | ConvertFrom-Json | % title")).lines.filter(Boolean)).toEqual(["Hello"]);
  });

  it("reports invalid JSON and empty input as errors", async () => {
    const bad = await run("'{nope' | ConvertFrom-Json");
    expect(bad.success).toBe(false);
    expect(bad.text).toContain("Conversion from JSON failed");
    expect((await run("ConvertFrom-Json")).success).toBe(false);
  });

  it("round-trips an object", async () => {
    const { text } = await run(`'{"a": {"b": 1}}' | ConvertFrom-Json | ConvertTo-Json -Compress`);
    expect(JSON.parse(text)).toEqual({ a: { b: 1 } });
  });

  it("never runs code that is hidden in the JSON", async () => {
    const result = await run(`'{"x": "(globalThis.pwned = 1)"}' | ConvertFrom-Json`);
    expect(result.success).toBe(true);
    expect((globalThis as { pwned?: number }).pwned).toBeUndefined();
  });
});
