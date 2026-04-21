import { normalizePath } from "@/lib/filesystem";
import type { BrowserResolvedDocument } from "@/lib/browser/types";
import type { FileNode } from "@/types/system";
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
    </style>
  </head>
  <body>${bodyMarkup}</body>
</html>`;
}

function buildLocalFileDocument(file: FileNode): BrowserResolvedDocument | null {
  if (typeof file.content === "string") {
    if (HTML_EXTENSIONS.has(file.extension ?? "") || file.mimeType?.includes("html")) {
      // Filesystem-backed HTML is treated as untrusted content, so sanitize it before mounting into srcDoc.
      const sanitizedMarkup = sanitizeHTML(file.content);

      return {
        kind: "local",
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
  readFile: (path: string) => FileNode | null
): LocalBrowserResolution {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return { document: null, error: null };
  }

  const normalizedPath = normalizePath(trimmed);
  const file = readFile(normalizedPath);

  if (!file) {
    return {
      document: null,
      error: `Local file not found: ${normalizedPath}`,
    };
  }

  const document = buildLocalFileDocument(file);

  if (!document) {
    return {
      document: null,
      error: `${file.name} cannot be rendered inside the Browser app.`,
    };
  }

  return {
    document,
    error: null,
  };
}
