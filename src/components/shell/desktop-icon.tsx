import type { RefObject } from "react";
import { FileCode2, FileText, Folder, Globe, Image, LucideIcon, UserSquare2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { DesktopEntry, DesktopGridMetrics, DesktopGridPosition, VirtualNode } from "@/types/system";

interface DesktopIconProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  position: DesktopGridPosition;
  pixelPosition: { x: number; y: number };
  gridMetrics: DesktopGridMetrics;
  dragConstraintsRef: RefObject<HTMLDivElement>;
  selected: boolean;
  onActivate: () => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPositionChange: (position: DesktopGridPosition) => void;
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

  if (entry.filePath?.endsWith(".pdf")) {
    return UserSquare2;
  }

  return FileText;
}

export function DesktopIcon({
  entry,
  node,
  position,
  pixelPosition,
  gridMetrics,
  dragConstraintsRef,
  selected,
  onActivate,
  onSelect,
  onContextMenu,
  onPositionChange,
}: DesktopIconProps) {
  const Icon = resolveIcon(entry, node);

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
      onDragEnd={(_, info) => {
        onPositionChange({
          gridX: Math.round((pixelPosition.x + info.offset.x - gridMetrics.paddingX) / gridMetrics.cellWidth),
          gridY: Math.round((pixelPosition.y + info.offset.y - gridMetrics.paddingY) / gridMetrics.cellHeight),
        });
      }}
    >
      <span className="desktop-icon__glyph">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <span className="desktop-icon__label">{entry.label}</span>
    </motion.button>
  );
}
