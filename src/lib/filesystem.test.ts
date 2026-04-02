import { describe, expect, it } from "vitest";
import {
  deleteNodeRecord,
  listDirectory,
  mkdirRecord,
  readFile,
  renameRecord,
  writeFileRecord,
} from "@/lib/filesystem";
import type { FileSystemRecord } from "@/types/system";

function createBaseNodes(): FileSystemRecord {
  return {
    "/": {
      kind: "directory",
      path: "/",
      name: "/",
      createdAt: 1,
      updatedAt: 1,
    },
    "/Documents": {
      kind: "directory",
      path: "/Documents",
      name: "Documents",
      createdAt: 1,
      updatedAt: 1,
    },
  };
}

describe("filesystem api", () => {
  it("creates folders and lists directory entries as file nodes", () => {
    const { nodes, path } = mkdirRecord(createBaseNodes(), "/Documents/Photos");
    const entries = listDirectory(nodes, "/Documents");

    expect(path).toBe("/Documents/Photos");
    expect(entries).toEqual([
      expect.objectContaining({
        path: "/Documents/Photos",
        name: "Photos",
        type: "folder",
      }),
    ]);
  });

  it("writes, reads, renames, and deletes files through the shared record helpers", () => {
    const created = writeFileRecord(createBaseNodes(), "/Documents/To-do list.txt", "hello", {
      mimeType: "text/plain",
      extension: "txt",
    });

    expect(readFile(created.nodes, created.path)).toEqual(
      expect.objectContaining({
        path: "/Documents/To-do list.txt",
        type: "file",
        content: "hello",
      })
    );

    const renamed = renameRecord(created.nodes, created.path, "Ideas.txt");
    expect(readFile(renamed.nodes, renamed.path)).toEqual(
      expect.objectContaining({
        path: "/Documents/Ideas.txt",
        name: "Ideas.txt",
        content: "hello",
      })
    );

    const deleted = deleteNodeRecord(renamed.nodes, renamed.path);
    expect(readFile(deleted, renamed.path)).toBeNull();
  });
});
