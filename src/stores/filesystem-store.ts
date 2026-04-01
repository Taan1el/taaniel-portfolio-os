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
  loadFileSystem,
  pasteNodeRecord,
  renameNodeRecord,
  saveFileSystem,
  updateBinaryFileRecord,
  updateTextFileRecord,
} from "@/lib/filesystem";
import { ensureNotesWorkspace } from "@/lib/notes";
import type { FileSystemRecord } from "@/types/system";

interface FileSystemState {
  nodes: FileSystemRecord;
  initialized: boolean;
  initialize: () => Promise<void>;
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
  deleteNode: (path: string) => Promise<void>;
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
    const nodes = ensureNotesWorkspace(storedNodes);

    if (nodes !== storedNodes) {
      await persistNodes(nodes);
    }

    set({ nodes, initialized: true });
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
    const nodes = ensureNotesWorkspace(buildSeedFileSystem());
    set({ nodes, initialized: true });
    await clearPersistedFileSystem();
    await persistNodes(nodes);
  },
}));
