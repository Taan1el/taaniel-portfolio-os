import { describe, expect, it } from "vitest";
import { operationFromModifiers } from "@/lib/dnd/operation";
import { canAppOpenPath, describeDestination, resolveDropPlan, type ResolveDropInput } from "@/lib/dnd/resolve";
import { createShortcutNode } from "@/lib/shortcuts";
import type { DragItem, DropZone } from "@/lib/dnd/types";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({
  kind: "directory",
  path,
  name: path.split("/").filter(Boolean).at(-1) ?? "/",
  createdAt: 1,
  updatedAt: 1,
});

const file = (path: string, extension: string, mimeType: string, extra: Partial<VirtualFile> = {}): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").filter(Boolean).at(-1) ?? path,
  extension,
  mimeType,
  content: "",
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

const nodes: FileSystemRecord = Object.fromEntries(
  [
    dir("/"),
    dir("/Desktop"),
    dir("/Documents"),
    dir("/Documents/Reports"),
    dir("/Trash"),
    dir("/Media"),
    dir("/Media/Photography"),
    file("/Documents/notes.txt", "txt", "text/plain"),
    file("/Documents/cv.pdf", "pdf", "application/pdf"),
    file("/Documents/Reports/q1.txt", "txt", "text/plain"),
    file("/Desktop/todo.txt", "txt", "text/plain"),
    file("/Desktop/pic.png", "png", "image/png"),
    file("/Media/Photography/austria.jpg", "jpg", "image/jpeg", { readonly: true, source: "/a.jpg", content: undefined }),
    createShortcutNode("/Desktop/About.lnk", { type: "app", appId: "about" }),
    createShortcutNode("/Desktop/Resume.pdf.lnk", { type: "path", path: "/Documents/cv.pdf" }),
    file("/Trash/old.txt", "txt", "text/plain", { originalPath: "/Documents/old.txt", deletedAt: 5 }),
  ].map((node) => [node.path, node])
);

const toItems = (...paths: string[]): DragItem[] => paths.map((path) => ({ id: path, path }));
const folder = (path: string, extra: Partial<Extract<DropZone, { kind: "folder" }>> = {}): DropZone => ({
  kind: "folder",
  path,
  ...extra,
});
const none = { ctrl: false, shift: false, alt: false };

function resolve(partial: Partial<ResolveDropInput> & Pick<ResolveDropInput, "items" | "zone">) {
  return resolveDropPlan({ origin: "explorer", modifiers: none, nodes, ...partial });
}

describe("operationFromModifiers", () => {
  it("follows Windows: move, Ctrl copies, Alt or Ctrl+Shift links, Shift moves", () => {
    expect(operationFromModifiers(none)).toBe("move");
    expect(operationFromModifiers({ ...none, shift: true })).toBe("move");
    expect(operationFromModifiers({ ...none, ctrl: true })).toBe("copy");
    expect(operationFromModifiers({ ...none, alt: true })).toBe("link");
    expect(operationFromModifiers({ ctrl: true, shift: true, alt: false })).toBe("link");
  });
});

describe("resolveDropPlan into folders", () => {
  it("moves by default and words it like Windows", () => {
    expect(resolve({ items: toItems("/Desktop/todo.txt"), zone: folder("/Documents") })).toEqual({
      kind: "transfer",
      operation: "move",
      destination: "/Documents",
      paths: ["/Desktop/todo.txt"],
      label: "Move to Documents",
    });
  });

  it("copies with Ctrl and creates links with Alt", () => {
    expect(resolve({ items: toItems("/Documents/notes.txt"), zone: folder("/Desktop"), modifiers: { ...none, ctrl: true } })).toMatchObject({
      kind: "transfer",
      operation: "copy",
      label: "Copy to Desktop",
    });
    expect(resolve({ items: toItems("/Documents/notes.txt"), zone: folder("/Desktop"), modifiers: { ...none, alt: true } })).toMatchObject({
      kind: "transfer",
      operation: "link",
      label: "Create link in Desktop",
    });
  });

  it("names the profile folder after the user", () => {
    expect(describeDestination(nodes, "/")).toBe("Taaniel");
    expect(describeDestination(nodes, "/Trash")).toBe("Recycle Bin");
  });

  it("copies read-only items instead of moving them", () => {
    expect(resolve({ items: toItems("/Media/Photography/austria.jpg"), zone: folder("/Desktop") })).toMatchObject({
      kind: "transfer",
      operation: "copy",
      label: "Copy to Desktop",
    });
  });

  it("keeps moving a mixed selection and leaves the locked item to be skipped", () => {
    expect(
      resolve({ items: toItems("/Media/Photography/austria.jpg", "/Desktop/todo.txt"), zone: folder("/Documents") })
    ).toMatchObject({ kind: "transfer", operation: "move" });
  });

  it("refuses to move a folder into itself or its own subfolder", () => {
    expect(resolve({ items: toItems("/Documents"), zone: folder("/Documents") })).toEqual({ kind: "none" });
    expect(resolve({ items: toItems("/Documents"), zone: folder("/Documents/Reports") })).toEqual({ kind: "none" });
  });

  it("does nothing when items are dropped on the folder they already live in", () => {
    expect(resolve({ items: toItems("/Documents/notes.txt"), zone: folder("/Documents") })).toEqual({ kind: "none" });
  });

  it("duplicates when Ctrl-dropped on the same folder", () => {
    expect(
      resolve({ items: toItems("/Documents/notes.txt"), zone: folder("/Documents"), modifiers: { ...none, ctrl: true } })
    ).toMatchObject({ kind: "transfer", operation: "copy", label: "Copy to Documents" });
  });

  it("repositions desktop icons dropped on the desktop", () => {
    expect(
      resolve({ origin: "desktop", items: toItems("/Desktop/todo.txt"), zone: folder("/Desktop", { surface: "desktop" }) })
    ).toEqual({ kind: "reposition" });
  });

  it("asks what to do on a right-button drag", () => {
    expect(resolve({ items: toItems("/Desktop/todo.txt"), zone: folder("/Documents"), button: 2 })).toMatchObject({
      kind: "choose",
      destination: "/Documents",
      label: "Move to Documents",
    });
  });

  it("has no plan over empty space", () => {
    expect(resolve({ items: toItems("/Desktop/todo.txt"), zone: null })).toEqual({ kind: "none" });
  });
});

describe("resolveDropPlan into the Recycle Bin", () => {
  it("moves to the Recycle Bin whatever the modifiers say", () => {
    expect(
      resolve({ items: toItems("/Desktop/todo.txt"), zone: folder("/Trash"), modifiers: { ...none, ctrl: true } })
    ).toMatchObject({ kind: "transfer", operation: "move", label: "Move to Recycle Bin" });
  });

  it("refuses items that can't be deleted", () => {
    expect(resolve({ items: toItems("/Media/Photography/austria.jpg"), zone: folder("/Trash") })).toEqual({ kind: "none" });
    expect(resolve({ items: toItems("/Documents"), zone: folder("/Trash") })).toEqual({ kind: "none" });
  });

  it("only sends the deletable part of a mixed drop", () => {
    expect(
      resolve({ items: toItems("/Media/Photography/austria.jpg", "/Desktop/todo.txt"), zone: folder("/Trash") })
    ).toMatchObject({ paths: ["/Desktop/todo.txt"] });
  });

  it("does nothing for items already in the Recycle Bin", () => {
    expect(resolve({ items: toItems("/Trash/old.txt"), zone: folder("/Trash") })).toEqual({ kind: "none" });
  });
});

describe("resolveDropPlan onto windows and apps", () => {
  it("opens an image with Photos when dropped on its window", () => {
    expect(
      resolve({ items: toItems("/Desktop/pic.png"), zone: { kind: "window", windowId: "w1", appId: "photos" } })
    ).toEqual({ kind: "open-with", appId: "photos", windowId: "w1", paths: ["/Desktop/pic.png"], label: "Open with Photos" });
  });

  it("refuses a file the app can't open", () => {
    expect(resolve({ items: toItems("/Documents/cv.pdf"), zone: { kind: "window", windowId: "w1", appId: "photos" } })).toEqual({
      kind: "none",
    });
  });

  it("follows shortcuts to the file they point at", () => {
    expect(canAppOpenPath(nodes, "/Desktop/Resume.pdf.lnk", "pdf")).toBe(true);
    expect(canAppOpenPath(nodes, "/Desktop/About.lnk", "pdf")).toBe(false);
  });

  it("opens a text file in the editor, but in Notes only the notes that live in its folder", () => {
    const notes: FileSystemRecord = {
      ...nodes,
      "/Documents/Notes": dir("/Documents/Notes"),
      "/Documents/Notes/idea.txt": file("/Documents/Notes/idea.txt", "txt", "text/plain"),
    };
    const onWindow = (path: string, appId: "editor" | "notes") =>
      resolve({ nodes: notes, items: toItems(path), zone: { kind: "window", windowId: "w1", appId } });

    expect(onWindow("/Desktop/todo.txt", "editor")).toMatchObject({ kind: "open-with", appId: "editor" });
    expect(onWindow("/Desktop/todo.txt", "notes")).toEqual({ kind: "none" });
    expect(onWindow("/Documents/Notes/idea.txt", "notes")).toMatchObject({ kind: "open-with", appId: "notes" });
    expect(onWindow("/Desktop/pic.png", "editor")).toEqual({ kind: "none" });
  });

  it("moves into the folder an Explorer window shows", () => {
    expect(
      resolve({
        items: toItems("/Desktop/todo.txt"),
        zone: { kind: "window", windowId: "files-1", appId: "files" },
        explorerPathOf: (windowId) => (windowId === "files-1" ? "/Documents/Reports" : undefined),
      })
    ).toMatchObject({ kind: "transfer", destination: "/Documents/Reports", label: "Move to Reports" });
  });

  it("opens a file with the app a desktop shortcut runs", () => {
    expect(resolve({ items: toItems("/Desktop/pic.png"), zone: { kind: "app", appId: "photos" } })).toMatchObject({
      kind: "open-with",
      appId: "photos",
    });
  });

  it("offers nothing on a taskbar button", () => {
    expect(resolve({ items: toItems("/Desktop/todo.txt"), zone: { kind: "taskbar", windowId: "w1" } })).toEqual({ kind: "none" });
  });
});

describe("system icons", () => {
  const recycleBin: DragItem[] = [{ id: "system:recycle-bin" }];

  it("can be repositioned on the desktop and nowhere else", () => {
    expect(
      resolve({ origin: "desktop", items: recycleBin, zone: folder("/Desktop", { surface: "desktop" }) })
    ).toEqual({ kind: "reposition" });
    expect(resolve({ origin: "desktop", items: recycleBin, zone: folder("/Documents") })).toEqual({ kind: "none" });
  });
});
