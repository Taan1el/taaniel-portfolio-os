// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import {
  chooseAppFor,
  copyItems,
  createShortcutsFor,
  cutItems,
  deleteItems,
  emptyRecycleBin,
  getFileLocation,
  pasteIntoFolder,
  restoreItems,
  revealInExplorer,
} from "@/lib/file-actions";
import { buildFileMenu } from "@/lib/file-menu";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import { useConfirmDialogStore } from "@/stores/confirm-dialog-store";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { useTransferDialogStore } from "@/stores/transfer-dialog-store";
import type { VirtualFile } from "@/types/system";

const nodes = () => useFileSystemStore.getState().nodes;
const note = (path: string): VirtualFile => ({
  kind: "file",
  path,
  name: path.split("/").at(-1) ?? path,
  extension: "txt",
  mimeType: "text/plain",
  content: "hello",
  createdAt: 1,
  updatedAt: 1,
});

/** The "Are you sure?" the OS is showing, if any. */
const question = () => {
  const request = useConfirmDialogStore.getState().request;
  return request ? { title: request.title, message: request.message, confirmLabel: request.confirmLabel } : undefined;
};
const answer = (accepted: boolean) => useConfirmDialogStore.getState().answer(accepted);

beforeEach(() => {
  useConfirmDialogStore.setState({ request: null });
  useFileSystemStore.setState({
    nodes: { ...ensureSystemWorkspace(buildSeedFileSystem()), "/Documents/a.txt": note("/Documents/a.txt"), "/Documents/b.txt": note("/Documents/b.txt") },
    initialized: true,
  });
  useShellStore.setState({ clipboard: null });
});

describe("clipboard", () => {
  it("copies and pastes several items in one go", async () => {
    copyItems(["/Documents/a.txt", "/Documents/b.txt"]);
    const landed = await pasteIntoFolder("/Desktop");

    expect(landed.sort()).toEqual(["/Desktop/a.txt", "/Desktop/b.txt"]);
    expect(nodes()["/Documents/a.txt"]).toBeTruthy();
    expect(useShellStore.getState().clipboard).not.toBeNull();
  });

  it("cuts, moves on paste and empties the clipboard", async () => {
    expect(cutItems(["/Documents/a.txt"])).toBe(true);
    await pasteIntoFolder("/Desktop");

    expect(nodes()["/Documents/a.txt"]).toBeUndefined();
    expect(nodes()["/Desktop/a.txt"]).toBeTruthy();
    expect(useShellStore.getState().clipboard).toBeNull();
  });

  it("refuses to cut a read-only item", () => {
    const readonly = Object.values(nodes()).find((node) => node.kind === "file" && node.readonly);

    expect(readonly).toBeTruthy();
    expect(cutItems([readonly!.path])).toBe(false);
    expect(useShellStore.getState().clipboard).toBeNull();
  });
});

describe("deleteItems", () => {
  it("sends items to the Recycle Bin together, remembering where they were", async () => {
    expect(await deleteItems(["/Documents/a.txt", "/Documents/b.txt"])).toBe(2);

    expect(nodes()[`${TRASH_PATH}/a.txt`]).toMatchObject({ originalPath: "/Documents/a.txt" });
    expect(nodes()[`${TRASH_PATH}/b.txt`]).toBeTruthy();
  });

  it("asks in the OS before deleting for good, and respects a no", async () => {
    const browserConfirm = vi.spyOn(globalThis, "confirm");

    const refused = deleteItems(["/Documents/a.txt"], { permanent: true });
    expect(question()).toEqual({
      title: "Delete File",
      message: 'Are you sure you want to permanently delete "a.txt"?',
      confirmLabel: "Delete",
    });
    answer(false);
    expect(await refused).toBe(0);
    expect(nodes()["/Documents/a.txt"]).toBeTruthy();

    const accepted = deleteItems(["/Documents/a.txt"], { permanent: true });
    answer(true);
    expect(await accepted).toBe(1);
    expect(nodes()["/Documents/a.txt"]).toBeUndefined();
    expect(nodes()[`${TRASH_PATH}/a.txt`]).toBeUndefined();

    // Never the browser's own dialog, which looks foreign and says no where dialogs are blocked.
    expect(browserConfirm).not.toHaveBeenCalled();
    browserConfirm.mockRestore();
  });

  it("words the question for a folder and for several items", async () => {
    await useFileSystemStore.getState().mkdir("/Desktop/Stuff");

    const folder = deleteItems(["/Desktop/Stuff"], { permanent: true });
    expect(question()).toMatchObject({ title: "Delete Folder", message: 'Are you sure you want to permanently delete "Stuff"?' });
    answer(false);
    await folder;

    const several = deleteItems(["/Documents/a.txt", "/Documents/b.txt"], { permanent: true });
    expect(question()).toMatchObject({
      title: "Delete Multiple Items",
      message: "Are you sure you want to permanently delete these 2 items?",
    });
    answer(false);
    await several;
  });

  it("deletes for good when the items are already in the Recycle Bin", async () => {
    await deleteItems(["/Documents/a.txt"]);

    const deleting = deleteItems([`${TRASH_PATH}/a.txt`]);
    answer(true);

    expect(await deleting).toBe(1);
    expect(nodes()[`${TRASH_PATH}/a.txt`]).toBeUndefined();
  });

  it("empties the Recycle Bin only after a yes", async () => {
    await deleteItems(["/Documents/a.txt", "/Documents/b.txt"]);

    const declined = emptyRecycleBin();
    expect(question()).toMatchObject({
      title: "Delete Multiple Items",
      message: "Are you sure you want to permanently delete these 2 items?",
    });
    answer(false);
    expect(await declined).toBe(false);
    expect(nodes()[`${TRASH_PATH}/a.txt`]).toBeTruthy();

    const confirmed = emptyRecycleBin();
    answer(true);
    expect(await confirmed).toBe(true);
    expect(nodes()[`${TRASH_PATH}/a.txt`]).toBeUndefined();
    expect(nodes()[`${TRASH_PATH}/b.txt`]).toBeUndefined();
    expect(nodes()[TRASH_PATH]).toBeTruthy();
  });

  it("has nothing to ask about an empty Recycle Bin", async () => {
    expect(await emptyRecycleBin()).toBe(false);
    expect(question()).toBeUndefined();
  });

  it("brings items back with restoreItems", async () => {
    await deleteItems(["/Documents/a.txt"]);

    expect(await restoreItems([`${TRASH_PATH}/a.txt`])).toEqual(["/Documents/a.txt"]);
    expect(nodes()["/Documents/a.txt"]).toBeTruthy();
  });
});

describe("shortcuts", () => {
  it("creates a shortcut beside each item", async () => {
    const created = await createShortcutsFor(["/Documents/a.txt", "/Documents/b.txt"]);

    expect(created.sort()).toEqual(["/Documents/a.txt - Shortcut.lnk", "/Documents/b.txt - Shortcut.lnk"]);
    expect(nodes()["/Documents/a.txt - Shortcut.lnk"]).toMatchObject({ shortcut: { type: "path", path: "/Documents/a.txt" } });
  });

  it("finds the file location of an item and of what a shortcut points at", () => {
    expect(getFileLocation("/Documents/a.txt")).toEqual({ directory: "/Documents", select: "/Documents/a.txt" });
    expect(getFileLocation("/Desktop/Resume.pdf.lnk")).toEqual({
      directory: "/Documents",
      select: "/Documents/Taaniel-Vananurm-CV.pdf",
    });
    // Apps and pages have no file to show.
    expect(getFileLocation("/Desktop/About.lnk")).toBeNull();
    expect(getFileLocation("/Desktop/Portfolio.lnk")).toBeNull();
  });

  it("offers Open with for a file shortcut using the file it points at", () => {
    chooseAppFor("/Desktop/OS Case Study.md.lnk");

    expect(useShellStore.getState().openWithTarget).toMatchObject({
      filePath: "/Portfolio/OS-Case-Study.md",
      node: { path: "/Portfolio/OS-Case-Study.md" },
    });

    // The menu entry does the same, and it is not offered for a shortcut to an app.
    useShellStore.getState().setOpenWithTarget(null);
    buildFileMenu({ nodes: nodes(), paths: ["/Desktop/OS Case Study.md.lnk"], clipboard: null, onOpen: () => {} })
      .find((action) => action.id === "open-with")
      ?.onSelect();
    expect(useShellStore.getState().openWithTarget?.filePath).toBe("/Portfolio/OS-Case-Study.md");

    useShellStore.getState().setOpenWithTarget(null);
    chooseAppFor("/Desktop/About.lnk");
    expect(useShellStore.getState().openWithTarget).toBeNull();
  });

  it("names shortcuts without .lnk when asking to delete them for good", async () => {
    const deleting = deleteItems(["/Desktop/About.lnk"], { permanent: true });

    expect(question()).toMatchObject({ title: "Delete Shortcut", message: 'Are you sure you want to permanently delete "About"?' });
    answer(false);
    await deleting;
  });

  it("opens Explorer on the folder with the file selected", () => {
    revealInExplorer("/Desktop/Resume.pdf.lnk");

    const explorerWindow = useSystemStore.getState().windows.find((window) => window.appId === "files");
    expect(explorerWindow).toBeTruthy();
    const session = useExplorerStore.getState().sessions[explorerWindow!.id];
    expect(session.currentPath).toBe("/Documents");
    expect(session.selectedPaths).toEqual(["/Documents/Taaniel-Vananurm-CV.pdf"]);
    useSystemStore.getState().closeWindow(explorerWindow!.id);
  });
});

describe("buildFileMenu", () => {
  const labels = (paths: string[], extra: Partial<Parameters<typeof buildFileMenu>[0]> = {}) =>
    buildFileMenu({ nodes: nodes(), paths, clipboard: null, onOpen: () => {}, onRename: () => {}, ...extra })
      .filter((action) => !action.separator)
      .map((action) => action.label);

  it("offers the Windows set for a file", () => {
    expect(labels(["/Documents/a.txt"])).toEqual([
      "Open",
      "Open with…",
      "Edit",
      "Cut",
      "Copy",
      "Create shortcut",
      "Delete",
      "Rename",
      "Move to…",
      "Copy to…",
      "Download",
      "Properties",
    ]);
  });

  it("counts items for a multi-selection and turns Rename off", () => {
    const menu = buildFileMenu({
      nodes: nodes(),
      paths: ["/Documents/a.txt", "/Documents/b.txt"],
      clipboard: null,
      onOpen: () => {},
      onRename: () => {},
    });

    expect(menu.find((action) => action.id === "delete")?.label).toBe("Delete 2 items");
    expect(menu.find((action) => action.id === "rename")?.disabled).toBe(true);
  });

  it("offers Open file location for shortcuts that point at a file, and for everything on the desktop", () => {
    expect(labels(["/Desktop/Resume.pdf.lnk"])).toContain("Open file location");
    expect(labels(["/Desktop/About.lnk"])).not.toContain("Open file location");
    expect(labels(["/Documents/a.txt"])).not.toContain("Open file location");
    expect(labels(["/Documents/a.txt"], { locationForAll: true })).toContain("Open file location");
  });

  it("offers Restore and a permanent delete in the Recycle Bin", async () => {
    await deleteItems(["/Documents/a.txt"]);
    const inBin = labels([`${TRASH_PATH}/a.txt`]);

    expect(inBin).toContain("Restore");
    expect(inBin).toContain("Delete permanently");
    expect(inBin).not.toContain("Create shortcut");
    expect(inBin).not.toContain("Move to…");
  });

  it("offers Paste into on a folder only when something is on the clipboard", () => {
    expect(labels(["/Documents"])).not.toContain("Move here");
    expect(labels(["/Documents"], { clipboard: { paths: ["/Desktop/About.lnk"], operation: "cut" } })).toContain("Move here");
    expect(labels(["/Documents"], { clipboard: { paths: ["/Desktop/About.lnk"], operation: "copy" } })).toContain("Paste into folder");
  });

  it("locks Cut, Delete and Rename for protected folders", () => {
    const menu = buildFileMenu({ nodes: nodes(), paths: ["/Documents"], clipboard: null, onOpen: () => {}, onRename: () => {} });
    const disabled = (id: string) => menu.find((action) => action.id === id)?.disabled;

    expect(disabled("cut")).toBe(true);
    expect(disabled("delete")).toBe(true);
    expect(disabled("rename")).toBe(true);
    expect(disabled("copy")).toBeFalsy();
  });

  it("opens the Move to dialog for the selection", () => {
    const menu = buildFileMenu({ nodes: nodes(), paths: ["/Documents/a.txt"], clipboard: null, onOpen: () => {} });
    menu.find((action) => action.id === "move-to")?.onSelect();

    expect(useTransferDialogStore.getState().request).toEqual({ paths: ["/Documents/a.txt"], operation: "move" });
    useTransferDialogStore.getState().close();
  });
});
