import { formatDateTime, formatSize, getNodeSize } from "@/components/apps/explorer/explorer-model";
import { describeFileType } from "@/components/icons/file-icon";
import { NodeIcon } from "@/components/icons/node-icon";
import { describePreview } from "@/lib/file-preview";
import type { FileSystemRecord } from "@/types/system";

function Note({ children }: { children: string }) {
  return <p className="explorer-preview__note">{children}</p>;
}

/** The pane beside the file area. It shows only what the selected item really holds. */
export function ExplorerPreview({ nodes, paths }: { nodes: FileSystemRecord; paths: string[] }) {
  const preview = describePreview(nodes, paths);

  if (preview.kind === "empty" || preview.kind === "many") {
    return (
      <aside className="explorer-preview" aria-label="Preview">
        <Note>{preview.kind === "many" ? `${preview.count} items selected` : "Select a file to preview it."}</Note>
      </aside>
    );
  }

  const { node } = preview;
  const size = node.kind === "file" ? formatSize(getNodeSize(node)) : "";

  return (
    <aside className="explorer-preview" aria-label={`Preview of ${node.name}`}>
      <div className="explorer-preview__body">
        {preview.kind === "image" ? <img key={node.path} src={preview.source} alt={node.name} draggable={false} /> : null}
        {preview.kind === "audio" ? <audio key={node.path} src={preview.source} controls preload="metadata" aria-label={node.name} /> : null}
        {preview.kind === "video" ? <video key={node.path} src={preview.source} controls playsInline preload="metadata" aria-label={node.name} /> : null}
        {preview.kind === "text" ? (
          <pre tabIndex={0} aria-label={`Text of ${node.name}`}>
            {preview.text}
            {preview.truncated ? "\n…" : ""}
          </pre>
        ) : null}
        {preview.kind === "folder" || preview.kind === "none" ? <NodeIcon node={node} size={64} /> : null}
        {preview.kind === "none" ? <Note>{preview.broken ? "This shortcut's target is gone." : "No preview for this kind of file."}</Note> : null}
      </div>
      <dl className="explorer-preview__details">
        <dt>Name</dt>
        <dd>{node.name}</dd>
        <dt>Type</dt>
        <dd>{describeFileType(node)}</dd>
        {preview.kind === "folder" ? (
          <>
            <dt>Items</dt>
            <dd>{preview.items}</dd>
          </>
        ) : null}
        {size ? (
          <>
            <dt>Size</dt>
            <dd>{size}</dd>
          </>
        ) : null}
        <dt>Modified</dt>
        <dd>{formatDateTime(node.updatedAt)}</dd>
      </dl>
    </aside>
  );
}
