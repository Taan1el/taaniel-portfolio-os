import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import type { PasteRequest } from "@/components/apps/terminal/terminal-session";

interface TerminalPasteDialogProps {
  request: PasteRequest;
  onConfirm: () => void;
  onCancel: () => void;
}

const PREVIEW_LINES = 4;
const PREVIEW_WIDTH = 120;

export function describePaste({ review }: PasteRequest): { title: string; detail: string } {
  if (review.reason === "multiline") {
    return {
      title: `Paste ${review.lines} lines?`,
      detail: "Each line will run as a command, one after the other.",
    };
  }
  return {
    title: "Paste a large amount of text?",
    detail: `You are about to paste ${review.characters.toLocaleString("en")} characters.`,
  };
}

/** Windows Terminal's "are you sure you want to paste this" prompt. Cancel has focus, because pasting runs commands. */
export function TerminalPasteDialog({ request, onConfirm, onCancel }: TerminalPasteDialogProps) {
  const titleId = useId();
  const detailId = useId();
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const { title, detail } = describePaste(request);

  const preview = request.text
    .split(/\r\n|\r|\n/)
    .slice(0, PREVIEW_LINES)
    .map((line) => (line.length > PREVIEW_WIDTH ? `${line.slice(0, PREVIEW_WIDTH)}…` : line));
  const hidden = request.review.lines - preview.length;

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else if (event.key === "Tab") {
      // A modal dialog keeps Tab inside itself.
      event.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  };

  return (
    <div className="w11-terminal__scrim">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        className="w11-terminal__dialog"
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={detailId}>{detail}</p>
        <pre className="w11-terminal__dialog-preview" aria-label="Start of the text">
          {preview.join("\n")}
          {hidden > 0 ? `\n… and ${hidden} more ${hidden === 1 ? "line" : "lines"}` : ""}
        </pre>
        <div className="w11-terminal__dialog-actions">
          <button ref={confirmRef} type="button" className="w11-terminal__button is-primary" onClick={onConfirm}>
            Paste anyway
          </button>
          <button ref={cancelRef} type="button" className="w11-terminal__button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
