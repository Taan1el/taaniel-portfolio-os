import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useIsPresent } from "framer-motion";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** The taskbar button that toggles a flyout carries `data-flyout-trigger="<id>"`. */
export function getFlyoutTrigger(triggerId: string) {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector<HTMLElement>(`[data-flyout-trigger="${triggerId}"]`);
}

export function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.closest("[hidden], [inert]")
  );
}

interface UseFlyoutOptions {
  open: boolean;
  /** Matches the trigger's data-flyout-trigger attribute. */
  triggerId: string;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Focused when the flyout opens; defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Behaviour shared by the taskbar flyouts (Quick Settings, the clock):
 * focus moves in on open, Tab stays inside, Escape closes and hands focus
 * back to the taskbar button, and a press anywhere else closes without
 * stealing focus from what was pressed. Any other close (a button inside that
 * launched an app, say) also hands focus to the taskbar button, provided the
 * flyout is rendered through AnimatePresence so it is still mounted to do so.
 */
export function useFlyout({ open, triggerId, panelRef, onClose, initialFocusRef }: UseFlyoutOptions) {
  const isPresent = useIsPresent();
  const onCloseRef = useRef(onClose);
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;

      if (!panel || panel.contains(document.activeElement)) {
        return;
      }

      const target = initialFocusRef?.current ?? getFocusableElements(panel)[0] ?? panel;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;

      if (event.key === "Escape") {
        onCloseRef.current();
        getFlyoutTrigger(triggerId)?.focus({ preventScroll: true });
        return;
      }

      if (event.key !== "Tab" || !panel || !panel.contains(document.activeElement)) {
        return;
      }

      const focusable = getFocusableElements(panel);
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target) || getFlyoutTrigger(triggerId)?.contains(target)) {
        return;
      }

      // Whatever was pressed takes focus itself; do not pull it back to the taskbar.
      pressedOutsideRef.current = true;
      onCloseRef.current();
    };

    // Capture phase: React forwards a synthetic stopPropagation() to the native event, so a
    // component that stops pointerdown (a desktop icon, a rename field) would never reach a
    // bubbling listener and the flyout would stay open over what was just pressed.
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [initialFocusRef, open, panelRef, triggerId]);

  // A flyout shown through AnimatePresence stays mounted for its exit, however it was closed
  // (an action that launched an app, a shortcut, another overlay opening). Focus left inside
  // it would fall to <body> when it unmounts, so hand it to the taskbar button first.
  useLayoutEffect(() => {
    if (isPresent) {
      pressedOutsideRef.current = false;
      return;
    }

    if (pressedOutsideRef.current) {
      return;
    }

    if (panelRef.current?.contains(document.activeElement)) {
      getFlyoutTrigger(triggerId)?.focus({ preventScroll: true });
    }
  }, [isPresent, panelRef, triggerId]);
}
