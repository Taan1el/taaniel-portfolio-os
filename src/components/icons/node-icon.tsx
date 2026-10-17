import { useCallback } from "react";
import { getFileIcon, getShortcutIcon } from "@/components/icons/file-icon";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { ShortcutTarget } from "@/types/system";

interface NodeIconTarget {
  path: string;
  /** FileNode uses `type`, VirtualNode uses `kind`; either works. */
  type?: "file" | "folder";
  kind?: "file" | "directory";
  extension?: string;
  mimeType?: string;
  shortcut?: ShortcutTarget;
}

interface NodeIconProps {
  node: NodeIconTarget;
  size?: number;
  className?: string;
  /** Draw the Recycle Bin as full. */
  recycleBinFull?: boolean;
}

/** The little arrow Windows draws over a shortcut's icon. */
function ShortcutBadge() {
  return (
    <svg className="node-icon__badge" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="#fff" stroke="rgba(0,0,0,0.3)" />
      <path
        d="M4.5 11.5V9a3 3 0 0 1 3-3h3.2M8.6 3.8 11 6l-2.4 2.2"
        fill="none"
        stroke="#0f6cbd"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShortcutNodeIcon({ shortcut, size, className }: { shortcut: ShortcutTarget; size: number; className?: string }) {
  // Selecting the icon component itself keeps this from re-rendering on unrelated filesystem writes.
  const Icon = useFileSystemStore(useCallback((state) => getShortcutIcon(shortcut, state.nodes), [shortcut]));

  return (
    <span className={cn("node-icon", className)} style={{ width: size, height: size }}>
      <Icon size={size} />
      <ShortcutBadge />
    </span>
  );
}

/**
 * The icon for a file, folder or shortcut. Shortcuts show what they point at
 * with the arrow badge, so the desktop and Explorer's Desktop folder match.
 */
export function NodeIcon({ node, size = 16, className, recycleBinFull = false }: NodeIconProps) {
  if (node.shortcut && (node.kind === "file" || node.type === "file")) {
    return <ShortcutNodeIcon shortcut={node.shortcut} size={size} className={className} />;
  }

  const Icon = getFileIcon(node, { recycleBinFull });
  return <Icon size={size} className={className} />;
}
