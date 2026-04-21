import {
  getNodeByPath,
  getParentPath,
  listDirectory,
  normalizePath,
  toFileNode,
} from "@/lib/filesystem";
import type { BrowserResolvedDocument } from "@/lib/browser/types";
import type { FileNode, FileSystemRecord } from "@/types/system";
import { sanitizeHTML } from "@/utils/sanitize";

interface LocalBrowserResolution {
  document: BrowserResolvedDocument | null;
  error: string | null;
}

const HTML_EXTENSIONS = new Set(["htm", "html"]);

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSrcDocShell(title: string, bodyMarkup: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark light;
        font-family: "IBM Plex Sans", system-ui, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        background: #f7f8fb;
        color: #111827;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: 14px/1.6 "IBM Plex Mono", monospace;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .browser-local-media {
        display: grid;
        min-height: calc(100vh - 48px);
        place-items: center;
      }

      .browser-local-media img,
      .browser-local-media video {
        max-width: 100%;
        max-height: calc(100vh - 48px);
        object-fit: contain;
      }

      .browser-local-media audio {
        width: min(520px, 100%);
      }

      .browser-local-directory {
        display: grid;
        gap: 18px;
      }

      .browser-local-directory__hero {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
      }

      .browser-local-directory__hero h1,
      .browser-local-directory__hero p {
        margin: 0;
      }

      .browser-local-directory__hero p {
        color: #6b7280;
        font-size: 13px;
      }

      .browser-local-breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        font: 13px/1.4 "IBM Plex Mono", monospace;
        color: #4b5563;
      }

      .browser-local-breadcrumbs span.is-separator {
        color: #9ca3af;
      }

      .browser-local-breadcrumbs a {
        color: #1f2937;
      }

      .browser-local-directory__list {
        display: grid;
        gap: 10px;
      }

      .browser-local-entry {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) minmax(0, 180px);
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.82);
        transition: border-color 120ms ease, transform 120ms ease, background 120ms ease;
      }

      .browser-local-entry:hover {
        border-color: rgba(37, 99, 235, 0.24);
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-1px);
      }

      .browser-local-entry__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 46px;
        min-height: 32px;
        padding: 0 10px;
        border-radius: 999px;
        background: #e5e7eb;
        color: #111827;
        font: 12px/1 "IBM Plex Mono", monospace;
        letter-spacing: 0.04em;
      }

      .browser-local-entry__badge.is-folder {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .browser-local-entry__copy,
      .browser-local-entry__meta {
        display: grid;
        min-width: 0;
        gap: 3px;
      }

      .browser-local-entry__copy strong,
      .browser-local-entry__meta strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .browser-local-entry__copy small,
      .browser-local-entry__meta small {
        color: #6b7280;
      }

      .browser-local-directory__empty {
        padding: 20px;
        border: 1px dashed rgba(15, 23, 42, 0.14);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.62);
        color: #6b7280;
      }

      @media (max-width: 780px) {
        .browser-local-entry {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .browser-local-entry__meta {
          grid-column: 1 / -1;
        }
      }
    </style>
  </head>
  <body>${bodyMarkup}</body>
</html>`;
}

function formatBrowserLocalMeta(node: FileNode) {
  if (node.type === "folder") {
    return "Folder";
  }

  if (typeof node.size === "number") {
    return `${node.extension?.toUpperCase() ?? "FILE"} · ${node.size} bytes`;
  }

  if (typeof node.content === "string") {
    return `${node.extension?.toUpperCase() ?? "TEXT"} · ${node.content.length} chars`;
  }

  return node.extension?.toUpperCase() ?? "FILE";
}

function buildDirectoryBreadcrumbs(directoryPath: string) {
  const normalized = normalizePath(directoryPath);
  const segments = normalized === "/" ? [] : normalized.split("/").filter(Boolean);
  const crumbs = [{ label: "Root", path: "/" }];
  let currentPath = "";

  for (const segment of segments) {
    currentPath = `${currentPath}/${segment}`;
    crumbs.push({ label: segment, path: currentPath });
  }

  return crumbs
    .map((crumb, index) => {
      const isLast = index === crumbs.length - 1;
      const markup = isLast
        ? `<strong>${escapeHtml(crumb.label)}</strong>`
        : `<a href="${escapeHtml(crumb.path)}" data-browser-path="${escapeHtml(crumb.path)}">${escapeHtml(crumb.label)}</a>`;

      if (isLast) {
        return markup;
      }

      return `${markup}<span class="is-separator">/</span>`;
    })
    .join("");
}

function buildDirectoryEntriesMarkup(directoryPath: string, entries: FileNode[]) {
  const rows: string[] = [];

  if (directoryPath !== "/") {
    const parentPath = getParentPath(directoryPath);

    rows.push(`
      <a class="browser-local-entry" href="${escapeHtml(parentPath)}" data-browser-path="${escapeHtml(parentPath)}">
        <span class="browser-local-entry__badge is-folder">UP</span>
        <span class="browser-local-entry__copy">
          <strong>..</strong>
          <small>Parent directory</small>
        </span>
        <span class="browser-local-entry__meta">
          <strong>${escapeHtml(parentPath)}</strong>
          <small>Move one level up</small>
        </span>
      </a>
    `);
  }

  for (const entry of entries) {
    const isFolder = entry.type === "folder";

    rows.push(`
      <a class="browser-local-entry" href="${escapeHtml(entry.path)}" data-browser-path="${escapeHtml(entry.path)}">
        <span class="browser-local-entry__badge ${isFolder ? "is-folder" : ""}">
          ${isFolder ? "DIR" : escapeHtml(entry.extension?.slice(0, 4).toUpperCase() ?? "FILE")}
        </span>
        <span class="browser-local-entry__copy">
          <strong>${escapeHtml(entry.name)}</strong>
          <small>${isFolder ? "Directory" : "File preview"}</small>
        </span>
        <span class="browser-local-entry__meta">
          <strong>${escapeHtml(entry.path)}</strong>
          <small>${escapeHtml(formatBrowserLocalMeta(entry))}</small>
        </span>
      </a>
    `);
  }

  if (rows.length === 0) {
    return `<div class="browser-local-directory__empty">This directory is empty.</div>`;
  }

  return `<div class="browser-local-directory__list">${rows.join("")}</div>`;
}

function buildLocalDirectoryDocument(
  directoryPath: string,
  entries: FileNode[]
): BrowserResolvedDocument {
  const normalizedPath = normalizePath(directoryPath);
  const title = normalizedPath === "/" ? "Root" : normalizedPath.split("/").filter(Boolean).at(-1) ?? normalizedPath;
  const breadcrumbMarkup = buildDirectoryBreadcrumbs(normalizedPath);
  const entriesMarkup = buildDirectoryEntriesMarkup(normalizedPath, entries);
  const itemCountLabel = `${entries.length} ${entries.length === 1 ? "item" : "items"}`;

  return {
    kind: "local",
    localKind: "directory",
    title,
    displayUrl: normalizedPath,
    note: "Local filesystem directory index rendered through srcDoc.",
    frameSource: {
      kind: "srcDoc",
      value: buildSrcDocShell(
        title,
        `
          <section class="browser-local-directory">
            <div class="browser-local-directory__hero">
              <div>
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(normalizedPath)}</p>
              </div>
              <p>${itemCountLabel}</p>
            </div>
            <nav class="browser-local-breadcrumbs" aria-label="Local path">${breadcrumbMarkup}</nav>
            ${entriesMarkup}
          </section>
        `
      ),
    },
  };
}

function buildLocalFileDocument(file: FileNode): BrowserResolvedDocument | null {
  if (typeof file.content === "string") {
    if (HTML_EXTENSIONS.has(file.extension ?? "") || file.mimeType?.includes("html")) {
      // Filesystem-backed HTML is treated as untrusted content, so sanitize it before mounting into srcDoc.
      const sanitizedMarkup = sanitizeHTML(file.content);

      return {
        kind: "local",
        localKind: "file",
        title: file.name,
        displayUrl: file.path,
        note: "Local filesystem preview rendered through srcDoc.",
        frameSource: {
          kind: "srcDoc",
          value: buildSrcDocShell(file.name, sanitizedMarkup),
        },
      };
    }

    return {
      kind: "local",
      localKind: "file",
      title: file.name,
      displayUrl: file.path,
      note: "Text file preview rendered from the virtual filesystem.",
      frameSource: {
        kind: "srcDoc",
        value: buildSrcDocShell(file.name, `<pre>${escapeHtml(file.content)}</pre>`),
      },
    };
  }

  if (typeof file.source === "string") {
    const escapedSource = escapeHtml(file.source);

    if (file.mimeType?.startsWith("image/")) {
      return {
        kind: "local",
        localKind: "file",
        title: file.name,
        displayUrl: file.path,
        note: "Image file preview rendered from the virtual filesystem.",
        frameSource: {
          kind: "srcDoc",
          value: buildSrcDocShell(
            file.name,
            `<div class="browser-local-media"><img src="${escapedSource}" alt="${escapeHtml(file.name)}" /></div>`
          ),
        },
      };
    }

    if (file.mimeType?.startsWith("video/")) {
      return {
        kind: "local",
        localKind: "file",
        title: file.name,
        displayUrl: file.path,
        note: "Video file preview rendered from the virtual filesystem.",
        frameSource: {
          kind: "srcDoc",
          value: buildSrcDocShell(
            file.name,
            `<div class="browser-local-media"><video src="${escapedSource}" controls playsinline></video></div>`
          ),
        },
      };
    }

    if (file.mimeType?.startsWith("audio/")) {
      return {
        kind: "local",
        localKind: "file",
        title: file.name,
        displayUrl: file.path,
        note: "Audio file preview rendered from the virtual filesystem.",
        frameSource: {
          kind: "srcDoc",
          value: buildSrcDocShell(
            file.name,
            `<div class="browser-local-media"><audio src="${escapedSource}" controls></audio></div>`
          ),
        },
      };
    }
  }

  return null;
}

export function resolveLocalBrowserDocument(
  input: string,
  nodes: FileSystemRecord
): LocalBrowserResolution {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { document: null, error: null };
  }

  const normalizedPath = normalizePath(trimmed);
  const node = getNodeByPath(nodes, normalizedPath);

  if (!node) {
    return {
      document: null,
      error: `Local file not found: ${normalizedPath}`,
    };
  }

  if (node.kind === "directory") {
    return {
      document: buildLocalDirectoryDocument(normalizedPath, listDirectory(nodes, normalizedPath)),
      error: null,
    };
  }

  const document = buildLocalFileDocument(toFileNode(node));

  if (!document) {
    return {
      document: null,
      error: `${node.name} cannot be rendered inside the Browser app.`,
    };
  }

  return {
    document,
    error: null,
  };
}
