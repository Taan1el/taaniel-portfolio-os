import { create } from "zustand";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import {
  clearPersistedFileSystem,
  createDirectoryRecord,
  createTextFileRecord,
  deleteNodeRecord,
  loadFileSystem,
  renameNodeRecord,
  saveFileSystem,
  updateTextFileRecord,
} from "@/lib/filesystem";
import type { FileSystemRecord } from "@/types/system";

interface FileSystemState {
  nodes: FileSystemRecord;
  initialized: boolean;
  initialize: () => Promise<void>;
  createDirectory: (directoryPath: string, name?: string) => Promise<void>;
  createTextFile: (directoryPath: string, name?: string, content?: string) => Promise<void>;
  renameNode: (path: string, nextName: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
  updateTextFile: (path: string, content: string) => Promise<void>;
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

    const nodes = await loadFileSystem();
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
  reset: async () => {
    const nodes = buildSeedFileSystem();
    set({ nodes, initialized: true });
    await clearPersistedFileSystem();
    await persistNodes(nodes);
  },
}));
