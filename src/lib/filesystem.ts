import { del, get, set } from "idb-keyval";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { inferMimeTypeFromExtension, isTextLikeExtension } from "@/lib/file-registry";
import type { FileSystemRecord, VirtualDirectory, VirtualFile, VirtualNode } from "@/types/system";

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

export function joinPath(...segments: string[]) {
  return normalizePath(segments.join("/"));
}

export function getNodeByPath(nodes: FileSystemRecord, path: string) {
  return nodes[normalizePath(path)];
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

function ensureUniqueName(nodes: FileSystemRecord, directoryPath: string, desiredName: string) {
  const siblingNames = new Set(listChildren(nodes, directoryPath).map((node) => node.name));

  if (!siblingNames.has(desiredName)) {
    return desiredName;
  }

  const parts = desiredName.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()}` : "";
  const stem = parts.join(".") || desiredName.replace(extension, "");

  let index = 1;
  let candidate = `${stem} ${index}${extension}`;

  while (siblingNames.has(candidate)) {
    index += 1;
    candidate = `${stem} ${index}${extension}`;
  }

  return candidate;
}

export function createDirectoryRecord(
  nodes: FileSystemRecord,
  directoryPath: string,
  name = "New Folder"
): FileSystemRecord {
  const parent = normalizePath(directoryPath);
  const uniqueName = ensureUniqueName(nodes, parent, name);
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
  name = "New Note.md",
  content = "# Untitled\n"
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

export function renameNodeRecord(nodes: FileSystemRecord, path: string, nextName: string) {
  const normalized = normalizePath(path);
  const target = nodes[normalized];

  if (!target) {
    return nodes;
  }

  const parentPath = getParentPath(normalized);
  const uniqueName = ensureUniqueName(nodes, parentPath, nextName);
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
    if (hasReadonlyContent(nodes, normalizedSourcePath)) {
      return nodes;
    }

    if (getParentPath(normalizedSourcePath) === normalizedDestinationDirectoryPath) {
      return nodes;
    }
  }

  const nextName = ensureUniqueName(nodes, normalizedDestinationDirectoryPath, sourceNode.name);
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

    clonedNodes[nextPath] = {
      ...node,
      path: nextPath,
      name: nextPath.split("/").filter(Boolean).at(-1) ?? node.name,
      createdAt: operation === "copy" ? now : node.createdAt,
      updatedAt: now,
    };
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
