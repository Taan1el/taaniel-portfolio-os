import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';

export function getFocusable(panel: HTMLElement | null) {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

/**
 * Moves focus into a dialog or menu when it opens and hands it back to the
 * opener when it closes. With `trap`, Tab cycles inside the panel.
 */
export function useDialogFocus(panelRef: RefObject<HTMLElement | null>, { trap = true } = {}) {
  // A ref, so StrictMode's second effect run does not record the panel as its own opener.
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    openerRef.current ??= document.activeElement as HTMLElement | null;
    getFocusable(panel)[0]?.focus({ preventScroll: true });

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !trap) return;
      const items = getFocusable(panel);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    };

    panel?.addEventListener("keydown", handleTab);
    return () => {
      panel?.removeEventListener("keydown", handleTab);
      const opener = openerRef.current;
      requestAnimationFrame(() => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost && opener?.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, [panelRef, trap]);
}
