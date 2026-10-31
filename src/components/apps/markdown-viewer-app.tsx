import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Check, Code2, Copy, Download, Eye, FolderOpen, Save, TextSelect, WrapText, ZoomIn, ZoomOut } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getNodeByPath, getParentPath, joinPath } from "@/lib/filesystem";
import { getBaseName } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { toast } from "@/stores/toast-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppComponentProps, ContextMenuAction } from "@/types/system";
import { sanitizeHTML } from "@/utils/sanitize";
import "@/styles/notepad.css";

const SAFE_MARKDOWN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAVE_DELAY_MS = 300;
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;

function sanitizeMarkdownUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return SAFE_MARKDOWN_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function caretOf(text: string, offset: number) {
  const lines = text.slice(0, offset).split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

export function MarkdownViewerApp({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const launchApp = useSystemStore((state) => state.launchApp);
  const setContextMenu = useShellStore((state) => state.setContextMenu);
  const updateProcess = useProcessStore((state) => state.updateProcess);
  const setWindowTitle = useWindowStore((state) => state.setWindowTitle);

  const [createdPath, setCreatedPath] = useState<string | null>(null);
  const path = createdPath ?? appWindow.payload?.filePath;
  const node = path ? getNodeByPath(nodes, path) : undefined;
  const file = node?.kind === "file" ? node : undefined;
  const saved = file?.content ?? "";

  const [draft, setDraft] = useState(saved);
  const [mode, setMode] = useState<"formatted" | "source">(path ? "formatted" : "source");
  const [zoom, setZoom] = useState(100);
  const [wrap, setWrap] = useState(true);
  const [statusShown, setStatusShown] = useState(true);
  const [caret, setCaret] = useState({ line: 1, column: 1 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const documentRef = useRef<HTMLDivElement | null>(null);
  const loaded = useRef({ path, text: saved });
  const draftRef = useRef(draft);
  const pendingRef = useRef<{ path: string; text: string } | null>(null);
  draftRef.current = draft;

  // A save landing mid-typing must not put older text back under the caret.
  useEffect(() => {
    const unedited = draftRef.current === loaded.current.text;
    if (loaded.current.path !== path || unedited) setDraft(saved);
    loaded.current = { path, text: saved };
  }, [path, saved]);

  const persist = useCallback(
    (target: string, text: string) => {
      pendingRef.current = null;
      return writeFile(target, text, { extension: file?.extension ?? "md", mimeType: file?.mimeType ?? "text/markdown" });
    },
    [file?.extension, file?.mimeType, writeFile]
  );

  useEffect(() => {
    if (!file || file.readonly || draft === saved) {
      pendingRef.current = null;
      return undefined;
    }

    pendingRef.current = { path: file.path, text: draft };
    const timeoutId = globalThis.window.setTimeout(() => void persist(file.path, draft), SAVE_DELAY_MS);
    return () => globalThis.window.clearTimeout(timeoutId);
  }, [draft, file, persist, saved]);

  const pendingWrite = useRef(persist);
  pendingWrite.current = persist;
  useEffect(
    () => () => {
      if (pendingRef.current) void pendingWrite.current(pendingRef.current.path, pendingRef.current.text);
    },
    []
  );

  const save = async () => {
    if (file) {
      if (!file.readonly && draft !== saved) await persist(file.path, draft);
      return;
    }

    const created = await writeFile(joinPath("/Documents", "Untitled.md"), draft, {
      extension: "md",
      mimeType: "text/markdown",
      uniqueName: true,
    });
    loaded.current = { path: created, text: draft };
    setCreatedPath(created);
    updateProcess(appWindow.processId, { launchPayload: { ...appWindow.payload, filePath: created } });
    setWindowTitle(appWindow.id, getBaseName(created));
    toast(`Saved to Documents as ${getBaseName(created)}`, "success");
  };

  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([draft], { type: "text/markdown" }));
    link.download = file?.name ?? "Untitled.md";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const selectAll = () => {
    if (mode === "source") {
      textareaRef.current?.select();
    } else if (documentRef.current) {
      globalThis.window.getSelection()?.selectAllChildren(documentRef.current);
    }
  };

  const changeZoom = (step: number) => setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value + step)));
  const separator = (id: string): ContextMenuAction => ({ id, label: "", separator: true, onSelect: () => {} });
  const checked = (on: boolean) => (on ? Check : undefined);

  const menus: { label: string; actions: () => ContextMenuAction[] }[] = [
    {
      label: "File",
      actions: () => [
        {
          id: "save",
          label: "Save",
          icon: Save,
          shortcut: "Ctrl+S",
          disabled: Boolean(file && (file.readonly || draft === saved)),
          onSelect: () => void save(),
        },
        { id: "download", label: "Download a copy", icon: Download, onSelect: download },
        separator("file-sep"),
        {
          id: "code",
          label: "Open in Code",
          icon: Code2,
          disabled: !file,
          onSelect: () => launchApp({ appId: "editor", payload: { filePath: file?.path } }),
        },
        {
          id: "folder",
          label: "Show in File Explorer",
          icon: FolderOpen,
          disabled: !file,
          onSelect: () => file && launchApp({ appId: "files", payload: { directoryPath: getParentPath(file.path) } }),
        },
      ],
    },
    {
      label: "Edit",
      actions: () => [
        { id: "copy-all", label: "Copy all", icon: Copy, onSelect: () => void navigator.clipboard?.writeText(draft) },
        { id: "select-all", label: "Select all", icon: TextSelect, shortcut: "Ctrl+A", onSelect: selectAll },
      ],
    },
    {
      label: "View",
      actions: () => [
        { id: "formatted", label: "Formatted", icon: checked(mode === "formatted"), onSelect: () => setMode("formatted") },
        { id: "source", label: "Source", icon: checked(mode === "source"), onSelect: () => setMode("source") },
        separator("view-sep-1"),
        { id: "zoom-in", label: "Zoom in", icon: ZoomIn, disabled: zoom >= MAX_ZOOM, onSelect: () => changeZoom(10) },
        { id: "zoom-out", label: "Zoom out", icon: ZoomOut, disabled: zoom <= MIN_ZOOM, onSelect: () => changeZoom(-10) },
        { id: "zoom-reset", label: "Restore default zoom", disabled: zoom === 100, onSelect: () => setZoom(100) },
        separator("view-sep-2"),
        { id: "wrap", label: "Word wrap", icon: wrap ? Check : WrapText, onSelect: () => setWrap((on) => !on) },
        { id: "status", label: "Status bar", icon: checked(statusShown), onSelect: () => setStatusShown((on) => !on) },
      ],
    },
  ];

  const openMenu = (event: MouseEvent<HTMLButtonElement>, actions: ContextMenuAction[]) => {
    // The desktop closes menus on any click that reaches it.
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, actions });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  };

  const trackCaret = () => {
    const area = textareaRef.current;
    if (area) setCaret(caretOf(draft, area.selectionStart));
  };

  if (path && !file) {
    return <div className="app-empty">This file is no longer there.</div>;
  }

  // Filesystem-backed markdown is treated as untrusted content, so strip embedded HTML before rendering.
  const sanitizedMarkdown = sanitizeHTML(draft);
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const unsaved = !file ? draft.length > 0 : draft !== saved;
  const scale = { fontSize: `${(14 * zoom) / 100}px` };

  return (
    <div className="notepad" onKeyDown={handleKeyDown}>
      <div className="notepad__menu">
        {menus.map((menu) => (
          <button key={menu.label} type="button" aria-haspopup="menu" onClick={(event) => openMenu(event, menu.actions())}>
            {menu.label}
          </button>
        ))}
        <button
          type="button"
          className="notepad__mode"
          title={mode === "formatted" ? "Show the plain text" : "Show it formatted"}
          onClick={() => setMode((value) => (value === "formatted" ? "source" : "formatted"))}
        >
          {mode === "formatted" ? <Code2 size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {mode === "formatted" ? "Source" : "Formatted"}
        </button>
      </div>

      {mode === "formatted" ? (
        <div ref={documentRef} className="notepad__document" style={scale} tabIndex={0}>
          <ReactMarkdown skipHtml urlTransform={sanitizeMarkdownUrl}>
            {sanitizedMarkdown}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="notepad__source"
          style={scale}
          value={draft}
          readOnly={file?.readonly}
          wrap={wrap ? "soft" : "off"}
          spellCheck={false}
          aria-label={`Text of ${file?.name ?? "Untitled"}`}
          onChange={(event) => setDraft(event.target.value)}
          onSelect={trackCaret}
          onKeyUp={trackCaret}
          onClick={trackCaret}
        />
      )}

      {statusShown ? (
        <footer className="notepad__status">
          {mode === "source" ? <span>{`Ln ${caret.line}, Col ${caret.column}`}</span> : null}
          <span>{`${draft.length} characters`}</span>
          <span>{`${words} ${words === 1 ? "word" : "words"}`}</span>
          <span className="notepad__status-spacer" />
          <span>{file?.readonly ? "Read-only" : unsaved ? "Not saved" : "Saved"}</span>
          <span>{`${zoom}%`}</span>
          <span>{draft.includes("\r\n") ? "CRLF" : "LF"}</span>
          <span>UTF-8</span>
        </footer>
      ) : null}
    </div>
  );
}
