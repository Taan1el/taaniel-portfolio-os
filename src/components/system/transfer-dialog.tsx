import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FilesIcon, FolderIcon } from "@/components/icons/apps";
import { DESKTOP_PATH } from "@/data/desktop-seed";
import { transferItems } from "@/lib/file-actions";
import { listFolderChoices } from "@/lib/folder-tree";
import { getDisplayName } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useTransferDialogStore, type TransferRequest } from "@/stores/transfer-dialog-store";

function TransferDialogInner({ request, onClose }: { request: TransferRequest; onClose: () => void }) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const choices = useMemo(() => listFolderChoices(nodes, request.paths, request.operation), [nodes, request]);
  const enabled = useMemo(() => choices.filter((choice) => !choice.disabledReason), [choices]);
  const [selected, setSelected] = useState<string | null>(
    () => enabled.find((choice) => choice.path === DESKTOP_PATH)?.path ?? enabled[0]?.path ?? null
  );
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const verb = request.operation === "move" ? "Move" : "Copy";
  // Read once: the item is gone from the listing by the time the closing animation plays.
  const [subject] = useState(() => {
    const first = nodes[request.paths[0]];
    const count = request.paths.length;
    return count === 1 && first ? `"${getDisplayName(first)}"` : `${count} ${count === 1 ? "item" : "items"}`;
  });

  // Focus moves into the dialog and goes back to where it was when the dialog closes. The menu item
  // that opened the dialog is gone by then, so the item the dialog was about is the next best place.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstPath = request.paths[0];
    dialogRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')?.focus();

    return () => {
      if (previous?.isConnected && previous !== document.body) {
        previous.focus();
        return;
      }

      Array.from(document.querySelectorAll<HTMLElement>("[data-path]"))
        .find((element) => element.dataset.path === firstPath)
        ?.focus({ preventScroll: true });
    };
  }, [request.paths]);

  const confirm = async () => {
    if (!selected) {
      return;
    }

    onClose();
    // Nobody pointed at a spot, so anything arriving on the desktop takes the first free cell.
    await transferItems(request.paths, selected, request.operation);
  };

  const moveSelection = (offset: number | "first" | "last") => {
    if (enabled.length === 0) {
      return;
    }

    const index = enabled.findIndex((choice) => choice.path === selected);
    const next =
      offset === "first" ? 0 : offset === "last" ? enabled.length - 1 : Math.min(enabled.length - 1, Math.max(0, index + offset));

    setSelected(enabled[next].path);
    window.requestAnimationFrame(() =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("[data-folder-path]") ?? [])
        .find((element) => element.dataset.folderPath === enabled[next].path)
        ?.focus()
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === "Tab") {
      // Keep Tab inside the dialog. Only what Tab can reach counts: the folder list is one tab stop (the
      // selected option, arrows move within it), so the other options must not look like places to land.
      const tabbable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])') ?? []);

      if (tabbable.length === 0) {
        event.preventDefault();
        return;
      }

      const current = tabbable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? current - 1 : current + 1;

      if (current === -1 || next < 0 || next >= tabbable.length) {
        event.preventDefault();
        const target = current === -1 ? (event.shiftKey ? tabbable.length - 1 : 0) : (next + tabbable.length) % tabbable.length;
        tabbable[target].focus();
      }
    }
  };

  return (
    <div className="open-with-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="transfer-dialog"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.16, ease: [0, 0, 0, 1] }}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="transfer-dialog__title">
          {verb} {subject} to…
        </h2>

        <div className="transfer-dialog__list" role="listbox" aria-label="Destination folder">
          {choices.map((choice) => {
            const Icon = choice.path === "/" ? FilesIcon : FolderIcon;
            const active = choice.path === selected;

            return (
              <button
                key={choice.path}
                type="button"
                role="option"
                aria-selected={active}
                aria-disabled={choice.disabledReason ? true : undefined}
                data-folder-path={choice.path}
                tabIndex={active ? 0 : -1}
                title={choice.disabledReason}
                className={cn("transfer-dialog__folder", active && "is-selected", choice.disabledReason && "is-disabled")}
                style={{ paddingInlineStart: 10 + choice.depth * 18 }}
                onClick={() => !choice.disabledReason && setSelected(choice.path)}
                onDoubleClick={() => !choice.disabledReason && void confirm()}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveSelection(1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveSelection(-1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    moveSelection("first");
                  } else if (event.key === "End") {
                    event.preventDefault();
                    moveSelection("last");
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    void confirm();
                  }
                }}
              >
                <Icon size={18} />
                <span>{choice.label}</span>
              </button>
            );
          })}
        </div>

        <div className="transfer-dialog__actions">
          <button type="button" className="w11-button w11-button--accent" disabled={!selected} onClick={() => void confirm()}>
            {verb}
          </button>
          <button type="button" className="w11-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** "Move to..." / "Copy to...": pick a folder instead of dragging, for touch and keyboard. */
export function TransferDialog() {
  const request = useTransferDialogStore((state) => state.request);
  const close = useTransferDialogStore((state) => state.close);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>{request ? <TransferDialogInner key={request.paths.join("|")} request={request} onClose={close} /> : null}</AnimatePresence>,
    document.body
  );
}
