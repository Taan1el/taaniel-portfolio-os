import { getOpenWithOptions } from "@/lib/file-registry";
import { getParentPath, isLockedNode, normalizePath, type TransferOperation } from "@/lib/filesystem";
import { editFileSystemPath, openFileSystemPath } from "@/lib/launchers";
import { getDisplayName, resolveShortcut, resolveShortcutNode } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import { confirmInOs } from "@/stores/confirm-dialog-store";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { toast } from "@/stores/toast-store";
import type { FileSystemRecord } from "@/types/system";

/*
 * The things you can do to files and folders, whichever surface you do them
 * from: the desktop, File Explorer, the drag and drop layer. They read and write
 * the shell stores directly, so the callers only decide which paths and where.
 */

const fileSystem = () => useFileSystemStore.getState();

export function isInTrash(path: string) {
  const normalized = normalizePath(path);
  return normalized === TRASH_PATH || normalized.startsWith(`${TRASH_PATH}/`);
}

/** Put the items on the clipboard to be pasted as copies. */
export function copyItems(paths: string[]) {
  if (paths.length > 0) {
    useShellStore.getState().setClipboard({ paths: paths.map(normalizePath), operation: "copy" });
  }
}

/** Put the items on the clipboard to be moved on paste. Read-only items can't be cut. */
export function cutItems(paths: string[]) {
  if (paths.length === 0) {
    return false;
  }

  if (paths.some((path) => isLockedNode(fileSystem().nodes, path))) {
    toast("Read-only items can't be cut", "error");
    return false;
  }

  useShellStore.getState().setClipboard({ paths: paths.map(normalizePath), operation: "cut" });
  return true;
}

/** Paste the clipboard into a folder in one write. Resolves to the paths that landed there. */
export async function pasteIntoFolder(destination: string) {
  const { clipboard, clearClipboard } = useShellStore.getState();

  if (!clipboard) {
    return [];
  }

  const sources = clipboard.paths.filter((path) => fileSystem().nodes[path]);
  const result = await fileSystem().transferNodes(sources, destination, clipboard.operation === "cut" ? "move" : "copy");

  if (clipboard.operation === "cut") {
    clearClipboard();
  }

  return result.transferred.map((entry) => entry.to);
}

/** Move, copy or link items into a folder (the Move to... / Copy to... commands and drops). */
export async function transferItems(paths: string[], destination: string, operation: TransferOperation) {
  return fileSystem().transferNodes(paths, destination, operation);
}

/** The question Windows asks before deleting for good: its title and its words. */
function describeDeletion(nodes: FileSystemRecord, paths: string[]) {
  if (paths.length === 1) {
    const node = nodes[paths[0]];
    const kind = node?.kind === "directory" ? "Folder" : node?.kind === "file" && node.shortcut ? "Shortcut" : "File";

    return {
      title: `Delete ${kind}`,
      message: `Are you sure you want to permanently delete "${node ? getDisplayName(node) : "this item"}"?`,
    };
  }

  return { title: "Delete Multiple Items", message: `Are you sure you want to permanently delete these ${paths.length} items?` };
}

/**
 * Delete items: into the Recycle Bin, or for good (Shift+Delete, or anything
 * already in the bin) after asking, as Windows does. The question is asked in
 * the OS's own dialog; it is answered "no" by Cancel, Escape or a click outside.
 */
export async function deleteItems(paths: string[], options: { permanent?: boolean } = {}) {
  const targets = Array.from(new Set(paths.map(normalizePath)));

  if (targets.length === 0) {
    return 0;
  }

  const permanent = options.permanent || targets.every(isInTrash);

  if (!permanent) {
    const result = await fileSystem().transferNodes(targets, TRASH_PATH, "move");
    return result.transferred.length;
  }

  const confirmed = await confirmInOs({ ...describeDeletion(fileSystem().nodes, targets), confirmLabel: "Delete" });

  if (!confirmed) {
    return 0;
  }

  for (const path of targets) {
    // Sequential on purpose: each delete reads the store the previous one wrote.
    // eslint-disable-next-line no-await-in-loop
    await fileSystem().deleteNodePermanently(path);
  }

  return targets.length;
}

/** Empty the Recycle Bin after asking. Resolves to whether it was emptied. */
export async function emptyRecycleBin() {
  const inBin = fileSystem().listDirectory(TRASH_PATH).map((node) => node.path);

  if (inBin.length === 0) {
    return false;
  }

  const confirmed = await confirmInOs({ ...describeDeletion(fileSystem().nodes, inBin), confirmLabel: "Delete" });

  if (!confirmed) {
    return false;
  }

  await fileSystem().emptyTrash();
  return true;
}

/** Put Recycle Bin items back where they were deleted from. Resolves to the restored paths. */
export async function restoreItems(paths: string[]) {
  const restored: string[] = [];

  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    const next = await fileSystem().restoreNode(path);
    if (next) restored.push(next);
  }

  if (restored.length > 0) {
    toast(restored.length === 1 ? "Restored 1 item" : `Restored ${restored.length} items`, "success");
  }

  return restored;
}

/** "Create shortcut": a .lnk next to each item, as the right-click command does. */
export async function createShortcutsFor(paths: string[]) {
  const nodes = fileSystem().nodes;
  const byFolder = new Map<string, string[]>();

  paths
    .map(normalizePath)
    .filter((path) => nodes[path] && !isInTrash(path))
    .forEach((path) => {
      const folder = getParentPath(path);
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), path]);
    });

  const created: string[] = [];

  for (const [folder, sources] of byFolder) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fileSystem().transferNodes(sources, folder, "link");
    created.push(...result.transferred.map((entry) => entry.to));
  }

  return created;
}

export function openItems(paths: string[]) {
  const { launchApp } = useSystemStore.getState();
  paths.forEach((path) => openFileSystemPath(path, fileSystem().nodes, launchApp));
}

export function editItem(path: string) {
  editFileSystemPath(path, fileSystem().nodes, useSystemStore.getState().launchApp);
}

/** The "Open with..." dialog for a file. A shortcut offers the apps that can open what it points at. */
export function chooseAppFor(path: string) {
  const nodes = fileSystem().nodes;
  const saved = nodes[normalizePath(path)];
  const node = saved?.kind === "file" && saved.shortcut ? resolveShortcutNode(nodes, saved) : saved;

  if (node?.kind === "file" && getOpenWithOptions(node).length > 0) {
    useShellStore.getState().setOpenWithTarget({ filePath: node.path, node });
  }
}

/**
 * Where "Open file location" goes: the folder holding the item, or for a
 * shortcut the folder holding what it points at. Null for shortcuts to apps,
 * pages and web addresses, which have no file to show.
 */
export function getFileLocation(path: string): { directory: string; select: string } | null {
  const nodes = fileSystem().nodes;
  const node = nodes[normalizePath(path)];

  if (!node) {
    return null;
  }

  if (node.kind === "file" && node.shortcut) {
    const resolved = resolveShortcut(nodes, node);

    if (resolved.kind !== "node") {
      return null;
    }

    return { directory: getParentPath(resolved.node.path), select: resolved.node.path };
  }

  return { directory: getParentPath(node.path), select: node.path };
}

/** Open File Explorer on the folder holding the item, with the item selected. */
export function revealInExplorer(path: string) {
  const location = getFileLocation(path);

  if (!location) {
    toast("There is no file to show for this shortcut", "info");
    return;
  }

  const windowId = useSystemStore.getState().launchApp({
    appId: "files",
    payload: { directoryPath: location.directory },
  });

  // Prepare the window's session first, so it opens already showing the item selected.
  const explorer = useExplorerStore.getState();
  explorer.ensureSession(windowId, location.directory);
  explorer.navigate(windowId, location.directory);
  explorer.setSelectedPath(windowId, location.select);
}
