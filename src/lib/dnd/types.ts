import type { AppId } from "@/types/system";

/*
 * Shared vocabulary of the file drag and drop system (see controller.ts). Drags
 * are driven by pointer events rather than the HTML5 drag API, so the same code
 * handles mouse, pen and touch, can show Windows' "Move to ..." ghost, and works
 * across windows, the desktop and the taskbar.
 */

export type DragOperation = "move" | "copy" | "link";

/** Where a drag started. The desktop can also reposition icons; Explorer cannot. */
export type DragOrigin = "desktop" | "explorer";

export interface DragItem {
  /** Desktop icon id, or the item's path for Explorer drags. */
  id: string;
  /** Filesystem path. Absent for system icons (the Recycle Bin), which can only be repositioned. */
  path?: string;
}

export interface DragModifiers {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

/** What is under the pointer, read from data-drop-* attributes (see dom.ts). */
export type DropZone =
  /** A folder: an Explorer item, sidebar location, breadcrumb, the Explorer's file area or the desktop. */
  | { kind: "folder"; path: string; surface?: "desktop"; windowId?: string; spring?: boolean }
  /** An app window: drop opens the file there when the app can. */
  | { kind: "window"; windowId: string; appId: AppId }
  /** A taskbar button: hovering restores the window, nothing can be dropped. */
  | { kind: "taskbar"; windowId: string }
  /** A desktop icon that runs an app: drop opens the file with it. */
  | { kind: "app"; appId: AppId };

/**
 * Move, copy or link the dragged items into a folder. `surface` is set when
 * the drop landed on the desktop itself, where arrivals take the cell under
 * the pointer; dropped anywhere else they take the first free cell.
 */
export interface TransferPlan {
  kind: "transfer";
  operation: DragOperation;
  destination: string;
  paths: string[];
  label: string;
  surface?: "desktop";
}

/** Open a dragged file with an app (in an existing window when one was targeted). */
export interface OpenWithPlan {
  kind: "open-with";
  appId: AppId;
  windowId?: string;
  paths: string[];
  label: string;
}

/** Move desktop icons to another grid cell. */
export interface RepositionPlan {
  kind: "reposition";
}

/** A drop that is decided: it does something as soon as the pointer is released. */
export type ConcreteDropPlan = TransferPlan | OpenWithPlan | RepositionPlan;

/** One entry of the menu a right-button drag opens: "Move here", "Copy here", "Create shortcuts here", "Open with ...". */
export interface DropChoice {
  id: "move" | "copy" | "link" | "open";
  label: string;
  /** What choosing it does; null for an entry Windows shows but can't offer here (dimmed). */
  plan: ConcreteDropPlan | null;
}

/** Right-button drag: ask what to do when the button is released. */
export interface ChoosePlan {
  kind: "choose";
  /** What the ghost says while dragging: the first thing the menu would offer. */
  label: string;
  choices: DropChoice[];
}

export type DropPlan =
  | ConcreteDropPlan
  | ChoosePlan
  /** Nothing happens. `quiet` marks a plain no-op (the item's own folder) as opposed to a refusal, which the ghost says out loud. */
  | { kind: "none"; quiet?: boolean };
