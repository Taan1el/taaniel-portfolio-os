import { describe, expect, it } from "vitest";
import { transferNodesRecord } from "@/lib/filesystem";
import { createShortcutNode } from "@/lib/shortcuts";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path === "/" ? "/" : path.split("/").at(-1)!,
  createdAt: 1,
  updatedAt: 1,
});

const txt = (path: string, extra: Partial<VirtualFile> = {}): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").at(-1)!,
  extension: "txt",
  mimeType: "text/plain",
  content: path,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

const seed = (): FileSystemRecord => ({
  "/": dir("/"),
  "/Trash": dir("/Trash"),
  "/Desktop": dir("/Desktop"),
  "/Desktop/a.txt": txt("/Desktop/a.txt"),
  "/Desktop/b.txt": txt("/Desktop/b.txt"),
  "/Desktop/Work": dir("/Desktop/Work"),
  "/Desktop/Work/plan.txt": txt("/Desktop/Work/plan.txt"),
  "/Documents": dir("/Documents"),
  "/Documents/a.txt": txt("/Documents/a.txt"),
  "/Documents/CV.pdf": txt("/Documents/CV.pdf", { readonly: true, extension: "pdf" }),
});

const options = { trashPath: "/Trash", now: 42 };

describe("transferNodesRecord", () => {
  it("moves several items in one pass and numbers collisions", () => {
    const result = transferNodesRecord(seed(), ["/Desktop/a.txt", "/Desktop/b.txt"], "/Documents", "move", options);

    expect(result.transferred).toEqual([
      { from: "/Desktop/a.txt", to: "/Documents/a (2).txt" },
      { from: "/Desktop/b.txt", to: "/Documents/b.txt" },
    ]);
    expect(result.nodes["/Desktop/a.txt"]).toBeUndefined();
    expect(result.nodes["/Documents/a.txt"]).toMatchObject({ content: "/Documents/a.txt" });
  });

  it("moves a folder only once when its children are selected too", () => {
    const result = transferNodesRecord(seed(), ["/Desktop/Work", "/Desktop/Work/plan.txt"], "/Documents", "move", options);

    expect(result.transferred).toEqual([{ from: "/Desktop/Work", to: "/Documents/Work" }]);
    expect(result.nodes["/Documents/Work/plan.txt"]).toBeTruthy();
  });

  it("refuses to move a folder into itself or a read-only file at all", () => {
    const nodes = seed();
    const into = transferNodesRecord(nodes, ["/Desktop/Work"], "/Desktop/Work", "move", options);
    expect(into.skipped).toEqual([{ path: "/Desktop/Work", reason: "into-itself" }]);
    expect(into.nodes).toBe(nodes);

    const locked = transferNodesRecord(seed(), ["/Documents/CV.pdf"], "/Desktop", "move", options);
    expect(locked.skipped).toEqual([{ path: "/Documents/CV.pdf", reason: "locked" }]);
  });

  it("skips items already in the destination", () => {
    const result = transferNodesRecord(seed(), ["/Desktop/a.txt"], "/Desktop", "move", options);
    expect(result.skipped).toEqual([{ path: "/Desktop/a.txt", reason: "same-folder" }]);
  });

  it("copies read-only files as the visitor's own deletable copies", () => {
    const result = transferNodesRecord(seed(), ["/Documents/CV.pdf"], "/Desktop", "copy", options);
    expect(result.transferred).toEqual([{ from: "/Documents/CV.pdf", to: "/Desktop/CV.pdf" }]);
    expect((result.nodes["/Desktop/CV.pdf"] as VirtualFile).readonly).toBeUndefined();
    expect((result.nodes["/Documents/CV.pdf"] as VirtualFile).readonly).toBe(true);
  });

  it("names a copy in the same folder '- Copy'", () => {
    const result = transferNodesRecord(seed(), ["/Desktop/a.txt"], "/Desktop", "copy", options);
    expect(result.transferred[0].to).toBe("/Desktop/a - Copy.txt");
  });

  it("creates shortcuts, copying a shortcut's own target", () => {
    const nodes = {
      ...seed(),
      "/Desktop/About.lnk": createShortcutNode("/Desktop/About.lnk", { type: "app", appId: "about" }),
    };
    const result = transferNodesRecord(nodes, ["/Documents/a.txt", "/Desktop/About.lnk"], "/Desktop", "link", options);

    expect(result.transferred.map((entry) => entry.to)).toEqual([
      "/Desktop/a.txt - Shortcut.lnk",
      "/Desktop/About (2).lnk",
    ]);
    expect(result.nodes["/Desktop/a.txt - Shortcut.lnk"]).toMatchObject({
      shortcut: { type: "path", path: "/Documents/a.txt" },
    });
    expect(result.nodes["/Desktop/About (2).lnk"]).toMatchObject({ shortcut: { type: "app", appId: "about" } });
  });

  it("records where items came from when moved to the Recycle Bin, and forgets it when moved out", () => {
    const recycled = transferNodesRecord(seed(), ["/Desktop/a.txt", "/Desktop/Work"], "/Trash", "move", options);
    expect(recycled.nodes["/Trash/a.txt"]).toMatchObject({ originalPath: "/Desktop/a.txt", deletedAt: 42 });
    expect(recycled.nodes["/Trash/Work"]).toMatchObject({ originalPath: "/Desktop/Work" });

    const restored = transferNodesRecord(recycled.nodes, ["/Trash/a.txt"], "/Documents", "move", options);
    expect(restored.nodes["/Documents/a (2).txt"]?.originalPath).toBeUndefined();
    expect(restored.nodes["/Documents/a (2).txt"]?.deletedAt).toBeUndefined();
  });

  it("never copies or links into the Recycle Bin", () => {
    expect(transferNodesRecord(seed(), ["/Desktop/a.txt"], "/Trash", "copy", options).skipped[0].reason).toBe("not-allowed");
    expect(transferNodesRecord(seed(), ["/Desktop/a.txt"], "/Trash", "link", options).skipped[0].reason).toBe("not-allowed");
  });

  it("does not put things inside a folder that sits in the Recycle Bin", () => {
    const recycled = transferNodesRecord(seed(), ["/Desktop/Work"], "/Trash", "move", options).nodes;
    const result = transferNodesRecord(recycled, ["/Desktop/a.txt"], "/Trash/Work", "move", options);

    expect(result.transferred).toEqual([]);
    expect(result.skipped).toEqual([{ path: "/Desktop/a.txt", reason: "not-allowed" }]);
    expect(result.nodes["/Desktop/a.txt"]).toBeTruthy();
  });

  it("protects system folders", () => {
    const result = transferNodesRecord(seed(), ["/Desktop"], "/Documents", "move", options);
    expect(result.skipped).toEqual([{ path: "/Desktop", reason: "locked" }]);
  });
});
