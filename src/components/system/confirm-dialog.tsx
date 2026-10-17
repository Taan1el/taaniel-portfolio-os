import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useConfirmDialogStore, type ConfirmRequest } from "@/stores/confirm-dialog-store";

function ConfirmDialogInner({ request, onAnswer }: { request: ConfirmRequest; onAnswer: (accepted: boolean) => void }) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Cancel has the focus, so a stray Enter never deletes anything; it goes back to where it was when the
  // dialog closes. The menu item that asked is gone by then, so the desktop is the next best place.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    return () => {
      if (previous?.isConnected && previous !== document.body) {
        previous.focus();
        return;
      }

      document.querySelector<HTMLElement>(".desktop-surface")?.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onAnswer(false);
      return;
    }

    if (event.key === "Tab") {
      // The dialog is modal: Tab goes round its two buttons and never out to what is behind it.
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLElement);
      const next = current === -1 ? 0 : (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;

      event.preventDefault();
      buttons[next]?.focus();
    }
  };

  return (
    <div className="open-with-overlay" onPointerDown={(event) => event.target === event.currentTarget && onAnswer(false)}>
      <motion.div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="confirm-dialog"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.16, ease: [0, 0, 0, 1] }}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="confirm-dialog__title">
          {request.title}
        </h2>
        <p id={messageId} className="confirm-dialog__message">
          {request.message}
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="w11-button w11-button--accent" onClick={() => onAnswer(true)}>
            {request.confirmLabel}
          </button>
          <button ref={cancelRef} type="button" className="w11-button" onClick={() => onAnswer(false)}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** The shell's own "Are you sure?" (Empty Recycle Bin, Shift+Delete). Mounted once, next to the drag layer. */
export function ConfirmDialog() {
  const request = useConfirmDialogStore((state) => state.request);
  const answer = useConfirmDialogStore((state) => state.answer);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>{request ? <ConfirmDialogInner key={request.id} request={request} onAnswer={answer} /> : null}</AnimatePresence>,
    document.body
  );
}
