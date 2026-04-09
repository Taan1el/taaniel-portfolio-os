import {
  bundledWorkspaceAssets,
  bundledWorkspaceDirectories,
} from "@/data/bundled-assets";
import { photographyAssets } from "@/data/portfolio";
import {
  GAMES_DIRECTORY_PATH,
  GAMES_README_PATH,
} from "@/lib/games";
import { ensureNotesWorkspace } from "@/lib/notes";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

export const LEGACY_WELCOME_PATH = "/Desktop/Welcome.md";
const LEGACY_MUSIC_PATHS = ["/Media/Music/Studio Loop.mp3", "/Media/Music/T-Rex Roar.mp3"];
const REQUIRED_DIRECTORIES = [
  "/Media",
  "/Media/Music",
  "/Media/Photography",
  ...bundledWorkspaceDirectories,
];
const BUNDLED_READONLY_FILES = [
  ...bundledWorkspaceAssets,
  ...photographyAssets.map((asset) => ({
    path: `/Media/Photography/${asset.title}.${asset.src.endsWith(".png") ? "png" : "jpg"}`,
    extension: asset.src.endsWith(".png") ? "png" : "jpg",
    mimeType: asset.src.endsWith(".png") ? "image/png" : "image/jpeg",
    source: asset.src,
  })),
] as const;

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  const normalized = `/${path}`.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

function createDirectoryNode(path: string, timestamp: number): VirtualDirectory {
  const normalizedPath = normalizePath(path);
  const name = normalizedPath.split("/").filter(Boolean).at(-1) ?? "/";

  return {
    kind: "directory",
    path: normalizedPath,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createFileNode(
  path: string,
  extension: string,
  mimeType: string,
  source: string,
  timestamp: number
): VirtualFile {
  const normalizedPath = normalizePath(path);
  const name = normalizedPath.split("/").filter(Boolean).at(-1) ?? normalizedPath;

  return {
    kind: "file",
    path: normalizedPath,
    name,
    extension,
    mimeType,
    source,
    readonly: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createTextFileNode(
  path: string,
  extension: string,
  mimeType: string,
  content: string,
  timestamp: number
): VirtualFile {
  const normalizedPath = normalizePath(path);
  const name = normalizedPath.split("/").filter(Boolean).at(-1) ?? normalizedPath;

  return {
    kind: "file",
    path: normalizedPath,
    name,
    extension,
    mimeType,
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function ensureSystemWorkspace(nodes: FileSystemRecord) {
  let nextNodes = ensureNotesWorkspace(nodes);
  let changed = nextNodes !== nodes;
  const timestamp = Date.now();

  if (nextNodes[LEGACY_WELCOME_PATH]) {
    nextNodes = { ...nextNodes };
    delete nextNodes[LEGACY_WELCOME_PATH];
    changed = true;
  }

  REQUIRED_DIRECTORIES.forEach((path) => {
    if (nextNodes[path]) {
      return;
    }

    nextNodes = {
      ...nextNodes,
      [path]: createDirectoryNode(path, timestamp),
    };
    changed = true;
  });

  LEGACY_MUSIC_PATHS.forEach((path) => {
    if (!nextNodes[path]) {
      return;
    }

    nextNodes = { ...nextNodes };
    delete nextNodes[path];
    changed = true;
  });

  BUNDLED_READONLY_FILES.forEach((asset) => {
    const existing = nextNodes[asset.path];

    if (!existing) {
      nextNodes = {
        ...nextNodes,
        [asset.path]: createFileNode(asset.path, asset.extension, asset.mimeType, asset.source, timestamp),
      };
      changed = true;
      return;
    }

    // Refresh bundled readonly assets even when persisted nodes exist,
    // so moving files under /public/assets (e.g. Music/Photography/Work) doesn't break old sessions.
    if (
      existing.kind === "file" &&
      existing.readonly === true &&
      (existing.source !== asset.source ||
        existing.extension !== asset.extension ||
        existing.mimeType !== asset.mimeType)
    ) {
      nextNodes = {
        ...nextNodes,
        [asset.path]: {
          ...existing,
          source: asset.source,
          extension: asset.extension,
          mimeType: asset.mimeType,
          updatedAt: timestamp,
        },
      };
      changed = true;
    }
  });

  // Portfolio is no longer shipping games by default; remove legacy game surfaces if present.
  if (nextNodes[GAMES_README_PATH] || nextNodes[GAMES_DIRECTORY_PATH]) {
    nextNodes = { ...nextNodes };
    delete nextNodes[GAMES_README_PATH];

    Object.keys(nextNodes).forEach((path) => {
      if (path === GAMES_DIRECTORY_PATH || path.startsWith(`${GAMES_DIRECTORY_PATH}/`)) {
        delete nextNodes[path];
      }
    });
    changed = true;
  }

  if (changed) {
    return nextNodes;
  }

  return nodes;
}
