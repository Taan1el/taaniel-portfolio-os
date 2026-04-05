import type { FileSystemRecord, VirtualDirectory, VirtualFile, VirtualNode } from "@/types/system";

export const NOTES_DIRECTORY_PATH = "/Documents/Notes";
export const DEFAULT_NOTE_NAME = "To-do list.txt";
export const DEFAULT_NOTE_PATH = `${NOTES_DIRECTORY_PATH}/${DEFAULT_NOTE_NAME}`;
export const DEFAULT_NOTE_CONTENT = `To-do list

`;

function normalizeNotesPath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  const normalized = `/${path}`
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return normalized || "/";
}

function createDirectoryNode(path: string, timestamp: number): VirtualDirectory {
  const normalizedPath = normalizeNotesPath(path);
  const name = normalizedPath.split("/").filter(Boolean).at(-1) ?? "/";

  return {
    kind: "directory",
    path: normalizedPath,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createTextNode(path: string, content: string, timestamp: number): VirtualFile {
  const normalizedPath = normalizeNotesPath(path);
  const name = normalizedPath.split("/").filter(Boolean).at(-1) ?? normalizedPath;

  return {
    kind: "file",
    path: normalizedPath,
    name,
    extension: "txt",
    mimeType: "text/plain",
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isNotesPath(path?: string) {
  if (!path) {
    return false;
  }

  const normalizedPath = normalizeNotesPath(path);
  return normalizedPath === NOTES_DIRECTORY_PATH || normalizedPath.startsWith(`${NOTES_DIRECTORY_PATH}/`);
}

export function isNotesNode(node?: VirtualNode) {
  return Boolean(node && node.kind === "file" && isNotesPath(node.path));
}

export function ensureNotesWorkspace(nodes: FileSystemRecord) {
  let nextNodes = nodes;
  let changed = false;
  const timestamp = Date.now();

  if (!nextNodes[NOTES_DIRECTORY_PATH]) {
    nextNodes = {
      ...nextNodes,
      [NOTES_DIRECTORY_PATH]: createDirectoryNode(NOTES_DIRECTORY_PATH, timestamp),
    };
    changed = true;
  }

  if (!nextNodes[DEFAULT_NOTE_PATH]) {
    nextNodes = {
      ...nextNodes,
      [DEFAULT_NOTE_PATH]: createTextNode(DEFAULT_NOTE_PATH, DEFAULT_NOTE_CONTENT, timestamp),
    };
    changed = true;
  }

  return changed ? nextNodes : nodes;
}
