import { resolveAppIdForNode } from "@/lib/app-registry";
import { normalizePath } from "@/lib/filesystem";
import type { AppId, FileSystemRecord } from "@/types/system";

interface LaunchApp {
  (options: {
    appId: AppId;
    payload?: {
      filePath?: string;
      directoryPath?: string;
    };
  }): string;
}

export function openFileSystemPath(path: string, nodes: FileSystemRecord, launchApp: LaunchApp) {
  const node = nodes[normalizePath(path)];

  if (!node) {
    return;
  }

  if (node.kind === "directory") {
    launchApp({
      appId: "files",
      payload: {
        directoryPath: node.path,
      },
    });
    return;
  }

  const appId = resolveAppIdForNode(node);
  launchApp({
    appId,
    payload: {
      filePath: node.path,
    },
  });
}
