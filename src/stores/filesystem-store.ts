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
  getParentPath,
  hasReadonlyContent,
  importFilesRecord,
  listDirectory as listDirectoryNodes,
  loadFileSystem,
  mkdirRecord,
  pasteNodeRecord,
  readFile as readFileNode,
  renameRecord,
  renameNodeRecord,
  restoreFromTrashRecord,
  saveFileSystem,
  updateBinaryFileRecord,
  updateTextFileRecord,
  writeFileRecord,
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
  importFiles: (directoryPath: string, files: File[]) => Promise<string[]>;
  canCutNode: (path: string) => boolean;
  emptyTrash: () => Promise<void>;
  reset: () => Promise<void>;
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
    // Permanently delete items that are already in the Trash, or are the Trash itself.
    const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
    const inTrash =
      normalized === TRASH_PATH || normalized.startsWith(`${TRASH_PATH}/`);

    if (inTrash) {
      const nodes = deleteNodeRecord(get().nodes, path);
      set({ nodes });
      await persistNodes(nodes);
      if (!options?.quiet) toast("Permanently deleted", "success");
      return;
    }

    // Soft-delete: move into the Recycle Bin and remember where it came from.
    const before = get().nodes;
    const pasted = pasteNodeRecord(before, path, TRASH_PATH, "cut");

    if (pasted === before) {
      toast("This item is read-only and can't be deleted", "error");
      return;
    }

    const landed = Object.keys(pasted).find((key) => !(key in before) && getParentPath(key) === TRASH_PATH);
    const nodes = landed
      ? { ...pasted, [landed]: { ...pasted[landed], originalPath: normalized, deletedAt: Date.now() } }
      : pasted;
    set({ nodes });
    await persistNodes(nodes);
    if (!options?.quiet) toast("Moved to Recycle Bin", "success");
  },
  deleteNodePermanently: async (path) => {
    const before = get().nodes;
    if (hasReadonlyContent(before, path)) {
      toast("This item is read-only and can't be deleted", "error");
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
    const nodes = pasteNodeRecord(get().nodes, sourcePath, destinationDirectoryPath, operation);
    set({ nodes });
    await persistNodes(nodes);
    if (!options?.quiet) toast(operation === "cut" ? "Moved" : "Copied", "success");
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
  canCutNode: (path) => !hasReadonlyContent(get().nodes, path),
  reset: async () => {
    const nodes = ensureSystemWorkspace(buildSeedFileSystem());
    set({ nodes, initialized: true });
    await clearPersistedFileSystem();
    await persistNodes(nodes);
  },
}));
