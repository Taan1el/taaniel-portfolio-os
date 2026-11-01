import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatDateTime, formatSize } from "@/components/apps/explorer/explorer-model";
import { describeFileType } from "@/components/icons/file-icon";
import { NodeIcon } from "@/components/icons/node-icon";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { describeProperties } from "@/lib/file-properties";
import { toWindowsPath } from "@/lib/windows-path";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { usePropertiesStore } from "@/stores/properties-store";
import "@/styles/properties-dialog.css";

const count = (amount: number, noun: string) => `${amount} ${noun}${amount === 1 ? "" : "s"}`;

function PropertiesInner({ paths, onClose }: { paths: string[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const nodes = useFileSystemStore((state) => state.nodes);
  const details = describeProperties(nodes, paths);
  useDialogFocus(dialogRef, { trap: true });

  // The item can go while the dialog is open, say deleted from another window.
  useEffect(() => {
    if (!details) onClose();
  }, [details, onClose]);

  if (!details) return null;

  const { node } = details;
  const inside = details.folders - (node?.kind === "directory" ? 1 : 0);
  const rows: [string, string | null][] = [
    ["Type", node ? describeFileType(node) : "Multiple items"],
    ["Target", details.target && toWindowsPath(details.target)],
    ["Location", details.location && toWindowsPath(details.location)],
    ["Size", formatSize(details.bytes) || "0 bytes"],
    ["Contains", node?.kind === "file" ? null : `${count(details.files, "file")}, ${count(inside, "folder")}`],
    ["Created", details.created ? formatDateTime(details.created) : null],
    ["Modified", details.modified ? formatDateTime(details.modified) : null],
    ["Attributes", details.readOnly ? "Read-only" : "Normal"],
  ];

  return (
    <div className="props-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()} onKeyDown={(event) => event.key === "Escape" && (event.stopPropagation(), onClose())}>
      <div ref={dialogRef} className="props w11-flyout" role="dialog" aria-modal="true" aria-labelledby="props-title">
        <header>
          <strong id="props-title">{details.name} Properties</strong>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="props__summary">
          {node ? <NodeIcon node={node} size={32} /> : null}
          <span>{details.name}</span>
        </div>
        <dl className="props__rows">
          {rows.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null
          )}
        </dl>
        <footer>
          <button type="button" className="w11-button w11-button--accent" onClick={onClose}>
            OK
          </button>
        </footer>
      </div>
    </div>
  );
}

export function PropertiesDialog() {
  const paths = usePropertiesStore((state) => state.paths);
  const close = usePropertiesStore((state) => state.close);
  return paths ? createPortal(<PropertiesInner paths={paths} onClose={close} />, document.body) : null;
}
