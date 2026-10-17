import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { boxFromPoints, combineMarqueeSelection, getBoxSize, getMarqueeHits, type Box } from "@/lib/marquee";

/** Pixels the pointer must travel before a press on empty space becomes a rubber band. */
const START_DISTANCE = 4;
const SCROLL_EDGE = 36;
const SCROLL_SPEED = 14;

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface UseMarqueeSelectionOptions {
  /** The element the rectangle is drawn in and measured against. It scrolls with the content. */
  contentRef: RefObject<HTMLElement | null>;
  /** The scrolling ancestor, when the content scrolls: the band auto-scrolls it near the edges. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Selects the items inside `contentRef`. */
  itemSelector: string;
  getItemId: (element: HTMLElement) => string | null;
  getSelection: () => string[];
  onSelectionChange: (ids: string[]) => void;
  /** Whether a press on this element may start a rubber band. Defaults to anything that isn't an item. */
  canStart?: (target: HTMLElement, event: ReactPointerEvent<HTMLElement>) => boolean;
  enabled?: boolean;
}

interface Gesture {
  pointerId: number;
  start: { x: number; y: number };
  client: { x: number; y: number };
  startClient: { x: number; y: number };
  base: string[];
  additive: boolean;
  active: boolean;
  frame: number | null;
  scrollVelocity: number;
}

/**
 * Rubber-band selection: press on empty space and drag a rectangle; whatever it
 * touches is selected, Ctrl flips items relative to the old selection. Mouse and
 * pen only (a touch drag on empty space scrolls). Attach `onPointerDown` to the
 * surface and draw `rect` inside `contentRef`.
 */
export function useMarqueeSelection(options: UseMarqueeSelectionOptions) {
  const [rect, setRect] = useState<MarqueeRect | null>(null);
  const optionsRef = useRef(options);
  const gestureRef = useRef<Gesture | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  optionsRef.current = options;

  const evaluate = useCallback(() => {
    const gesture = gestureRef.current;
    const { contentRef, itemSelector, getItemId, getSelection, onSelectionChange } = optionsRef.current;
    const content = contentRef.current;

    if (!gesture || !gesture.active || !content) {
      return;
    }

    const contentBox = content.getBoundingClientRect();
    const current = { x: gesture.client.x - contentBox.left, y: gesture.client.y - contentBox.top };
    const marquee = boxFromPoints(gesture.start, current);
    const items = Array.from(content.querySelectorAll<HTMLElement>(itemSelector)).flatMap((element) => {
      const id = getItemId(element);

      if (!id) {
        return [];
      }

      const box = element.getBoundingClientRect();
      const relative: Box = {
        left: box.left - contentBox.left,
        top: box.top - contentBox.top,
        right: box.right - contentBox.left,
        bottom: box.bottom - contentBox.top,
      };

      return [{ id, box: relative }];
    });
    const next = combineMarqueeSelection(gesture.base, getMarqueeHits(items, marquee), gesture.additive);
    const previous = getSelection();

    if (next.length !== previous.length || next.some((id, index) => id !== previous[index])) {
      onSelectionChange(next);
    }

    const size = getBoxSize(marquee);
    setRect({ left: marquee.left, top: marquee.top, width: size.width, height: size.height });
  }, []);

  const scrollTick = useCallback(() => {
    const gesture = gestureRef.current;
    const scroller = optionsRef.current.scrollRef?.current;

    if (!gesture || !scroller || gesture.scrollVelocity === 0) {
      if (gesture) gesture.frame = null;
      return;
    }

    scroller.scrollTop += gesture.scrollVelocity;
    evaluate();
    gesture.frame = requestAnimationFrame(scrollTick);
  }, [evaluate]);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    gestureRef.current = null;
    setRect(null);
  }, []);

  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const { enabled = true, contentRef, itemSelector, canStart, getSelection } = optionsRef.current;
      const target = event.target as HTMLElement;
      const content = contentRef.current;

      if (!enabled || !content || event.button !== 0 || event.pointerType === "touch" || gestureRef.current) {
        return;
      }

      if (!(canStart ? canStart(target, event) : !target.closest(itemSelector))) {
        return;
      }

      const contentBox = content.getBoundingClientRect();
      const additive = event.ctrlKey || event.metaKey;
      const gesture: Gesture = {
        pointerId: event.pointerId,
        start: { x: event.clientX - contentBox.left, y: event.clientY - contentBox.top },
        client: { x: event.clientX, y: event.clientY },
        startClient: { x: event.clientX, y: event.clientY },
        base: additive ? getSelection() : [],
        additive,
        active: false,
        frame: null,
        scrollVelocity: 0,
      };

      gestureRef.current = gesture;

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== gesture.pointerId) {
          return;
        }

        gesture.client = { x: moveEvent.clientX, y: moveEvent.clientY };

        if (moveEvent.buttons !== undefined && (moveEvent.buttons & 1) === 0 && moveEvent.pointerType === "mouse") {
          stop();
          return;
        }

        if (!gesture.active) {
          if (Math.hypot(gesture.client.x - gesture.startClient.x, gesture.client.y - gesture.startClient.y) < START_DISTANCE) {
            return;
          }

          gesture.active = true;
          document.body.classList.add("is-marquee-selecting");
          window.getSelection?.()?.removeAllRanges();
        }

        const scroller = optionsRef.current.scrollRef?.current;

        if (scroller) {
          const bounds = scroller.getBoundingClientRect();
          const near = gesture.client.y - bounds.top < SCROLL_EDGE ? -SCROLL_SPEED : bounds.bottom - gesture.client.y < SCROLL_EDGE ? SCROLL_SPEED : 0;
          const canScroll =
            near < 0 ? scroller.scrollTop > 0 : near > 0 ? scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1 : false;

          gesture.scrollVelocity = canScroll ? near : 0;

          if (gesture.scrollVelocity !== 0 && gesture.frame === null) {
            gesture.frame = requestAnimationFrame(scrollTick);
          }
        }

        evaluate();
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== gesture.pointerId) {
          return;
        }

        const wasActive = gesture.active;
        stop();

        if (wasActive) {
          // The release would otherwise count as a click on the background and clear what was just selected.
          const swallow = (clickEvent: Event) => clickEvent.stopPropagation();
          window.addEventListener("click", swallow, true);
          window.setTimeout(() => window.removeEventListener("click", swallow, true), 0);
        }
      };

      const handleKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape" && gesture.active) {
          keyEvent.stopPropagation();
          optionsRef.current.onSelectionChange(gesture.base);
          stop();
        }
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      window.addEventListener("keydown", handleKey, true);

      cleanupRef.current = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        window.removeEventListener("keydown", handleKey, true);
        document.body.classList.remove("is-marquee-selecting");

        if (gesture.frame !== null) {
          cancelAnimationFrame(gesture.frame);
        }
      };
    },
    [evaluate, scrollTick, stop]
  );

  return { rect, onPointerDown };
}
