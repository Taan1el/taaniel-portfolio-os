/*
 * Join-Path and Split-Path work on the text of a path, not on a folder that has
 * to exist, and they use the Windows rules: either slash is accepted and the
 * result uses a backslash. Pure functions, so the rules are easy to test.
 */

const toBackslashes = (path: string) => path.replace(/\//g, "\\");

/** Join-Path: the parent and children joined by exactly one backslash each. */
export function joinPath(parent: string, ...children: string[]): string {
  let result = toBackslashes(parent);
  for (const child of children) {
    result = `${result.replace(/\\+$/, "")}\\${toBackslashes(child).replace(/^\\+/, "")}`;
  }
  return result;
}

export type SplitPart = "parent" | "leaf" | "leafbase" | "extension" | "qualifier" | "noqualifier";

const QUALIFIER = /^[A-Za-z]:/;

/** The last segment of a path ("" for a drive root such as C:\). */
function leafOf(path: string) {
  const trimmed = path.replace(/\\+$/, "");
  const index = trimmed.lastIndexOf("\\");
  return index === -1 ? trimmed.replace(QUALIFIER, "") : trimmed.slice(index + 1);
}

/**
 * Split-Path: one part of a path. Returns null for a qualifier the path does not have.
 * The parent of a drive root, or of a bare name, is empty.
 */
export function splitPath(path: string, part: SplitPart): string | null {
  const text = toBackslashes(path);

  if (part === "qualifier") return QUALIFIER.exec(text)?.[0] ?? null;
  if (part === "noqualifier") return text.replace(QUALIFIER, "");

  if (part === "leaf") return leafOf(text);
  if (part === "leafbase" || part === "extension") {
    const leaf = leafOf(text);
    const dot = leaf.lastIndexOf(".");
    if (part === "extension") return dot > 0 ? leaf.slice(dot) : "";
    return dot > 0 ? leaf.slice(0, dot) : leaf;
  }

  // parent
  const trimmed = text.replace(/\\+$/, "");
  const index = trimmed.lastIndexOf("\\");
  if (index === -1) return "";
  const parent = trimmed.slice(0, index);
  // C:\file has the parent C:\ ; \file has the parent \
  return parent === "" || /^[A-Za-z]:$/.test(parent) ? `${parent}\\` : parent;
}

/** Split-Path -IsAbsolute: true only for a drive-qualified path such as C:\Users. */
export function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path);
}
