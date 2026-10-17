import { getDisplayName } from "@/lib/shortcuts";
import { normalizePath } from "@/lib/filesystem";
import { SHELL_USER } from "@/lib/windows-path";
import type { ExplorerBreadcrumb } from "@/components/apps/explorer/explorer-toolbar";
import type { ExplorerSortKey } from "@/stores/explorer-store";
import type { FileNode } from "@/types/system";

/** Pure helpers behind File Explorer's lists: names, sorting, searching, sizes, dates. */

/** The name Explorer shows: a shortcut's without ".lnk", like Windows. */
export function getNodeLabel(node: FileNode) {
  return getDisplayName(node);
}

export function buildBreadcrumbs(path: string): ExplorerBreadcrumb[] {
  const normalized = normalizePath(path);

  if (normalized === "/") {
    return [{ label: SHELL_USER, path: "/" }];
  }

  const parts = normalized.split("/").filter(Boolean);

  return [
    { label: SHELL_USER, path: "/" },
    ...parts.map((part, index) => ({
      label: part,
      path: `/${parts.slice(0, index + 1).join("/")}`,
    })),
  ];
}

/** Text a search matches against: what is shown, plus where the item is and what kind it is. */
export function getSearchText(node: FileNode) {
  return [getNodeLabel(node), node.path, node.type, node.mimeType ?? "", node.extension ?? ""].join(" ").toLowerCase();
}

/** Best available byte size of a file: recorded size, text length, or decoded data-URL length. */
export function getNodeSize(node: { size?: number; content?: unknown; source?: string }) {
  if (typeof node.size === "number") return node.size;
  if (typeof node.content === "string") return node.content.length;
  if (node.source?.startsWith("data:")) {
    const comma = node.source.indexOf(",");
    const payload = node.source.slice(comma + 1);
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }
  return 0;
}

/** Status bar size: "512 bytes", "2.34 KB", "1.20 MB". */
export function formatSize(size?: number) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/** Details column size: whole kilobytes rounded up, like Windows ("1 KB" for 12 bytes). */
export function formatDetailsSize(size: number) {
  return `${Math.max(1, Math.ceil(size / 1024)).toLocaleString()} KB`;
}

export function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** Shift+click: everything between the anchor and the clicked item, in the order shown. */
export function selectPathRange(ordered: string[], anchor: string | null | undefined, target: string) {
  const to = ordered.indexOf(target);
  const from = anchor ? ordered.indexOf(anchor) : -1;

  if (to < 0 || from < 0) {
    return [target];
  }

  return ordered.slice(Math.min(from, to), Math.max(from, to) + 1);
}

/** Folders first, whatever the key; names compare as people read them (file2 before file10). */
export function sortExplorerNodes(nodes: FileNode[], key: ExplorerSortKey, direction: "asc" | "desc"): FileNode[] {
  const mult = direction === "asc" ? 1 : -1;
  const byName = (a: FileNode, b: FileNode) =>
    getNodeLabel(a).localeCompare(getNodeLabel(b), undefined, { numeric: true, sensitivity: "base" });

  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    let cmp = 0;

    switch (key) {
      case "name":
        cmp = byName(a, b);
        break;
      case "date":
        // In the Recycle Bin the date column is "Date deleted".
        cmp = (a.deletedAt ?? a.updatedAt) - (b.deletedAt ?? b.updatedAt);
        break;
      case "size":
        cmp = getNodeSize(a) - getNodeSize(b);
        break;
      case "type":
        cmp = (a.extension ?? "").localeCompare(b.extension ?? "");
        break;
    }

    return cmp === 0 ? byName(a, b) : cmp * mult;
  });
}
