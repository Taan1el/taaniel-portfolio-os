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

import { useFileSystemStore } from "@/stores/filesystem-store";

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
    it("removes the node from the store", async () => {
      await useFileSystemStore.getState().deleteNode("/Documents/notes.txt");
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).toBeNull();
      expect(useFileSystemStore.getState().listDirectory("/Documents")).toHaveLength(0);
    });

    it("deletes a directory and all its descendants", async () => {
      await useFileSystemStore.getState().deleteNode("/Documents");
      expect(useFileSystemStore.getState().listDirectory("/")).toHaveLength(0);
      expect(useFileSystemStore.getState().readFile("/Documents/notes.txt")).toBeNull();
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
