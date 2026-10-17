import { getParentPath, normalizePath } from "@/lib/filesystem";
import { TRASH_PATH } from "@/lib/system-workspace";
import { SHELL_USER } from "@/lib/windows-path";
import type { FileSystemRecord } from "@/types/system";

export interface FolderChoice {
  path: string;
  label: string;
  /** Nesting level: the profile folder is 0, its subfolders 1, and so on. */
  depth: number;
  /** Why this folder can't take the items, when it can't. */
  disabledReason?: string;
}

/**
 * Every folder a "Move to..." or "Copy to..." can target, in tree order (the
 * profile folder first, each folder followed by its subfolders). The Recycle
 * Bin is left out: that is Delete. Folders the items can't go into stay in the
 * list, disabled, with the reason.
 */
export function listFolderChoices(
  nodes: FileSystemRecord,
  sources: string[],
  operation: "move" | "copy"
): FolderChoice[] {
  const normalizedSources = sources.map(normalizePath);
  const folders = Object.values(nodes).filter(
    (node) => node.kind === "directory" && node.path !== TRASH_PATH && !node.path.startsWith(`${TRASH_PATH}/`)
  );
  const childrenOf = new Map<string, string[]>();

  folders.forEach((folder) => {
    if (folder.path === "/") return;
    const parent = getParentPath(folder.path);
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), folder.path]);
  });

  childrenOf.forEach((children) =>
    children.sort((a, b) => (nodes[a]?.name ?? a).localeCompare(nodes[b]?.name ?? b, undefined, { sensitivity: "base", numeric: true }))
  );

  const choices: FolderChoice[] = [];

  const visit = (path: string, depth: number) => {
    const intoItself = normalizedSources.some((source) => path === source || path.startsWith(`${source}/`));
    const alreadyThere = operation === "move" && normalizedSources.every((source) => getParentPath(source) === path);

    choices.push({
      path,
      label: path === "/" ? SHELL_USER : (nodes[path]?.name ?? path),
      depth,
      disabledReason: intoItself
        ? "A folder can't go into itself"
        : alreadyThere
          ? "The items are already in this folder"
          : undefined,
    });

    (childrenOf.get(path) ?? []).forEach((child) => visit(child, depth + 1));
  };

  if (nodes["/"]) {
    visit("/", 0);
  }

  return choices;
}
