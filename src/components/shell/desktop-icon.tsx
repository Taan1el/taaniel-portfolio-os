import { memo, useCallback, useRef, useState } from "react";
import { RecycleBinEmptyIcon, RecycleBinFullIcon } from "@/components/icons/apps";
import { NodeIcon } from "@/components/icons/node-icon";
import { InlineRenameInput } from "@/components/system/inline-rename-input";
import { appDropProps } from "@/lib/dnd/dom";
import { cn } from "@/lib/utils";
import { useSystemStore } from "@/stores/system-store";
import type { AppId, DesktopEntry, DesktopGridMetrics, VirtualNode } from "@/types/system";

/** Let filenames wrap before the extension ("Resume" / ".pdf") instead of mid-word. */
function renderIconLabel(label: string) {
  const dot = label.lastIndexOf(".");

  if (dot <= 0 || dot === label.length - 1 || label.includes(" ")) {
    return label;
  }

  return (
    <>
      {label.slice(0, dot)}
      <wbr />
      {label.slice(dot)}
    </>
  );
}

interface DesktopIconGlyphProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  recycleBinFull: boolean;
  size?: number;
}

/** The picture on a desktop icon: the Recycle Bin, or the file, folder or shortcut it stands for. */
export function DesktopIconGlyph({ entry, node, recycleBinFull, size = 48 }: DesktopIconGlyphProps) {
  if (entry.kind === "recycle-bin") {
    const Icon = recycleBinFull ? RecycleBinFullIcon : RecycleBinEmptyIcon;
    return <Icon size={size} />;
  }

  return node ? <NodeIcon node={node} size={size} /> : null;
}

interface DesktopIconProps {
  entry: DesktopEntry;
  node?: VirtualNode;
  pixelPosition: { x: number; y: number };
  gridMetrics: DesktopGridMetrics;
  selected: boolean;
  /** The icon that takes the keyboard focus when the desktop is tabbed to. */
  tabbable: boolean;
  renaming: boolean;
  /** Cut to the clipboard: drawn faded until pasted. */
  cut: boolean;
  /** Part of the drag in progress. */
  dragSource: boolean;
  recycleBinFull: boolean;
  onPointerDown: (entry: DesktopEntry, event: React.PointerEvent<HTMLElement>) => void;
  onActivate: (entry: DesktopEntry) => void;
  onContextMenu: (entry: DesktopEntry, event: React.MouseEvent<HTMLElement>) => void;
  onCommitRename: (entry: DesktopEntry, name: string) => void;
  onCancelRename: () => void;
}

export const DesktopIcon = memo(function DesktopIcon({
  entry,
  node,
  pixelPosition,
  gridMetrics,
  selected,
  tabbable,
  renaming,
  cut,
  dragSource,
  recycleBinFull,
  onPointerDown,
  onActivate,
  onContextMenu,
  onCommitRename,
  onCancelRename,
}: DesktopIconProps) {
  const lastPointerType = useRef("mouse");
  const [launching, setLaunching] = useState(false);

  // The app a shortcut runs, so its icon can show a window of it is open.
  const shortcutAppId: AppId | null = node?.kind === "file" && node.shortcut?.type === "app" ? node.shortcut.appId : null;
  const isWindowOpen = useSystemStore(
    useCallback((state) => (shortcutAppId ? state.windows.some((window) => window.appId === shortcutAppId) : false), [shortcutAppId])
  );

  const activate = () => {
    setLaunching(true);
    window.setTimeout(() => setLaunching(false), 400);
    onActivate(entry);
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-label={entry.label}
      tabIndex={tabbable ? 0 : -1}
      data-desktop-icon-id={entry.id}
      data-path={entry.kind === "node" ? entry.path : undefined}
      // A desktop icon that runs an app is also a drop target: drop a file on it to open the file there.
      {...(shortcutAppId ? appDropProps(shortcutAppId) : {})}
      className={cn(
        "desktop-icon",
        "desktop-icon-button",
        selected && "is-selected",
        cut && "is-cut",
        dragSource && "is-drag-source",
        renaming && "is-renaming",
        launching && "is-launching"
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
        lastPointerType.current = event.pointerType || "mouse";
        onPointerDown(entry, event);
      }}
      // A mouse or pen opens on double-click, as Windows does; a finger opens on a tap.
      onClick={() => {
        if (lastPointerType.current === "touch" && !renaming) {
          activate();
        }
      }}
      onDoubleClick={() => {
        if (lastPointerType.current !== "touch" && !renaming) {
          activate();
        }
      }}
      onContextMenu={(event) => onContextMenu(entry, event)}
    >
      <span className="desktop-icon__glyph">
        <DesktopIconGlyph entry={entry} node={node} recycleBinFull={recycleBinFull} />
      </span>
      {renaming ? (
        <InlineRenameInput
          initialName={entry.label}
          multiline
          className="desktop-icon__rename"
          onCommit={(name) => onCommitRename(entry, name)}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="desktop-icon__label">{renderIconLabel(entry.label)}</span>
      )}
      {isWindowOpen ? <span className="desktop-icon__active-dot" aria-hidden="true" /> : null}
    </div>
  );
});
