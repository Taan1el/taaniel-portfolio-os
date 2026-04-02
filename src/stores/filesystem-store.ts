import { create } from "zustand";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import {
  clearPersistedFileSystem,
  createBinaryFileRecord,
  createDirectoryRecord,
  createTextFileRecord,
  deleteNodeRecord,
  hasReadonlyContent,
  importFilesRecord,
  listDirectory as listDirectoryNodes,
  loadFileSystem,
  mkdirRecord,
  pasteNodeRecord,
  readFile as readFileNode,
  renameRecord,
  renameNodeRecord,
  saveFileSystem,
  updateBinaryFileRecord,
  updateTextFileRecord,
  writeFileRecord,
} from "@/lib/filesystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
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
  deleteNode: (path: string) => Promise<void>;
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
    operation: "copy" | "cut"
  ) => Promise<void>;
  importFiles: (directoryPath: string, files: File[]) => Promise<string[]>;
  canCutNode: (path: string) => boolean;
  reset: () => Promise<void>;
}

async function persistNodes(nodes: FileSystemRecord) {
  await saveFileSystem(nodes);
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  nodes: {},
  initialized: false,
  initialize: async () => {
    if (get().initialized) {
      return;
    }

    const storedNodes = await loadFileSystem();
    const nodes = ensureSystemWorkspace(storedNodes);

    if (nodes !== storedNodes) {
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
  deleteNode: async (path) => {
    const nodes = deleteNodeRecord(get().nodes, path);
    set({ nodes });
    await persistNodes(nodes);
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
  pasteNode: async (sourcePath, destinationDirectoryPath, operation) => {
    const nodes = pasteNodeRecord(get().nodes, sourcePath, destinationDirectoryPath, operation);
    set({ nodes });
    await persistNodes(nodes);
  },
  importFiles: async (directoryPath, files) => {
    const { nodes, importedPaths } = await importFilesRecord(get().nodes, directoryPath, files);
    set({ nodes });
    await persistNodes(nodes);
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
