import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { openFileSystemPath } from "@/lib/launchers";
import { RUN_HISTORY_KEY, addToRunHistory, readRunHistory, resolveRunTarget } from "@/lib/run-command";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import "@/styles/run-dialog.css";

function RunInner({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState(() => readRunHistory(readLocalStorage(RUN_HISTORY_KEY)));
  const [text, setText] = useState(history[0] ?? "");
  const [error, setError] = useState("");
  useDialogFocus(dialogRef, { trap: true });

  // The hook lands on the first control, which is Close. Run opens ready to type.
  useEffect(() => inputRef.current?.focus(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return;

    const nodes = useFileSystemStore.getState().nodes;
    const { launchApp } = useSystemStore.getState();
    const target = resolveRunTarget(line, nodes);

    if (target.kind === "missing") {
      setError(`Taaniel OS cannot find "${line}". Check the spelling and try again.`);
      inputRef.current?.select();
      return;
    }

    const next = addToRunHistory(history, line);
    setHistory(next);
    writeLocalStorage(RUN_HISTORY_KEY, JSON.stringify(next));
    onClose();

    if (target.kind === "app") launchApp({ appId: target.appId, payload: target.payload });
    else if (target.kind === "path") openFileSystemPath(target.path, nodes, launchApp);
    else launchApp({ appId: "browser", payload: { externalUrl: target.url } });
  };

  return (
    <div className="run-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div
        ref={dialogRef}
        className="run-dialog w11-flyout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.14 }}
      >
        <header>
          <strong id="run-title">Run</strong>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <form onSubmit={submit}>
          <p className="run-dialog__intro">
            <LogoMark size={28} />
            Type the name of a program, folder, document or website, and Taaniel OS will open it for you.
          </p>
          <label className="run-dialog__field">
            <span>Open:</span>
            <input
              ref={inputRef}
              list="run-history"
              value={text}
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={error ? "run-error" : undefined}
              aria-invalid={Boolean(error)}
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                setText(event.target.value);
                setError("");
              }}
            />
            <datalist id="run-history">
              {history.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </label>
          {error ? (
            <p id="run-error" className="run-dialog__error" role="alert">
              {error}
            </p>
          ) : null}
          <footer>
            <button type="submit" className="w11-button w11-button--accent" disabled={!text.trim()}>
              OK
            </button>
            <button type="button" className="w11-button" onClick={onClose}>
              Cancel
            </button>
          </footer>
        </form>
      </motion.div>
    </div>
  );
}

export function RunDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return createPortal(<AnimatePresence>{open ? <RunInner onClose={onClose} /> : null}</AnimatePresence>, document.body);
}
