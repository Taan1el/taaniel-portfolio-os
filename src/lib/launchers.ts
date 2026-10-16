import { resolveEditApp, resolveOpenApp } from "@/lib/file-registry";
import { downloadFileNode } from "@/lib/filesystem";
import { normalizePath } from "@/lib/filesystem";
import { navigateShell } from "@/lib/shell-navigation";
import { getDisplayName, resolveShortcut } from "@/lib/shortcuts";
import { trackRecentFile } from "@/stores/recent-files-store";
import { toast } from "@/stores/toast-store";
import type { AppId, FileSystemRecord, VirtualNode, WindowPayload } from "@/types/system";

interface LaunchApp {
  (options: {
    appId: AppId;
    payload?: WindowPayload;
  }): string;
}

type LaunchMode = "open" | "edit" | "preview";

/** Windows' "Problem with Shortcut" message. */
export function describeBrokenShortcut(node: VirtualNode, targetPath?: string) {
  const target = targetPath ? targetPath.split("/").filter(Boolean).at(-1) ?? targetPath : getDisplayName(node);
  return `The item '${target}' that this shortcut refers to has been changed or moved, so this shortcut will no longer work properly.`;
}

/** Open what a .lnk points at: an app, a page of the site, a web address or another item. */
function launchShortcut(node: VirtualNode, nodes: FileSystemRecord, launchApp: LaunchApp, mode: LaunchMode) {
  const resolved = resolveShortcut(nodes, node);

  switch (resolved.kind) {
    case "app":
      launchApp({ appId: resolved.appId });
      return;
    case "route":
      if (!navigateShell(resolved.route)) {
        toast("This page can't be opened from here", "error");
      }
      return;
    case "url":
      launchApp({ appId: "browser", payload: { externalUrl: resolved.url } });
      return;
    case "node":
      launchNode(resolved.node, nodes, launchApp, mode);
      return;
    case "broken":
      toast(describeBrokenShortcut(node, resolved.path), "error");
  }
}

function launchNode(node: VirtualNode, nodes: FileSystemRecord, launchApp: LaunchApp, mode: LaunchMode) {
  if (node.kind === "directory") {
    launchApp({
      appId: "files",
      payload: {
        directoryPath: node.path,
      },
    });
    return;
  }

  if (node.shortcut) {
    launchShortcut(node, nodes, launchApp, mode);
    return;
  }

  if (mode === "open" && node.extension === "zip") {
    void downloadFileNode(node);
    return;
  }

  // Track file opens (not directory navigations) in Recent Files. A shortcut
  // lands here with its target, so Recent shows the real file.
  trackRecentFile(node.path);

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

  launchNode(node, nodes, launchApp, mode);
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
