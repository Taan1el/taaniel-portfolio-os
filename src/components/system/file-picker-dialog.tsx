import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { File, Folder, FolderOpen } from "lucide-react";
import { listChildren } from "@/lib/filesystem";
import { useFilePickerStore } from "@/stores/file-picker-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { VirtualNode } from "@/types/system";

const ROOT_PATH = "/";

function joinPath(parent: string, name: string) {
  if (parent === "/") return `/${name}`;
  return `${parent}/${name}`;
}

function parentOf(path: string) {
  if (path === ROOT_PATH) return ROOT_PATH;
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return ROOT_PATH;
  return path.slice(0, idx);
}

export function FilePickerDialog() {
  const pending = useFilePickerStore((s) => s.pending);
  const resolve = useFilePickerStore((s) => s.resolve);
  const nodes = useFileSystemStore((s) => s.nodes);

  const [cwd, setCwd] = useState<string>(ROOT_PATH);
  const [selected, setSelected] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");

  // When a new request arrives, reset the dialog state.
  useEffect(() => {
    if (!pending) return;
    setCwd(pending.suggestedDirectory ?? ROOT_PATH);
    setSelected(null);
    setFilename(pending.suggestedName ?? "");
  }, [pending]);

  // Esc to cancel.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolve(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, resolve]);

  const accept = pending?.accept ?? [];
  const mode = pending?.mode ?? "open";

  const children = useMemo<VirtualNode[]>(() => {
    if (!pending) return [];
    const all = listChildren(nodes, cwd);
    return all.filter((node) => {
      if (node.kind === "directory") return true;
      if (accept.length === 0) return true;
      return accept.includes(node.extension.toLowerCase());
    });
  }, [cwd, nodes, pending, accept]);

  const canSubmit = useMemo(() => {
    if (!pending) return false;
    if (mode === "open") return Boolean(selected);
    return filename.trim().length > 0;
  }, [pending, mode, selected, filename]);

  const submit = () => {
    if (!pending) return;
    if (mode === "open") {
      if (!selected) return;
      resolve({ path: selected });
      return;
    }
    const cleaned = filename.trim();
    if (!cleaned) return;
    resolve({ path: joinPath(cwd, cleaned) });
  };

  const breadcrumb = cwd === ROOT_PATH ? "Root" : cwd;

  return (
    <AnimatePresence>
      {pending ? (
        <div
          className="open-with-overlay"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) resolve(null);
          }}
        >
          <motion.div
            className="file-picker-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="file-picker-dialog__header">
              <strong className="file-picker-dialog__title">{pending.title}</strong>
              <small className="file-picker-dialog__subtitle">{breadcrumb}</small>
            </div>

            <div className="file-picker-dialog__nav">
              <button
                type="button"
                className="file-picker-dialog__nav-btn"
                disabled={cwd === ROOT_PATH}
                onClick={() => setCwd(parentOf(cwd))}
              >
                <FolderOpen size={14} /> Up
              </button>
              {accept.length > 0 ? (
                <span className="file-picker-dialog__filter">
                  Showing: {accept.join(", ")}
                </span>
              ) : null}
            </div>

            <ul className="file-picker-dialog__list">
              {children.length === 0 ? (
                <li className="file-picker-dialog__empty">No matching items here.</li>
              ) : (
                children.map((node) => {
                  const isDir = node.kind === "directory";
                  const path = node.path;
                  const isSelected = !isDir && selected === path;
                  return (
                    <li key={path}>
                      <button
                        type="button"
                        className={`file-picker-dialog__item${
                          isSelected ? " is-selected" : ""
                        }`}
                        onClick={() => {
                          if (isDir) {
                            setCwd(path);
                            setSelected(null);
                          } else {
                            setSelected(path);
                            if (mode === "save") setFilename(node.name);
                          }
                        }}
                        onDoubleClick={() => {
                          if (isDir) return;
                          setSelected(path);
                          if (mode === "save") setFilename(node.name);
                          // Double-click on a file commits in open mode.
                          if (mode === "open") {
                            resolve({ path });
                          }
                        }}
                      >
                        <span className="file-picker-dialog__item-icon">
                          {isDir ? <Folder size={16} /> : <File size={16} />}
                        </span>
                        <span className="file-picker-dialog__item-label">{node.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {mode === "save" ? (
              <label className="file-picker-dialog__filename">
                <span>File name</span>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
              </label>
            ) : null}

            <div className="file-picker-dialog__actions">
              <button
                type="button"
                className="file-picker-dialog__btn"
                onClick={() => resolve(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="file-picker-dialog__btn is-primary"
                disabled={!canSubmit}
                onClick={submit}
              >
                {mode === "open" ? "Open" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** Imperative helpers — preferred by app code over reaching into the store. */
export async function showOpenFilePicker(opts?: {
  title?: string;
  accept?: string[];
  startIn?: string;
}) {
  return useFilePickerStore.getState().request({
    mode: "open",
    title: opts?.title ?? "Open file",
    accept: (opts?.accept ?? []).map((e) => (e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`)),
    suggestedDirectory: opts?.startIn,
  });
}

export async function showSaveFilePicker(opts?: {
  title?: string;
  suggestedName?: string;
  startIn?: string;
  accept?: string[];
}) {
  return useFilePickerStore.getState().request({
    mode: "save",
    title: opts?.title ?? "Save as",
    accept: (opts?.accept ?? []).map((e) => (e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`)),
    suggestedName: opts?.suggestedName,
    suggestedDirectory: opts?.startIn,
  });
}
