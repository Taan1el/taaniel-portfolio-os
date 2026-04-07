import { useRef } from "react";
import { FileCode2, FileText, Folder, Globe, Image, UserSquare2 } from "lucide-react";
import { getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { DesktopEntry, DesktopGridMetrics, VirtualNode } from "@/types/system";

const TOUCH_DRAG_DELAY_MS = 280;

function resolveIcon(entry: DesktopEntry, node?: VirtualNode) {
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

interface DesktopIconShellProps {
  entry: DesktopEntry;
  node?: VirtualNode;
}

function DesktopIconContent({ entry, node }: DesktopIconShellProps) {
  const Icon = resolveIcon(entry, node);

  return (
    <>
      <span className="desktop-icon__glyph">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <span className="desktop-icon__label">{entry.label}</span>
    </>
  );
}

interface DesktopIconProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  pixelPosition: { x: number; y: number };
  gridMetrics: DesktopGridMetrics;
  selected: boolean;
  /** True while this icon is the active drag source (mousedown / drag session). */
  dragging?: boolean;
  /** After the pointer moves, detach hit-testing so clicks pass through the faded cell. */
  dragPointerSink?: boolean;
  onActivate: () => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerStart: (
    pointer: { clientX: number; clientY: number; pointerId: number; pointerType: string },
    snapshot: { left: number; top: number; width: number; height: number }
  ) => void;
}

export function DesktopIcon({
  entry,
  node,
  pixelPosition,
  gridMetrics,
  selected,
  dragging,
  dragPointerSink,
  onActivate,
  onSelect,
  onContextMenu,
  onPointerStart,
}: DesktopIconProps) {
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = null;
  };

  return (
    <button
      type="button"
      aria-label={`Open ${entry.label}`}
      className={cn(
        "desktop-icon",
        "desktop-icon-button",
        selected && "is-selected",
        dragging && "is-dragging",
        dragPointerSink && "is-dragging-sink"
      )}
      style={
        {
          left: pixelPosition.x,
          top: pixelPosition.y,
          "--desktop-cell-width": `${gridMetrics.cellWidth}px`,
          "--desktop-cell-height": `${gridMetrics.cellHeight}px`,
        } as React.CSSProperties
      }
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();

        if (event.button !== 0) {
          return;
        }

        const element = event.currentTarget.getBoundingClientRect();
        const snapshot = {
          left: element.left,
          top: element.top,
          width: element.width,
          height: element.height,
        };

        if (event.pointerType === "touch") {
          longPressTriggeredRef.current = false;
          longPressTimeoutRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            onPointerStart(
              {
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
              },
              snapshot
            );
          }, TOUCH_DRAG_DELAY_MS);
          return;
        }

        onPointerStart(
          {
            clientX: event.clientX,
            clientY: event.clientY,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
          },
          snapshot
        );
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch") {
          return;
        }

        clearLongPressTimeout();

        if (!longPressTriggeredRef.current) {
          onActivate();
        }

        longPressTriggeredRef.current = false;
      }}
      onPointerCancel={() => {
        clearLongPressTimeout();
        longPressTriggeredRef.current = false;
      }}
      onPointerLeave={() => {
        if (dragging) {
          return;
        }

        clearLongPressTimeout();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onActivate();
        }
      }}
      onContextMenu={onContextMenu}
    >
      <DesktopIconContent
        entry={entry}
        node={node}
      />
    </button>
  );
}

interface DesktopIconGhostProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  pixelPosition: { x: number; y: number };
  gridMetrics: DesktopGridMetrics;
}

export function DesktopIconGhost(props: DesktopIconGhostProps) {
  return (
    <span
      className="desktop-icon desktop-drag-ghost"
      style={
        {
          left: props.pixelPosition.x,
          top: props.pixelPosition.y,
          "--desktop-cell-width": `${props.gridMetrics.cellWidth}px`,
          "--desktop-cell-height": `${props.gridMetrics.cellHeight}px`,
        } as React.CSSProperties
      }
    >
      <DesktopIconContent entry={props.entry} node={props.node} />
    </span>
  );
}
