import ReactMarkdown from "react-markdown";
import { getNodeByPath } from "@/lib/filesystem";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

export function MarkdownViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const file = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No document selected.</div>;
  }

  return (
    <article className="markdown-viewer">
      <header className="markdown-viewer__header">
        <p className="eyebrow">Document</p>
        <h1>{file.name}</h1>
      </header>
      <ReactMarkdown>{file.content ?? ""}</ReactMarkdown>
    </article>
  );
}
