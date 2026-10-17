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

describe("New-Guid, Get-Uptime and Get-Host", () => {
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  it("prints a new GUID as a one-column table, and a different one each time", async () => {
    const first = await run("New-Guid");
    expect(first.lines.filter(Boolean)[0]).toBe("Guid");
    expect(first.lines.filter(Boolean)[1]).toBe("----");
    expect(first.lines.filter(Boolean)[2]).toMatch(GUID);
    const second = await run("New-Guid");
    expect(second.lines.filter(Boolean)[2]).not.toBe(first.lines.filter(Boolean)[2]);
  });

  it("hands a variable just the GUID, and has -Empty", async () => {
    await run("$id = New-Guid");
    expect((await run("$id")).text).toMatch(GUID);
    expect((await run('"id: $id"')).text).toMatch(/^id: [0-9a-f-]{36}$/);
    expect((await run("New-Guid -Empty | % { $_.Guid }")).text).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("reports how long the session has run as a TimeSpan", async () => {
    const { text } = await run("Get-Uptime");
    expect(text).toMatch(/Days\s+: \d+/);
    expect(text).toMatch(/TotalSeconds\s+: [\d.]+/);
    expect((await run("Get-Uptime | % TotalSeconds")).text).toMatch(/^[\d.]+$/);
    expect((await run("Get-Uptime -Since")).lines.filter(Boolean)).toHaveLength(1);
    expect((await run("Get-Uptime -Bogus")).success).toBe(false);
  });

  it("describes the host", async () => {
    const { text } = await run("Get-Host");
    expect(text).toMatch(/Name\s+: ConsoleHost/);
    expect(text).toMatch(/Version\s+: 7\.4\.5/);
    expect(text).not.toMatch(/Microsoft|Windows/);
    expect((await run("Get-Host | % Version")).text).toBe("7.4.5");
  });
});

describe("Invoke-Expression", () => {
  it("runs text through the shell, expressions included", async () => {
    expect((await run("iex 'echo hi'")).text).toBe("hi");
    expect((await run("Invoke-Expression '1 + 1'")).text).toBe("2");
    expect((await run("iex 'echo a; echo b'")).lines).toEqual(["a", "b"]);
    expect((await run("iex echo bare words")).lines).toEqual(["bare", "words"]);
  });

  it("runs each piped string, and lets what it ran change the session", async () => {
    expect((await run("echo 'echo one' 'echo two' | iex")).lines).toEqual(["one", "two"]);
    await run("iex 'cd ..'");
    expect(session.cwd).toBe("/");
  });

  it("hands its output to the next stage and to variables", async () => {
    expect((await run(`iex "echo 'alpha beta'" | sls beta`)).text).toContain("alpha beta");
    await run("$x = iex 'echo captured'");
    expect((await run("$x")).text).toBe("captured");
  });

  it("reports what the text did wrong, and succeeds or fails with it", async () => {
    const bad = await run("iex 'Get-Content nope.txt'");
    expect(bad.success).toBe(false);
    expect(bad.text).toContain("Cannot find path");
    expect((await run("iex 'echo fine'")).success).toBe(true);
    const empty = await run("iex ''");
    expect(empty.success).toBe(false);
    expect(empty.text).toContain("empty string");
  });

  it("never runs JavaScript", async () => {
    await run("iex '(globalThis.pwned = 2)'");
    await run("iex 'globalThis.pwned = 3'");
    expect((globalThis as { pwned?: number }).pwned).toBeUndefined();
  });

  it("stops at the script depth limit when it calls itself", async () => {
    await run("$s = 'iex $s'");
    const result = await run("iex $s");
    expect(result.success).toBe(false);
    expect(result.text).toContain("call depth overflow");
  });

  it("stops when Ctrl+C is pressed", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await run("iex 'echo never'", { signal: controller.signal });
    expect(result.interrupted).toBe(true);
  });
});

describe("Get-Help", () => {
  const BRAND = /microsoft|\bwindows\b/i;

  it("keeps the long-standing default view: NAME, SYNOPSIS, SYNTAX and ALIASES", async () => {
    const { lines } = await run("Get-Help Get-Date");
    expect(lines).toEqual(["", "NAME", "    Get-Date", "", "SYNOPSIS", "    Show the current date and time.", "", "SYNTAX", "    Get-Date", "", "ALIASES", "    date", ""]);
    expect((await run("help ls")).text).toContain("ALIASES\n    ls, dir, gci");
  });

  it("shows examples for a command, by name or alias", async () => {
    const { text } = await run("Get-Help ls -Examples");
    expect(text).toContain("NAME\n    Get-ChildItem");
    expect(text).toContain("-------------------------- EXAMPLE 1 --------------------------");
    expect(text).toContain("PS C:\\> Get-ChildItem");
    expect(text).toContain("Lists the files and folders in the current folder.");
    expect(text).toContain("EXAMPLE 3");
    expect(text).not.toContain("SYNTAX");
    expect((await run("Get-Help -Name Get-Date -Examples")).text).toContain("PS C:\\> Get-Date");
  });

  it("adds PARAMETERS with -Detailed and NOTES with -Full", async () => {
    const detailed = await run("help Get-ChildItem -Detailed");
    expect(detailed.text).toContain("PARAMETERS");
    expect(detailed.text).toContain("-Path <string>");
    expect(detailed.text).toContain("-Recurse [<SwitchParameter>]");
    expect(detailed.text).toContain("-Depth <uint>");
    expect(detailed.text).toContain("EXAMPLES");
    expect(detailed.text).not.toContain("NOTES");

    const full = await run("help Get-ChildItem -Full");
    expect(full.text).toContain("NOTES");
    expect(full.text).toContain("PARAMETERS");
  });

  it("says so when a command has no named parameters", async () => {
    expect((await run("Get-Help Get-Location -Detailed")).text).toContain("This command has no named parameters.");
  });

  it("lists matches for a wildcard as a table, and shows a single match in full", async () => {
    const list = await run("Get-Help Get-*");
    expect(list.lines.filter(Boolean)[0]).toMatch(/^Name\s+Category\s+Synopsis$/);
    expect(list.text).toMatch(/Get-ChildItem\s+Cmdlet\s+List the items in a folder\./);
    expect(list.text).toMatch(/Get-Uptime\s+Cmdlet/);

    const single = await run("Get-Help Get-Dat*");
    expect(single.text).toContain("NAME\n    Get-Date");
    expect((await run("Get-Help Zzz*")).success).toBe(false);
  });

  it("reads about_ topics, and lists them", async () => {
    const topic = await run("Get-Help about_Pipelines");
    expect(topic.text).toContain("TOPIC\n    about_Pipelines");
    expect(topic.text).toContain("SHORT DESCRIPTION");
    expect(topic.text).toContain("LONG DESCRIPTION");
    expect(topic.text).toContain("ls | where Length -gt 1kb");
    expect((await run("help ABOUT_comparison_operators")).text).toContain("-like");

    const list = await run("Get-Help about_*");
    expect(list.text).toMatch(/about_Chain_Operators\s+HelpFile/);
    expect(list.text).toMatch(/about_Terminal_Shortcuts\s+HelpFile/);
    expect((await run("Get-Help about_Terminal_Shortcuts")).text).toContain("F6");
  });

  it("answers `command -?` with help and where to read more", async () => {
    const { text, success } = await run("ls -?");
    expect(success).toBe(true);
    expect(text).toContain("NAME\n    Get-ChildItem");
    expect(text).toContain("REMARKS");
    expect(text).toContain('Get-Help Get-ChildItem -Examples');
    expect((await run("Get-Date -?")).text).toContain("Show the current date and time.");
    // A value that merely looks like the switch is not a request for help.
    expect((await run("echo a -? b")).lines).toEqual(["a", "-?", "b"]);
  });

  it("explains an unknown name and online help", async () => {
    const unknown = await run("Get-Help Nope-Cmdlet");
    expect(unknown.success).toBe(false);
    expect(unknown.text).toContain("Get-Help could not find Nope-Cmdlet in a help file in this session.");
    const online = await run("Get-Help ls -Online");
    expect(online.success).toBe(false);
    expect(online.text).toContain("not available");
    expect((await run("Get-Help ls -Bogus")).success).toBe(false);
  });

  it("has examples for every command, and each starts with a command this shell knows", async () => {
    const listing = (await run("Get-Command -CommandType Cmdlet")).lines.concat((await run("Get-Command -CommandType Function")).lines);
    const names = listing.map((line) => line.split(/\s+/)[1]).filter((word) => word && !/^(Name|----)$/.test(word));
    expect(names.length).toBeGreaterThan(60);

    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const { text } = await run(`Get-Help ${name} -Examples`);
      expect(text, name).not.toContain("There are no examples");
      for (const match of text.matchAll(/PS C:\\> (.+)/g)) {
        for (const stage of match[1].split("|")) {
          const word = stage.trim().split(/\s+/)[0];
          // Quoted values, script blocks and variables head a stage as data, not as a command.
          if (!word || /^['"{$(\d]/.test(word)) continue;
          // eslint-disable-next-line no-await-in-loop
          expect((await run(`Get-Command ${word}`)).success, `${name}: ${word}`).toBe(true);
        }
      }
    }
  });

  it("never names the Windows or Microsoft brand", async () => {
    const listing = (await run("Get-Command -CommandType Cmdlet")).lines;
    for (const line of listing) {
      const name = line.split(/\s+/)[1];
      if (!name || /^(Name|----)$/.test(name)) continue;
      // eslint-disable-next-line no-await-in-loop
      expect((await run(`Get-Help ${name} -Full`)).text, name).not.toMatch(BRAND);
    }
    expect((await run("Get-Help about_*")).text).not.toMatch(BRAND);
    expect((await run("ls -?")).text).not.toMatch(BRAND);
  });
});

describe("Get-Command", () => {
  const BRAND = /microsoft|\bwindows\b/i;

  it("lists the commands, then the apps that start from the prompt", async () => {
    const { lines, text } = await run("Get-Command");
    expect(lines.filter(Boolean)[0]).toMatch(/^CommandType\s+Name$/);
    expect(text).toMatch(/Cmdlet\s+Get-ChildItem/);
    expect(text).toMatch(/Function\s+mkdir/);
    expect(text).toMatch(/Application\s+notepad\.exe/);
    expect(text).toMatch(/Application\s+calc\.exe/);
    // The apps come after every command, and the ms-settings: address is no program.
    expect(text.lastIndexOf("Cmdlet")).toBeLessThan(text.indexOf("Application"));
    expect(text).not.toContain("ms-settings");
  });

  it("describes one name with its version and a neutral source", async () => {
    const app = await run("Get-Command notepad");
    expect(app.lines.filter(Boolean)[0]).toMatch(/^CommandType\s+Name\s+Version\s+Source$/);
    expect(app.text).toMatch(/Application\s+notepad\.exe\s+11\.0\.0\.0\s+C:\\Program Files\\Taaniel OS\\notepad\.exe/);
    expect(app.text).not.toMatch(BRAND);
    expect((await run("gcm notepad.exe")).text).toContain("notepad.exe");

    expect((await run("gcm Get-Date")).text).toMatch(/Cmdlet\s+Get-Date\s+7\.4\.5\s+Taaniel\.Shell/);
    expect((await run("gcm ls")).text).toMatch(/Alias\s+ls -> Get-ChildItem/);
  });

  it("filters by wildcard and command type", async () => {
    const gets = await run("Get-Command Get-*");
    expect(gets.text).toMatch(/Cmdlet\s+Get-Date/);
    expect(gets.text).not.toContain("Application");
    expect(gets.text).not.toMatch(/Function\s+mkdir/);

    const apps = await run("Get-Command -CommandType Application");
    expect(apps.text).toMatch(/Application\s+wt\.exe/);
    expect(apps.text).not.toContain("Cmdlet");

    expect((await run("gcm *.exe")).text).toContain("notepad.exe");
    expect((await run("gcm Zzz*")).lines).toEqual([]);
  });

  it("reports an unknown name, and a bad command type", async () => {
    const unknown = await run("Get-Command nope");
    expect(unknown.success).toBe(false);
    expect(unknown.text).toContain("The term 'nope' is not recognized");
    expect((await run("Get-Command -CommandType Nonsense")).success).toBe(false);
  });
});

describe("Get-ChildItem -Depth", () => {
  const blocks = (text: string) => text.split("\n").filter((line) => line.includes("Directory:"));

  beforeEach(async () => {
    await run("mkdir deep\\one\\two\\three");
    await run("echo x > deep\\one\\two\\three\\f.txt");
  });

  it("goes the given number of levels below the folder", async () => {
    expect(blocks((await run("ls deep -Depth 0")).text)).toHaveLength(1);
    expect(blocks((await run("ls deep -Depth 1")).text)).toHaveLength(2);
    expect(blocks((await run("ls deep -Depth 2")).text)).toHaveLength(3);
    expect(blocks((await run("ls deep -Recurse")).text)).toHaveLength(4);
  });

  it("limits -Recurse too, and does not list what is deeper", async () => {
    const shallow = await run("ls deep -Recurse -Depth 1");
    expect(shallow.text).toContain("two");
    expect(shallow.text).not.toContain("three");
    expect(shallow.text).not.toContain("f.txt");
    expect((await run("ls deep -Recurse -Depth 3")).text).toContain("f.txt");
    expect((await run("ls deep -Depth 3 -File")).text).toContain("f.txt");
  });

  it("works with -Name and as the object pipeline sees it", async () => {
    expect((await run("ls deep -Depth 1 -Name")).lines).toEqual(["one", "two"]);
    expect((await run("ls deep -Depth 1 | % Name")).lines.filter(Boolean)).toEqual(["one", "two"]);
  });

  it("rejects a depth that is not a whole number", async () => {
    for (const bad of ["x", "-1", "1.5"]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await run(`ls deep -Depth ${bad}`);
      expect(result.success).toBe(false);
      expect(result.text).toContain("Cannot bind parameter 'Depth'");
    }
  });
});

describe("Get-PSReadLineKeyHandler", () => {
  it("lists the line editor's keys in PSReadLine's groups", async () => {
    const { text, success } = await run("Get-PSReadLineKeyHandler");
    expect(success).toBe(true);
    expect(text).toContain("Basic editing functions\n=======================");
    expect(text).toMatch(/Enter\s+AcceptLine\s+Run the line/);
    expect(text).toMatch(/Ctrl\+Backspace\s+BackwardKillWord/);
    expect(text).toMatch(/UpArrow\s+PreviousHistory/);
    expect(text).toMatch(/Tab\s+Complete\s/);
  });

  it("lists the terminal's own shortcuts, and names the focus escape key", async () => {
    const { text } = await run("Get-PSReadLineKeyHandler -Bound");
    expect(text).toContain("Terminal functions");
    expect(text).toMatch(/F6\s+Terminal\s+Move focus out of the terminal/);
    expect(text).not.toMatch(/Microsoft|Windows/);
  });

  it("filters through the pipeline like any output", async () => {
    const { lines } = await run("Get-PSReadLineKeyHandler | sls History");
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.every((line) => /history/i.test(line))).toBe(true);
  });

  it("has nothing unbound, and rejects unknown parameters", async () => {
    expect((await run("Get-PSReadLineKeyHandler -Unbound")).lines).toEqual([]);
    expect((await run("Get-PSReadLineKeyHandler -Bogus")).success).toBe(false);
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
