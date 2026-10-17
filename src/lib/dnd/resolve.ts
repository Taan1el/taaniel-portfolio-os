import { getOpenWithOptions } from "@/lib/file-registry";
import { getParentPath, isLockedNode, normalizePath } from "@/lib/filesystem";
import { describeOperation, operationFromModifiers } from "@/lib/dnd/operation";
import type { DragItem, DragModifiers, DragOperation, DragOrigin, DropPlan, DropZone } from "@/lib/dnd/types";
import { getAppDefinition } from "@/lib/app-registry";
import { isNotesNode } from "@/lib/notes";
import { resolveShortcutNode } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import { SHELL_USER } from "@/lib/windows-path";
import type { AppId, FileSystemRecord } from "@/types/system";

export interface ResolveDropInput {
  items: DragItem[];
  origin: DragOrigin;
  zone: DropZone | null;
  modifiers: DragModifiers;
  /** 2 for a right-button drag, which asks what to do on release. */
  button?: number;
  nodes: FileSystemRecord;
  /** The folder an Explorer window currently shows, for drops on the window frame. */
  explorerPathOf?: (windowId: string) => string | undefined;
}

const NONE: DropPlan = { kind: "none" };

/** The name Windows shows for a destination: the folder's name, the profile folder as the user's name. */
export function describeDestination(nodes: FileSystemRecord, path: string) {
  const normalized = normalizePath(path);

  if (normalized === "/") return SHELL_USER;
  if (normalized === TRASH_PATH) return "Recycle Bin";
  return nodes[normalized]?.name ?? normalized.split("/").filter(Boolean).at(-1) ?? normalized;
}

/** True when the app can show this file: shortcuts are followed to what they open. */
export function canAppOpenPath(nodes: FileSystemRecord, path: string, appId: AppId) {
  const node = nodes[normalizePath(path)];
  const target = node?.kind === "file" && node.shortcut ? resolveShortcutNode(nodes, node) : node;

  if (!target || target.kind !== "file") {
    return false;
  }

  // Notes only ever shows the notes in its own folder, whatever else could read a text file.
  if (appId === "notes") {
    return isNotesNode(target);
  }

  return getOpenWithOptions(target).includes(appId);
}

function planOpenWith(nodes: FileSystemRecord, paths: string[], appId: AppId, windowId?: string): DropPlan {
  const openable = paths.filter((path) => canAppOpenPath(nodes, path, appId));

  if (openable.length === 0) {
    return NONE;
  }

  return { kind: "open-with", appId, windowId, paths: openable, label: `Open with ${getAppDefinition(appId).title}` };
}

function planFolderDrop(input: ResolveDropInput, destinationPath: string, surface?: "desktop"): DropPlan {
  const { items, origin, modifiers, nodes } = input;
  const destination = normalizePath(destinationPath);
  const destinationNode = nodes[destination];
  const paths = items.flatMap((item) => (item.path ? [normalizePath(item.path)] : []));

  if (!destinationNode || destinationNode.kind !== "directory" || paths.length === 0) {
    return NONE;
  }

  const intoTrash = destination === TRASH_PATH;
  let operation: DragOperation = operationFromModifiers(modifiers);

  // Items that can't go anywhere inside themselves are dropped from the plan; with nothing left there is no drop.
  const placeable = paths.filter((path) => operation === "link" || (path !== destination && !destination.startsWith(`${path}/`)));

  if (placeable.length === 0) {
    return NONE;
  }

  if (intoTrash) {
    // The Recycle Bin only ever receives moves, and only of things that can be deleted.
    operation = "move";
    const deletable = placeable.filter((path) => !isLockedNode(nodes, path) && getParentPath(path) !== TRASH_PATH);
    return deletable.length === 0
      ? NONE
      : { kind: "transfer", operation, destination, paths: deletable, label: describeOperation(operation, "Recycle Bin") };
  }

  // Read-only and system items are copied, as Windows does for read-only media.
  if (operation === "move" && placeable.every((path) => isLockedNode(nodes, path))) {
    operation = "copy";
  }

  const label = describeOperation(operation, describeDestination(nodes, destination));

  if (operation === "move" && placeable.every((path) => getParentPath(path) === destination)) {
    // Dropping icons where they already are: on the desktop that repositions them, in Explorer it does nothing.
    return origin === "desktop" && surface === "desktop" ? { kind: "reposition" } : NONE;
  }

  if (input.button === 2) {
    return { kind: "choose", destination, paths: placeable, label };
  }

  return { kind: "transfer", operation, destination, paths: placeable, label };
}

/** Decide what releasing the drag here would do. Pure: the controller and the ghost both read it. */
export function resolveDropPlan(input: ResolveDropInput): DropPlan {
  const { zone, items, origin } = input;

  if (!zone || items.length === 0) {
    return NONE;
  }

  const paths = items.flatMap((item) => (item.path ? [normalizePath(item.path)] : []));
  const hasSystemIcon = items.some((item) => !item.path);

  // The Recycle Bin and other system icons can be moved around the desktop, but are not files.
  if (hasSystemIcon) {
    return zone.kind === "folder" && zone.surface === "desktop" && origin === "desktop" ? { kind: "reposition" } : NONE;
  }

  switch (zone.kind) {
    case "folder":
      return planFolderDrop(input, zone.path, zone.surface);
    case "window": {
      if (zone.appId === "files") {
        const shown = input.explorerPathOf?.(zone.windowId);
        return shown ? planFolderDrop(input, shown) : NONE;
      }

      return planOpenWith(input.nodes, paths, zone.appId, zone.windowId);
    }
    case "app":
      return planOpenWith(input.nodes, paths, zone.appId);
    case "taskbar":
      return NONE;
  }
}
