import { resolveEditApp, resolveOpenApp } from "@/lib/file-registry";
import { downloadFileNode } from "@/lib/filesystem";
import { normalizePath } from "@/lib/filesystem";
import type { AppId, FileSystemRecord, VirtualNode } from "@/types/system";

interface LaunchApp {
  (options: {
    appId: AppId;
    payload?: {
      filePath?: string;
      directoryPath?: string;
    };
  }): string;
}

type LaunchMode = "open" | "edit" | "preview";

function launchNode(node: VirtualNode, launchApp: LaunchApp, mode: LaunchMode) {
  if (node.kind === "directory") {
    launchApp({
      appId: "files",
      payload: {
        directoryPath: node.path,
      },
    });
    return;
  }

  if (mode === "open" && node.extension === "zip") {
    void downloadFileNode(node);
    return;
  }

  const appId = mode === "edit" ? resolveEditApp(node) ?? resolveOpenApp(node) : resolveOpenApp(node);

  launchApp({
    appId,
    payload: {
      filePath: node.path,
    },
  });
}

export function launchFileSystemPath(
  path: string,
  nodes: FileSystemRecord,
  launchApp: LaunchApp,
  mode: LaunchMode = "open"
) {
  const node = nodes[normalizePath(path)];

  if (!node) {
    return;
  }

  launchNode(node, launchApp, mode);
}

export function openFileSystemPath(path: string, nodes: FileSystemRecord, launchApp: LaunchApp) {
  launchFileSystemPath(path, nodes, launchApp, "open");
}

export function editFileSystemPath(path: string, nodes: FileSystemRecord, launchApp: LaunchApp) {
  launchFileSystemPath(path, nodes, launchApp, "edit");
}

export function previewFileSystemPath(path: string, nodes: FileSystemRecord, launchApp: LaunchApp) {
  launchFileSystemPath(path, nodes, launchApp, "preview");
}
