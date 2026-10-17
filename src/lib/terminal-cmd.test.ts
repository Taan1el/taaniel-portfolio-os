import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import { completeCmdInput, formatCmdPrompt, getCmdBanner, highlightCmdInput, MAX_COMMAND_STEPS, runCmdCommand } from "@/lib/terminal-cmd";
import { createShellSession, MAX_OUTPUT_LINES, stripAnsi, type ShellFileSystem, type ShellHost, type ShellSession } from "@/lib/terminal-shell";
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
  const result = await runCmdCommand(input, session, fileSystem, host);
  return { ...result, text: result.lines.map(stripAnsi).join("\n") };
}

const exists = (path: string) => Boolean(useFileSystemStore.getState().nodes[path]);
const contentOf = (path: string) => (useFileSystemStore.getState().nodes[path] as { content?: string } | undefined)?.content;

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/Desktop");
});

describe("the prompt and the banner", () => {
  it("prints the folder as a Windows path", () => {
    expect(formatCmdPrompt("/Desktop")).toBe("C:\\Users\\Taaniel\\Desktop>");
    expect(formatCmdPrompt("/")).toBe("C:\\Users\\Taaniel>");
  });

  it("names Taaniel OS and never the Windows brand", async () => {
    const banner = getCmdBanner().map(stripAnsi).join("\n");
    expect(banner).toContain("Taaniel OS [Version");
    expect(banner).not.toMatch(/Windows|Microsoft/);
    const { text } = await run("ver");
    expect(text).toContain("Taaniel OS [Version");
    expect(text).not.toMatch(/Windows|Microsoft/);
    expect((await run("help")).text).not.toMatch(/Windows|Microsoft/);
  });
});

describe("dir", () => {
  it("lists a folder the way dir prints it", async () => {
    await fileSystem.mkdir("/Desktop/Lab");
    await fileSystem.writeFile("/Desktop/Lab/a.txt", "hello");
    await fileSystem.writeFile("/Desktop/Lab/big.txt", "x".repeat(1234));
    await fileSystem.mkdir("/Desktop/Lab/Sub");
    const { lines } = await run("dir Lab");

    expect(lines[0]).toBe(" Volume in drive C is Taaniel OS");
    expect(lines[1]).toBe(" Volume Serial Number is 7A1C-3E5D");
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe(" Directory of C:\\Users\\Taaniel\\Desktop\\Lab");
    expect(lines[4]).toBe("");
    expect(lines[5]).toMatch(/^\d\d\/\d\d\/\d{4} {2}\d\d:\d\d {4}<DIR> {10}\.$/);
    expect(lines[6]).toMatch(/<DIR> {10}\.\.$/);
    expect(lines[7]).toMatch(/<DIR> {10}Sub$/);
    expect(lines[8]).toMatch(/^\d\d\/\d\d\/\d{4} {2}\d\d:\d\d {17}5 a\.txt$/);
    expect(lines[9]).toMatch(/ {9}1,234 big\.txt$/);
    expect(lines[10]).toBe("               2 File(s)          1,239 bytes");
    expect(lines[11]).toMatch(/^ {15}3 Dir\(s\) {2}128,849,018,880 bytes free$/);
    expect(lines).toHaveLength(12);
  });

  it("lists bare names, folders only and wildcard matches", async () => {
    await fileSystem.mkdir("/Desktop/Lab");
    await fileSystem.writeFile("/Desktop/Lab/a.md", "1");
    await fileSystem.writeFile("/Desktop/Lab/b.txt", "2");
    await fileSystem.mkdir("/Desktop/Lab/Sub");

    expect((await run("dir /b Lab")).lines).toEqual(["Sub", "a.md", "b.txt"]);
    expect((await run("dir Lab\\*.md")).text).toMatch(/a\.md/);
    expect((await run("dir Lab\\*.md")).text).not.toMatch(/b\.txt/);
    expect((await run("dir /ad /b Lab")).lines).toEqual(["Sub"]);
    expect((await run("dir /a-d /b Lab")).lines).toEqual(["a.md", "b.txt"]);
    expect((await run("dir/b Lab")).lines).toEqual(["Sub", "a.md", "b.txt"]);
  });

  it("recurses with /s and totals at the end", async () => {
    await fileSystem.mkdir("/Desktop/Lab");
    await fileSystem.writeFile("/Desktop/Lab/a.txt", "abc");
    await fileSystem.mkdir("/Desktop/Lab/Sub");
    await fileSystem.writeFile("/Desktop/Lab/Sub/b.txt", "abcde");
    const { text } = await run("dir /s Lab");

    expect(text).toContain("Directory of C:\\Users\\Taaniel\\Desktop\\Lab\n");
    expect(text).toContain("Directory of C:\\Users\\Taaniel\\Desktop\\Lab\\Sub");
    expect(text).toContain("Total Files Listed:");
    expect(text).toMatch(/2 File\(s\)\s+8 bytes\n.*Dir\(s\)/);
  });

  it("says File Not Found like cmd does", async () => {
    const { text, success } = await run("dir nothing-here");
    expect(success).toBe(false);
    expect(text).toContain("File Not Found");
    expect((await run("dir /zzz")).text).toContain('Invalid switch - "zzz"');
  });

  it("hides the Recycle Bin unless asked", async () => {
    session.cwd = "/";
    expect((await run("dir /b")).lines).not.toContain(".Trash");
    expect((await run("dir /b")).lines.some((line) => TRASH_PATH.endsWith(line))).toBe(false);
  });
});

describe("navigation", () => {
  it("changes folder, with and without a space, and prints the folder when bare", async () => {
    await run("cd ..\\Documents");
    expect(session.cwd).toBe("/Documents");
    await run("cd..");
    expect(session.cwd).toBe("/");
    await run("cd /d C:\\Users\\Taaniel\\Media");
    expect(session.cwd).toBe("/Media");
    await run("cd\\");
    expect(session.cwd).toBe("/");
    expect((await run("cd Portfolio\\Case Studies")).success).toBe(true);
    expect(session.cwd).toBe("/Portfolio/Case Studies");
    expect((await run("cd")).text).toBe("C:\\Users\\Taaniel\\Portfolio\\Case Studies");
    expect((await run("chdir ..")).success).toBe(true);
  });

  it("reports a missing folder with cmd's wording and drives the C: switch", async () => {
    const missing = await run("cd nowhere");
    expect(missing.success).toBe(false);
    expect(missing.text).toBe("The system cannot find the path specified.");
    expect((await run("C:")).success).toBe(true);
  });

  it("keeps a folder stack with pushd and popd", async () => {
    await run("pushd ..\\Media");
    expect(session.cwd).toBe("/Media");
    await run("popd");
    expect(session.cwd).toBe("/Desktop");
  });
});

describe("files", () => {
  it("writes with > and >>, and reads back with type", async () => {
    await run("echo first line > notes.txt");
    await run("echo second line >> notes.txt");
    expect(contentOf("/Desktop/notes.txt")).toBe("first line\nsecond line");
    expect((await run("type notes.txt")).lines).toEqual(["first line", "second line"]);
  });

  it("prints echo text exactly, including quotes", async () => {
    expect((await run('echo "hi there"')).text).toBe('"hi there"');
    expect((await run("echo.")).lines).toEqual([""]);
    expect((await run("echo")).text).toBe("ECHO is on.");
  });

  it("discards output sent to nul", async () => {
    expect((await run("echo hidden > nul")).lines).toEqual([]);
    expect((await run("type nope.txt 2>nul")).lines).toEqual([]);
    expect(exists("/Desktop/nul")).toBe(false);
  });

  it("makes, renames, copies, moves and deletes", async () => {
    expect((await run("mkdir Reports\\2026")).success).toBe(true);
    expect(exists("/Desktop/Reports/2026")).toBe(true);
    expect((await run("mkdir Reports")).text).toBe("A subdirectory or file Reports already exists.");

    await run("echo hi > a.txt");
    await run("ren a.txt b.txt");
    expect(exists("/Desktop/b.txt")).toBe(true);
    expect(exists("/Desktop/a.txt")).toBe(false);

    const copied = await run("copy b.txt Reports");
    expect(copied.text).toBe("        1 file(s) copied.");
    expect(exists("/Desktop/Reports/b.txt")).toBe(true);

    const moved = await run("move b.txt Reports\\2026");
    expect(moved.text).toBe("        1 file(s) moved.");
    expect(exists("/Desktop/Reports/2026/b.txt")).toBe(true);
    expect(exists("/Desktop/b.txt")).toBe(false);

    await run("del Reports\\b.txt");
    expect(exists("/Desktop/Reports/b.txt")).toBe(false);
    expect(exists(`${TRASH_PATH}/b.txt`)).toBe(true);
  });

  it("will not overwrite without /y, and says why", async () => {
    await run("echo one > a.txt");
    await run("echo two > b.txt");
    const refused = await run("copy a.txt b.txt");
    expect(refused.text).toContain("/y");
    expect(contentOf("/Desktop/b.txt")).toBe("two");
    await run("copy /y a.txt b.txt");
    expect(contentOf("/Desktop/b.txt")).toBe("one");
  });

  it("expands wildcards in del and reports what it cannot find", async () => {
    await run("echo 1 > one.log & echo 2 > two.log & echo keep > keep.txt");
    await run("del *.log");
    expect(exists("/Desktop/one.log")).toBe(false);
    expect(exists("/Desktop/two.log")).toBe(false);
    expect(exists("/Desktop/keep.txt")).toBe(true);
    const missing = await run("del nothing.txt");
    expect(missing.success).toBe(false);
    expect(missing.text).toBe("Could Not Find C:\\Users\\Taaniel\\Desktop\\nothing.txt");
  });

  it("guards non-empty folders and asks for /q before /s", async () => {
    await run("mkdir Old\\Stuff");
    await run("echo x > Old\\Stuff\\x.txt");
    expect((await run("rmdir Old")).text).toBe("The directory is not empty.");
    expect((await run("rd /s Old")).text).toContain("add /q");
    expect(exists("/Desktop/Old")).toBe(true);
    expect((await run("rd /s /q Old")).success).toBe(true);
    expect(exists("/Desktop/Old")).toBe(false);
    expect(exists(`${TRASH_PATH}/Old`)).toBe(true);
  });

  it("refuses to remove read-only portfolio files", async () => {
    const readonly = Object.values(useFileSystemStore.getState().nodes).find((node) => node.kind === "file" && node.readonly);
    if (!readonly) return;
    expect((await run(`del "${readonly.path}"`)).text).toBe("Access is denied.");
    expect(exists(readonly.path)).toBe(true);
  });

  it("reports a missing file with cmd's wording", async () => {
    expect((await run("type nope.txt")).text).toBe("The system cannot find the file specified.");
    expect((await run("ren nope.txt x.txt")).text).toBe("The system cannot find the file specified.");
    expect((await run("copy nope.txt x.txt")).text).toBe("The system cannot find the file specified.");
  });
});

describe("variables", () => {
  it("expands %VAR% and leaves unknown names as typed", async () => {
    expect((await run("echo %USERNAME%")).text).toBe("Taaniel");
    expect((await run("echo %cd%")).text).toBe("C:\\Users\\Taaniel\\Desktop");
    expect((await run("echo %NOPE%")).text).toBe("%NOPE%");
    expect((await run("echo %OS%")).text).toBe("Taaniel_OS");
  });

  it("sets, lists and clears variables, ignoring case", async () => {
    await run("set Greeting=hello");
    expect((await run("echo %GREETING%")).text).toBe("hello");
    expect((await run("set gre")).text).toBe("GREETING=hello");
    expect((await run("set")).text).toContain("USERNAME=Taaniel");
    await run("set greeting=");
    expect((await run("set greeting")).success).toBe(false);
  });

  it("does arithmetic with set /a", async () => {
    expect((await run("set /a 2+3*4")).text).toBe("14");
    await run("set /a total=10/4");
    expect((await run("echo %total%")).text).toBe("2");
    await run("set /a again=total*5");
    expect((await run("echo %again%")).text).toBe("10");
    expect((await run("set /a 1/0")).success).toBe(false);
  });

  it("keeps %ERRORLEVEL% from the last command", async () => {
    await run("type nope.txt");
    expect((await run("echo %ERRORLEVEL%")).text).toBe("1");
    await run("echo ok");
    expect((await run("echo %ERRORLEVEL%")).text).toBe("0");
  });
});

describe("operators", () => {
  it("joins commands with & && and ||", async () => {
    expect((await run("echo a & echo b")).lines).toEqual(["a", "b"]);
    expect((await run("type nope.txt && echo yes")).text).not.toContain("yes");
    expect((await run("type nope.txt || echo fallback")).text).toContain("fallback");
    expect((await run("echo ok && echo next")).lines).toEqual(["ok", "next"]);
    expect((await run("echo ok || echo never")).lines).toEqual(["ok"]);
  });

  it("pipes into find, findstr, sort and more", async () => {
    await run("echo banana > fruit.txt & echo apple >> fruit.txt & echo cherry >> fruit.txt");
    expect((await run("type fruit.txt | sort")).lines).toEqual(["apple", "banana", "cherry"]);
    expect((await run("type fruit.txt | sort /r")).lines).toEqual(["cherry", "banana", "apple"]);
    expect((await run('type fruit.txt | find "an"')).lines).toEqual(["banana"]);
    expect((await run('type fruit.txt | find /v "an"')).lines).toEqual(["apple", "cherry"]);
    expect((await run('type fruit.txt | find /c "a"')).text).toBe("2");
    expect((await run("type fruit.txt | findstr /i APPLE")).lines).toEqual(["apple"]);
    expect((await run("type fruit.txt | more")).lines).toEqual(["banana", "apple", "cherry"]);
  });

  it("treats a ^ as an escape for the next character", async () => {
    expect((await run("echo a ^& b")).text).toBe("a & b");
  });

  it("searches files with find and findstr", async () => {
    await run("echo alpha > words.txt & echo beta >> words.txt & echo alphabet >> words.txt");
    expect((await run("findstr alpha words.txt")).lines).toEqual(["alpha", "alphabet"]);
    expect((await run("findstr /n alpha words.txt")).lines).toEqual(["1:alpha", "3:alphabet"]);
    expect((await run('findstr "alpha beta" words.txt')).lines).toEqual(["alpha", "beta", "alphabet"]);
    expect((await run('findstr /c:"alpha b" words.txt')).success).toBe(false);
    expect((await run("find /n \"beta\" words.txt")).lines).toEqual(["---------- WORDS.TXT", "[2]beta"]);
  });
});

describe("control flow", () => {
  it("tests files and text with if", async () => {
    await run("echo hi > here.txt");
    expect((await run("if exist here.txt echo found")).text).toBe("found");
    expect((await run("if not exist nope.txt echo missing")).text).toBe("missing");
    expect((await run('if "a"=="a" echo same')).text).toBe("same");
    expect((await run('if /i "A"=="a" echo same')).text).toBe("same");
    expect((await run('if "a"=="b" (echo yes) else echo no')).text).toBe("no");
    await run("type nope.txt");
    expect((await run("if errorlevel 1 echo failed")).text).toBe("failed");
  });

  it("loops with for, over words, files and counts", async () => {
    expect((await run("for %i in (a b c) do echo %i")).lines).toEqual(["a", "b", "c"]);
    expect((await run("for /l %n in (1,1,3) do echo n=%n")).lines).toEqual(["n=1", "n=2", "n=3"]);
    await run("echo 1 > x.log & echo 2 > y.log");
    expect((await run("for %f in (*.log) do echo %f")).lines).toEqual(["x.log", "y.log"]);
  });

  it("caps loops", async () => {
    const { lines } = await run("for /l %n in (1,1,999999) do rem");
    expect(lines).toEqual([]);
    const counted = await run("for /l %n in (1,1,999999) do echo x");
    expect(counted.lines.length).toBe(1000);
  });
});

describe("launching", () => {
  it("opens apps by name, with the PowerShell engine's actions", async () => {
    expect((await run("notepad")).actions[0]).toMatchObject({ type: "launch-app", appId: "notes" });
    expect((await run("calc.exe")).actions[0]).toMatchObject({ type: "launch-app", appId: "calculator" });
    expect((await run("start https://github.com")).actions[0]).toMatchObject({
      type: "launch-app",
      appId: "browser",
      payload: { externalUrl: "https://github.com" },
    });
    expect((await run('start "" https://github.com')).actions[0]).toMatchObject({ appId: "browser" });
    expect((await run("explorer .")).actions[0]).toMatchObject({ type: "launch-app", appId: "files", payload: { directoryPath: "/Desktop" } });
    expect((await run("ms-settings:display")).actions[0]).toMatchObject({ appId: "settings", payload: { section: "display" } });
  });

  it("opens a new tab for powershell and for a bare start", async () => {
    expect((await run("powershell")).actions[0]).toMatchObject({ type: "open-tab", profile: "pwsh" });
    expect((await run("start")).actions[0]).toMatchObject({ type: "open-tab", profile: "cmd" });
  });

  it("opens a document when its path is typed", async () => {
    expect((await run("..\\Documents\\Taaniel-Vananurm-CV.pdf")).actions[0]).toEqual({ type: "open-path", path: "/Documents/Taaniel-Vananurm-CV.pdf" });
  });

  it("boots the emulator for wsl through the Linux profile route", async () => {
    // wsl is not a cmd built-in: it is an executable, handled by the PowerShell engine.
    const { actions, text } = await run("wsl");
    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "v86" });
    expect(text).toContain("Virtual x86");
  });

  it("closes and renames the tab", async () => {
    expect((await run("exit")).actions).toEqual([{ type: "exit" }]);
    expect((await run("title Build logs")).actions).toEqual([{ type: "set-title", title: "Build logs" }]);
  });

  it("never launches an app for a typo, and reports it as cmd does", async () => {
    const { text, success, actions } = await run("calcc");
    expect(success).toBe(false);
    expect(actions).toEqual([]);
    expect(text).toBe("'calcc' is not recognized as an internal or external command,\noperable program or batch file.");
    expect((await run("constructor")).text).toContain("is not recognized");
    expect((await run("__proto__")).text).toContain("is not recognized");
  });
});

describe("the system", () => {
  const processes: ShellHost = {
    listProcesses: () => [
      { id: "process-a", name: "notes", title: "Notes", minimized: false },
      { id: "process-b", name: "terminal", title: "Terminal", minimized: false },
    ],
    stopProcess: vi.fn(),
  };

  it("lists apps with tasklist and closes them with taskkill", async () => {
    const listing = await run("tasklist", processes);
    expect(listing.text).toMatch(/Image Name\s+PID Session Name/);
    expect(listing.text).toMatch(/notes\s+\d+ Console/);

    const killed = await run("taskkill /im notes", processes);
    expect(killed.text).toMatch(/SUCCESS: Sent termination signal to the process "notes" with PID \d+\./);
    expect(processes.stopProcess).toHaveBeenCalledWith("process-a");
    expect((await run("taskkill /im nope", processes)).text).toBe('ERROR: The process "nope" not found.');
  });

  it("answers date, time, whoami, hostname, vol and tree", async () => {
    expect((await run("date /t")).text).toMatch(/^\w{3} \d\d\/\d\d\/\d{4}$/);
    expect((await run("time /t")).text).toMatch(/^\d\d:\d\d$/);
    expect((await run("whoami")).text).toBe("taaniel-pc\\taaniel");
    expect((await run("hostname")).text).toBe("TAANIEL-PC");
    expect((await run("vol")).text).toContain("Taaniel OS");
    expect((await run("tree /Portfolio /F")).text).toContain("C:\\USERS\\TAANIEL\\PORTFOLIO");
  });

  it("goes offline with the tray", async () => {
    const fetchSpy = vi.fn();
    const offline: ShellHost = { isOffline: () => true, fetch: fetchSpy as unknown as typeof fetch };
    expect((await run("ipconfig", offline)).text).toContain("Offline");
    expect((await run("ping github.com", offline)).success).toBe(false);
    expect((await run("curl example.com", offline)).text).toContain("No such host is known.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stops on Ctrl+C", async () => {
    const controller = new AbortController();
    controller.abort();
    expect((await run("echo hi", { signal: controller.signal })).interrupted).toBe(true);
    const sleeping = new AbortController();
    const pending = run("powershell -c 1 & ping github.com", { signal: sleeping.signal, fetch: (() => new Promise(() => {})) as unknown as typeof fetch });
    sleeping.abort();
    expect((await pending).interrupted).toBe(true);
  });
});

describe("loops cannot run away", () => {
  it("still runs an ordinary loop to the end", async () => {
    const { lines, success } = await run("for /l %a in (1,1,1000) do echo %a");
    expect(success).toBe(true);
    expect(lines).toHaveLength(1000);
    expect(lines.at(-1)).toBe("1000");
  });

  it("stops nested loops after a fixed number of commands, keeping what they printed", async () => {
    const started = Date.now();
    const { lines, success, interrupted } = await run("for /l %a in (1,1,1000) do for /l %b in (1,1,1000) do echo x");
    expect(interrupted).toBeUndefined();
    expect(success).toBe(false);
    expect(lines.at(-1)).toBe(`The command was stopped after ${MAX_COMMAND_STEPS} steps.`);
    expect(lines.length).toBeGreaterThan(1000);
    expect(lines.length).toBeLessThanOrEqual(MAX_COMMAND_STEPS + 1);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("counts a loop three deep the same way, instead of running a billion commands", async () => {
    const { text, success } = await run("for /l %a in (1,1,1000) do for /l %b in (1,1,1000) do for /l %c in (1,1,1000) do echo x");
    expect(success).toBe(false);
    expect(text).toContain("stopped after");
  });

  it("caps the output of a loop at the output limit", async () => {
    await fileSystem.writeFile("/Desktop/big.txt", Array.from({ length: 1000 }, (_, index) => `line ${index}`).join("\n"));
    const { lines, success } = await run("for /l %a in (1,1,100) do type big.txt");
    expect(success).toBe(false);
    expect(lines).toHaveLength(MAX_OUTPUT_LINES + 1);
    expect(lines.at(-1)).toBe(`Output stopped after ${MAX_OUTPUT_LINES} lines.`);
  });

  it("caps what a single command prints too", async () => {
    await fileSystem.writeFile("/Desktop/huge.txt", Array.from({ length: MAX_OUTPUT_LINES + 500 }, (_, index) => `l${index}`).join("\n"));
    const { lines } = await run("type huge.txt");
    expect(lines).toHaveLength(MAX_OUTPUT_LINES + 1);
  });

  it("listens for Ctrl+C while a loop runs", async () => {
    const controller = new AbortController();
    const pending = run("for /l %a in (1,1,1000) do for /l %b in (1,1,1000) do echo x", { signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    const result = await pending;
    expect(result.interrupted).toBe(true);
    expect(result.lines).toEqual([]);
  });

  it("gives a plain line a step budget of its own each time", async () => {
    await run("for /l %a in (1,1,9000) do rem");
    expect((await run("echo again")).text).toBe("again");
  });
});

describe("completion and highlighting", () => {
  it("completes command names and paths with & as a separator", () => {
    const nodes = useFileSystemStore.getState().nodes;
    expect(completeCmdInput("ech", 3, session, nodes).line).toBe("echo ");
    expect(completeCmdInput("dir & rm", 8, session, nodes).line).toBe("dir & rmdir ");
    expect(completeCmdInput("d", 1, session, nodes).candidates).toEqual(expect.arrayContaining(["date", "del", "dir"]));
    session.cwd = "/";
    expect(completeCmdInput("cd Doc", 6, session, nodes).line).toBe("cd Documents\\");
    expect(completeCmdInput("Get-Chi", 7, session, nodes).candidates).toEqual([]);
  });

  it("quotes a name with spaces in double quotes, which cmd can read back", async () => {
    const nodes = () => useFileSystemStore.getState().nodes;
    session.cwd = "/Portfolio";
    const folder = completeCmdInput("cd Ca", 5, session, nodes());
    expect(folder.line).toBe('cd "Case Studies\\"');
    // The completed line has to run: this is what the single quotes of PowerShell broke.
    expect((await run(folder.line)).success).toBe(true);
    expect(session.cwd).toBe("/Portfolio/Case Studies");

    session.cwd = "/Desktop";
    await fileSystem.writeFile("/Desktop/My file.txt", "hello there");
    const file = completeCmdInput("type My", 7, session, nodes());
    expect(file.line).toBe('type "My file.txt"');
    expect((await run(file.line)).text).toBe("hello there");
  });

  it("treats a leading double quote as the start of a quoted name, and keeps it", async () => {
    await fileSystem.writeFile("/Desktop/My file.txt", "x");
    const nodes = useFileSystemStore.getState().nodes;
    expect(completeCmdInput('type "My f', 10, session, nodes).line).toBe('type "My file.txt"');
    expect(completeCmdInput('type "My', 8, session, nodes).line).toBe('type "My file.txt"');
  });

  it("does not take a single quote for a quote, or offer PowerShell parameter names", async () => {
    await fileSystem.writeFile("/Desktop/My file.txt", "x");
    const nodes = useFileSystemStore.getState().nodes;
    expect(completeCmdInput("type 'My", 8, session, nodes)).toMatchObject({ line: "type 'My", candidates: [] });
    expect(completeCmdInput("dir -Rec", 8, session, nodes)).toMatchObject({ line: "dir -Rec", candidates: [] });
  });

  it("leaves typed text uncoloured", () => {
    expect(highlightCmdInput("dir /b | find \"x\"")).toBe("dir /b | find \"x\"");
  });
});
