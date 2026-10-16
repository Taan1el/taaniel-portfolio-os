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

export type DropPlan =
  /** Move, copy or link the dragged items into a folder. */
  | { kind: "transfer"; operation: DragOperation; destination: string; paths: string[]; label: string }
  /** Right-button drag: ask what to do when the button is released. */
  | { kind: "choose"; destination: string; paths: string[]; label: string }
  /** Open a dragged file with an app (in an existing window when one was targeted). */
  | { kind: "open-with"; appId: AppId; windowId?: string; paths: string[]; label: string }
  /** Move desktop icons to another grid cell. */
  | { kind: "reposition" }
  | { kind: "none" };
