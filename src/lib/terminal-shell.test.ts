import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { listDirectory, readFile } from "@/lib/filesystem";
import { executeTerminalCommand, TERMINAL_HOME_PATH } from "@/lib/terminal-shell";

const nodes = buildSeedFileSystem();

function createContext(currentPath = TERMINAL_HOME_PATH) {
  return {
    currentPath,
    nodes,
    listDirectory: (path: string) => listDirectory(nodes, path),
    readFile: (path: string) => readFile(nodes, path),
  };
}

describe("terminal shell", () => {
  it("lists directories from the virtual filesystem", () => {
    const result = executeTerminalCommand("ls /Media", createContext());

    expect(result.lines.some((line) => line.includes("Photography/"))).toBe(true);
    expect(result.lines.some((line) => line.includes("Music/"))).toBe(true);
  });

  it("changes directories through normalized paths", () => {
    const result = executeTerminalCommand("cd ../Documents", createContext("/Desktop"));

    expect(result.nextPath).toBe("/Documents");
  });

  it("opens portfolio apps through explicit commands", () => {
    const result = executeTerminalCommand("about", createContext());

    expect(result.actions?.[0]).toMatchObject({ type: "launch-app", appId: "about" });
    expect(result.lines[0]).toContain("Taaniel");
  });

  it("opens files and folders through the open command", () => {
    const folderResult = executeTerminalCommand("open /Media/Photography", createContext());
    const fileResult = executeTerminalCommand("open resume", createContext());

    expect(folderResult.actions?.[0]).toMatchObject({
      type: "open-path",
      path: "/Media/Photography",
    });
    expect(fileResult.actions?.[0]).toMatchObject({
      type: "open-path",
      path: "/Documents/Taaniel-Vananurm-CV.pdf",
    });
  });

  it("prints note content inline for cat", () => {
    const result = executeTerminalCommand('cat "/Documents/Notes/To-do list.txt"', createContext());

    expect(result.lines.join(" ")).toMatch(/To-do list/i);
  });

  it("opens project-specific views by name", () => {
    const result = executeTerminalCommand("projects dineromon", createContext());

    expect(result.actions?.[0]).toMatchObject({
      type: "launch-app",
      appId: "projects",
      payload: { projectId: "dineromon" },
    });
  });
});
