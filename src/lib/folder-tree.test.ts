import { describe, expect, it } from "vitest";
import { listFolderChoices } from "@/lib/folder-tree";
import type { FileSystemRecord, VirtualDirectory } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path.split("/").filter(Boolean).at(-1) ?? "/",
  createdAt: 1,
  updatedAt: 1,
});

const nodes: FileSystemRecord = Object.fromEntries(
  ["/", "/Desktop", "/Documents", "/Documents/Reports", "/Documents/Archive", "/Media", "/Trash", "/Trash/Old"].map((path) => [path, dir(path)])
);

describe("listFolderChoices", () => {
  it("lists folders in tree order, indented, without the Recycle Bin", () => {
    const choices = listFolderChoices(nodes, [], "copy");

    expect(choices.map((choice) => `${"-".repeat(choice.depth)}${choice.label}`)).toEqual([
      "Taaniel",
      "-Desktop",
      "-Documents",
      "--Archive",
      "--Reports",
      "-Media",
    ]);
  });

  it("disables a folder and everything inside it as a destination for itself", () => {
    const choices = listFolderChoices(nodes, ["/Documents"], "copy");
    const reason = (path: string) => choices.find((choice) => choice.path === path)?.disabledReason;

    expect(reason("/Documents")).toMatch(/into itself/);
    expect(reason("/Documents/Reports")).toMatch(/into itself/);
    expect(reason("/Desktop")).toBeUndefined();
  });

  it("disables the folder items already live in when moving, but not when copying", () => {
    const moving = listFolderChoices(nodes, ["/Documents/Reports"], "move");
    const copying = listFolderChoices(nodes, ["/Documents/Reports"], "copy");

    expect(moving.find((choice) => choice.path === "/Documents")?.disabledReason).toMatch(/already in this folder/);
    expect(copying.find((choice) => choice.path === "/Documents")?.disabledReason).toBeUndefined();
  });
});
