import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

// Must be hoisted above store import so the store's lazy-loaded module gets mocks
vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

vi.mock("@/lib/system-workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/system-workspace")>();
  return { ...actual, ensureSystemWorkspace: (nodes: FileSystemRecord) => nodes };
});

import { subscribeFileSystemMoves, useFileSystemStore } from "@/stores/filesystem-store";
import { useToastStore } from "@/stores/toast-store";

const dir = (path: string, name: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name,
  createdAt: 1,
  updatedAt: 1,
});

const txt = (path: string, name: string, content = ""): VirtualFile => ({
  kind: "file",
  path,
  name,
  extension: "txt",
  mimeType: "text/plain",
  content,
  createdAt: 1,
  updatedAt: 1,
});

const SEED: FileSystemRecord = {
  "/": dir("/", "/"),
  "/Documents": dir("/Documents", "Documents"),
  "/Documents/notes.txt": txt("/Documents/notes.txt", "notes.txt", "hello"),
  "/Trash": dir("/Trash", "Trash"),
};

beforeEach(() => {
  useFileSystemStore.setState({ nodes: { ...SEED }, initialized: true });
});

afterEach(() => {
  useFileSystemStore.setState({ nodes: {}, initialized: false });
});

describe("filesystem-store", () => {
  describe("listDirectory", () => {
    it("returns children of an existing directory", () => {
      const children = useFileSystemStore.getState().listDirectory("/Documents");
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe("notes.txt");
      expect(children[0].type).toBe("file");
    });

    it("returns empty array for a non-existent path", () => {
      expect(useFileSystemStore.getState().listDirectory("/Nonexistent")).toHaveLength(0);
    });
  });

  describe("readFile", () => {
    it("returns the file node with content", () => {
      const file = useFileSystemStore.getState().readFile("/Documents/notes.txt");
      expect(file).not.toBeNull();
      expect(file!.name).toBe("notes.txt");
      expect(file!.content).toBe("hello");
    });

    it("returns null for a missing path", () => {
      expect(useFileSystemStore.getState().readFile("/Documents/missing.txt")).toBeNull();
    });

    it("returns null when the path is a directory", () => {
      expect(useFileSystemStore.getState().readFile("/Documents")).toBeNull();
    });
  });

  describe("writeFile", () => {
    it("creates a new file", async () => {
      await useFileSystemStore.getState().writeFile("/Documents/new.txt", "body");
      const file = useFileSystemStore.getState().readFile("/Documents/new.txt");
      expect(file).not.toBeNull();
      expect(file!.content).toBe("body");
    });

    it("overwrites an existing file", async () => {
      await useFileSystemStore.getState().writeFile("/Documents/notes.txt", "updated");
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")!.content).toBe(
        "updated"
      );
    });
  });

  describe("mkdir", () => {
    it("creates a new directory under an existing parent", async () => {
      await useFileSystemStore.getState().mkdir("/Documents/Archive");
      const children = useFileSystemStore.getState().listDirectory("/Documents");
      expect(children.some((c) => c.name === "Archive" && c.type === "folder")).toBe(true);
    });

    it("does nothing when the parent does not exist", async () => {
      await useFileSystemStore.getState().mkdir("/Ghost/Sub");
      expect(useFileSystemStore.getState().listDirectory("/Ghost")).toHaveLength(0);
    });
  });

  describe("deleteNode", () => {
    it("moves a file to /Trash (soft-delete)", async () => {
      await useFileSystemStore.getState().deleteNode("/Documents/notes.txt");
      // Original location is gone
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).toBeNull();
      expect(useFileSystemStore.getState().listDirectory("/Documents")).toHaveLength(0);
      // File now lives in /Trash
      const trashed = useFileSystemStore.getState().readFile("/Trash/notes.txt");
      expect(trashed).not.toBeNull();
      expect(trashed!.content).toBe("hello");
    });

    it("moves a directory and its descendants to /Trash (soft-delete)", async () => {
      // /Documents is a protected system folder, so use a folder of the visitor's own.
      useFileSystemStore.setState({
        nodes: {
          ...useFileSystemStore.getState().nodes,
          "/Work": dir("/Work", "Work"),
          "/Work/plan.txt": txt("/Work/plan.txt", "plan.txt", "ship it"),
        },
      });
      await useFileSystemStore.getState().deleteNode("/Work");
      // /Work is no longer a child of /
      const rootChildren = useFileSystemStore.getState().listDirectory("/");
      expect(rootChildren.every((c) => c.name !== "Work")).toBe(true);
      // The directory and its contents now exist under /Trash
      expect(useFileSystemStore.getState().listDirectory("/Trash")).toHaveLength(1);
      expect(useFileSystemStore.getState().readFile("/Trash/Work/plan.txt")?.content).toBe("ship it");
    });

    it("permanently deletes a file already inside /Trash", async () => {
      // Seed a file directly in /Trash
      useFileSystemStore.setState({
        nodes: {
          ...useFileSystemStore.getState().nodes,
          "/Trash/old.txt": txt("/Trash/old.txt", "old.txt", "gone"),
        },
      });
      await useFileSystemStore.getState().deleteNode("/Trash/old.txt");
      expect(useFileSystemStore.getState().readFile("/Trash/old.txt")).toBeNull();
      expect(useFileSystemStore.getState().listDirectory("/Trash")).toHaveLength(0);
    });
  });

  describe("renameNode", () => {
    it("changes the node name and path", async () => {
      await useFileSystemStore.getState().renameNode("/Documents/notes.txt", "diary.txt");
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).toBeNull();
      const renamed = useFileSystemStore.getState().readFile("/Documents/diary.txt");
      expect(renamed).not.toBeNull();
      expect(renamed!.name).toBe("diary.txt");
    });
  });

  describe("pasteNode", () => {
    beforeEach(async () => {
      // Add a /Media directory to paste into
      useFileSystemStore.setState({
        nodes: {
          ...SEED,
          "/Media": dir("/Media", "Media"),
        },
        initialized: true,
      });
    });

    it("copy leaves the source intact and creates a copy at destination", async () => {
      await useFileSystemStore.getState().pasteNode("/Documents/notes.txt", "/Media", "copy");
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).not.toBeNull();
      const copy = useFileSystemStore.getState().readFile("/Media/notes.txt");
      expect(copy).not.toBeNull();
      expect(copy!.content).toBe("hello");
    });

    it("cut removes the source and moves the file to destination", async () => {
      await useFileSystemStore.getState().pasteNode("/Documents/notes.txt", "/Media", "cut");
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).toBeNull();
      const moved = useFileSystemStore.getState().readFile("/Media/notes.txt");
      expect(moved).not.toBeNull();
      expect(moved!.content).toBe("hello");
    });
  });

  describe("refused changes", () => {
    const toasts = () => useToastStore.getState().toasts.map((entry) => [entry.message, entry.type]);
    const nodes = () => useFileSystemStore.getState().nodes;

    beforeEach(() => {
      useToastStore.setState({ toasts: [] });
      useFileSystemStore.setState({
        nodes: {
          ...SEED,
          "/Media": dir("/Media", "Media"),
          "/Documents/locked.txt": { ...txt("/Documents/locked.txt", "locked.txt", "bundled"), readonly: true },
          "/Trash/old.txt": txt("/Trash/old.txt", "old.txt", "gone"),
        },
        initialized: true,
      });
    });

    it("never deletes the Recycle Bin, even for good, and leaves what is in it", async () => {
      const before = nodes();

      await expect(useFileSystemStore.getState().tryDeleteNode("/Trash")).resolves.toEqual({ ok: false, reason: "protected" });
      await useFileSystemStore.getState().deleteNode("/Trash");

      expect(nodes()).toBe(before);
      expect(nodes()["/Trash/old.txt"]).toBeTruthy();
      expect(toasts().every(([, type]) => type === "error")).toBe(true);
      expect(toasts()[0][0]).toMatch(/system/);
    });

    it("refuses the other system folders the same way", async () => {
      for (const path of ["/", "/Documents"]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(useFileSystemStore.getState().tryDeleteNode(path, { quiet: true })).resolves.toEqual({
          ok: false,
          reason: "protected",
        });
      }

      expect(nodes()["/Documents"]).toBeTruthy();
      expect(toasts()).toEqual([]);
    });

    it("says why a read-only or missing item wasn't deleted, without announcing a delete", async () => {
      await expect(useFileSystemStore.getState().tryDeleteNode("/Documents/locked.txt")).resolves.toEqual({
        ok: false,
        reason: "read-only",
      });
      expect(toasts()).toEqual([["This item is read-only and can't be deleted", "error"]]);

      useToastStore.setState({ toasts: [] });
      await expect(useFileSystemStore.getState().tryDeleteNode("/Documents/ghost.txt")).resolves.toEqual({
        ok: false,
        reason: "missing",
      });
      expect(toasts()).toEqual([]);
      expect(nodes()["/Documents/locked.txt"]).toBeTruthy();
    });

    it("reports the deletes that went through", async () => {
      await expect(useFileSystemStore.getState().tryDeleteNode("/Documents/notes.txt")).resolves.toEqual({ ok: true });
      expect(nodes()["/Trash/notes.txt"]).toMatchObject({ originalPath: "/Documents/notes.txt" });
      expect(toasts()).toEqual([["Moved to Recycle Bin", "success"]]);

      await expect(useFileSystemStore.getState().tryDeleteNode("/Trash/old.txt")).resolves.toEqual({ ok: true });
      expect(nodes()["/Trash/old.txt"]).toBeUndefined();
    });

    it("only announces a paste that changed something", async () => {
      // Moving a system folder, a read-only file or a folder into itself changes nothing, so nothing is said.
      const refusals = [
        await useFileSystemStore.getState().tryPasteNode("/Documents", "/Media", "cut"),
        await useFileSystemStore.getState().tryPasteNode("/Documents/locked.txt", "/Media", "cut"),
        await useFileSystemStore.getState().tryPasteNode("/Documents", "/Documents", "copy"),
        await useFileSystemStore.getState().tryPasteNode("/Documents/ghost.txt", "/Media", "copy"),
        await useFileSystemStore.getState().tryPasteNode("/Documents/notes.txt", "/Documents/notes.txt", "copy"),
      ];

      expect(refusals).toEqual([
        { ok: false, reason: "protected" },
        { ok: false, reason: "read-only" },
        { ok: false, reason: "invalid" },
        { ok: false, reason: "missing" },
        { ok: false, reason: "invalid" },
      ]);
      expect(toasts()).toEqual([]);
      expect(nodes()["/Documents"]).toBeTruthy();
      expect(nodes()["/Media/Documents"]).toBeUndefined();

      await useFileSystemStore.getState().pasteNode("/Documents/notes.txt", "/Media", "cut");
      expect(toasts()).toEqual([["Moved", "success"]]);
    });

    it("lets a system folder be copied, which is not a change to it", async () => {
      await expect(useFileSystemStore.getState().tryPasteNode("/Documents", "/Media", "copy", { quiet: true })).resolves.toEqual({
        ok: true,
      });
      expect(nodes()["/Media/Documents/notes.txt"]).toBeTruthy();
    });
  });

  describe("canCutNode", () => {
    it("returns false for a path containing readonly content", () => {
      useFileSystemStore.setState({
        nodes: {
          ...SEED,
          "/Documents/protected.txt": {
            ...txt("/Documents/protected.txt", "protected.txt", "locked"),
            readonly: true,
          },
        },
        initialized: true,
      });
      expect(useFileSystemStore.getState().canCutNode("/Documents/protected.txt")).toBe(false);
    });

    it("returns true for normal writable content", () => {
      expect(useFileSystemStore.getState().canCutNode("/Documents/notes.txt")).toBe(true);
    });
  });
});

describe("move events", () => {
  const heard: Array<Array<{ from: string; to: string }>> = [];
  let stop = () => {};

  beforeEach(() => {
    heard.length = 0;
    stop = subscribeFileSystemMoves((moves) => heard.push(moves));
  });

  afterEach(() => stop());

  it("announces a rename with the old and new path, before the listing changes", async () => {
    let listedWhenHeard: string[] = [];
    stop();
    stop = subscribeFileSystemMoves(() => {
      listedWhenHeard = useFileSystemStore.getState().listDirectory("/Documents").map((node) => node.name);
    });

    await useFileSystemStore.getState().rename("/Documents/notes.txt", "todo.txt");

    expect(listedWhenHeard).toEqual(["notes.txt"]);
    expect(useFileSystemStore.getState().readFile("/Documents/todo.txt")).not.toBeNull();
  });

  it("reports where a renamed item ended up", async () => {
    await useFileSystemStore.getState().rename("/Documents/notes.txt", "todo.txt");

    expect(heard).toEqual([[{ from: "/Documents/notes.txt", to: "/Documents/todo.txt" }]]);
  });

  it("reports every item of a batch move, and nothing for a copy", async () => {
    useFileSystemStore.setState({
      nodes: { ...SEED, "/Documents/b.txt": txt("/Documents/b.txt", "b.txt"), "/Media": dir("/Media", "Media") },
      initialized: true,
    });

    await useFileSystemStore.getState().transferNodes(["/Documents/notes.txt", "/Documents/b.txt"], "/Media", "copy");
    expect(heard).toEqual([]);

    // Start again without the copies, so the moved items keep their names.
    useFileSystemStore.setState({
      nodes: { ...SEED, "/Documents/b.txt": txt("/Documents/b.txt", "b.txt"), "/Media": dir("/Media", "Media") },
      initialized: true,
    });
    await useFileSystemStore.getState().transferNodes(["/Documents/notes.txt", "/Documents/b.txt"], "/Media", "move");
    expect(heard).toEqual([
      [
        { from: "/Documents/notes.txt", to: "/Media/notes.txt" },
        { from: "/Documents/b.txt", to: "/Media/b.txt" },
      ],
    ]);
  });

  it("stays quiet when nothing moved", async () => {
    await useFileSystemStore.getState().rename("/Documents/notes.txt", "notes.txt");
    await useFileSystemStore.getState().transferNodes(["/Documents/notes.txt"], "/Documents", "move");

    expect(heard).toEqual([]);
  });
});