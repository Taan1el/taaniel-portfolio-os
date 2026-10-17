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
  isScriptBlock,
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
  return { ...result, text: result.lines.map(stripAnsi).join("\n"), lines: result.lines.map(stripAnsi) };
}

/** A folder with files of known sizes: 3, 10, 2 and 6 characters. */
async function makeLab() {
  await run("mkdir Lab");
  session.cwd = "/Desktop/Lab";
  await fileSystem.writeFile("/Desktop/Lab/a.md", "aaa");
  await fileSystem.writeFile("/Desktop/Lab/b.md", "bbbbbbbbbb");
  await fileSystem.writeFile("/Desktop/Lab/c.txt", "cc");
  await fileSystem.writeFile("/Desktop/Lab/d.txt", "dddddd");
  await fileSystem.mkdir("/Desktop/Lab/Sub");
}

const processes: ShellHost = {
  listProcesses: () => [
    { id: "process-a", name: "notes", title: "Notes", minimized: false },
    { id: "process-b", name: "terminal", title: "Terminal", minimized: true },
    { id: "process-c", name: "files", title: "Documents", minimized: false },
  ],
};

beforeEach(async () => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/Desktop");
});

describe("script block tokens", () => {
  it("keeps a { block } as one word and leaves its variables alone", async () => {
    expect(isScriptBlock("{ $_.Length }")).toBe(true);
    expect(isScriptBlock("{")).toBe(false);
    expect((await run("echo { $_.Name }")).text).toBe("{ $_.Name }");
    expect((await run("echo {a} {b}")).lines).toEqual(["{a}", "{b}"]);
  });

  it("does not treat a lone brace or a hash literal as a block", async () => {
    expect((await run("echo {")).text).toBe("{");
    expect((await run("echo @{a=1}")).text).toBe("@{a=1}");
  });
});

describe("Get-ChildItem objects", () => {
  it("keeps the default listing exactly as it was", async () => {
    await makeLab();
    const { lines } = await run("ls");
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("    Directory: C:\\Users\\Taaniel\\Desktop\\Lab");
    expect(lines[3]).toMatch(/^Mode\s+LastWriteTime\s+Length Name$/);
    expect(lines.some((line) => /^d----.*\sSub$/.test(line))).toBe(true);
    expect(lines.some((line) => /^-a---.*\s10 b\.md$/.test(line))).toBe(true);
  });

  it("filters with the simplified Where-Object syntax", async () => {
    await makeLab();
    const { text } = await run("ls | where Length -gt 5");
    expect(text).toMatch(/b\.md/);
    expect(text).toMatch(/d\.txt/);
    expect(text).not.toMatch(/a\.md/);
    expect(text).not.toMatch(/c\.txt/);
    expect(text).toContain("Directory: C:\\Users\\Taaniel\\Desktop\\Lab");
  });

  it("filters with a script block", async () => {
    await makeLab();
    const { text } = await run("ls | where { $_.Length -gt 2 -and $_.Name -like '*.md' }");
    expect(text).toMatch(/a\.md/);
    expect(text).toMatch(/b\.md/);
    expect(text).not.toMatch(/\.txt/);
  });

  it("reads size suffixes and operators in both syntaxes", async () => {
    // In its own folder: the Desktop holds 1 KB shortcut files.
    await makeLab();
    await fileSystem.writeFile("/Desktop/Lab/big.txt", "x".repeat(2048));
    expect((await run("ls | where Length -ge 1kb | select -ExpandProperty Name")).text).toBe("big.txt");
    expect((await run("ls | ? { $_.Length -ge 1kb } | select -ExpandProperty Name")).text).toBe("big.txt");
    expect((await run("ls | where -Property Name -Like -Value big*")).text).toContain("big.txt");
  });

  it("selects properties into a table", async () => {
    await makeLab();
    const { lines } = await run("ls -File | select Name, Length");
    expect(lines).toEqual(["", "Name  Length", "----  ------", "a.md       3", "b.md      10", "c.txt      2", "d.txt      6", ""]);
  });

  it("expands one property into plain text", async () => {
    await makeLab();
    expect((await run("ls -File | select -ExpandProperty Name")).lines).toEqual(["a.md", "b.md", "c.txt", "d.txt"]);
    expect((await run("ls -File | ForEach-Object -MemberName Name")).lines).toEqual(["a.md", "b.md", "c.txt", "d.txt"]);
  });

  it("sorts by a property, a descending property and an expression", async () => {
    await makeLab();
    expect((await run("ls -File | sort Length -Descending | select -ExpandProperty Name")).lines).toEqual(["b.md", "d.txt", "a.md", "c.txt"]);
    expect((await run("ls -File | sort -Property Name -Descending | select -First 1 -ExpandProperty Name")).text).toBe("d.txt");
    expect((await run("ls -File | sort { $_.Length } | select -First 2 -ExpandProperty Name")).lines).toEqual(["c.txt", "a.md"]);
  });

  it("sorts by several properties", async () => {
    await makeLab();
    const { lines } = await run("ls -File | sort Extension, Length -Descending | select -ExpandProperty Name");
    expect(lines).toEqual(["d.txt", "c.txt", "b.md", "a.md"]);
  });

  it("takes the first items as rows, not as text lines", async () => {
    await makeLab();
    const { lines } = await run("ls -File | select -First 2");
    expect(lines.filter((line) => /\.md$/.test(line))).toHaveLength(2);
    expect(lines.join("\n")).not.toMatch(/\.txt/);
  });

  it("runs ForEach-Object with $_ and string interpolation", async () => {
    await makeLab();
    expect((await run("ls -File | ForEach-Object { $_.Name }")).lines).toEqual(["a.md", "b.md", "c.txt", "d.txt"]);
    expect((await run('ls *.md | % { "$($_.Name): $($_.Length) bytes" }')).lines).toEqual(["a.md: 3 bytes", "b.md: 10 bytes"]);
    expect((await run("ls -File | % { $_.Length * 2 } | measure -Sum")).text).toMatch(/Sum\s+: 42/);
  });

  it("measures a property", async () => {
    await makeLab();
    const { text } = await run("ls -File | measure Length -Sum -Average -Maximum -Minimum");
    expect(text).toMatch(/Count\s+: 4/);
    expect(text).toMatch(/Sum\s+: 21/);
    expect(text).toMatch(/Average\s+: 5\.25/);
    expect(text).toMatch(/Maximum\s+: 10/);
    expect(text).toMatch(/Minimum\s+: 2/);
    expect(text).toMatch(/Property\s+: Length/);
    expect((await run("ls | measure")).text).toMatch(/Count\s+: 5/);
  });

  it("formats tables and lists", async () => {
    await makeLab();
    const table = await run("ls -File | Format-Table Name, Length");
    expect(table.lines).toEqual(["", "Name  Length", "----  ------", "a.md       3", "b.md      10", "c.txt      2", "d.txt      6", ""]);

    const list = await run("ls a.md | fl Name, Length");
    expect(list.lines).toEqual(["", "Name   : a.md", "Length : 3", ""]);

    const everything = await run("ls a.md | fl *");
    expect(everything.text).toMatch(/FullName\s+: C:\\Users\\Taaniel\\Desktop\\Lab\\a\.md/);
    expect(everything.text).toMatch(/Extension\s+: \.md/);
  });

  it("shows file objects with Format-Table as the usual listing", async () => {
    await makeLab();
    expect((await run("ls | ft")).text).toBe((await run("ls")).text);
  });

  it("keeps text pipelines working next to objects", async () => {
    await makeLab();
    expect((await run("ls | sls md")).text).toMatch(/a\.md/);
    expect((await run("ls -Name | sort -Descending")).lines).toEqual(["Sub", "d.txt", "c.txt", "b.md", "a.md"]);
    await run("echo c b a > letters.txt");
    expect((await run("cat letters.txt | sort")).text).toBe("a\nb\nc");
    expect((await run("cat letters.txt | select -First 1")).text).toBe("c");
    expect((await run("cat letters.txt | where { $_ -ne 'b' }")).lines).toEqual(["c", "a"]);
  });

  it("writes object output to files as the text it printed", async () => {
    await makeLab();
    await run("ls -File | select -ExpandProperty Name > names.txt");
    expect((await run("cat names.txt")).lines).toEqual(["a.md", "b.md", "c.txt", "d.txt"]);
  });
});

describe("Get-Process objects", () => {
  it("keeps the default table", async () => {
    const { lines } = await run("Get-Process", processes);
    expect(lines[1]).toMatch(/^\s+Id ProcessName\s+Status\s+MainWindowTitle$/);
    expect(lines.join("\n")).toMatch(/notes\s+Running\s+Notes/);
    expect(lines.join("\n")).toMatch(/terminal\s+Minimized\s+Terminal/);
  });

  it("filters, sorts and selects", async () => {
    expect((await run("ps | where Status -eq Minimized | select -ExpandProperty ProcessName", processes)).text).toBe("terminal");
    expect((await run("ps | sort ProcessName | select -ExpandProperty Name", processes)).lines).toEqual(["files", "notes", "terminal"]);
    const table = await run("ps | select ProcessName, Status", processes);
    expect(table.lines[1]).toBe("ProcessName Status");
    expect(table.text).toMatch(/notes\s+Running/);
  });

  it("shows the process table again after filtering", async () => {
    const { lines } = await run("ps | where { $_.Name -like 'n*' }", processes);
    expect(lines[1]).toMatch(/Id ProcessName\s+Status/);
    expect(lines.join("\n")).toMatch(/notes\s+Running/);
    expect(lines.join("\n")).not.toMatch(/terminal/);
  });

  it("lists every property with Format-List", async () => {
    const { text } = await run("ps notes | fl *", processes);
    expect(text).toMatch(/ProcessName\s+: notes/);
    expect(text).toMatch(/MainWindowTitle\s+: Notes/);
  });
});

describe("script blocks are never code", () => {
  it("reports blocks that are not a single expression", async () => {
    await makeLab();
    const { text, success } = await run("ls | where { Get-Date }");
    expect(success).toBe(false);
    expect(text).toContain("single expression");
  });

  it("does not run JavaScript from a block", async () => {
    await makeLab();
    await run("ls | where { (globalThis.pwned = 1) }");
    await run("ls | % { globalThis.pwned = 1 }");
    expect((globalThis as { pwned?: number }).pwned).toBeUndefined();
  });

  it("reports an expression error once, not per item", async () => {
    await makeLab();
    const { text, success } = await run("ls | where { 1 / 0 }");
    expect(success).toBe(false);
    expect(text.match(/divide by zero/g)).toHaveLength(1);
  });

  it("caps the work a pipeline may do", async () => {
    await makeLab();
    const { text, success } = await run("ls | % { 'x' * 999999 * 999999 }");
    expect(success).toBe(false);
    expect(text).toContain("too long");
  });
});

describe("expressions at the prompt", () => {
  it("reads members of session variables", async () => {
    await run("$name = 'Taaniel'");
    expect((await run("$name.Length")).text).toBe("7");
  });

  it("combines comparisons with -and / -or by precedence", async () => {
    expect((await run("1 -eq 1 -and 2 -eq 2")).text).toBe("True");
    expect((await run("1 -eq 2 -or 3 -gt 2")).text).toBe("True");
    expect((await run("5 -gt 3 -and 2 -lt 1")).text).toBe("False");
  });

  it("evaluates subexpressions inside double quotes", async () => {
    expect((await run('"2 + 2 = $(2 + 2)"')).text).toBe("2 + 2 = 4");
    expect((await run('echo "sum: $(1 + 2)"')).text).toBe("sum: 3");
  });

  it("refuses to build giant strings", async () => {
    const { text, success } = await run("'a' * 99999999");
    expect(success).toBe(false);
    expect(text).toContain("too long");
  });
});
