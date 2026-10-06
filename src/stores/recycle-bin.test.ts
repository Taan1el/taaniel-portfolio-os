import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { ensureCopyName, ensureUniqueName, renameRecord } from "@/lib/filesystem";
import { TRASH_PATH } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path === "/" ? "/" : path.split("/").at(-1)!,
  createdAt: 1,
  updatedAt: 1,
});

const txt = (path: string, content = ""): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").at(-1)!,
  extension: "txt",
  mimeType: "text/plain",
  content,
  createdAt: 1,
  updatedAt: 1,
});

const seed = (): FileSystemRecord => ({
  "/": dir("/"),
  [TRASH_PATH]: dir(TRASH_PATH),
  "/Desktop": dir("/Desktop"),
  "/Documents": dir("/Documents"),
  "/Documents/Work": dir("/Documents/Work"),
  "/Documents/Work/plan.txt": txt("/Documents/Work/plan.txt", "ship it"),
  "/Documents/notes.txt": txt("/Documents/notes.txt", "hello"),
  "/Documents/New folder": dir("/Documents/New folder"),
});

const store = () => useFileSystemStore.getState();

beforeEach(() => {
  useFileSystemStore.setState({ nodes: seed(), initialized: true });
});

describe("Windows-style naming", () => {
  it("numbers collisions as (2), (3)", () => {
    const nodes = seed();
    expect(ensureUniqueName(nodes, "/Documents", "New folder", true)).toBe("New folder (2)");
    expect(ensureUniqueName(nodes, "/Documents", "notes.txt")).toBe("notes (2).txt");
    expect(ensureUniqueName(nodes, "/Documents", "NOTES.TXT")).toBe("NOTES (2).TXT");
  });

  it("names same-folder copies '- Copy'", () => {
    expect(ensureCopyName(seed(), "/Documents", "notes.txt", false)).toBe("notes - Copy.txt");
  });

  it("allows a rename that only changes case", () => {
    const { path } = renameRecord(seed(), "/Documents/notes.txt", "Notes.txt");
    expect(path).toBe("/Documents/Notes.txt");
  });

  it("duplicates in place with the Copy suffix", async () => {
    await store().pasteNode("/Documents/notes.txt", "/Documents", "copy");
    expect(store().nodes["/Documents/notes - Copy.txt"]).toBeTruthy();
  });
});

describe("Recycle Bin", () => {
  it("remembers where a deleted item came from", async () => {
    await store().deleteNode("/Documents/notes.txt");

    const trashed = store().nodes[`${TRASH_PATH}/notes.txt`];
    expect(trashed?.originalPath).toBe("/Documents/notes.txt");
    expect(typeof trashed?.deletedAt).toBe("number");
    expect(store().nodes["/Documents/notes.txt"]).toBeUndefined();
  });

  it("restores an item, with its contents, to its original location", async () => {
    await store().deleteNode("/Documents/Work");
    const restored = await store().restoreNode(`${TRASH_PATH}/Work`);

    expect(restored).toBe("/Documents/Work");
    expect(store().nodes["/Documents/Work/plan.txt"]).toMatchObject({ content: "ship it" });
    expect(store().nodes["/Documents/Work"]?.originalPath).toBeUndefined();
    expect(store().nodes[`${TRASH_PATH}/Work`]).toBeUndefined();
  });

  it("recreates a missing parent folder on restore", async () => {
    await store().deleteNode("/Documents/Work/plan.txt");
    await store().deleteNode("/Documents/Work");
    await store().deleteNodePermanently(`${TRASH_PATH}/Work`);

    const restored = await store().restoreNode(`${TRASH_PATH}/plan.txt`);
    expect(restored).toBe("/Documents/Work/plan.txt");
    expect(store().nodes["/Documents/Work"]?.kind).toBe("directory");
  });

  it("does not overwrite a newer file with the same name", async () => {
    await store().deleteNode("/Documents/notes.txt");
    await store().writeFile("/Documents/notes.txt", "newer");

    const restored = await store().restoreNode(`${TRASH_PATH}/notes.txt`);
    expect(restored).toBe("/Documents/notes (2).txt");
    expect(store().nodes["/Documents/notes.txt"]).toMatchObject({ content: "newer" });
  });

  it("deletes permanently without the Recycle Bin", async () => {
    await store().deleteNodePermanently("/Documents/notes.txt");
    expect(store().nodes["/Documents/notes.txt"]).toBeUndefined();
    expect(Object.keys(store().nodes).some((path) => path.startsWith(`${TRASH_PATH}/`))).toBe(false);
  });
});
