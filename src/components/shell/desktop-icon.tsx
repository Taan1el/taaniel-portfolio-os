import type { RefObject } from "react";
import { FileCode2, FileText, Folder, Globe, Image, LucideIcon, UserSquare2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { DesktopEntry, DesktopGridMetrics, VirtualNode } from "@/types/system";

interface DesktopDragSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DesktopIconProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  pixelPosition: { x: number; y: number };
  gridMetrics: DesktopGridMetrics;
  dragConstraintsRef: RefObject<HTMLDivElement>;
  selected: boolean;
  onActivate: () => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDragPreviewChange: (iconId: string, snapshot: DesktopDragSnapshot) => void;
  onDragCommit: (iconId: string, snapshot: DesktopDragSnapshot) => void;
  onDragCancel: () => void;
}

function resolveIcon(entry: DesktopEntry, node?: VirtualNode): LucideIcon {
  if (entry.type === "app" && entry.appId) {
    return getAppDefinition(entry.appId).icon;
  }

  if (entry.type === "folder") {
    return Folder;
  }

  if (entry.type === "link") {
    return Globe;
  }

  if (node?.kind === "file" && node.mimeType.startsWith("image/")) {
    return Image;
  }

  if (node?.kind === "file" && ["ts", "tsx", "js", "jsx", "css", "html"].includes(node.extension)) {
    return FileCode2;
  }

  if (node?.kind === "file" && node.extension === "pdf") {
    return UserSquare2;
  }

  return FileText;
}

export function DesktopIcon({
  entry,
  node,
  pixelPosition,
  gridMetrics,
  dragConstraintsRef,
  selected,
  onActivate,
  onSelect,
  onContextMenu,
  onDragPreviewChange,
  onDragCommit,
  onDragCancel,
}: DesktopIconProps) {
  const Icon = resolveIcon(entry, node);

  const getSnapshot = (event: MouseEvent | TouchEvent | PointerEvent): DesktopDragSnapshot | null => {
    const element = (event.currentTarget as HTMLElement | null) ?? null;

    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  return (
    <motion.button
      className={cn("desktop-icon", selected && "is-selected")}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragConstraintsRef}
      whileDrag={{ scale: 1.03, zIndex: 8 }}
      style={
        {
          left: pixelPosition.x,
          top: pixelPosition.y,
          "--desktop-cell-width": `${gridMetrics.cellWidth}px`,
          "--desktop-cell-height": `${gridMetrics.cellHeight}px`,
        } as React.CSSProperties
      }
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onContextMenu={onContextMenu}
      onDragStart={(event) => {
        const snapshot = getSnapshot(event);

        if (snapshot) {
          onDragPreviewChange(entry.id, snapshot);
        }
      }}
      onDrag={(event) => {
        const snapshot = getSnapshot(event);

        if (snapshot) {
          onDragPreviewChange(entry.id, snapshot);
        }
      }}
      onDragEnd={(event) => {
        const snapshot = getSnapshot(event);

        if (snapshot) {
          onDragCommit(entry.id, snapshot);
          return;
        }

        onDragCancel();
      }}
    >
      <span className="desktop-icon__glyph">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <span className="desktop-icon__label">{entry.label}</span>
    </motion.button>
  );
}
