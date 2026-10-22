import {
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FilePen,
  FolderInput,
  FolderOpen,
  FolderOutput,
  LayoutGrid,
  Link2,
  MapPin,
  Pencil,
  RotateCcw,
  Scissors,
  Trash2,
} from "lucide-react";
import {
  chooseAppFor,
  copyItems,
  createShortcutsFor,
  cutItems,
  deleteItems,
  editItem,
  getFileLocation,
  isInTrash,
  pasteIntoFolder,
  restoreItems,
  revealInExplorer,
} from "@/lib/file-actions";
import { getOpenWithOptions, resolveEditApp } from "@/lib/file-registry";
import { downloadFileNode, getParentPath, isLockedNode, normalizePath } from "@/lib/filesystem";
import { resolveShortcutNode } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import { useTransferDialogStore } from "@/stores/transfer-dialog-store";
import type { ClipboardState, ContextMenuAction, FileSystemRecord } from "@/types/system";

export interface FileMenuInput {
  nodes: FileSystemRecord;
  /** The items the menu acts on: the whole selection when the clicked item is part of it. */
  paths: string[];
  clipboard: ClipboardState | null;
  /** What "Open" does on this surface (Explorer opens a folder in place, the desktop in a new window). */
  onOpen: () => void;
  /** Start renaming in place. Leave out where there is nothing to rename in place. */
  onRename?: () => void;
  /** Explorer: "Open in new window" for a folder. */
  onOpenInNewWindow?: () => void;
  /**
   * Show "Open file location" for every item (the desktop, where it is the way
   * to get from an icon to its folder) rather than only for shortcuts.
   */
  locationForAll?: boolean;
}

const separator = (id: string): ContextMenuAction => ({ id, label: "", separator: true, onSelect: () => {} });

/**
 * The right-click menu for one or more files and folders. The desktop and File
 * Explorer both build theirs here, so Cut, Copy, Create shortcut, Delete, Rename
 * and Open file location mean exactly the same in both.
 */
export function buildFileMenu(input: FileMenuInput): ContextMenuAction[] {
  const { nodes, clipboard, onOpen, onRename, onOpenInNewWindow, locationForAll } = input;
  const paths = Array.from(new Set(input.paths.map(normalizePath))).filter((path) => nodes[path]);
  const count = paths.length;

  if (count === 0) {
    return [];
  }

  const single = count === 1 ? nodes[paths[0]] : null;
  const inTrash = paths.every(isInTrash);
  const locked = paths.some((path) => isLockedNode(nodes, path));
  const allLocked = paths.every((path) => isLockedNode(nodes, path));
  const items = (label: string) => (count > 1 ? `${label} ${count} items` : label);

  // What an app can do with the item: through a shortcut, with what it points at.
  const subject = single?.kind === "file" && single.shortcut ? resolveShortcutNode(nodes, single) : single;
  const openWithOptions = subject?.kind === "file" ? getOpenWithOptions(subject) : [];
  const editable = subject?.kind === "file" && resolveEditApp(subject) !== null;
  const location = single && (locationForAll || (single.kind === "file" && single.shortcut)) ? getFileLocation(single.path) : null;
  const canReveal = Boolean(location) && !inTrash;
  const topLevelInTrash = paths.every((path) => getParentPath(path) === TRASH_PATH);

  const actions: ContextMenuAction[] = [];
  const push = (action: ContextMenuAction | null | false | undefined) => {
    if (action) actions.push(action);
  };

  if (inTrash && topLevelInTrash) {
    push({ id: "restore", label: items("Restore"), icon: RotateCcw, onSelect: () => void restoreItems(paths) });
    push(separator("sep-restore"));
  }

  push({ id: "open", label: "Open", icon: single?.kind === "directory" ? FolderOpen : ExternalLink, onSelect: onOpen });

  push(
    single?.kind === "directory" &&
      onOpenInNewWindow && { id: "open-new-window", label: "Open in new window", icon: ExternalLink, onSelect: onOpenInNewWindow }
  );

  push(
    openWithOptions.length > 1 &&
      single && { id: "open-with", label: "Open with…", icon: LayoutGrid, onSelect: () => chooseAppFor(single.path) }
  );

  push(editable && single && { id: "edit", label: "Edit", icon: FilePen, onSelect: () => editItem(single.path) });

  push(separator("sep-clipboard"));
  push({ id: "cut", label: items("Cut"), icon: Scissors, shortcut: "Ctrl+X", disabled: locked, onSelect: () => cutItems(paths) });
  push({ id: "copy", label: items("Copy"), icon: Copy, shortcut: "Ctrl+C", onSelect: () => copyItems(paths) });
  push(
    clipboard &&
      single?.kind === "directory" && {
        id: "paste-into",
        label: clipboard.operation === "cut" ? "Move here" : "Paste into folder",
        icon: ClipboardPaste,
        onSelect: () => void pasteIntoFolder(single.path),
      }
  );

  push(separator("sep-manage"));
  push(!inTrash && { id: "create-shortcut", label: "Create shortcut", icon: Link2, onSelect: () => void createShortcutsFor(paths) });
  push(
    inTrash
      ? { id: "delete-permanent", label: items("Delete permanently"), icon: Trash2, danger: true, onSelect: () => void deleteItems(paths, { permanent: true }) }
      : { id: "delete", label: items("Delete"), icon: Trash2, shortcut: "Del", danger: true, disabled: allLocked, onSelect: () => void deleteItems(paths) }
  );
  push(
    onRename && {
      id: "rename",
      label: "Rename",
      icon: Pencil,
      shortcut: "F2",
      disabled: count > 1 || locked || inTrash,
      onSelect: onRename,
    }
  );

  if (!inTrash) {
    push(separator("sep-transfer"));
    const open = useTransferDialogStore.getState().open;
    push({ id: "move-to", label: "Move to…", icon: FolderInput, disabled: allLocked, onSelect: () => open(paths, "move") });
    push({ id: "copy-to", label: "Copy to…", icon: FolderOutput, onSelect: () => open(paths, "copy") });
  }

  if (canReveal && single) {
    push(separator("sep-location"));
    push({ id: "open-location", label: "Open file location", icon: MapPin, onSelect: () => revealInExplorer(single.path) });
  }

  if (single?.kind === "file" && !single.shortcut && !inTrash) {
    push({ id: "download", label: "Download", icon: Download, onSelect: () => void downloadFileNode(single) });
  }

  return actions;
}
