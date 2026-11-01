import { getNodeSize } from "@/components/apps/explorer/explorer-model";
import { getParentPath, normalizePath } from "@/lib/filesystem";
import { resolveShortcutNode } from "@/lib/shortcuts";
import type { FileSystemRecord, VirtualNode } from "@/types/system";

export interface FileProperties {
  /** Name of the one item, or "3 items". */
  name: string;
  /** The single item, when there is only one. */
  node: VirtualNode | null;
  location: string | null;
  bytes: number;
  /** Everything counted, including what is inside folders. */
  files: number;
  folders: number;
  created: number | null;
  modified: number | null;
  readOnly: boolean;
  /** Where a shortcut points. */
  target: string | null;
}

/** Adds up a selection, walking through folders. Nothing is counted twice if a folder and its child are both picked. */
export function describeProperties(nodes: FileSystemRecord, paths: string[]): FileProperties | null {
  const picked = Array.from(new Set(paths.map(normalizePath))).filter((path) => nodes[path]);
  if (picked.length === 0) return null;

  const seen = new Set<string>();
  const visit = (root: string) => {
    seen.add(root);
    const prefix = root === "/" ? "/" : `${root}/`;
    for (const path of Object.keys(nodes)) {
      if (path !== root && path.startsWith(prefix)) seen.add(path);
    }
  };
  picked.forEach(visit);

  let bytes = 0;
  let files = 0;
  let folders = 0;
  for (const path of seen) {
    const node = nodes[path];
    if (node.kind === "file") {
      files += 1;
      bytes += getNodeSize(node);
    } else {
      folders += 1;
    }
  }

  const node = picked.length === 1 ? nodes[picked[0]] : null;
  const parents = new Set(picked.map(getParentPath));
  const target = node?.kind === "file" && node.shortcut ? resolveShortcutNode(nodes, node) : null;

  return {
    name: node ? node.name : `${picked.length} items`,
    node,
    location: parents.size === 1 ? [...parents][0] : null,
    bytes,
    files,
    folders,
    created: node?.createdAt ?? null,
    modified: node?.updatedAt ?? null,
    readOnly: picked.every((path) => {
      const entry = nodes[path];
      return entry.kind === "file" && Boolean(entry.readonly);
    }),
    target: target?.path ?? null,
  };
}
