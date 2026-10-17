import { describe, expect, it } from "vitest";
import {
  createShortcutNode,
  getDisplayName,
  getShortcutFileName,
  isShortcutNode,
  resolveShortcut,
  sanitizeShortcutTarget,
  toStoredName,
} from "@/lib/shortcuts";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path.split("/").at(-1) || "/",
  createdAt: 1,
  updatedAt: 1,
});

const txt = (path: string): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").at(-1)!,
  extension: "txt",
  mimeType: "text/plain",
  content: "",
  createdAt: 1,
  updatedAt: 1,
});

describe("shortcut names", () => {
  it("hides .lnk like Windows does", () => {
    expect(getDisplayName({ name: "About.lnk", kind: "file" })).toBe("About");
    expect(getDisplayName({ name: "Resume.pdf.lnk", type: "file" })).toBe("Resume.pdf");
    expect(getDisplayName({ name: "notes.txt", kind: "file" })).toBe("notes.txt");
    // A folder called "x.lnk" is not a shortcut.
    expect(getDisplayName({ name: "x.lnk", kind: "directory" })).toBe("x.lnk");
  });

  it("keeps the hidden extension when a shortcut is renamed", () => {
    expect(toStoredName("CV", { name: "Resume.pdf.lnk", kind: "file" })).toBe("CV.lnk");
    expect(toStoredName("CV.lnk", { name: "Resume.pdf.lnk", kind: "file" })).toBe("CV.lnk");
    expect(toStoredName("todo.md", { name: "todo.txt", kind: "file" })).toBe("todo.md");
  });

  it("names new shortcuts '<name> - Shortcut'", () => {
    expect(getShortcutFileName("notes.txt")).toBe("notes.txt - Shortcut.lnk");
    expect(getShortcutFileName("About.lnk", true)).toBe("About.lnk");
  });
});

describe("shortcut targets", () => {
  it("rejects anything that is not a known, safe target", () => {
    expect(sanitizeShortcutTarget({ type: "app", appId: "about" })).toEqual({ type: "app", appId: "about" });
    expect(sanitizeShortcutTarget({ type: "app", appId: "evil" })).toBeNull();
    expect(sanitizeShortcutTarget({ type: "url", url: "javascript:alert(1)" })).toBeNull();
    expect(sanitizeShortcutTarget({ type: "url", url: "https://example.com" })).toEqual({
      type: "url",
      url: "https://example.com",
    });
    expect(sanitizeShortcutTarget({ type: "route", route: "//evil.example" })).toBeNull();
    expect(sanitizeShortcutTarget({ type: "route", route: "/portfolio" })).toEqual({ type: "route", route: "/portfolio" });
    expect(sanitizeShortcutTarget({ type: "path", path: "Documents" })).toBeNull();
    expect(sanitizeShortcutTarget("about")).toBeNull();
  });

  it("follows path shortcuts to the node, including shortcuts to shortcuts", () => {
    const nodes: FileSystemRecord = {
      "/": dir("/"),
      "/Documents": dir("/Documents"),
      "/Documents/a.txt": txt("/Documents/a.txt"),
      "/Desktop": dir("/Desktop"),
      "/Desktop/a.lnk": createShortcutNode("/Desktop/a.lnk", { type: "path", path: "/Documents/a.txt" }),
      "/Desktop/b.lnk": createShortcutNode("/Desktop/b.lnk", { type: "path", path: "/Desktop/a.lnk" }),
      "/Desktop/gone.lnk": createShortcutNode("/Desktop/gone.lnk", { type: "path", path: "/Documents/gone.txt" }),
    };

    expect(isShortcutNode(nodes["/Desktop/a.lnk"])).toBe(true);
    expect(isShortcutNode(nodes["/Documents/a.txt"])).toBe(false);
    expect(resolveShortcut(nodes, nodes["/Desktop/b.lnk"])).toEqual({ kind: "node", node: nodes["/Documents/a.txt"] });
    expect(resolveShortcut(nodes, nodes["/Desktop/gone.lnk"])).toEqual({ kind: "broken", path: "/Documents/gone.txt" });
  });

  it("stops following a shortcut loop", () => {
    const nodes: FileSystemRecord = {
      "/a.lnk": createShortcutNode("/a.lnk", { type: "path", path: "/b.lnk" }),
      "/b.lnk": createShortcutNode("/b.lnk", { type: "path", path: "/a.lnk" }),
    };

    expect(resolveShortcut(nodes, nodes["/a.lnk"]).kind).toBe("broken");
  });
});
