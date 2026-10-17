import { memo } from "react";
import {
  formatDateTime,
  formatDetailsSize,
  getNodeLabel,
  getNodeSize,
} from "@/components/apps/explorer/explorer-model";
import { NodeIcon } from "@/components/icons/node-icon";
import { describeFileType } from "@/components/icons/file-icon";
import { InlineRenameInput } from "@/components/system/inline-rename-input";
import { appDropProps, folderDropProps } from "@/lib/dnd/dom";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { getParentPath } from "@/lib/filesystem";
import { cn } from "@/lib/utils";
import { toWindowsPath } from "@/lib/windows-path";
import type { FileNode } from "@/types/system";

export interface ExplorerItemHandlers {
  onOpen: (node: FileNode) => void;
  onPointerDown: (node: FileNode, event: React.PointerEvent) => void;
  onContextMenu: (node: FileNode, event: React.MouseEvent) => void;
  onDoubleClick: (node: FileNode) => void;
  onCommitRename: (node: FileNode, nextName: string) => void;
  onCancelRename: () => void;
}

export interface ExplorerItemProps extends ExplorerItemHandlers {
  node: FileNode;
  /** The Explorer window the item is in, so a drag can open folders inside it. */
  windowId: string;
  selected: boolean;
  renaming: boolean;
  /** On the clipboard from a Cut: drawn faded until pasted, as in Windows. */
  cut: boolean;
  /** Part of the drag in progress. */
  dragSource: boolean;
  /** Showing the Recycle Bin: Details shows original location and date deleted. */
  recycleBin?: boolean;
}

/** Folders take drops, and so do shortcuts that run an app (the file opens in that app). */
function getItemDropProps(node: FileNode, windowId: string) {
  if (node.type === "folder") {
    return folderDropProps(node.path, { windowId, spring: true });
  }

  return node.shortcut?.type === "app" ? appDropProps(node.shortcut.appId) : {};
}

export const ExplorerGridItem = memo(function ExplorerGridItem({
  node,
  windowId,
  selected,
  renaming,
  cut,
  dragSource,
  onOpen,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
  onCommitRename,
  onCancelRename,
}: ExplorerItemProps) {
  const label = getNodeLabel(node);
  const canRenderThumbnail =
    node.type === "file" &&
    Boolean(node.mimeType?.startsWith("image/")) &&
    Boolean(node.extension && isBrowserRenderableImageExtension(node.extension)) &&
    Boolean(node.source);

  return (
    <div
      className={cn(
        "explorer-grid-item",
        selected && "is-selected",
        renaming && "is-renaming",
        cut && "is-cut",
        dragSource && "is-drag-source"
      )}
      data-path={node.path}
      role="option"
      aria-selected={selected}
      aria-label={label}
      tabIndex={-1}
      title={label}
      {...getItemDropProps(node, windowId)}
      onPointerDown={(event) => onPointerDown(node, event)}
      // The press already did the selecting; this only keeps the click from reaching the background.
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick(node);
      }}
      onContextMenu={(event) => onContextMenu(node, event)}
      onKeyDown={(event) => {
        if (renaming) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(node);
        }
      }}
    >
      <span className="explorer-grid-item__thumb">
        {canRenderThumbnail ? (
          <img src={node.source} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <NodeIcon node={node} size={48} />
        )}
      </span>
      {renaming ? (
        <InlineRenameInput
          initialName={label}
          multiline
          className="explorer-rename-input"
          onCommit={(next) => onCommitRename(node, next)}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="explorer-grid-item__label">{label}</span>
      )}
    </div>
  );
});

export const ExplorerListItem = memo(function ExplorerListItem({
  node,
  windowId,
  selected,
  renaming,
  cut,
  dragSource,
  recycleBin,
  onOpen,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
  onCommitRename,
  onCancelRename,
}: ExplorerItemProps) {
  const label = getNodeLabel(node);
  const size = getNodeSize(node);

  return (
    <div
      className={cn(
        "explorer-list-item w11-details__row",
        selected && "is-selected",
        renaming && "is-renaming",
        cut && "is-cut",
        dragSource && "is-drag-source"
      )}
      data-path={node.path}
      role="row"
      aria-selected={selected}
      aria-label={label}
      tabIndex={-1}
      title={label}
      {...getItemDropProps(node, windowId)}
      onPointerDown={(event) => onPointerDown(node, event)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick(node);
      }}
      onContextMenu={(event) => onContextMenu(node, event)}
      onKeyDown={(event) => {
        if (renaming) return;
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen(node);
        }
      }}
    >
      <span className="w11-details__cell w11-details__name" role="gridcell">
        <span className="w11-details__icon">
          <NodeIcon node={node} size={16} />
        </span>
        {renaming ? (
          <InlineRenameInput
            initialName={label}
            className="explorer-rename-input"
            onCommit={(next) => onCommitRename(node, next)}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="w11-details__label">{label}</span>
        )}
      </span>
      {recycleBin ? (
        <>
          <span className="w11-details__cell" role="gridcell">
            {node.originalPath ? toWindowsPath(getParentPath(node.originalPath)) : ""}
          </span>
          <span className="w11-details__cell" role="gridcell">
            {node.deletedAt ? formatDateTime(node.deletedAt) : ""}
          </span>
        </>
      ) : (
        <>
          <span className="w11-details__cell" role="gridcell">
            {formatDateTime(node.updatedAt)}
          </span>
          <span className="w11-details__cell" role="gridcell">
            {describeFileType(node)}
          </span>
        </>
      )}
      <span className="w11-details__cell w11-details__size" role="gridcell">
        {node.type === "file" ? formatDetailsSize(size) : ""}
      </span>
    </div>
  );
});
