import {
  bundledWorkspaceAssets,
  bundledWorkspaceDirectories,
} from "@/data/bundled-assets";
import { photographyAssets } from "@/data/portfolio";
import {
  GAMES_DIRECTORY_PATH,
  GAMES_README_CONTENT,
  GAMES_README_PATH,
  LEGACY_GAMES_README_CONTENT,
  PORTS_GAMES_README_CONTENT,
} from "@/lib/games";
import { ensureNotesWorkspace } from "@/lib/notes";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

export const LEGACY_WELCOME_PATH = "/Desktop/Welcome.md";
export const SNAPSHOTS_DIRECTORY_PATH = "/Users/Public/Snapshots";
const LEGACY_MUSIC_PATHS = ["/Media/Music/Studio Loop.mp3", "/Media/Music/T-Rex Roar.mp3"];
const REQUIRED_DIRECTORIES = [
  GAMES_DIRECTORY_PATH,
  "/Media",
  "/Media/Music",
  "/Media/Photography",
  SNAPSHOTS_DIRECTORY_PATH,
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
    if (nextNodes[asset.path]) {
      return;
    }

    nextNodes = {
      ...nextNodes,
      [asset.path]: createFileNode(
        asset.path,
        asset.extension,
        asset.mimeType,
        asset.source,
        timestamp
      ),
    };
    changed = true;
  });

  const gamesReadmeNode = nextNodes[GAMES_README_PATH];

  if (!gamesReadmeNode) {
    nextNodes = {
      ...nextNodes,
      [GAMES_README_PATH]: createTextFileNode(
        GAMES_README_PATH,
        "md",
        "text/markdown",
        GAMES_README_CONTENT,
        timestamp
      ),
    };
    changed = true;
  } else if (
    gamesReadmeNode.kind === "file" &&
    (gamesReadmeNode.content === LEGACY_GAMES_README_CONTENT ||
      gamesReadmeNode.content === PORTS_GAMES_README_CONTENT)
  ) {
    nextNodes = {
      ...nextNodes,
      [GAMES_README_PATH]: {
        ...gamesReadmeNode,
        content: GAMES_README_CONTENT,
        updatedAt: timestamp,
      },
    };
    changed = true;
  }

  if (changed) {
    return nextNodes;
  }

  return nodes;
}
