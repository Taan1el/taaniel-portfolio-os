import { getParentPath } from "@/lib/filesystem";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import type { FileSystemRecord } from "@/types/system";

/** This site's own source, opened in Code. It sits beside the OS file system, and edits stay in this browser. */
export const PROJECT_NAME = "taaniel-portfolio-os";
export const PROJECT_ROOT = `/${PROJECT_NAME}`;

const EDITS_KEY = "taaniel-os-code-project-edits";
const MAX_PATH = 240;
const LISTED_NOTE = "This file is in the repo, but it is not text the editor can show here.\n";

export interface ProjectSource {
  branch: string;
  commit: string;
  files: Record<string, string>;
  /** In the repo but not readable here: images, binaries and the lockfile. */
  listed: string[];
}

/** Saved text by project path. A path that is not in the source is a new file. */
export type ProjectEdits = Record<string, string>;

export interface ProjectChange {
  path: string;
  name: string;
  status: "M" | "U";
}

/** Relative, with no empty or climbing segments, so it can only ever name something inside the project. */
export function isSafeProjectPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= MAX_PATH &&
    !/[\\\u0000-\u001f]/.test(path) &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== ".." && part !== "__proto__")
  );
}

function sanitizeFiles(raw: unknown) {
  const files: Record<string, string> = Object.create(null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return files;
  for (const [path, text] of Object.entries(raw)) {
    if (isSafeProjectPath(path) && typeof text === "string") files[path] = text;
  }
  return files;
}

export function sanitizeProject(raw: unknown): ProjectSource | null {
  const data = raw as Partial<ProjectSource> | null;
  const files = sanitizeFiles(data?.files);
  if (Object.keys(files).length === 0) return null;
  return {
    branch: typeof data?.branch === "string" ? data.branch.slice(0, 80) : "main",
    commit: typeof data?.commit === "string" ? data.commit.slice(0, 12) : "",
    files,
    listed: Array.isArray(data?.listed) ? data.listed.filter(isSafeProjectPath) : [],
  };
}

export async function fetchProject() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}project-source.json`);
    return response.ok ? sanitizeProject(await response.json()) : null;
  } catch {
    return null;
  }
}

export function readProjectEdits(): ProjectEdits {
  try {
    return sanitizeFiles(JSON.parse(readLocalStorage(EDITS_KEY) ?? "null"));
  } catch {
    return sanitizeFiles(null);
  }
}

export function writeProjectEdits(edits: ProjectEdits) {
  if (Object.keys(edits).length > 0) writeLocalStorage(EDITS_KEY, JSON.stringify(edits));
  else removeLocalStorage(EDITS_KEY);
}

export function isProjectPath(path: string) {
  return path.startsWith(`${PROJECT_ROOT}/`);
}

export function toProjectPath(path: string) {
  return path.slice(PROJECT_ROOT.length + 1);
}

export function fromProjectPath(path: string) {
  return `${PROJECT_ROOT}/${path}`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** The project in the shape the editor already reads, with saved edits laid over the source. */
export function buildProjectNodes(source: ProjectSource | null, edits: ProjectEdits): FileSystemRecord {
  if (!source) return {};

  const nodes: FileSystemRecord = {
    [PROJECT_ROOT]: { kind: "directory", path: PROJECT_ROOT, name: PROJECT_NAME, createdAt: 0, updatedAt: 0 },
  };

  const listed = source.listed.map((relative) => [relative, LISTED_NOTE]);

  for (const [relative, original] of listed.concat(Object.entries(source.files), Object.entries(edits))) {
    const path = fromProjectPath(relative);
    const name = relative.slice(relative.lastIndexOf("/") + 1);
    const content = edits[relative] ?? original;
    const readonly = original === LISTED_NOTE;
    nodes[path] = { kind: "file", path, name, extension: extensionOf(name), mimeType: "text/plain", content, size: content.length, readonly, createdAt: 0, updatedAt: 0 };

    for (let folder = getParentPath(path); folder !== PROJECT_ROOT && !nodes[folder]; folder = getParentPath(folder)) {
      nodes[folder] = { kind: "directory", path: folder, name: folder.slice(folder.lastIndexOf("/") + 1), createdAt: 0, updatedAt: 0 };
    }
  }

  return nodes;
}

/** Saving text that matches the source again clears the edit. New files stay until they are discarded. */
export function applyProjectEdit(source: ProjectSource, edits: ProjectEdits, relative: string, text: string) {
  const next: ProjectEdits = Object.assign(Object.create(null), edits);
  if (source.files[relative] === text) delete next[relative];
  else next[relative] = text;
  return next;
}

export function discardProjectEdit(edits: ProjectEdits, relative: string) {
  const next: ProjectEdits = Object.assign(Object.create(null), edits);
  delete next[relative];
  return next;
}

export function projectChanges(source: ProjectSource | null, edits: ProjectEdits): ProjectChange[] {
  if (!source) return [];
  return Object.keys(edits)
    .sort((a, b) => a.localeCompare(b))
    .map((relative) => ({
      path: fromProjectPath(relative),
      name: relative.slice(relative.lastIndexOf("/") + 1),
      status: relative in source.files ? "M" : "U",
    }));
}
