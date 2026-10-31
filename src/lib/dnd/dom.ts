import type { AppId } from "@/types/system";
import type { DropZone } from "@/lib/dnd/types";

/*
 * Drop zones are plain DOM elements tagged with data-drop-* attributes, so any
 * component can be a target without registering anything: the controller reads
 * what is under the pointer on every move. The same tags work for the desktop,
 * Explorer items, the sidebar, breadcrumbs, window frames and taskbar buttons.
 */

export const DROP_ZONE_SELECTOR = [
  "[data-drop-folder]",
  "[data-drop-window-id]",
  "[data-drop-taskbar-window]",
  "[data-drop-app]",
].join(",");

/** Marks the element the controller highlights while it is the active drop target. */
export const DROP_ACTIVE_ATTRIBUTE = "data-drop-active";
/** Marks a scrollable element that scrolls while a drag hovers near its edge. */
export const DND_SCROLL_ATTRIBUTE = "data-dnd-scroll";

type Attributes = Record<string, string | undefined>;

export interface FolderDropOptions {
  /** The Explorer window that owns the target; set it to let a 1 s hover open the folder in that window. */
  windowId?: string;
  spring?: boolean;
  surface?: "desktop";
}

/** Props that make an element drop target for a folder. Spread them onto the element. */
export function folderDropProps(path: string, options: FolderDropOptions = {}): Attributes {
  return {
    "data-drop-folder": path,
    "data-drop-owner-window": options.windowId,
    "data-drop-spring": options.spring ? "true" : undefined,
    "data-drop-surface": options.surface,
  };
}

/** Props for an app window frame. */
export function windowDropProps(windowId: string, appId: AppId): Attributes {
  return { "data-drop-window-id": windowId, "data-drop-window-app": appId };
}

/** Props for a taskbar button that represents a window. */
export function taskbarDropProps(windowId: string): Attributes {
  return { "data-drop-taskbar-window": windowId };
}

/** Props for a desktop icon that launches an app. */
export function appDropProps(appId: AppId): Attributes {
  return { "data-drop-app": appId };
}

export interface FoundDropZone {
  zone: DropZone;
  element: Element;
}

function readZone(element: Element): DropZone | null {
  const dataset = (element as HTMLElement).dataset ?? {};

  if (dataset.dropFolder !== undefined) {
    return {
      kind: "folder",
      path: dataset.dropFolder,
      surface: dataset.dropSurface === "desktop" ? "desktop" : undefined,
      windowId: dataset.dropOwnerWindow || undefined,
      spring: dataset.dropSpring === "true",
    };
  }

  if (dataset.dropWindowId !== undefined && dataset.dropWindowApp) {
    return { kind: "window", windowId: dataset.dropWindowId, appId: dataset.dropWindowApp as AppId };
  }

  if (dataset.dropTaskbarWindow !== undefined) {
    return { kind: "taskbar", windowId: dataset.dropTaskbarWindow };
  }

  if (dataset.dropApp !== undefined) {
    return { kind: "app", appId: dataset.dropApp as AppId };
  }

  return null;
}

/**
 * Shell surfaces that sit over the desktop without being drop targets: the
 * taskbar, Start and the flyouts (the tray's quick settings, calendar and the
 * rest all carry `w11-flyout`). A pointer over one of them is over nothing,
 * not over the desktop behind it. Add `data-dnd-barrier` to any other overlay.
 */
const BARRIER_SELECTOR = "[data-dnd-barrier], .taskbar, .w11-start, .w11-flyout, .context-menu, .open-with-overlay";

/**
 * The drop zone under the pointer. `elements` is document.elementsFromPoint
 * (top-most first); the nearest tagged ancestor of the top-most element wins,
 * so a folder inside an Explorer window beats the window around it.
 */
export function findDropZone(elements: Element[]): FoundDropZone | null {
  for (const element of elements) {
    if ((element as HTMLElement).closest?.("[data-dnd-ignore]")) {
      continue;
    }

    const tagged = element.closest(DROP_ZONE_SELECTOR);
    const barrier = element.closest(BARRIER_SELECTOR);

    // Something solid with nothing to drop on: stop here rather than reach through to the desktop. A barrier
    // inside a zone (a flyout mounted in a window or on the desktop surface) shuts that zone out too, while a
    // zone inside a barrier (a taskbar button) is still a zone.
    if (barrier && (!tagged || (barrier !== tagged && tagged.contains(barrier)))) {
      return null;
    }

    if (!tagged) {
      continue;
    }

    const zone = readZone(tagged);

    if (zone) {
      return { zone, element: tagged };
    }
  }

  return null;
}

/** Stable identity of a zone, used to tell "still over the same folder" from "moved to another". */
export function getZoneKey(zone: DropZone | null) {
  if (!zone) return "none";

  switch (zone.kind) {
    case "folder":
      return `folder:${zone.path}@${zone.windowId ?? ""}:${zone.surface ?? ""}`;
    case "window":
      return `window:${zone.windowId}`;
    case "taskbar":
      return `taskbar:${zone.windowId}`;
    case "app":
      return `app:${zone.appId}`;
  }
}
