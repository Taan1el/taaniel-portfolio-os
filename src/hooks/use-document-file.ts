import { useCallback, useEffect, useRef, useState } from "react";
import { getNodeByPath, joinPath } from "@/lib/filesystem";
import { getBaseName } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppWindow } from "@/types/system";

const AUTOSAVE_DELAY_MS = 400;

interface DocumentOptions {
  /** File name for a first save, such as "Board.board". */
  defaultName: string;
  extension: string;
  mimeType: string;
}

/**
 * The open and save behaviour the document apps share. A window starts on the file it was
 * opened with, or on nothing until the first Save, which puts a new file in Documents.
 * From then on `change` saves by itself, a moment after the last edit.
 */
export function useDocumentFile(appWindow: AppWindow, { defaultName, extension, mimeType }: DocumentOptions) {
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const updateProcess = useProcessStore((state) => state.updateProcess);
  const setWindowTitle = useWindowStore((state) => state.setWindowTitle);
  const [createdPath, setCreatedPath] = useState<string | null>(null);
  const path = createdPath ?? appWindow.payload?.filePath ?? null;
  const node = useFileSystemStore((state) => (path ? getNodeByPath(state.nodes, path) : undefined));
  const file = node?.kind === "file" ? node : undefined;
  const readOnly = Boolean(file?.readonly);
  const [status, setStatus] = useState<"new" | "saved" | "unsaved">(path ? "saved" : "new");
  const pending = useRef<{ path: string; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    globalThis.window.clearTimeout(timer.current);
    const write = pending.current;
    pending.current = null;
    if (!write) return;
    void writeFile(write.path, write.text, { extension, mimeType }).then(() => {
      if (!pending.current) setStatus("saved");
    });
  }, [extension, mimeType, writeFile]);

  // Closing the window must not lose the last moments of work.
  useEffect(() => flush, [flush]);

  const change = useCallback(
    (text: string) => {
      if (!file || readOnly) {
        setStatus(file ? "saved" : "new");
        return;
      }
      pending.current = { path: file.path, text };
      setStatus("unsaved");
      globalThis.window.clearTimeout(timer.current);
      timer.current = globalThis.window.setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [file, flush, readOnly]
  );

  /** Saves now. With no file yet, or a read-only one, a new file is made in Documents. */
  const save = useCallback(
    async (text: string) => {
      if (file && !readOnly) {
        pending.current = { path: file.path, text };
        flush();
        return file.path;
      }

      const created = await writeFile(joinPath("/Documents", defaultName), text, { extension, mimeType, uniqueName: true });
      setCreatedPath(created);
      setStatus("saved");
      updateProcess(appWindow.processId, { launchPayload: { ...appWindow.payload, filePath: created } });
      setWindowTitle(appWindow.id, getBaseName(created));
      return created;
    },
    [appWindow.id, appWindow.payload, appWindow.processId, defaultName, extension, file, flush, mimeType, readOnly, setWindowTitle, updateProcess, writeFile]
  );

  return { file, path, readOnly, status, change, save, name: file?.name ?? defaultName };
}
