import { getOpenWithOptions } from "@/lib/file-registry";
import { getParentPath, isLockedNode, normalizePath } from "@/lib/filesystem";
import { describeOperation, operationFromModifiers } from "@/lib/dnd/operation";
import type {
  ConcreteDropPlan,
  DragItem,
  DragModifiers,
  DragOperation,
  DragOrigin,
  DropChoice,
  DropPlan,
  DropZone,
} from "@/lib/dnd/types";
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
/** Nothing to do, and nothing wrong: dropped where the items already are. */
const NO_OP: DropPlan = { kind: "none", quiet: true };

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

/** The Recycle Bin or anything inside it. */
function isTrashPath(path: string) {
  return path === TRASH_PATH || path.startsWith(`${TRASH_PATH}/`);
}

const CHOICE_LABELS: Record<DragOperation, string> = {
  move: "Move here",
  copy: "Copy here",
  link: "Create shortcuts here",
};

/** Words for what a choice would do, shown by the ghost while a right-button drag is over a target. */
function describeChoice(plan: ConcreteDropPlan | null) {
  return plan && "label" in plan ? plan.label : "";
}

/**
 * A right-button drag never acts on release: it opens the menu of what could be done. With
 * nothing the menu could offer there is no menu, and the drop is refused (or ignored) as usual.
 */
function chooseDrop(choices: DropChoice[], fallback: DropPlan): DropPlan {
  const first = choices.find((choice) => choice.plan !== null);
  return first ? { kind: "choose", label: describeChoice(first.plan), choices } : fallback;
}

/**
 * What dropping into a folder would do for one operation: a transfer, a reposition on the desktop, or
 * nothing. `asked` is a right-button drag, where the menu offers each operation on its own, so a move
 * of read-only items is refused here instead of quietly turning into a copy.
 */
function planFolderOperation(
  input: ResolveDropInput,
  destinationPath: string,
  surface: "desktop" | undefined,
  requested: DragOperation,
  asked = false
): DropPlan {
  const { items, origin, nodes } = input;
  // Windows has no folders inside the Recycle Bin to drop on: anything dropped in it is deleted, so a
  // deleted folder is the bin itself and the drop never lands in it without its originalPath.
  const intoTrash = isTrashPath(normalizePath(destinationPath));
  const destination = intoTrash ? TRASH_PATH : normalizePath(destinationPath);
  const destinationNode = nodes[destination];
  const paths = items.flatMap((item) => (item.path ? [normalizePath(item.path)] : []));

  if (!destinationNode || destinationNode.kind !== "directory" || paths.length === 0) {
    return NONE;
  }

  let operation: DragOperation = requested;

  // Items that can't go anywhere inside themselves are dropped from the plan; with nothing left there is no drop.
  const placeable = paths.filter((path) => requested === "link" || (path !== destination && !destination.startsWith(`${path}/`)));

  if (placeable.length === 0) {
    return NONE;
  }

  if (intoTrash) {
    // The Recycle Bin only ever receives moves, and only of things that can be deleted.
    operation = "move";
    const deletable = placeable.filter((path) => !isLockedNode(nodes, path) && !isTrashPath(path));
    return deletable.length === 0
      ? placeable.every(isTrashPath)
        ? NO_OP
        : NONE
      : { kind: "transfer", operation, destination, paths: deletable, label: describeOperation(operation, "Recycle Bin") };
  }

  // Judged on what the visitor asked for, before locked items turn into copies: a click-drag of a bundled
  // item inside its own folder must stay a no-op rather than duplicating it.
  if (requested === "move" && placeable.every((path) => getParentPath(path) === destination)) {
    // Dropping icons where they already are: on the desktop that repositions them, in Explorer it does nothing.
    return origin === "desktop" && surface === "desktop" ? { kind: "reposition" } : NO_OP;
  }

  // Read-only and system items are copied, as Windows does for read-only media.
  if (operation === "move" && placeable.every((path) => isLockedNode(nodes, path))) {
    if (asked) {
      return NONE;
    }

    operation = "copy";
  }

  const label = describeOperation(operation, describeDestination(nodes, destination));

  return { kind: "transfer", operation, destination, paths: placeable, label, surface };
}

function isDecided(plan: DropPlan): plan is ConcreteDropPlan {
  return plan.kind !== "none" && plan.kind !== "choose";
}

function planFolderDrop(input: ResolveDropInput, destinationPath: string, surface?: "desktop"): DropPlan {
  if (input.button !== 2) {
    return planFolderOperation(input, destinationPath, surface, operationFromModifiers(input.modifiers));
  }

  // The Recycle Bin only has "Move here"; every other folder offers all three, and dims what can't be done.
  const operations: DragOperation[] = isTrashPath(normalizePath(destinationPath)) ? ["move"] : ["move", "copy", "link"];
  const plans = operations.map((operation) => planFolderOperation(input, destinationPath, surface, operation, true));
  const choices = operations.map<DropChoice>((operation, index) => {
    const plan = plans[index];
    return { id: operation, label: CHOICE_LABELS[operation], plan: isDecided(plan) ? plan : null };
  });

  return chooseDrop(choices, plans[0]);
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
    if (zone.kind !== "folder" || zone.surface !== "desktop" || origin !== "desktop") {
      return NONE;
    }

    const reposition: ConcreteDropPlan = { kind: "reposition" };
    return input.button === 2 ? chooseDrop([{ id: "move", label: CHOICE_LABELS.move, plan: reposition }], NONE) : reposition;
  }

  switch (zone.kind) {
    case "folder":
      return planFolderDrop(input, zone.path, zone.surface);
    case "window": {
      if (zone.appId === "files") {
        const shown = input.explorerPathOf?.(zone.windowId);
        return shown ? planFolderDrop(input, shown) : NONE;
      }

      return askToOpen(input, planOpenWith(input.nodes, paths, zone.appId, zone.windowId));
    }
    case "app":
      return askToOpen(input, planOpenWith(input.nodes, paths, zone.appId));
    case "taskbar":
      return NONE;
  }
}

/** A right-button drag onto an app offers "Open with ..." in a menu instead of opening straight away. */
function askToOpen(input: ResolveDropInput, plan: DropPlan): DropPlan {
  return input.button === 2 && plan.kind === "open-with"
    ? chooseDrop([{ id: "open", label: plan.label, plan }], plan)
    : plan;
}
