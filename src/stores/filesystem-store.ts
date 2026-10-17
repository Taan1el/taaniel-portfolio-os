import { create } from "zustand";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { toast } from "@/stores/toast-store";
import { refreshPortfolioWorkspace } from "@/lib/portfolio-workspace";
import {
  clearPersistedFileSystem,
  createBinaryFileRecord,
  createDirectoryRecord,
  createTextFileRecord,
  deleteNodeRecord,
  getChangeRefusal,
  getParentPath,
  importFilesRecord,
  isLockedNode,
  listDirectory as listDirectoryNodes,
  loadFileSystem,
  mkdirRecord,
  normalizePath,
  pasteNodeRecord,
  readFile as readFileNode,
  renameRecord,
  renameNodeRecord,
  restoreFromTrashRecord,
  saveFileSystem,
  transferNodesRecord,
  updateBinaryFileRecord,
  updateTextFileRecord,
  writeFileRecord,
  type ChangeRefusal,
  type NodeChangeResult,
  type TransferOperation,
  type TransferResult,
} from "@/lib/filesystem";
import { TRASH_PATH, ensureSystemWorkspace } from "@/lib/system-workspace";
import type { FileNode, FileSystemRecord } from "@/types/system";

interface FileSystemState {
  nodes: FileSystemRecord;
  initialized: boolean;
  initialize: () => Promise<void>;
  listDirectory: (path: string) => FileNode[];
  readFile: (path: string) => FileNode | null;
  writeFile: (
    path: string,
    content: string,
    options?: {
      mimeType?: string;
      extension?: string;
      source?: string;
      uniqueName?: boolean;
    }
  ) => Promise<string>;
  mkdir: (path: string, options?: { uniqueName?: boolean }) => Promise<string>;
  rename: (path: string, nextName: string) => Promise<string>;
  deleteNode: (path: string, options?: { quiet?: boolean }) => Promise<void>;
  /**
   * deleteNode that says whether anything was deleted, and why not. The Recycle Bin and the
   * system folders are refused, never deleted. For callers that word their own errors.
   */
  tryDeleteNode: (path: string, options?: { quiet?: boolean }) => Promise<NodeChangeResult>;
  /** Put a Recycle Bin item back where it came from. Resolves to the restored path. */
  restoreNode: (path: string) => Promise<string | null>;
  /** Delete without going through the Recycle Bin (Shift+Delete). */
  deleteNodePermanently: (path: string) => Promise<void>;
  createDirectory: (directoryPath: string, name?: string) => Promise<void>;
  createTextFile: (directoryPath: string, name?: string, content?: string) => Promise<void>;
  createBinaryFile: (
    directoryPath: string,
    name: string,
    source: string,
    mimeType: string,
    extension: string
  ) => Promise<string>;
  renameNode: (path: string, nextName: string) => Promise<void>;
  updateTextFile: (path: string, content: string) => Promise<void>;
  updateBinaryFile: (
    path: string,
    source: string,
    options?: {
      mimeType?: string;
      extension?: string;
    }
  ) => Promise<void>;
  pasteNode: (
    sourcePath: string,
    destinationDirectoryPath: string,
    operation: "copy" | "cut",
    options?: { quiet?: boolean }
  ) => Promise<void>;
  /** pasteNode that says whether anything changed, and why not. It only announces a change that happened. */
  tryPasteNode: (
    sourcePath: string,
    destinationDirectoryPath: string,
    operation: "copy" | "cut",
    options?: { quiet?: boolean }
  ) => Promise<NodeChangeResult>;
  /**
   * Move, copy or link several items in one write - a drag, a paste or a
   * multi-item delete. Moving into the Recycle Bin records where items came from.
   */
  transferNodes: (
    sourcePaths: string[],
    destinationDirectoryPath: string,
    operation: TransferOperation,
    options?: { quiet?: boolean }
  ) => Promise<TransferResult>;
  importFiles: (directoryPath: string, files: File[]) => Promise<string[]>;
  canCutNode: (path: string) => boolean;
  emptyTrash: () => Promise<void>;
  reset: () => Promise<void>;
}

/** The toast for a refused delete. */
function describeRefusal(refusal: ChangeRefusal, action: string) {
  return refusal === "protected"
    ? `This folder is part of the system and can't be ${action}`
    : `This item is read-only and can't be ${action}`;
}

/** Why a paste changed nothing. */
function getPasteRefusal(
  nodes: FileSystemRecord,
  sourcePath: string,
  destinationPath: string,
  operation: "copy" | "cut"
): ChangeRefusal {
  const destination = nodes[normalizePath(destinationPath)];

  if (!nodes[normalizePath(sourcePath)] || !destination) {
    return "missing";
  }

  if (destination.kind !== "directory") {
    return "invalid";
  }

  // Only moving is held back by protection; a copy of a system folder is fine.
  return (operation === "cut" ? getChangeRefusal(nodes, sourcePath) : null) ?? "invalid";
}

/** One toast per drag or paste, worded like Windows' progress dialog. */
function describeTransfer(
  result: TransferResult,
  operation: TransferOperation,
  intoTrash: boolean
): { text: string; tone: "success" | "error" } | null {
  const count = result.transferred.length;
  const items = (n: number) => (n === 1 ? "1 item" : `${n} items`);

  if (count > 0) {
    const locked = result.skipped.filter((entry) => entry.reason === "locked").length;
    // A mixed drop still succeeds; say what stayed behind.
    const withNote = (text: string) =>
      locked > 0 ? `${text}. ${locked === 1 ? "1 read-only item was" : `${locked} read-only items were`} left in place` : text;

    if (intoTrash) return { text: withNote(count === 1 ? "Moved to Recycle Bin" : `Moved ${items(count)} to the Recycle Bin`), tone: "success" };
    if (operation === "link") return { text: count === 1 ? "Shortcut created" : `Created ${count} shortcuts`, tone: "success" };
    return { text: withNote(`${operation === "move" ? "Moved" : "Copied"} ${items(count)}`), tone: "success" };
  }

  const reasons = new Set(result.skipped.map((entry) => entry.reason));
  if (reasons.has("into-itself")) return { text: "The destination folder is a subfolder of the source folder", tone: "error" };
  if (reasons.has("locked")) return { text: "This item is read-only and can't be moved", tone: "error" };
  return null;
}

/** An item that kept its identity but changed path: renamed or moved. */
export interface FileSystemMove {
  from: string;
  to: string;
}

const moveListeners = new Set<(moves: FileSystemMove[]) => void>();

/**
 * Hear about renames and moves as they happen, before the new listing is
 * published. The desktop uses it to keep an icon where it was when its file is
 * renamed from Explorer, a move that icons keyed by path would otherwise lose.
 */
export function subscribeFileSystemMoves(listener: (moves: FileSystemMove[]) => void) {
  moveListeners.add(listener);
  return () => {
    moveListeners.delete(listener);
  };
}

function emitMoves(moves: FileSystemMove[]) {
  if (moves.length > 0) {
    moveListeners.forEach((listener) => listener(moves));
  }
}

async function persistNodes(nodes: FileSystemRecord) {
  try {
    await saveFileSystem(nodes);
  } catch {
    // Non-fatal — IndexedDB may be unavailable (private browsing, quota, etc.)
    // The app continues with in-memory state for this session.
  }
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  nodes: {},
  initialized: false,
  initialize: async () => {
    if (get().initialized) {
      return;
    }

    let storedNodes;
    try {
      storedNodes = await loadFileSystem();
    } catch {
      // IndexedDB unavailable (e.g. Safari private browsing, storage quota
      // exceeded). Fall back to the seed filesystem so the app still loads.
      console.warn("[fs] IndexedDB unavailable — falling back to seed filesystem");
      storedNodes = null;
    }

    const nodes = ensureSystemWorkspace(
      storedNodes ? await refreshPortfolioWorkspace(storedNodes) : buildSeedFileSystem()
    );

    if (storedNodes !== null && nodes !== storedNodes) {
      await persistNodes(nodes);
    }

    set({ nodes, initialized: true });
  },
  listDirectory: (path) => listDirectoryNodes(get().nodes, path),
  readFile: (path) => readFileNode(get().nodes, path),
  writeFile: async (path, content, options) => {
    const result = writeFileRecord(get().nodes, path, content, options);
    set({ nodes: result.nodes });
    await persistNodes(result.nodes);
    return result.path;
  },
  mkdir: async (path, options) => {
    const result = mkdirRecord(get().nodes, path, options);
    set({ nodes: result.nodes });
    await persistNodes(result.nodes);
    return result.path;
  },
  rename: async (path, nextName) => {
    const result = renameRecord(get().nodes, path, nextName);
    if (result.path !== normalizePath(path)) emitMoves([{ from: normalizePath(path), to: result.path }]);
    set({ nodes: result.nodes });
    await persistNodes(result.nodes);
    return result.path;
  },
  createDirectory: async (directoryPath, name) => {
    const nodes = createDirectoryRecord(get().nodes, directoryPath, name);
    set({ nodes });
    await persistNodes(nodes);
    toast("Folder created", "success");
  },
  createTextFile: async (directoryPath, name, content) => {
    const nodes = createTextFileRecord(get().nodes, directoryPath, name, content);
    set({ nodes });
    await persistNodes(nodes);
  },
  createBinaryFile: async (directoryPath, name, source, mimeType, extension) => {
    const result = createBinaryFileRecord(get().nodes, directoryPath, name, source, mimeType, extension);
    const nodes = result.nodes;
    set({ nodes });
    await persistNodes(nodes);
    return result.path;
  },
  renameNode: async (path, nextName) => {
    const nodes = renameNodeRecord(get().nodes, path, nextName);
    set({ nodes });
    await persistNodes(nodes);
  },
  deleteNode: async (path, options) => {
    await get().tryDeleteNode(path, options);
  },
  tryDeleteNode: async (path, options) => {
    const normalized = normalizePath(path);
    const before = get().nodes;
    const refusal = getChangeRefusal(before, normalized);

    // Nothing to delete is nothing to say; the Recycle Bin and the system folders are never deleted,
    // not even for good.
    if (refusal === "missing") {
      return { ok: false, reason: refusal };
    }

    if (refusal === "protected") {
      if (!options?.quiet) toast(describeRefusal(refusal, "deleted"), "error");
      return { ok: false, reason: refusal };
    }

    // Items already in the Recycle Bin are deleted for good.
    if (normalized.startsWith(`${TRASH_PATH}/`)) {
      const nodes = deleteNodeRecord(before, normalized);
      set({ nodes });
      await persistNodes(nodes);
      if (!options?.quiet) toast("Permanently deleted", "success");
      return { ok: true };
    }

    if (refusal) {
      if (!options?.quiet) toast(describeRefusal(refusal, "deleted"), "error");
      return { ok: false, reason: refusal };
    }

    // Soft-delete: move into the Recycle Bin and remember where it came from.
    const pasted = pasteNodeRecord(before, normalized, TRASH_PATH, "cut");

    if (pasted === before) {
      return { ok: false, reason: "invalid" };
    }

    const landed = Object.keys(pasted).find((key) => !(key in before) && getParentPath(key) === TRASH_PATH);
    const nodes = landed
      ? { ...pasted, [landed]: { ...pasted[landed], originalPath: normalized, deletedAt: Date.now() } }
      : pasted;
    set({ nodes });
    await persistNodes(nodes);
    if (!options?.quiet) toast("Moved to Recycle Bin", "success");
    return { ok: true };
  },
  deleteNodePermanently: async (path) => {
    const before = get().nodes;
    const refusal = getChangeRefusal(before, path);

    if (refusal === "missing") {
      return;
    }

    if (refusal) {
      toast(describeRefusal(refusal, "deleted"), "error");
      return;
    }

    const nodes = deleteNodeRecord(before, path);
    set({ nodes });
    await persistNodes(nodes);
    toast("Permanently deleted", "success");
  },
  restoreNode: async (path) => {
    const result = restoreFromTrashRecord(get().nodes, path, TRASH_PATH);
    if (!result.path) return null;
    set({ nodes: result.nodes });
    await persistNodes(result.nodes);
    return result.path;
  },
  emptyTrash: async () => {
    const nodes = get().nodes;
    const trashChildren = Object.keys(nodes).filter(
      (p) => p !== TRASH_PATH && p.startsWith(`${TRASH_PATH}/`) && !p.slice(TRASH_PATH.length + 1).includes("/")
    );
    if (trashChildren.length === 0) {
      toast("The Recycle Bin is already empty", "info");
      return;
    }
    let nextNodes = { ...nodes };
    trashChildren.forEach((child) => {
      Object.keys(nextNodes).forEach((p) => {
        if (p === child || p.startsWith(`${child}/`)) {
          delete nextNodes[p];
        }
      });
    });
    set({ nodes: nextNodes });
    await persistNodes(nextNodes);
    toast("Recycle Bin emptied", "success");
  },
  updateTextFile: async (path, content) => {
    const nodes = updateTextFileRecord(get().nodes, path, content);
    set({ nodes });
    await persistNodes(nodes);
  },
  updateBinaryFile: async (path, source, options) => {
    const nodes = updateBinaryFileRecord(get().nodes, path, source, options);
    set({ nodes });
    await persistNodes(nodes);
  },
  pasteNode: async (sourcePath, destinationDirectoryPath, operation, options) => {
    await get().tryPasteNode(sourcePath, destinationDirectoryPath, operation, options);
  },
  tryPasteNode: async (sourcePath, destinationDirectoryPath, operation, options) => {
    const before = get().nodes;
    const nodes = pasteNodeRecord(before, sourcePath, destinationDirectoryPath, operation);

    // Refused (read-only, into itself, nowhere to go): nothing changed, so there is nothing to announce.
    if (nodes === before) {
      return { ok: false, reason: getPasteRefusal(before, sourcePath, destinationDirectoryPath, operation) };
    }

    set({ nodes });
    await persistNodes(nodes);
    if (!options?.quiet) toast(operation === "cut" ? "Moved" : "Copied", "success");
    return { ok: true };
  },
  transferNodes: async (sourcePaths, destinationDirectoryPath, operation, options) => {
    const result = transferNodesRecord(get().nodes, sourcePaths, destinationDirectoryPath, operation, {
      trashPath: TRASH_PATH,
    });

    if (result.transferred.length > 0) {
      if (operation === "move") emitMoves(result.transferred);
      set({ nodes: result.nodes });
      await persistNodes(result.nodes);
    }

    if (!options?.quiet) {
      const message = describeTransfer(result, operation, normalizePath(destinationDirectoryPath) === TRASH_PATH);
      if (message) toast(message.text, message.tone);
    }

    return result;
  },
  importFiles: async (directoryPath, files) => {
    const { nodes, importedPaths } = await importFilesRecord(get().nodes, directoryPath, files);
    set({ nodes });
    await persistNodes(nodes);
    toast(
      files.length === 1 ? `Imported "${files[0].name}"` : `Imported ${files.length} files`,
      "success"
    );
    return importedPaths;
  },
  canCutNode: (path) => !isLockedNode(get().nodes, path),
  reset: async () => {
    const nodes = ensureSystemWorkspace(buildSeedFileSystem());
    set({ nodes, initialized: true });
    await clearPersistedFileSystem();
    await persistNodes(nodes);
  },
}));
