import { DND_SCROLL_ATTRIBUTE, DROP_ACTIVE_ATTRIBUTE, findDropZone, getZoneKey } from "@/lib/dnd/dom";
import { useDragStore, type DragHover } from "@/lib/dnd/drag-store";
import { readModifiers } from "@/lib/dnd/operation";
import { resolveDropPlan } from "@/lib/dnd/resolve";
import type { DragItem, DragModifiers, DragOperation, DragOrigin, DropPlan } from "@/lib/dnd/types";
import type { AppId, FileSystemRecord } from "@/types/system";

/*
 * One pointer-events drag controller for every file drag: desktop icons,
 * Explorer items, anything else that arms it. It owns the gesture (threshold,
 * touch long-press, modifier keys, Escape, auto-scroll, hover timers, drop
 * highlighting) and leaves the effects to the environment that the shell
 * configures, so it can be tested without any UI.
 */

/** Pixels the pointer must travel before a mouse or pen press becomes a drag (Windows uses 4). */
export const DRAG_START_DISTANCE = 4;
/** How long a finger holds still on an item before the drag starts, so scrolling still works. */
export const TOUCH_HOLD_MS = 320;
const TOUCH_HOLD_SLOP = 10;
/** Hovering a taskbar button this long brings its window forward, as in Windows. */
export const TASKBAR_HOVER_MS = 600;
/** Hovering a folder this long opens it (spring-loaded folders). */
export const SPRING_OPEN_MS = 1000;
const SCROLL_EDGE = 44;
const SCROLL_MAX_SPEED = 20;

export interface DragEnvironment {
  getNodes: () => FileSystemRecord;
  /** The folder an Explorer window currently shows. */
  explorerPathOf: (windowId: string) => string | undefined;
  transfer: (paths: string[], destination: string, operation: DragOperation, point: { x: number; y: number }) => unknown;
  openWith: (request: { appId: AppId; windowId?: string; paths: string[] }) => void;
  springOpen: (windowId: string, path: string) => void;
  activateWindow: (windowId: string) => void;
  /** Desktop only: move icons to the grid cell under the pointer. */
  reposition: (drop: { items: DragItem[]; x: number; y: number; grab: { x: number; y: number } }) => void;
  /** Right-button drag: show "Move here / Copy here / Create shortcuts here / Cancel". */
  chooseOperation: (choice: { x: number; y: number; destination: string; paths: string[] }) => void;
}

const defaultEnvironment: DragEnvironment = {
  getNodes: () => ({}),
  explorerPathOf: () => undefined,
  transfer: () => undefined,
  openWith: () => undefined,
  springOpen: () => undefined,
  activateWindow: () => undefined,
  reposition: () => undefined,
  chooseOperation: () => undefined,
};

/** Each part of the shell that handles some drag effects adds a layer; later layers win. */
const environmentLayers: Array<Partial<DragEnvironment>> = [];

/**
 * Provide some of the controller's effects. Returns a function that takes that
 * layer back out, so it works as an effect cleanup in any order.
 */
export function configureDragEnvironment(partial: Partial<DragEnvironment>) {
  environmentLayers.push(partial);

  return () => {
    const index = environmentLayers.indexOf(partial);

    if (index >= 0) {
      environmentLayers.splice(index, 1);
    }
  };
}

function getEnvironment(): DragEnvironment {
  return Object.assign({}, defaultEnvironment, ...environmentLayers) as DragEnvironment;
}

export interface ArmDragOptions {
  event: {
    clientX: number;
    clientY: number;
    pointerId: number;
    pointerType: string;
    button: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey?: boolean;
  };
  items: DragItem[];
  origin: DragOrigin;
  originWindowId?: string;
  /** Pointer offset inside the grabbed icon, in pixels (desktop repositioning). */
  grab?: { x: number; y: number };
  /** Called once when the press turns into a real drag. */
  onStart?: () => void;
}

interface Gesture {
  options: ArmDragOptions;
  pointerId: number;
  pointerType: string;
  button: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  modifiers: DragModifiers;
}

interface ActiveState {
  zoneKey: string;
  plan: DropPlan;
  hover: DragHover | null;
  hoverTimer: number | null;
  scroll: { element: HTMLElement; vx: number; vy: number } | null;
  frame: number | null;
  pointerCaptured: boolean;
}

let armed: (Gesture & { holdTimer: number | null }) | null = null;
let active: (Gesture & ActiveState) | null = null;
let highlighted: Element | null = null;

const schedule = (callback: () => void) =>
  typeof requestAnimationFrame === "function" ? requestAnimationFrame(callback) : window.setTimeout(callback, 16);
const unschedule = (handle: number) =>
  typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(handle) : window.clearTimeout(handle);

export function isFileDragActive() {
  return active !== null;
}

/** Press on an item: becomes a drag after a few pixels (mouse, pen) or a long press (touch). */
export function armFileDrag(options: ArmDragOptions) {
  const { event } = options;

  // Left button for everything; right button for mouse drags that ask what to do on release.
  if (options.items.length === 0 || (event.button !== 0 && !(event.button === 2 && event.pointerType === "mouse"))) {
    return;
  }

  abortGesture();

  armed = {
    options,
    pointerId: event.pointerId,
    pointerType: event.pointerType || "mouse",
    button: event.button,
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
    modifiers: readModifiers(event),
    holdTimer: null,
  };

  if (armed.pointerType === "touch") {
    armed.holdTimer = window.setTimeout(() => {
      if (armed) {
        startDragging();
      }
    }, TOUCH_HOLD_MS);
  }

  addListeners();
}

/** Cancel whatever is in progress without dropping. */
export function cancelFileDrag() {
  abortGesture();
}

function addListeners() {
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerCancel);
  window.addEventListener("keydown", handleKey, true);
  window.addEventListener("keyup", handleKey, true);
  window.addEventListener("blur", handleBlur);
  document.addEventListener("dragstart", preventDefault, true);
  document.addEventListener("selectstart", preventWhileDragging, true);
  document.addEventListener("contextmenu", handleContextMenu, true);
}

function removeListeners() {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerCancel);
  window.removeEventListener("keydown", handleKey, true);
  window.removeEventListener("keyup", handleKey, true);
  window.removeEventListener("blur", handleBlur);
  document.removeEventListener("dragstart", preventDefault, true);
  document.removeEventListener("selectstart", preventWhileDragging, true);
  document.removeEventListener("contextmenu", handleContextMenu, true);
}

function preventDefault(event: Event) {
  event.preventDefault();
}

function preventWhileDragging(event: Event) {
  if (active) {
    event.preventDefault();
  }
}

/** A finger that is dragging must not also scroll the page. */
function blockTouchScroll(event: TouchEvent) {
  if (event.cancelable) {
    event.preventDefault();
  }
}

function handleContextMenu(event: Event) {
  if (active || (armed && armed.pointerType === "touch")) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** Releasing a right-button drag makes the browser open its context menu; swallow that one. */
function blockContextMenuBriefly() {
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener("contextmenu", swallow, true);
  window.setTimeout(() => document.removeEventListener("contextmenu", swallow, true), 250);
}

function handleBlur() {
  abortGesture();
}

function handlePointerMove(event: PointerEvent) {
  const gesture = active ?? armed;

  if (!gesture || event.pointerId !== gesture.pointerId) {
    return;
  }

  gesture.x = event.clientX;
  gesture.y = event.clientY;
  gesture.modifiers = readModifiers(event);

  // The button came up somewhere we never heard about (outside the window): don't leave a drag stuck.
  const mask = gesture.button === 2 ? 2 : 1;
  if (gesture.pointerType === "mouse" && event.buttons !== undefined && (event.buttons & mask) === 0) {
    abortGesture();
    return;
  }

  if (active) {
    requestEvaluate();
    return;
  }

  const distance = Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY);

  if (gesture.pointerType === "touch") {
    // Moving before the hold finished means the visitor is scrolling.
    if (distance > TOUCH_HOLD_SLOP) {
      abortGesture();
    }
    return;
  }

  if (distance >= DRAG_START_DISTANCE) {
    startDragging();
  }
}

function handlePointerUp(event: PointerEvent) {
  const gesture = active ?? armed;

  if (!gesture || event.pointerId !== gesture.pointerId) {
    return;
  }

  if (!active) {
    abortGesture();
    return;
  }

  active.x = event.clientX;
  active.y = event.clientY;
  active.modifiers = readModifiers(event);
  finishDrag(true);
}

function handlePointerCancel(event: PointerEvent) {
  const gesture = active ?? armed;

  if (gesture && event.pointerId === gesture.pointerId) {
    abortGesture();
  }
}

function handleKey(event: KeyboardEvent) {
  if (!active) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    abortGesture();
    return;
  }

  if (event.key === "Control" || event.key === "Shift" || event.key === "Alt" || event.key === "Meta") {
    // Alt on its own would focus the browser's menu bar; keep it for the drag.
    event.preventDefault();
    active.modifiers = readModifiers(event);
    evaluate();
  }
}

function startDragging() {
  if (!armed) {
    return;
  }

  const gesture = armed;

  if (gesture.holdTimer !== null) {
    window.clearTimeout(gesture.holdTimer);
  }

  armed = null;
  active = {
    ...gesture,
    zoneKey: "none",
    plan: { kind: "none" },
    hover: null,
    hoverTimer: null,
    scroll: null,
    frame: null,
    pointerCaptured: false,
  };

  document.body.classList.add("is-file-dragging");
  document.addEventListener("touchmove", blockTouchScroll, { passive: false });
  window.getSelection?.()?.removeAllRanges();

  // Keep hearing the pointer if it leaves the browser window, so the release still ends the drag.
  if (gesture.pointerType !== "touch") {
    try {
      document.documentElement.setPointerCapture(gesture.pointerId);
      active.pointerCaptured = true;
    } catch {
      /* Not supported, or the pointer is already gone. */
    }
  }

  if (gesture.pointerType === "touch") {
    navigator.vibrate?.(8);
  }

  gesture.options.onStart?.();
  evaluate();
}

function requestEvaluate() {
  if (!active || active.frame !== null) {
    return;
  }

  active.frame = schedule(() => {
    if (active) {
      active.frame = null;
      evaluate();
    }
  });
}

function setHighlight(element: Element | null) {
  if (highlighted && highlighted !== element) {
    highlighted.removeAttribute(DROP_ACTIVE_ATTRIBUTE);
  }

  // Re-asserted on every move: React can rewrite attributes it owns, never this one, but a re-render may swap the element.
  if (element && element.getAttribute(DROP_ACTIVE_ATTRIBUTE) !== "true") {
    element.setAttribute(DROP_ACTIVE_ATTRIBUTE, "true");
  }

  highlighted = element;
}

function clearHoverTimer(drag: ActiveState) {
  if (drag.hoverTimer !== null) {
    window.clearTimeout(drag.hoverTimer);
    drag.hoverTimer = null;
  }

  drag.hover = null;
}

function startHoverTimer(drag: ActiveState, hover: DragHover, delay: number, action: () => void) {
  drag.hover = hover;
  drag.hoverTimer = window.setTimeout(() => {
    drag.hoverTimer = null;
    drag.hover = null;
    action();
    // The window or folder changed under a pointer that has not moved: look again.
    window.setTimeout(() => {
      if (active === drag) {
        evaluate();
      }
    }, 60);
  }, delay);
}

function edgeSpeed(distanceFromEdge: number) {
  const closeness = Math.min(1, Math.max(0, (SCROLL_EDGE - distanceFromEdge) / SCROLL_EDGE));
  return Math.max(2, Math.round(closeness * SCROLL_MAX_SPEED));
}

function measureScroll(element: HTMLElement, x: number, y: number) {
  const rect = element.getBoundingClientRect();
  let vx = 0;
  let vy = 0;

  if (y - rect.top < SCROLL_EDGE && element.scrollTop > 0) vy = -edgeSpeed(y - rect.top);
  else if (rect.bottom - y < SCROLL_EDGE && element.scrollTop + element.clientHeight < element.scrollHeight - 1) {
    vy = edgeSpeed(rect.bottom - y);
  }

  if (x - rect.left < SCROLL_EDGE && element.scrollLeft > 0) vx = -edgeSpeed(x - rect.left);
  else if (rect.right - x < SCROLL_EDGE && element.scrollLeft + element.clientWidth < element.scrollWidth - 1) {
    vx = edgeSpeed(rect.right - x);
  }

  return { vx, vy };
}

function scrollTick() {
  const drag = active;

  if (!drag?.scroll) {
    return;
  }

  drag.scroll.element.scrollBy?.(drag.scroll.vx, drag.scroll.vy);
  evaluate();

  if (active === drag && drag.scroll) {
    drag.frame = schedule(() => {
      if (active === drag) {
        drag.frame = null;
        scrollTick();
      }
    });
  }
}

/** Work out what is under the pointer, what dropping there would do, and show it. */
function evaluate() {
  const drag = active;

  if (!drag) {
    return;
  }

  const env = getEnvironment();
  const elements = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(drag.x, drag.y) : [];
  const found = findDropZone(elements);
  const zone = found?.zone ?? null;
  const plan = resolveDropPlan({
    items: drag.options.items,
    origin: drag.options.origin,
    zone,
    modifiers: drag.modifiers,
    button: drag.button,
    nodes: env.getNodes(),
    explorerPathOf: env.explorerPathOf,
  });

  drag.plan = plan;
  setHighlight(found && plan.kind !== "none" && plan.kind !== "reposition" ? found.element : null);

  const zoneKey = getZoneKey(zone);

  if (zoneKey !== drag.zoneKey) {
    clearHoverTimer(drag);
    drag.zoneKey = zoneKey;

    if (zone?.kind === "taskbar") {
      startHoverTimer(drag, "restore-window", TASKBAR_HOVER_MS, () => getEnvironment().activateWindow(zone.windowId));
    } else if (zone?.kind === "folder" && zone.spring && zone.windowId && plan.kind !== "none") {
      startHoverTimer(drag, "open-folder", SPRING_OPEN_MS, () => getEnvironment().springOpen(zone.windowId as string, zone.path));
    }
  }

  // Auto-scroll when the pointer rests near the edge of a scrollable area.
  const scrollElement = elements
    .map((element) => element.closest<HTMLElement>(`[${DND_SCROLL_ATTRIBUTE}]`))
    .find((element): element is HTMLElement => element !== null);
  const velocity = scrollElement ? measureScroll(scrollElement, drag.x, drag.y) : { vx: 0, vy: 0 };
  const wasScrolling = drag.scroll !== null;

  drag.scroll = scrollElement && (velocity.vx !== 0 || velocity.vy !== 0) ? { element: scrollElement, ...velocity } : null;

  if (drag.scroll && !wasScrolling) {
    if (drag.frame !== null) {
      unschedule(drag.frame);
    }
    drag.frame = schedule(() => {
      if (active === drag) {
        drag.frame = null;
        scrollTick();
      }
    });
  }

  useDragStore.setState({
    session: {
      items: drag.options.items,
      origin: drag.options.origin,
      originWindowId: drag.options.originWindowId,
      pointerType: drag.pointerType,
      button: drag.button,
      x: drag.x,
      y: drag.y,
      grab: drag.options.grab ?? { x: 0, y: 0 },
      plan,
      overZone: found !== null,
      hover: drag.hover,
    },
  });
}

function suppressClickAfterDrag() {
  const swallow = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };

  window.addEventListener("click", swallow, true);
  window.setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}

function teardown() {
  const drag = active;

  if (drag) {
    clearHoverTimer(drag);

    if (drag.frame !== null) {
      unschedule(drag.frame);
    }

    if (drag.pointerCaptured) {
      try {
        document.documentElement.releasePointerCapture(drag.pointerId);
      } catch {
        /* Already released. */
      }
    }
  }

  if (armed?.holdTimer != null) {
    window.clearTimeout(armed.holdTimer);
  }

  setHighlight(null);
  document.body.classList.remove("is-file-dragging");
  document.removeEventListener("touchmove", blockTouchScroll);
  removeListeners();
  useDragStore.setState({ session: null });
  active = null;
  armed = null;
}

function abortGesture() {
  if (!armed && !active) {
    return;
  }

  const wasDragging = active !== null;
  teardown();

  if (wasDragging) {
    suppressClickAfterDrag();
  }
}

function finishDrag(drop: boolean) {
  const drag = active;

  if (!drag) {
    teardown();
    return;
  }

  if (drop) {
    // Judge the drop by where and how the pointer is right now, not by the last animation frame.
    evaluate();
  }

  const { plan, x, y } = drag;
  const items = drag.options.items;
  const grab = drag.options.grab ?? { x: 0, y: 0 };
  const rightButton = drag.button === 2;

  teardown();
  suppressClickAfterDrag();

  if (rightButton) {
    // Windows opens the context menu on release; our own menu replaces it.
    blockContextMenuBriefly();
  }

  if (!drop) {
    return;
  }

  switch (plan.kind) {
    case "transfer":
      getEnvironment().transfer(plan.paths, plan.destination, plan.operation, { x, y });
      return;
    case "choose":
      getEnvironment().chooseOperation({ x, y, destination: plan.destination, paths: plan.paths });
      return;
    case "open-with":
      getEnvironment().openWith({ appId: plan.appId, windowId: plan.windowId, paths: plan.paths });
      return;
    case "reposition":
      getEnvironment().reposition({ items, x, y, grab });
      return;
    case "none":
      return;
  }
}
