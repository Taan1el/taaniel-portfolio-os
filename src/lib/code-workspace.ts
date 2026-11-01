import { getNodeByPath, getParentPath, joinPath, listChildren } from "@/lib/filesystem";
import { TRASH_PATH } from "@/lib/system-workspace";
import type { FileSystemRecord, VirtualFile, VirtualNode } from "@/types/system";

export interface CodeTab {
  path: string;
  /** What is on disk. */
  saved: string;
  /** What is in the editor. */
  value: string;
}

export interface SearchHit {
  path: string;
  line: number;
  text: string;
}

const LANGUAGES: Record<string, string> = {
  md: "markdown",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  html: "html",
  htm: "html",
  ps1: "powershell",
  sh: "shell",
  py: "python",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
};

const MAX_SEARCH_HITS = 200;

export function languageForExtension(extension: string) {
  return LANGUAGES[extension.toLowerCase()] ?? "plaintext";
}

const LANGUAGE_LABELS: Record<string, string> = {
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  json: "JSON",
  markdown: "Markdown",
  plaintext: "Plain Text",
  powershell: "PowerShell",
  python: "Python",
  shell: "Shell Script",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

/** The name the status bar shows, which tells TSX from plain TypeScript. */
export function languageLabel(extension: string) {
  const lower = extension.toLowerCase();
  if (lower === "tsx") return "TypeScript JSX";
  if (lower === "jsx") return "JavaScript JSX";
  return LANGUAGE_LABELS[languageForExtension(lower)] ?? "Plain Text";
}

export function isTabDirty(tab: CodeTab) {
  return tab.value !== tab.saved;
}

/** Text files only: binaries and shortcuts have nothing to edit, and the Recycle Bin stays out of the way. */
export function isEditableFile(node: VirtualNode | undefined): node is VirtualFile {
  return node?.kind === "file" && node.content !== undefined && !node.shortcut && !node.path.startsWith(`${TRASH_PATH}/`);
}

export function openTab(tabs: CodeTab[], path: string, content: string) {
  return tabs.some((tab) => tab.path === path) ? tabs : [...tabs, { path, saved: content, value: content }];
}

/** Which tab takes over when the active one closes: its right neighbour, else its left. */
export function nextActiveAfterClose(tabs: CodeTab[], closing: string, active: string | null) {
  if (closing !== active) return active;
  const index = tabs.findIndex((tab) => tab.path === closing);
  return tabs[index + 1]?.path ?? tabs[index - 1]?.path ?? null;
}

function allEditableFiles(nodes: FileSystemRecord) {
  return Object.values(nodes).filter(isEditableFile).sort((a, b) => a.path.localeCompare(b.path));
}

/** Quick Open: letters in order, as in VS Code. Earlier and name matches rank first. */
export function quickOpenMatches(nodes: FileSystemRecord, query: string, limit = 12) {
  const needle = query.trim().toLowerCase();
  const score = (path: string) => {
    let from = 0;
    let total = 0;
    for (const letter of needle) {
      const found = path.indexOf(letter, from);
      if (found < 0) return -1;
      total += found - from;
      from = found + 1;
    }
    return total;
  };

  return allEditableFiles(nodes)
    .map((file) => ({ file, score: score(file.name.toLowerCase()), pathScore: score(file.path.toLowerCase()) }))
    .filter((entry) => entry.score >= 0 || entry.pathScore >= 0)
    .sort((a, b) => (a.score < 0 ? 1e6 : a.score) - (b.score < 0 ? 1e6 : b.score) || a.pathScore - b.pathScore)
    .slice(0, limit)
    .map((entry) => entry.file);
}

export function searchFiles(nodes: FileSystemRecord, query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const file of allEditableFiles(nodes)) {
    const lines = (file.content ?? "").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].toLowerCase().includes(needle)) continue;
      hits.push({ path: file.path, line: index + 1, text: lines[index].trim().slice(0, 120) });
      if (hits.length >= MAX_SEARCH_HITS) return hits;
    }
  }
  return hits;
}

export function childrenForTree(nodes: FileSystemRecord, directory: string) {
  return listChildren(nodes, directory).filter((node) => node.path !== TRASH_PATH && !(node.kind === "file" && node.shortcut));
}

export function previewKind(path: string | null) {
  if (!path) return null;
  if (/\.html?$/i.test(path)) return "html";
  if (/\.(md|markdown)$/i.test(path)) return "markdown";
  return null;
}

/** Nothing leaves the sandbox: previews run scripts but may not fetch anything. */
const PREVIEW_POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:";

function isLocalReference(reference: string) {
  return !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference);
}

/**
 * Builds the page for the live preview: the stylesheets and scripts a page links
 * from the same workspace are inlined, using unsaved text from `readOpen` first.
 */
export function buildPreviewDocument(
  path: string,
  source: string,
  nodes: FileSystemRecord,
  readOpen: (path: string) => string | undefined = () => undefined
) {
  const folder = getParentPath(path);
  const read = (reference: string) => {
    if (!isLocalReference(reference)) return null;
    const target = joinPath(folder, reference);
    const node = getNodeByPath(nodes, target);
    return readOpen(target) ?? (node?.kind === "file" ? node.content ?? null : null);
  };

  const inlined = source
    .replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (tag, href: string) => {
      if (!/stylesheet/i.test(tag)) return tag;
      const css = read(href);
      return css === null ? tag : `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
    })
    .replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src: string) => {
      const script = read(src);
      return script === null ? tag : `<script>${script.replace(/<\/script/gi, "<\\/script")}</script>`;
    });

  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${PREVIEW_POLICY}">${inlined}`;
}

export const SAMPLE_PROJECT: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hello from Taaniel OS</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <h1>Edit me</h1>
      <p>Change this page and the preview updates as you type.</p>
      <button id="count">Clicked 0 times</button>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`,
  "style.css": `body {
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: #0f2457;
  color: #fff;
  font-family: system-ui, sans-serif;
}

button {
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: #60cdff;
  font: inherit;
}
`,
  "script.js": `const button = document.getElementById("count");
let clicks = 0;

button.addEventListener("click", () => {
  clicks += 1;
  button.textContent = \`Clicked \${clicks} times\`;
});
`,
};
