import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import {
  completeShellInput,
  createShellSession,
  formatPrompt,
  runShellCommand,
  stripAnsi,
  type ShellFileSystem,
  type ShellSession,
} from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";

/** Backed by the real filesystem store - the same one File Explorer renders. */
const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

let session: ShellSession;

async function run(input: string) {
  const result = await runShellCommand(input, session, fileSystem);
  return { ...result, text: result.lines.map(stripAnsi).join("\n") };
}

const exists = (path: string) => Boolean(useFileSystemStore.getState().nodes[path]);
const contentOf = (path: string) => useFileSystemStore.getState().nodes[path] as { content?: string } | undefined;

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
  session = createShellSession("/Desktop");
});

describe("terminal shell: reading", () => {
  it("lists a folder as a Get-ChildItem table", async () => {
    const { text, success } = await run("ls /Media");

    expect(success).toBe(true);
    expect(text).toContain("Directory: C:\\Users\\Taaniel\\Media");
    expect(text).toMatch(/d----.*Photography/);
    expect(text).toMatch(/d----.*Music/);
  });

  it("prints the prompt as a Windows path", () => {
    expect(formatPrompt("/Desktop")).toBe("PS C:\\Users\\Taaniel\\Desktop> ");
    expect(formatPrompt("/")).toBe("PS C:\\Users\\Taaniel> ");
  });

  it("prints a file with spaces in its path when quoted", async () => {
    const double = await run('cat "/Documents/Notes/To-do list.txt"');
    const single = await run("cat 'C:\\Users\\Taaniel\\Documents\\Notes\\To-do list.txt'");

    expect(double.text).toMatch(/To-do list/i);
    expect(single.text).toBe(double.text);
  });

  it("reports a missing path with PowerShell's wording", async () => {
    const { text, success } = await run("cat nope.txt");

    expect(success).toBe(false);
    expect(text).toBe("Get-Content: Cannot find path 'C:\\Users\\Taaniel\\Desktop\\nope.txt' because it does not exist.");
  });

  it("refuses to cat a folder", async () => {
    const { text } = await run("cat ..\\Documents");
    expect(text).toContain("Unable to get content because it is a directory");
  });

  it("draws a folder tree", async () => {
    const { text } = await run("tree /Portfolio /F");
    expect(text).toContain("C:\\USERS\\TAANIEL\\PORTFOLIO");
    expect(text).toMatch(/[└├]───Case Studies/);
    expect(text).toContain("OS-Case-Study.md");
  });
});

describe("terminal shell: navigation", () => {
  it("resolves relative, Windows, home and case-insensitive paths", async () => {
    await run("cd ../Documents");
    expect(session.cwd).toBe("/Documents");

    await run("cd C:\\Users\\Taaniel\\Media");
    expect(session.cwd).toBe("/Media");

    await run("cd ~\\portfolio");
    expect(session.cwd).toBe("/Portfolio");

    await run("cd 'case studies'");
    expect(session.cwd).toBe("/Portfolio/Case Studies");
  });

  it("supports cd -, cd.. and cd with no argument", async () => {
    await run("cd /Media");
    await run("cd -");
    expect(session.cwd).toBe("/Desktop");

    await run("cd..");
    expect(session.cwd).toBe("/");

    await run("cd /Media/Music");
    await run("cd");
    expect(session.cwd).toBe("/");
  });

  it("does not change folder into a file or a missing path", async () => {
    const { success } = await run("cd Welcome.md");
    expect(success).toBe(false);
    expect(session.cwd).toBe("/Desktop");
  });
});

describe("terminal shell: writing through the shared filesystem", () => {
  it("creates folders that File Explorer can see", async () => {
    const { success } = await run("mkdir Reports\\2026");

    expect(success).toBe(true);
    const explorerView = useFileSystemStore.getState().listDirectory("/Desktop/Reports");
    expect(explorerView.map((node) => node.name)).toEqual(["2026"]);
  });

  it("writes, appends and reads back files with redirection", async () => {
    await run("echo 'first line' > notes.txt");
    await run("echo 'second line' >> notes.txt");

    expect(contentOf("/Desktop/notes.txt")?.content).toBe("first line\nsecond line");
    expect((await run("cat notes.txt")).text).toBe("first line\nsecond line");
  });

  it("creates files with New-Item, ni and touch", async () => {
    await run("New-Item -Path todo.txt -ItemType File -Value 'buy coffee'");
    await run("ni empty.txt");
    await run("touch also-empty.md");

    expect(contentOf("/Desktop/todo.txt")?.content).toBe("buy coffee");
    expect(exists("/Desktop/empty.txt")).toBe(true);
    expect(exists("/Desktop/also-empty.md")).toBe(true);
    expect((await run("ni todo.txt")).text).toContain("already exists");
  });

  it("moves, renames and copies", async () => {
    await run("echo hi > a.txt");
    await run("mkdir Archive");

    await run("ren a.txt b.txt");
    expect(exists("/Desktop/b.txt")).toBe(true);

    await run("cp b.txt Archive");
    expect(exists("/Desktop/Archive/b.txt")).toBe(true);
    expect(exists("/Desktop/b.txt")).toBe(true);

    await run("mv b.txt ..\\Documents\\moved.txt");
    expect(exists("/Desktop/b.txt")).toBe(false);
    expect(contentOf("/Documents/moved.txt")?.content).toBe("hi");
  });

  it("removes into the Recycle Bin and guards non-empty folders", async () => {
    await run("mkdir Old\\Stuff");
    await run("echo x > Old\\Stuff\\x.txt");

    const refused = await run("rm Old");
    expect(refused.success).toBe(false);
    expect(refused.text).toContain("Recurse parameter was not specified");
    expect(exists("/Desktop/Old")).toBe(true);

    await run("rm Old -Recurse");
    expect(exists("/Desktop/Old")).toBe(false);
    expect(exists(`${TRASH_PATH}/Old`)).toBe(true);
  });

  it("expands wildcards", async () => {
    await run("echo 1 > one.log; echo 2 > two.log; echo keep > keep.txt");
    await run("rm *.log");

    expect(exists("/Desktop/one.log")).toBe(false);
    expect(exists("/Desktop/two.log")).toBe(false);
    expect(exists("/Desktop/keep.txt")).toBe(true);
  });

  it("refuses to remove read-only portfolio files", async () => {
    const readonly = Object.values(useFileSystemStore.getState().nodes).find(
      (node) => node.kind === "file" && node.readonly
    );
    if (!readonly) return;

    const { success, text } = await run(`rm '${readonly.path}'`);
    expect(success).toBe(false);
    expect(text).toContain("sufficient access rights");
    expect(exists(readonly.path)).toBe(true);
  });
});

describe("terminal shell: pipes and parsing", () => {
  it("filters piped output with Select-String", async () => {
    const { text } = await run("ls /Media | sls photo");
    expect(text).toContain("Photography");
    expect(text).not.toContain("Music");
  });

  it("counts, sorts and slices piped lines", async () => {
    await run("echo c b a > letters.txt");
    expect((await run("cat letters.txt | sort")).text).toBe("a\nb\nc");
    expect((await run("cat letters.txt | select -First 2")).text).toBe("c\nb");
    expect((await run("cat letters.txt | measure")).text).toContain("Count    : 3");
  });

  it("searches files with line numbers", async () => {
    await run("echo 'alpha' 'beta' 'alphabet' > words.txt");
    const { text } = await run("sls alpha words.txt");
    expect(text).toBe("words.txt:1:alpha\nwords.txt:3:alphabet");
  });

  it("expands environment variables but not inside single quotes", async () => {
    expect((await run('echo "$env:USERNAME"')).text).toBe("Taaniel");
    expect((await run("echo '$env:USERNAME'")).text).toBe("$env:USERNAME");
  });

  it("reports unknown commands and never launches an app for a typo", async () => {
    const { text, success, actions } = await run("calcc");

    expect(success).toBe(false);
    expect(actions).toEqual([]);
    expect(text).toContain("The term 'calcc' is not recognized as a name of a cmdlet");
  });

  it("rejects an empty pipe element", async () => {
    const { text, success } = await run("ls |");
    expect(success).toBe(false);
    expect(text).toContain("An empty pipe element is not allowed.");
  });
});

describe("terminal shell: launching", () => {
  it("opens portfolio apps through explicit commands", async () => {
    const { actions, lines } = await run("about");

    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "about" });
    expect(lines[0]).toContain("Taaniel");
  });

  it("opens files and folders with start / open", async () => {
    const folder = await run("open /Media/Photography");
    const resume = await run("start resume");

    expect(folder.actions[0]).toMatchObject({ type: "open-path", path: "/Media/Photography" });
    expect(resume.actions[0]).toMatchObject({ type: "open-path", path: "/Documents/Taaniel-Vananurm-CV.pdf" });
  });

  it("opens project-specific views by name", async () => {
    const { actions } = await run("projects slow-pour");
    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "projects", payload: { projectId: "slow-pour" } });
  });

  it("runs Windows executables by name", async () => {
    expect((await run("calc")).actions[0]).toMatchObject({ type: "launch-app", appId: "calculator" });
    expect((await run("explorer .")).actions[0]).toMatchObject({ type: "launch-app", appId: "files", payload: { directoryPath: "/Desktop" } });
    expect((await run("start https://github.com")).actions[0]).toMatchObject({
      type: "launch-app",
      appId: "browser",
      payload: { externalUrl: "https://github.com" },
    });
  });

  it("creates a missing file when opened in notepad", async () => {
    const { actions } = await run("notepad ideas.txt");

    expect(exists("/Desktop/ideas.txt")).toBe(true);
    expect(actions[0]).toMatchObject({ type: "launch-app", appId: "notes", payload: { filePath: "/Desktop/ideas.txt" } });
  });

  it("closes the window on exit", async () => {
    expect((await run("exit")).actions).toEqual([{ type: "exit" }]);
  });
});

describe("terminal shell: tab completion", () => {
  const complete = (line: string) =>
    completeShellInput(line, line.length, session, useFileSystemStore.getState().nodes);

  it("completes command names", () => {
    expect(complete("Get-Chi").line).toBe("Get-ChildItem ");
  });

  it("completes folders with a trailing backslash", () => {
    session.cwd = "/";
    expect(complete("cd Doc").line).toBe("cd Documents\\");
  });

  it("quotes completions that contain spaces", () => {
    session.cwd = "/Portfolio";
    expect(complete("cd Case").line).toBe("cd 'Case Studies\\'");
  });

  it("lists candidates when the prefix is ambiguous", () => {
    session.cwd = "/";
    const result = complete("cd D");
    expect(result.line).toBe("cd D");
    expect(result.candidates).toEqual(expect.arrayContaining(["Desktop\\", "Documents\\"]));
  });
});
