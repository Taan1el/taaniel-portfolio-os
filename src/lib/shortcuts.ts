import { getAppDefinition } from "@/lib/app-registry";
import type { AppId, FileSystemRecord, ShortcutTarget, VirtualFile, VirtualNode } from "@/types/system";

/*
 * Windows-style .lnk shortcuts. A shortcut is an ordinary file in the virtual
 * filesystem (so it can be moved, copied, renamed and recycled) that carries a
 * typed `shortcut` target instead of content. Like Windows, the ".lnk"
 * extension is never shown to the visitor.
 */

export const SHORTCUT_EXTENSION = "lnk";
export const SHORTCUT_MIME_TYPE = "application/x-shortcut";

const SHORTCUT_SUFFIX = `.${SHORTCUT_EXTENSION}`;
/** Shortcuts pointing at shortcuts are followed, but never in a loop. */
const MAX_SHORTCUT_HOPS = 4;
const SAFE_ROUTE = /^\/[A-Za-z0-9/_-]*$/;

function normalizeTargetPath(path: string) {
  const normalized = `/${path}`.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

export function isShortcutName(name: string) {
  return name.toLowerCase().endsWith(SHORTCUT_SUFFIX) && name.length > SHORTCUT_SUFFIX.length;
}

interface ShortcutLike {
  kind?: string;
  type?: string;
  shortcut?: unknown;
}

/** True for .lnk files that carry a target. Accepts VirtualNode and FileNode. */
export function isShortcutNode(node: ShortcutLike | null | undefined) {
  return Boolean(node && (node.kind === "file" || node.type === "file") && node.shortcut);
}

/** The name a visitor sees: "About" for About.lnk, unchanged for everything else. */
export function getDisplayName(node: { name: string; kind?: string; type?: string }) {
  const isFile = node.kind === "file" || node.type === "file";
  return isFile && isShortcutName(node.name) ? node.name.slice(0, -SHORTCUT_SUFFIX.length) : node.name;
}

/** Turn a typed display name back into the stored file name, keeping a shortcut a shortcut. */
export function toStoredName(displayName: string, node: { name: string; kind?: string; type?: string }) {
  const isFile = node.kind === "file" || node.type === "file";
  return isFile && isShortcutName(node.name) && !isShortcutName(displayName)
    ? `${displayName}${SHORTCUT_SUFFIX}`
    : displayName;
}

function isKnownAppId(value: unknown): value is AppId {
  return typeof value === "string" && Boolean(getAppDefinition(value as AppId));
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validate a stored target. Anything unexpected becomes null, so it is never launched. */
export function sanitizeShortcutTarget(value: unknown): ShortcutTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const target = value as Record<string, unknown>;

  switch (target.type) {
    case "app":
      return isKnownAppId(target.appId) ? { type: "app", appId: target.appId } : null;
    case "path":
      return typeof target.path === "string" && target.path.startsWith("/")
        ? { type: "path", path: normalizeTargetPath(target.path) }
        : null;
    case "route":
      return typeof target.route === "string" && SAFE_ROUTE.test(target.route) && !target.route.startsWith("//")
        ? { type: "route", route: target.route }
        : null;
    case "url":
      return typeof target.url === "string" && isSafeExternalUrl(target.url) ? { type: "url", url: target.url } : null;
    default:
      return null;
  }
}

export function createShortcutNode(path: string, target: ShortcutTarget, timestamp = Date.now()): VirtualFile {
  const normalizedPath = normalizeTargetPath(path);

  return {
    kind: "file",
    path: normalizedPath,
    name: normalizedPath.split("/").filter(Boolean).at(-1) ?? normalizedPath,
    extension: SHORTCUT_EXTENSION,
    mimeType: SHORTCUT_MIME_TYPE,
    // Real .lnk files are about a kilobyte; the Details view shows "1 KB".
    size: 1024,
    shortcut: target,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** "notes.txt" -> "notes.txt - Shortcut.lnk"; a shortcut keeps its own name. */
export function getShortcutFileName(sourceName: string, sourceIsShortcut = false) {
  return sourceIsShortcut ? sourceName : `${sourceName} - Shortcut${SHORTCUT_SUFFIX}`;
}

export type ResolvedShortcut =
  | { kind: "app"; appId: AppId }
  | { kind: "node"; node: VirtualNode }
  | { kind: "route"; route: string }
  | { kind: "url"; url: string }
  /** The target was moved or deleted, or the shortcut is damaged. */
  | { kind: "broken"; path?: string };

/** Follow a shortcut to what it opens. */
export function resolveShortcut(nodes: FileSystemRecord, node: VirtualNode): ResolvedShortcut {
  let current: VirtualNode = node;

  for (let hop = 0; hop < MAX_SHORTCUT_HOPS; hop += 1) {
    if (current.kind !== "file" || !current.shortcut) {
      return { kind: "node", node: current };
    }

    const target = sanitizeShortcutTarget(current.shortcut);

    if (!target) {
      return { kind: "broken" };
    }

    switch (target.type) {
      case "app":
        return { kind: "app", appId: target.appId };
      case "route":
        return { kind: "route", route: target.route };
      case "url":
        return { kind: "url", url: target.url };
      case "path": {
        const next = nodes[target.path];
        if (!next) {
          return { kind: "broken", path: target.path };
        }
        current = next;
      }
    }
  }

  return { kind: "broken" };
}

/** The node a shortcut ends at, if it points into the filesystem. */
export function resolveShortcutNode(nodes: FileSystemRecord, node: VirtualNode) {
  const resolved = resolveShortcut(nodes, node);
  return resolved.kind === "node" ? resolved.node : null;
}
