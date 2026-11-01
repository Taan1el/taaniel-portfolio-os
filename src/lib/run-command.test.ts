import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { addToRunHistory, readRunHistory, resolveRunTarget } from "@/lib/run-command";

const nodes = buildSeedFileSystem();
const run = (text: string) => resolveRunTarget(text, nodes);

describe("Run", () => {
  it.each([
    ["calc", "calculator"],
    ["calc.exe", "calculator"],
    ["MSPAINT", "paint"],
    ["notepad", "markdown"],
    ["taskmgr", "task-manager"],
    ["explorer", "files"],
    ["Task Manager", "task-manager"],
    ["doom", "doom"],
  ])("opens %s", (text, appId) => {
    expect(run(text)).toMatchObject({ kind: "app", appId });
  });

  it("opens the shells as Terminal profiles", () => {
    expect(run("cmd")).toEqual({ kind: "app", appId: "terminal", payload: { profile: "cmd" } });
    expect(run("powershell")).toEqual({ kind: "app", appId: "terminal", payload: { profile: "pwsh" } });
  });

  it("opens settings pages", () => {
    expect(run("ms-settings:display")).toEqual({ kind: "app", appId: "settings", payload: { section: "display" } });
    expect(run("ms-settings:")).toEqual({ kind: "app", appId: "settings", payload: undefined });
  });

  it("opens files and folders by either spelling of the path", () => {
    expect(run("/Documents")).toEqual({ kind: "path", path: "/Documents" });
    expect(run("C:\\Users\\Taaniel\\Documents")).toEqual({ kind: "path", path: "/Documents" });
    expect(run("/Portfolio/OS-Case-Study.md")).toEqual({ kind: "path", path: "/Portfolio/OS-Case-Study.md" });
    expect(run("cv")).toEqual({ kind: "path", path: "/Documents/Taaniel-Vananurm-CV.pdf" });
  });

  it("opens web addresses over http and https only", () => {
    expect(run("https://example.com/a")).toEqual({ kind: "url", url: "https://example.com/a" });
    expect(run("www.example.com")).toEqual({ kind: "url", url: "https://www.example.com/" });
    expect(run("example.com")).toEqual({ kind: "url", url: "https://example.com/" });
    expect(run("javascript:alert(1)")).toEqual({ kind: "missing" });
    expect(run("data:text/html,hello")).toEqual({ kind: "missing" });
    expect(run("file:///etc/passwd")).toEqual({ kind: "missing" });
  });

  it("says when nothing matches", () => {
    expect(run("nothing-here")).toEqual({ kind: "missing" });
    expect(run("   ")).toEqual({ kind: "missing" });
  });

  it("is not fooled by names on the object prototype", () => {
    expect(run("constructor")).toEqual({ kind: "missing" });
    expect(run("__proto__")).toEqual({ kind: "missing" });
  });
});

describe("Run history", () => {
  it("keeps the latest ten, newest first, without repeats", () => {
    let history: string[] = [];
    for (let entry = 0; entry < 12; entry += 1) history = addToRunHistory(history, `item${entry}`);
    history = addToRunHistory(history, "ITEM5");

    expect(history).toHaveLength(10);
    expect(history[0]).toBe("ITEM5");
    expect(history.filter((entry) => entry.toLowerCase() === "item5")).toHaveLength(1);
  });

  it("drops anything that is not a short string", () => {
    expect(readRunHistory(JSON.stringify(["calc", 5, null, "x".repeat(500)]))).toEqual(["calc"]);
    expect(readRunHistory("{bad")).toEqual([]);
    expect(readRunHistory(null)).toEqual([]);
    expect(readRunHistory('{"a":1}')).toEqual([]);
  });
});
