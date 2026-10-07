import { profile } from "@/data/portfolio";
import { getParentPath, normalizePath } from "@/lib/filesystem";
import type { FileSystemRecord, VirtualNode } from "@/types/system";

/*
 * Windows-style presentation of the virtual filesystem, shared by the
 * terminal and File Explorer. The virtual root "/" is the user's profile
 * folder, so /Documents reads as C:\Users\Taaniel\Documents.
 */

export const SHELL_USER = profile.name.split(/\s+/)[0] || "User";
export const SHELL_HOST = `${SHELL_USER.toUpperCase()}-PC`;
export const PROFILE_ROOT = `C:\\Users\\${SHELL_USER}`;

export function toWindowsPath(virtualPath: string) {
  const normalized = normalizePath(virtualPath);
  return normalized === "/" ? PROFILE_ROOT : `${PROFILE_ROOT}${normalized.replace(/\//g, "\\")}`;
}

/** Direct children of a folder: folders first, then files, case-insensitively by name. */
export function childrenOf(nodes: FileSystemRecord, directoryPath: string): VirtualNode[] {
  return Object.values(nodes)
    .filter((node) => node.path !== directoryPath && getParentPath(node.path) === directoryPath)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

/** Find a child by name the way NTFS does: case-insensitively. */
export function findChild(nodes: FileSystemRecord, directoryPath: string, name: string) {
  const exact = nodes[directoryPath === "/" ? `/${name}` : `${directoryPath}/${name}`];
  if (exact) return exact;
  const lower = name.toLowerCase();
  return childrenOf(nodes, directoryPath).find((node) => node.name.toLowerCase() === lower) ?? null;
}

/**
 * Resolve user input to a virtual path. Accepts C:\Users\<user>\..., C:\...,
 * ~\..., \..., /..., .\..., ..\... and bare names, with either slash. When
 * `nodes` is given, each segment snaps to the real name's casing.
 */
export function resolveShellPath(input: string, cwd: string, nodes?: FileSystemRecord) {
  const raw = input.trim().replace(/\\/g, "/");
  if (!raw || raw === ".") return normalizePath(cwd);

  const profilePrefix = PROFILE_ROOT.replace(/\\/g, "/").toLowerCase();
  const lower = raw.toLowerCase();
  let segments: string[];
  let rest: string;

  if (lower === "~" || lower.startsWith("~/")) {
    segments = [];
    rest = raw.slice(1);
  } else if (lower === profilePrefix || lower.startsWith(`${profilePrefix}/`)) {
    segments = [];
    rest = raw.slice(profilePrefix.length);
  } else if (/^[a-z]:/i.test(raw)) {
    segments = [];
    rest = raw.slice(2);
  } else if (raw.startsWith("/")) {
    segments = [];
    rest = raw;
  } else {
    segments = normalizePath(cwd).split("/").filter(Boolean);
    rest = raw;
  }

  for (const segment of rest.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    if (nodes) {
      const parent = normalizePath(`/${segments.join("/")}`);
      const match = findChild(nodes, parent, segment);
      segments.push(match ? match.name : segment);
    } else {
      segments.push(segment);
    }
  }

  return normalizePath(`/${segments.join("/")}`);
}
