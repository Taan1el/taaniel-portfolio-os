import { getFileAssociationDescriptor, isBrowserRenderableImageExtension, isTextLikeExtension } from "@/lib/file-registry";
import { listChildren } from "@/lib/filesystem";
import { resolveShortcutNode } from "@/lib/shortcuts";
import type { FileSystemRecord, VirtualNode } from "@/types/system";

/** Enough to get the feel of a file. Rendering more slows the window down. */
export const PREVIEW_TEXT_LIMIT = 20_000;

export type FilePreview =
  | { kind: "empty" }
  | { kind: "many"; count: number }
  | { kind: "folder"; node: VirtualNode; items: number }
  | { kind: "image" | "audio" | "video"; node: VirtualNode; source: string }
  | { kind: "text"; node: VirtualNode; text: string; truncated: boolean }
  | { kind: "none"; node: VirtualNode; broken?: boolean };

/** What the preview pane shows for a selection. Text stays text: nothing is ever rendered as HTML. */
export function describePreview(nodes: FileSystemRecord, paths: string[]): FilePreview {
  const present = paths.filter((path) => nodes[path]);
  if (present.length === 0) return { kind: "empty" };
  if (present.length > 1) return { kind: "many", count: present.length };

  const picked = nodes[present[0]];
  const isShortcut = picked.kind === "file" && Boolean(picked.shortcut);
  const node = isShortcut ? resolveShortcutNode(nodes, picked) : picked;

  if (!node) return { kind: "none", node: picked, broken: true };
  if (node.kind === "directory") return { kind: "folder", node, items: listChildren(nodes, node.path).length };

  const family = getFileAssociationDescriptor(node.extension)?.family;
  if (node.source && family === "image" && isBrowserRenderableImageExtension(node.extension)) return { kind: "image", node, source: node.source };
  if (node.source && (family === "audio" || family === "video")) return { kind: family, node, source: node.source };
  if (typeof node.content === "string" && isTextLikeExtension(node.extension)) {
    return { kind: "text", node, text: node.content.slice(0, PREVIEW_TEXT_LIMIT), truncated: node.content.length > PREVIEW_TEXT_LIMIT };
  }
  return { kind: "none", node };
}
