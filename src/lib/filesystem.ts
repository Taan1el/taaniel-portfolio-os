import { del, get, set } from "idb-keyval";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { inferMimeTypeFromExtension, isTextLikeExtension } from "@/lib/file-registry";
import { createShortcutNode, getShortcutFileName } from "@/lib/shortcuts";
import { PROTECTED_PATHS } from "@/lib/system-workspace";
import type {
  FileNode,
  FileSystemRecord,
  ShortcutTarget,
  VirtualDirectory,
  VirtualFile,
  VirtualNode,
} from "@/types/system";

export const FILESYSTEM_STORAGE_KEY = "taaniel-os-filesystem-v1";

export function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  const normalized = `/${path}`
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return normalized || "/";
}

export function getParentPath(path: string) {
  const normalized = normalizePath(path);

  if (normalized === "/") {
    return "/";
  }

  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "/";
  }

  return `/${parts.slice(0, -1).join("/")}`;
}

export function getPathName(path: string) {
  const normalized = normalizePath(path);

  if (normalized === "/") {
    return "/";
  }

  return normalized.split("/").filter(Boolean).at(-1) ?? normalized;
}

export function joinPath(...segments: string[]) {
  return normalizePath(segments.join("/"));
}

export function getNodeByPath(nodes: FileSystemRecord, path: string) {
  return nodes[normalizePath(path)];
}

export function toFileNode(node: VirtualNode): FileNode {
  if (node.kind === "directory") {
    return {
      path: node.path,
      name: node.name,
      type: "folder",
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      originalPath: node.originalPath,
      deletedAt: node.deletedAt,
    };
  }

  return {
    path: node.path,
    name: node.name,
    type: "file",
    mimeType: node.mimeType,
    content: node.content,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    extension: node.extension,
    source: node.source,
    size: node.size,
    readonly: node.readonly,
    originalPath: node.originalPath,
    deletedAt: node.deletedAt,
    shortcut: node.shortcut,
  };
}

export function listDirectory(nodes: FileSystemRecord, directoryPath: string) {
  return listChildren(nodes, directoryPath).map(toFileNode);
}

export function readFile(nodes: FileSystemRecord, path: string) {
  const node = getNodeByPath(nodes, path);

  if (!node || node.kind !== "file") {
    return null;
  }

  return toFileNode(node);
}

export function listChildren(nodes: FileSystemRecord, directoryPath: string) {
  const normalized = normalizePath(directoryPath);

  return Object.values(nodes)
    .filter((node) => node.path !== normalized && getParentPath(node.path) === normalized)
    .sort(sortNodes);
}

export function listDescendants(nodes: FileSystemRecord, path: string) {
  const normalized = normalizePath(path);

  return Object.values(nodes)
    .filter((node) => node.path === normalized || node.path.startsWith(`${normalized}/`))
    .sort((a, b) => a.path.length - b.path.length);
}

export function sortNodes(a: VirtualNode, b: VirtualNode) {
  if (a.kind !== b.kind) {
    return a.kind === "directory" ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
}

export function isTextFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && !node.source);
}

export function isImageFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && node.mimeType.startsWith("image/"));
}

export function isVideoFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && node.mimeType.startsWith("video/"));
}

export function isMarkdownFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && node.extension === "md");
}

export function isPdfFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && node.extension === "pdf");
}

export function hasReadonlyContent(nodes: FileSystemRecord, path: string) {
  return listDescendants(nodes, path).some(
    (node) => node.kind === "file" && Boolean(node.readonly)
  );
}

/** System folders (Desktop, Documents, Recycle Bin, the profile root). */
export function isProtectedPath(path: string) {
  return PROTECTED_PATHS.has(normalizePath(path));
}

/** True when an item can't be moved, renamed or recycled - only copied. */
export function isLockedNode(nodes: FileSystemRecord, path: string) {
  return isProtectedPath(path) || hasReadonlyContent(nodes, path);
}

/**
 * Why a change was refused: the item (or its destination) isn't there, it is a system
 * folder, it holds read-only content, or the request makes no sense (into itself, onto a file).
 */
export type ChangeRefusal = "missing" | "protected" | "read-only" | "invalid";

/** What happened to a delete or paste that reports back, for callers that word their own errors (the terminal). */
export type NodeChangeResult = { ok: true } | { ok: false; reason: ChangeRefusal };

/**
 * Why an item can't be deleted, moved or renamed, or null when it can. Callers
 * that print their own errors check this first instead of guessing from silence.
 */
export function getChangeRefusal(nodes: FileSystemRecord, path: string): ChangeRefusal | null {
  const normalized = normalizePath(path);

  if (!nodes[normalized]) {
    return "missing";
  }

  if (isProtectedPath(normalized)) {
    return "protected";
  }

  return hasReadonlyContent(nodes, normalized) ? "read-only" : null;
}

export function searchNodes(nodes: FileSystemRecord, query: string, limit = 10) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return Object.values(nodes)
    .filter((node) => node.path !== "/")
    .filter((node) => {
      const nameMatch = node.name.toLowerCase().includes(normalizedQuery);
      const pathMatch = node.path.toLowerCase().includes(normalizedQuery);
      return nameMatch || pathMatch;
    })
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;

      if (aStarts !== bStarts) {
        return aStarts - bStarts;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

function splitName(name: string, isDirectory: boolean) {
  const dot = name.lastIndexOf(".");
  return !isDirectory && dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot) }
    : { stem: name, extension: "" };
}

/**
 * Windows-style collision naming: "New folder (2)", "notes (3).txt".
 * Matching is case-insensitive, like NTFS. `ignorePath` lets a rename that
 * only changes case keep its own name.
 */
export function ensureUniqueName(
  nodes: FileSystemRecord,
  directoryPath: string,
  desiredName: string,
  isDirectory = false,
  ignorePath?: string
) {
  const taken = new Set(
    listChildren(nodes, directoryPath)
      .filter((node) => node.path !== ignorePath)
      .map((node) => node.name.toLowerCase())
  );

  if (!taken.has(desiredName.toLowerCase())) {
    return desiredName;
  }

  const { stem, extension } = splitName(desiredName, isDirectory);
  const base = stem.replace(/ \(\d+\)$/, "");
  let index = 2;

  while (taken.has(`${base} (${index})${extension}`.toLowerCase())) {
    index += 1;
  }

  return `${base} (${index})${extension}`;
}

/** Name for a copy made in its own folder: "notes - Copy.txt", then "notes - Copy (2).txt". */
export function ensureCopyName(nodes: FileSystemRecord, directoryPath: string, sourceName: string, isDirectory: boolean) {
  const { stem, extension } = splitName(sourceName, isDirectory);
  return ensureUniqueName(nodes, directoryPath, `${stem} - Copy${extension}`, isDirectory);
}

interface CreateNodeOptions {
  uniqueName?: boolean;
}

export function mkdirRecord(
  nodes: FileSystemRecord,
  path: string,
  options: CreateNodeOptions = {}
) {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/" || nodes[normalizedPath]) {
    return {
      nodes,
      path: normalizedPath,
    };
  }

  const parentPath = getParentPath(normalizedPath);
  const parentNode = nodes[parentPath];

  if (!parentNode || parentNode.kind !== "directory") {
    return {
      nodes,
      path: normalizedPath,
    };
  }

  const requestedName = getPathName(normalizedPath);
  const nextName = options.uniqueName ? ensureUniqueName(nodes, parentPath, requestedName, true) : requestedName;
  const nextPath = joinPath(parentPath, nextName);
  const timestamp = Date.now();

  const directoryNode: VirtualDirectory = {
    kind: "directory",
    path: nextPath,
    name: nextName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    nodes: {
      ...nodes,
      [nextPath]: directoryNode,
    },
    path: nextPath,
  };
}

export function createDirectoryRecord(
  nodes: FileSystemRecord,
  directoryPath: string,
  name = "New folder"
): FileSystemRecord {
  const parent = normalizePath(directoryPath);
  const uniqueName = ensureUniqueName(nodes, parent, name, true);
  const path = joinPath(parent, uniqueName);
  const now = Date.now();

  const directoryNode: VirtualDirectory = {
    kind: "directory",
    path,
    name: uniqueName,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...nodes,
    [path]: directoryNode,
  };
}

export function createTextFileRecord(
  nodes: FileSystemRecord,
  directoryPath: string,
  name = "New Text Document.txt",
  content = ""
): FileSystemRecord {
  const parent = normalizePath(directoryPath);
  const uniqueName = ensureUniqueName(nodes, parent, name);
  const path = joinPath(parent, uniqueName);
  const extension = uniqueName.split(".").pop()?.toLowerCase() ?? "txt";
  const mimeType = extension === "md" ? "text/markdown" : "text/plain";
  const now = Date.now();

  const fileNode: VirtualFile = {
    kind: "file",
    path,
    name: uniqueName,
    extension,
    mimeType,
    content,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...nodes,
    [path]: fileNode,
  };
}

interface WriteFileOptions extends CreateNodeOptions {
  mimeType?: string;
  extension?: string;
  source?: string;
}

export function writeFileRecord(
  nodes: FileSystemRecord,
  path: string,
  content: string,
  options: WriteFileOptions = {}
) {
  const normalizedPath = normalizePath(path);
  const current = nodes[normalizedPath];

  if (current?.kind === "file") {
    if (current.readonly) {
      return {
        nodes,
        path: normalizedPath,
      };
    }

    if (options.source || current.source) {
      return {
        nodes: updateBinaryFileRecord(nodes, normalizedPath, options.source ?? String(content), {
          mimeType: options.mimeType,
          extension: options.extension,
        }),
        path: normalizedPath,
      };
    }

    return {
      nodes: updateTextFileRecord(nodes, normalizedPath, String(content)),
      path: normalizedPath,
    };
  }

  const parentPath = getParentPath(normalizedPath);
  const parentNode = nodes[parentPath];

  if (!parentNode || parentNode.kind !== "directory") {
    return {
      nodes,
      path: normalizedPath,
    };
  }

  const requestedName = getPathName(normalizedPath);
  const nextName = options.uniqueName ? ensureUniqueName(nodes, parentPath, requestedName) : requestedName;
  const nextPath = joinPath(parentPath, nextName);
  const extension = options.extension ?? nextName.split(".").pop()?.toLowerCase() ?? "txt";
  const mimeType = options.mimeType ?? inferMimeTypeFromExtension(extension);

  if (options.source || !shouldStoreAsText(mimeType, extension)) {
    return createBinaryFileRecord(
      nodes,
      parentPath,
      nextName,
      options.source ?? String(content),
      mimeType,
      extension
    );
  }

  return {
    nodes: createTextFileRecord(nodes, parentPath, nextName, String(content)),
    path: nextPath,
  };
}

export function updateTextFileRecord(nodes: FileSystemRecord, path: string, content: string) {
  const normalized = normalizePath(path);
  const current = nodes[normalized];

  if (!current || current.kind !== "file") {
    return nodes;
  }

  return {
    ...nodes,
    [normalized]: {
      ...current,
      content,
      updatedAt: Date.now(),
    },
  };
}

function getDataUrlByteSize(source: string) {
  if (!source.startsWith("data:")) {
    return undefined;
  }

  const payload = source.split(",")[1];

  if (!payload) {
    return undefined;
  }

  const normalizedPayload = payload.replace(/\s/g, "");
  const padding = normalizedPayload.endsWith("==") ? 2 : normalizedPayload.endsWith("=") ? 1 : 0;

  return Math.max(0, (normalizedPayload.length * 3) / 4 - padding);
}

export function createBinaryFileRecord(
  nodes: FileSystemRecord,
  directoryPath: string,
  name: string,
  source: string,
  mimeType: string,
  extension: string
) {
  const parent = normalizePath(directoryPath);
  const uniqueName = ensureUniqueName(nodes, parent, name);
  const path = joinPath(parent, uniqueName);
  const now = Date.now();

  const fileNode: VirtualFile = {
    kind: "file",
    path,
    name: uniqueName,
    extension,
    mimeType,
    source,
    size: getDataUrlByteSize(source),
    createdAt: now,
    updatedAt: now,
  };

  return {
    nodes: {
      ...nodes,
      [path]: fileNode,
    },
    path,
  };
}

export function updateBinaryFileRecord(
  nodes: FileSystemRecord,
  path: string,
  source: string,
  options: {
    mimeType?: string;
    extension?: string;
  } = {}
) {
  const normalized = normalizePath(path);
  const current = nodes[normalized];

  if (!current || current.kind !== "file" || current.readonly) {
    return nodes;
  }

  return {
    ...nodes,
    [normalized]: {
      ...current,
      source,
      content: undefined,
      mimeType: options.mimeType ?? current.mimeType,
      extension: options.extension ?? current.extension,
      size: getDataUrlByteSize(source),
      updatedAt: Date.now(),
    },
  };
}

export function renameNodeRecord(nodes: FileSystemRecord, path: string, nextName: string) {
  const normalized = normalizePath(path);
  const target = nodes[normalized];

  if (!target || isProtectedPath(normalized)) {
    return nodes;
  }

  const parentPath = getParentPath(normalized);
  const uniqueName = ensureUniqueName(nodes, parentPath, nextName, target.kind === "directory", normalized);
  const nextPath = joinPath(parentPath, uniqueName);

  if (nextPath === normalized) {
    return nodes;
  }

  const updatedNodes = { ...nodes };
  delete updatedNodes[normalized];

  updatedNodes[nextPath] = {
    ...target,
    path: nextPath,
    name: uniqueName,
    updatedAt: Date.now(),
  };

  if (target.kind === "directory") {
    Object.values(nodes)
      .filter((node) => node.path.startsWith(`${normalized}/`))
      .forEach((node) => {
        delete updatedNodes[node.path];
        const descendantPath = node.path.replace(normalized, nextPath);
        updatedNodes[descendantPath] = {
          ...node,
          path: descendantPath,
          updatedAt: Date.now(),
        };
      });
  }

  return updatedNodes;
}

export function renameRecord(nodes: FileSystemRecord, path: string, nextName: string) {
  const normalizedPath = normalizePath(path);
  const target = nodes[normalizedPath];

  if (!target || isProtectedPath(normalizedPath)) {
    return {
      nodes,
      path: normalizedPath,
    };
  }

  const parentPath = getParentPath(normalizedPath);
  const uniqueName = ensureUniqueName(nodes, parentPath, nextName, target.kind === "directory", normalizedPath);
  const nextPath = joinPath(parentPath, uniqueName);

  return {
    nodes: renameNodeRecord(nodes, normalizedPath, uniqueName),
    path: nextPath,
  };
}

/**
 * Move a top-level Recycle Bin item back to where it was deleted from,
 * recreating missing parent folders the way Windows does. Returns the
 * restored path, or null when the item cannot be restored.
 */
export function restoreFromTrashRecord(nodes: FileSystemRecord, trashedPath: string, trashRoot: string) {
  const source = normalizePath(trashedPath);
  const node = nodes[source];

  if (!node || getParentPath(source) !== normalizePath(trashRoot)) {
    return { nodes, path: null };
  }

  const original = normalizePath(node.originalPath ?? `/Desktop/${node.name}`);
  const targetDirectory = getParentPath(original);
  let next = nodes;
  let current = "";

  for (const segment of targetDirectory.split("/").filter(Boolean)) {
    current = `${current}/${segment}`;
    const existing = next[current];
    if (!existing) next = mkdirRecord(next, current).nodes;
    else if (existing.kind !== "directory") return { nodes, path: null };
  }

  const finalName = ensureUniqueName(next, targetDirectory, getPathName(original), node.kind === "directory");
  const finalPath = joinPath(targetDirectory, finalName);
  const now = Date.now();
  const moved: FileSystemRecord = {};

  listDescendants(next, source).forEach((entry) => {
    const nextPath = entry.path === source ? finalPath : entry.path.replace(`${source}/`, `${finalPath}/`);
    const { originalPath: _originalPath, deletedAt: _deletedAt, ...rest } = entry;
    moved[nextPath] = {
      ...rest,
      path: nextPath,
      name: nextPath === finalPath ? finalName : rest.name,
      updatedAt: now,
    } as VirtualNode;
  });

  return { nodes: { ...deleteNodeRecord(next, source), ...moved }, path: finalPath };
}

export function deleteNodeRecord(nodes: FileSystemRecord, path: string) {
  const normalized = normalizePath(path);
  const updatedNodes = { ...nodes };

  Object.keys(nodes).forEach((nodePath) => {
    if (nodePath === normalized || nodePath.startsWith(`${normalized}/`)) {
      delete updatedNodes[nodePath];
    }
  });

  return updatedNodes;
}

export function pasteNodeRecord(
  nodes: FileSystemRecord,
  sourcePath: string,
  destinationDirectoryPath: string,
  operation: "copy" | "cut"
): FileSystemRecord {
  const normalizedSourcePath = normalizePath(sourcePath);
  const normalizedDestinationDirectoryPath = normalizePath(destinationDirectoryPath);
  const sourceNode = nodes[normalizedSourcePath];
  const destinationNode = nodes[normalizedDestinationDirectoryPath];

  if (!sourceNode || !destinationNode || destinationNode.kind !== "directory") {
    return nodes;
  }

  if (normalizedSourcePath === "/" || normalizedSourcePath === normalizedDestinationDirectoryPath) {
    return nodes;
  }

  if (
    sourceNode.kind === "directory" &&
    normalizedDestinationDirectoryPath.startsWith(`${normalizedSourcePath}/`)
  ) {
    return nodes;
  }

  if (operation === "cut") {
    if (isLockedNode(nodes, normalizedSourcePath)) {
      return nodes;
    }

    if (getParentPath(normalizedSourcePath) === normalizedDestinationDirectoryPath) {
      return nodes;
    }
  }

  const isDirectory = sourceNode.kind === "directory";
  const nextName =
    operation === "copy" && getParentPath(normalizedSourcePath) === normalizedDestinationDirectoryPath
      ? ensureCopyName(nodes, normalizedDestinationDirectoryPath, sourceNode.name, isDirectory)
      : ensureUniqueName(nodes, normalizedDestinationDirectoryPath, sourceNode.name, isDirectory);
  const nextRootPath = joinPath(normalizedDestinationDirectoryPath, nextName);
  const subtree = listDescendants(nodes, normalizedSourcePath);
  const now = Date.now();
  const clonedNodes: FileSystemRecord = {};

  subtree.forEach((node) => {
    const nextPath =
      node.path === normalizedSourcePath
        ? nextRootPath
        : node.path.replace(`${normalizedSourcePath}/`, `${nextRootPath}/`);

    if (node.kind === "directory") {
      clonedNodes[nextPath] = {
        ...node,
        path: nextPath,
        name: nextPath.split("/").filter(Boolean).at(-1) ?? node.name,
        updatedAt: now,
      };
      return;
    }

    const cloned: VirtualFile = {
      ...node,
      path: nextPath,
      name: nextPath.split("/").filter(Boolean).at(-1) ?? node.name,
      createdAt: operation === "copy" ? now : node.createdAt,
      updatedAt: now,
    };

    // A copy belongs to the visitor: it can be deleted even if the bundled original can't.
    if (operation === "copy") {
      delete cloned.readonly;
    }

    clonedNodes[nextPath] = cloned;
  });

  if (operation === "copy") {
    return {
      ...nodes,
      ...clonedNodes,
    };
  }

  return {
    ...deleteNodeRecord(nodes, normalizedSourcePath),
    ...clonedNodes,
  };
}

export type TransferOperation = "move" | "copy" | "link";
export type TransferSkipReason = "missing" | "same-folder" | "into-itself" | "locked" | "not-allowed";

export interface TransferResult {
  nodes: FileSystemRecord;
  /** Where each item landed, in source order. */
  transferred: Array<{ from: string; to: string }>;
  skipped: Array<{ path: string; reason: TransferSkipReason }>;
}

interface TransferOptions {
  /** The Recycle Bin folder: moving there records originalPath/deletedAt. */
  trashPath?: string;
  now?: number;
}

/** Drop sources that sit inside another source: moving a folder already takes its children. */
function topLevelSources(sources: string[]) {
  const unique = Array.from(new Set(sources.map(normalizePath)));
  return unique.filter((path) => !unique.some((other) => other !== path && path.startsWith(`${other}/`)));
}

function withoutTrashMetadata(node: VirtualNode): VirtualNode {
  const { originalPath: _originalPath, deletedAt: _deletedAt, ...rest } = node;
  return rest as VirtualNode;
}

/**
 * Move, copy or create shortcuts to several items in one pass, the way a
 * single drag or paste does in Windows. Items that can't go there are
 * reported in `skipped` instead of aborting the rest.
 */
export function transferNodesRecord(
  nodes: FileSystemRecord,
  sources: string[],
  destinationDirectoryPath: string,
  operation: TransferOperation,
  options: TransferOptions = {}
): TransferResult {
  const destination = normalizePath(destinationDirectoryPath);
  const trashPath = options.trashPath ? normalizePath(options.trashPath) : null;
  const now = options.now ?? Date.now();
  const transferred: TransferResult["transferred"] = [];
  const skipped: TransferResult["skipped"] = [];
  const destinationNode = nodes[destination];
  const intoTrash = trashPath !== null && destination === trashPath;
  // A deleted folder is not a place to put things: only the Recycle Bin itself takes items, and it records where they came from.
  const insideTrashFolder = trashPath !== null && destination.startsWith(`${trashPath}/`);
  let next = nodes;

  if (!destinationNode || destinationNode.kind !== "directory" || insideTrashFolder) {
    return {
      nodes,
      transferred,
      skipped: sources.map((path) => ({ path: normalizePath(path), reason: "not-allowed" })),
    };
  }

  for (const source of topLevelSources(sources)) {
    const node = next[source];

    if (!node || source === "/") {
      skipped.push({ path: source, reason: "missing" });
      continue;
    }

    if (operation !== "link" && (source === destination || destination.startsWith(`${source}/`))) {
      skipped.push({ path: source, reason: "into-itself" });
      continue;
    }

    if (intoTrash && operation !== "move") {
      skipped.push({ path: source, reason: "not-allowed" });
      continue;
    }

    if (operation === "link") {
      const target: ShortcutTarget = node.kind === "file" && node.shortcut ? node.shortcut : { type: "path", path: source };
      const name = ensureUniqueName(next, destination, getShortcutFileName(node.name, Boolean(node.kind === "file" && node.shortcut)));
      const path = joinPath(destination, name);
      next = { ...next, [path]: createShortcutNode(path, target, now) };
      transferred.push({ from: source, to: path });
      continue;
    }

    if (operation === "move" && isLockedNode(next, source)) {
      skipped.push({ path: source, reason: "locked" });
      continue;
    }

    if (operation === "move" && getParentPath(source) === destination) {
      skipped.push({ path: source, reason: "same-folder" });
      continue;
    }

    const isDirectory = node.kind === "directory";
    const name =
      operation === "copy" && getParentPath(source) === destination
        ? ensureCopyName(next, destination, node.name, isDirectory)
        : ensureUniqueName(next, destination, node.name, isDirectory);
    const landed = joinPath(destination, name);
    const pasted = pasteNodeRecord(next, source, destination, operation === "move" ? "cut" : "copy");

    if (pasted === next || !pasted[landed]) {
      skipped.push({ path: source, reason: "not-allowed" });
      continue;
    }

    const leftTrash = trashPath !== null && getParentPath(source) === trashPath && !intoTrash;
    next = {
      ...pasted,
      [landed]: intoTrash
        ? { ...pasted[landed], originalPath: source, deletedAt: now }
        : leftTrash || operation === "copy"
          ? withoutTrashMetadata(pasted[landed])
          : pasted[landed],
    };
    transferred.push({ from: source, to: landed });
  }

  return { nodes: next, transferred, skipped };
}

function shouldStoreAsText(mimeType: string, extension: string) {
  if (mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/")) {
    return false;
  }

  if (mimeType === "application/pdf") {
    return false;
  }

  if (mimeType.startsWith("text/")) {
    return true;
  }

  return isTextLikeExtension(extension);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function importFilesRecord(
  nodes: FileSystemRecord,
  directoryPath: string,
  files: File[]
) {
  const normalizedDirectoryPath = normalizePath(directoryPath);
  const directoryNode = nodes[normalizedDirectoryPath];

  if (!directoryNode || directoryNode.kind !== "directory" || files.length === 0) {
    return { nodes, importedPaths: [] as string[] };
  }

  let nextNodes = { ...nodes };
  const importedPaths: string[] = [];

  for (const uploadedFile of files) {
    const fallbackName = uploadedFile.name?.trim() || `Upload-${Date.now()}`;
    const uniqueName = ensureUniqueName(nextNodes, normalizedDirectoryPath, fallbackName);
    const path = joinPath(normalizedDirectoryPath, uniqueName);
    const extension = uniqueName.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = uploadedFile.type || inferMimeTypeFromExtension(extension);
    const now = Date.now();

    const fileNode: VirtualFile = {
      kind: "file",
      path,
      name: uniqueName,
      extension,
      mimeType,
      size: uploadedFile.size,
      createdAt: now,
      updatedAt: now,
    };

    if (shouldStoreAsText(mimeType, extension)) {
      fileNode.content = await uploadedFile.text();
    } else {
      fileNode.source = await readFileAsDataUrl(uploadedFile);
    }

    nextNodes[path] = fileNode;
    importedPaths.push(path);
  }

  return {
    nodes: nextNodes,
    importedPaths,
  };
}

export async function downloadFileNode(node: VirtualFile) {
  let downloadUrl = "";
  let revokeUrl = "";

  if (node.source) {
    if (node.source.startsWith("data:")) {
      downloadUrl = node.source;
    } else {
      const response = await fetch(node.source);
      const blob = await response.blob();
      revokeUrl = URL.createObjectURL(blob);
      downloadUrl = revokeUrl;
    }
  } else {
    revokeUrl = URL.createObjectURL(
      new Blob([node.content ?? ""], {
        type: node.mimeType || "text/plain",
      })
    );
    downloadUrl = revokeUrl;
  }

  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = node.name;
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  if (revokeUrl) {
    URL.revokeObjectURL(revokeUrl);
  }
}

export async function loadFileSystem() {
  const stored = await get<FileSystemRecord>(FILESYSTEM_STORAGE_KEY);
  return stored ?? buildSeedFileSystem();
}

export async function saveFileSystem(nodes: FileSystemRecord) {
  await set(FILESYSTEM_STORAGE_KEY, nodes);
}

export async function clearPersistedFileSystem() {
  await del(FILESYSTEM_STORAGE_KEY);
}
