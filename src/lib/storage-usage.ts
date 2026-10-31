import { TRASH_PATH } from "@/lib/system-workspace";
import type { FileSystemRecord } from "@/types/system";

export interface FolderUsage {
  /** Top-level folder path, "/Documents". Files straight in "/" are grouped under "/". */
  path: string;
  name: string;
  bytes: number;
  files: number;
}

export interface FileSystemUsage {
  folders: FolderUsage[];
  totalBytes: number;
  totalFiles: number;
}

/** Bytes and file counts of the virtual file system, grouped by top-level folder, largest first. */
export function summarizeFileSystem(nodes: FileSystemRecord): FileSystemUsage {
  const byFolder = new Map<string, FolderUsage>();
  let totalBytes = 0;
  let totalFiles = 0;

  for (const node of Object.values(nodes)) {
    if (node.kind !== "file") continue;

    const [top] = node.path.split("/").filter(Boolean);
    const isRoot = node.path.split("/").filter(Boolean).length <= 1;
    const path = isRoot ? "/" : `/${top}`;
    const entry = byFolder.get(path) ?? {
      path,
      name: path === TRASH_PATH ? "Recycle Bin" : path === "/" ? "Root" : top,
      bytes: 0,
      files: 0,
    };
    const size = typeof node.size === "number" && Number.isFinite(node.size) && node.size > 0 ? node.size : 0;

    entry.bytes += size;
    entry.files += 1;
    totalBytes += size;
    totalFiles += 1;
    byFolder.set(path, entry);
  }

  return {
    folders: [...byFolder.values()].sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name)),
    totalBytes,
    totalFiles,
  };
}
