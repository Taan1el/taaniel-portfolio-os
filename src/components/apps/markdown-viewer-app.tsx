import { Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getNodeByPath } from "@/lib/filesystem";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";
import { sanitizeHTML } from "@/utils/sanitize";

const SAFE_MARKDOWN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function sanitizeMarkdownUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return SAFE_MARKDOWN_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function MarkdownViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const file = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No document selected.</div>;
  }

  // Filesystem-backed markdown is treated as untrusted content, so strip embedded HTML before rendering.
  const sanitizedMarkdown = sanitizeHTML(file.content ?? "");

  return (
    <article className="markdown-viewer">
      <header className="markdown-viewer__header">
        <p className="eyebrow">Document</p>
        <h1>{file.name}</h1>
        {!file.readonly ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              launchApp({
                appId: "editor",
                payload: { filePath: file.path },
              })
            }
          >
            <Pencil size={14} />
            Edit
          </button>
        ) : null}
      </header>
      <ReactMarkdown skipHtml urlTransform={sanitizeMarkdownUrl}>
        {sanitizedMarkdown}
      </ReactMarkdown>
    </article>
  );
}
