import { useEffect, useRef } from "react";
import { validateFileName } from "@/lib/file-names";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";

interface InlineRenameInputProps {
  /** The name as shown (a shortcut's without .lnk). */
  initialName: string;
  onCommit: (nextName: string) => void;
  onCancel: () => void;
  className?: string;
  /** Wrap long names over two lines, as the desktop does. */
  multiline?: boolean;
  ariaLabel?: string;
}

/**
 * The text box that replaces a name while renaming (F2): Enter keeps the new
 * name, Escape and clicking away from an invalid one go back, and only the part
 * before the extension is selected so typing keeps ".txt".
 */
export function InlineRenameInput({ initialName, onCommit, onCancel, className, multiline = false, ariaLabel = "Rename" }: InlineRenameInputProps) {
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const field = fieldRef.current;

    if (!field) {
      return;
    }

    field.focus();
    const dot = initialName.lastIndexOf(".");
    field.setSelectionRange(0, dot > 0 ? dot : initialName.length);
  }, [initialName]);

  const finish = (action: () => void) => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    action();
  };

  const tryCommit = (value: string, reportErrors: boolean) => {
    const trimmed = value.trim();
    const error = trimmed === initialName ? null : validateFileName(trimmed);

    if (error) {
      if (reportErrors) {
        // Like Windows: say what is wrong and keep the box open.
        toast(error, "error");
        fieldRef.current?.focus();
      } else {
        finish(onCancel);
      }
      return;
    }

    finish(() => onCommit(trimmed));
  };

  const shared = {
    ref: fieldRef,
    className: cn("inline-rename", multiline && "inline-rename--multiline", className),
    defaultValue: initialName,
    "aria-label": ariaLabel,
    spellCheck: false,
    autoComplete: "off",
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
    onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
    onDoubleClick: (event: React.MouseEvent) => event.stopPropagation(),
    onContextMenu: (event: React.MouseEvent) => event.stopPropagation(),
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => tryCommit(event.currentTarget.value, false),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Typing a name must not trigger the icon or file shortcuts behind it.
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        tryCommit(event.currentTarget.value, true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(onCancel);
      }
    },
  };

  return multiline ? <textarea {...shared} rows={2} /> : <input {...shared} />;
}
