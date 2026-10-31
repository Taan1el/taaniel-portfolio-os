import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, Columns2, Command, Files, Folder, Search, SquareTerminal, X } from "lucide-react";
import { getFileIcon } from "@/components/icons/file-icon";
import {
  SAMPLE_PROJECT,
  buildPreviewDocument,
  childrenForTree,
  isEditableFile,
  isTabDirty,
  languageForExtension,
  nextActiveAfterClose,
  openTab,
  previewKind,
  quickOpenMatches,
  searchFiles,
  type CodeTab,
} from "@/lib/code-workspace";
import { getNodeByPath, getParentPath, getPathName, joinPath } from "@/lib/filesystem";
import { createLaunchNonce } from "@/lib/terminal-profiles";
import { confirmInOs } from "@/stores/confirm-dialog-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import { cn } from "@/lib/utils";
import type { AppComponentProps, FileSystemRecord } from "@/types/system";
import "@/styles/code-app.css";

const SAMPLE_FOLDER = "/Documents/Sample Site";

interface FileTreeProps {
  nodes: FileSystemRecord;
  directory: string;
  depth: number;
  open: Set<string>;
  activePath: string | null;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
}

function FileTree({ nodes, directory, depth, open, activePath, onToggle, onOpenFile }: FileTreeProps) {
  return (
    <ul className="code-app__tree" role={depth === 0 ? "tree" : "group"} aria-label={depth === 0 ? "Files" : undefined}>
      {childrenForTree(nodes, directory).map((node) => {
        const expanded = open.has(node.path);
        const Icon = getFileIcon(node);
        const folder = node.kind === "directory";
        return (
          <li key={node.path} role="treeitem" aria-expanded={folder ? expanded : undefined}>
            <button
              type="button"
              className={cn("code-app__tree-row", node.path === activePath && "is-active")}
              style={{ paddingLeft: 8 + depth * 12 }}
              title={node.path}
              onClick={() => (folder ? onToggle(node.path) : onOpenFile(node.path))}
            >
              {folder ? (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span className="code-app__tree-gap" />}
              <Icon size={15} />
              <span>{node.name}</span>
            </button>
            {folder && expanded ? (
              <FileTree
                nodes={nodes}
                directory={node.path}
                depth={depth + 1}
                open={open}
                activePath={activePath}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

function Palette({ mode, items, onQuery, onClose }: { mode: "files" | "commands"; items: PaletteItem[]; onQuery: (query: string) => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setIndex((value) => (value + step + items.length) % Math.max(items.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[index];
      if (item) {
        onClose();
        item.run();
      }
    }
  };

  return (
    <div className="code-app__palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="code-app__palette" role="dialog" aria-label={mode === "files" ? "Go to file" : "Command palette"}>
        <input
          ref={inputRef}
          aria-label={mode === "files" ? "Search files by name" : "Type a command"}
          placeholder={mode === "files" ? "Search files by name" : "Type a command"}
          onChange={(event) => {
            setIndex(0);
            onQuery(event.target.value);
          }}
          onKeyDown={handleKey}
        />
        <ul role="listbox">
          {items.map((item, position) => (
            <li key={item.id} role="option" aria-selected={position === index}>
              <button
                type="button"
                className={cn(position === index && "is-active")}
                onMouseEnter={() => setIndex(position)}
                onClick={() => {
                  onClose();
                  item.run();
                }}
              >
                <span>{item.label}</span>
                {item.hint ? <small>{item.hint}</small> : null}
              </button>
            </li>
          ))}
          {items.length === 0 ? <li className="code-app__empty">No matches</li> : null}
        </ul>
      </div>
    </div>
  );
}

export function CodeEditorApp({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const updateTextFile = useFileSystemStore((state) => state.updateTextFile);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const mkdir = useFileSystemStore((state) => state.mkdir);
  const launchApp = useSystemStore((state) => state.launchApp);

  const [tabs, setTabs] = useState<CodeTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [panel, setPanel] = useState<"files" | "search" | null>("files");
  const [openFolders, setOpenFolders] = useState(() => new Set<string>(["/Documents"]));
  const [query, setQuery] = useState("");
  const [palette, setPalette] = useState<"files" | "commands" | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? null;
  const activeNode = activePath ? getNodeByPath(nodes, activePath) : undefined;
  const readOnly = activeNode?.kind === "file" && Boolean(activeNode.readonly);

  const openFile = useCallback((path: string, line?: number) => {
    const node = getNodeByPath(nodesRef.current, path);
    if (!isEditableFile(node)) return;
    setTabs((current) => openTab(current, path, node.content ?? ""));
    setActivePath(path);
    if (line) {
      requestAnimationFrame(() => {
        editorRef.current?.revealLineInCenter(line);
        editorRef.current?.setPosition({ lineNumber: line, column: 1 });
        editorRef.current?.focus();
      });
    }
  }, []);

  // Opening a file from Explorer or the terminal adds a tab to the running window.
  const payloadPath = appWindow.payload?.filePath;
  const payloadNonce = appWindow.payload?.launchNonce;
  useEffect(() => {
    if (payloadPath) openFile(payloadPath);
  }, [openFile, payloadNonce, payloadPath]);

  const save = useCallback(async (path: string) => {
    const tab = tabsRef.current.find((entry) => entry.path === path);
    const node = getNodeByPath(nodesRef.current, path);
    if (!tab || node?.kind !== "file" || node.readonly) return;
    await updateTextFile(path, tab.value);
    setTabs((current) => current.map((entry) => (entry.path === path ? { ...entry, saved: tab.value } : entry)));
  }, [updateTextFile]);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  const closeTab = async (path: string) => {
    const tab = tabs.find((entry) => entry.path === path);
    if (tab && isTabDirty(tab)) {
      const close = await confirmInOs({
        title: "Unsaved changes",
        message: `Close ${getPathName(path)} without saving?`,
        confirmLabel: "Don't save",
      });
      if (!close) return;
    }
    setActivePath(nextActiveAfterClose(tabs, path, activePath));
    setTabs((current) => current.filter((entry) => entry.path !== path));
  };

  const toggleFolder = (path: string) =>
    setOpenFolders((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  const createSampleProject = async () => {
    const folder = await mkdir(SAMPLE_FOLDER, { uniqueName: true });
    for (const [name, content] of Object.entries(SAMPLE_PROJECT)) await writeFile(joinPath(folder, name), content);
    setOpenFolders((current) => new Set(current).add("/Documents").add(folder));
    openFile(joinPath(folder, "index.html"));
    setPreviewOpen(true);
  };

  const commands: PaletteItem[] = [
    { id: "open", label: "Go to file", hint: "Ctrl+P", run: () => setPalette("files") },
    { id: "save", label: "Save", hint: "Ctrl+S", run: () => activePath && void save(activePath) },
    { id: "preview", label: "Toggle live preview", hint: "Ctrl+Shift+V", run: () => setPreviewOpen((value) => !value) },
    { id: "files", label: "Show files", run: () => setPanel("files") },
    { id: "search", label: "Search in files", hint: "Ctrl+Shift+F", run: () => setPanel("search") },
    { id: "sidebar", label: "Toggle sidebar", hint: "Ctrl+B", run: () => setPanel((value) => (value ? null : "files")) },
    { id: "close", label: "Close tab", run: () => activePath && void closeTab(activePath) },
    { id: "sample", label: "Create a sample website", run: () => void createSampleProject() },
    {
      id: "terminal",
      label: "Open in Terminal",
      run: () =>
        launchApp({
          appId: "terminal",
          payload: { directoryPath: activePath ? getParentPath(activePath) : "/", launchNonce: createLaunchNonce() },
        }),
    },
  ];

  const paletteItems = useMemo<PaletteItem[]>(() => {
    if (palette === "files") {
      return quickOpenMatches(nodes, paletteQuery).map((file) => ({
        id: file.path,
        label: file.name,
        hint: getParentPath(file.path),
        run: () => openFile(file.path),
      }));
    }
    const needle = paletteQuery.trim().toLowerCase();
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
    // `commands` closes over the same state these deps track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, nodes, openFile, palette, paletteQuery, tabs]);

  const showPalette = (mode: "files" | "commands") => {
    setPaletteQuery("");
    setPalette(mode);
  };

  // The palette's input is about to disappear, so give the keyboard back to the editor.
  const closePalette = () => {
    setPalette(null);
    requestAnimationFrame(() => (editorRef.current ?? rootRef.current)?.focus());
  };

  // Bindings live on the app root, and Monaco's own are registered in onMount below,
  // so they work whether focus is in the editor, the tree or the search box.
  const handleShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();
    const run = (action: () => void) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    if (event.shiftKey && key === "p") run(() => showPalette("commands"));
    else if (event.shiftKey && key === "f") run(() => setPanel("search"));
    else if (event.shiftKey && key === "v") run(() => setPreviewOpen((value) => !value));
    else if (!event.shiftKey && key === "p") run(() => showPalette("files"));
    else if (!event.shiftKey && key === "b") run(() => setPanel((value) => (value ? null : "files")));
    else if (!event.shiftKey && key === "s") run(() => activePath && void save(activePath));
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      if (activePathRef.current) void save(activePathRef.current);
    });
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyP, () => showPalette("files"));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, () => showPalette("commands"));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyV, () => setPreviewOpen((value) => !value));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF, () => setPanel("search"));
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyB, () => setPanel((value) => (value ? null : "files")));
    editor.onDidChangeCursorPosition((event) => setCursor({ line: event.position.lineNumber, column: event.position.column }));
  };

  const preview = previewKind(activePath);
  const previewDocument = useMemo(() => {
    if (!activeTab || preview !== "html") return "";
    const readOpen = (path: string) => tabs.find((tab) => tab.path === path)?.value;
    return buildPreviewDocument(activeTab.path, activeTab.value, nodes, readOpen);
  }, [activeTab, nodes, preview, tabs]);

  const searchResults = useMemo(() => (panel === "search" ? searchFiles(nodes, query) : []), [nodes, panel, query]);

  return (
    <div ref={rootRef} className="code-app" tabIndex={-1} onKeyDown={handleShortcut}>
      <nav className="code-app__activity" aria-label="Code sidebar">
        <button type="button" aria-label="Files" aria-pressed={panel === "files"} title="Files" onClick={() => setPanel(panel === "files" ? null : "files")}>
          <Files size={20} />
        </button>
        <button type="button" aria-label="Search in files" aria-pressed={panel === "search"} title="Search (Ctrl+Shift+F)" onClick={() => setPanel(panel === "search" ? null : "search")}>
          <Search size={20} />
        </button>
        <button type="button" aria-label="Command palette" title="Commands (Ctrl+Shift+P)" onClick={() => showPalette("commands")}>
          <Command size={20} />
        </button>
        <button
          type="button"
          aria-label="Open in Terminal"
          title="Open in Terminal"
          onClick={() => launchApp({ appId: "terminal", payload: { directoryPath: activePath ? getParentPath(activePath) : "/", launchNonce: createLaunchNonce() } })}
        >
          <SquareTerminal size={20} />
        </button>
      </nav>

      {panel === "files" ? (
        <aside className="code-app__side" aria-label="Files">
          <h2>Explorer</h2>
          <FileTree nodes={nodes} directory="/" depth={0} open={openFolders} activePath={activePath} onToggle={toggleFolder} onOpenFile={openFile} />
        </aside>
      ) : null}

      {panel === "search" ? (
        <aside className="code-app__side" aria-label="Search in files">
          <h2>Search</h2>
          <input className="code-app__search" autoFocus aria-label="Search in files" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
          <ul className="code-app__hits">
            {searchResults.map((hit) => (
              <li key={`${hit.path}:${hit.line}`}>
                <button type="button" onClick={() => openFile(hit.path, hit.line)}>
                  <strong>{getPathName(hit.path)}:{hit.line}</strong>
                  <span>{hit.text}</span>
                </button>
              </li>
            ))}
            {query.trim().length >= 2 && searchResults.length === 0 ? <li className="code-app__empty">No results</li> : null}
          </ul>
        </aside>
      ) : null}

      <div className="code-app__main">
        <div className="code-app__tabs" role="tablist" aria-label="Open files">
          {tabs.map((tab) => (
            <div key={tab.path} className={cn("code-app__tab", tab.path === activePath && "is-active")}>
              <button type="button" role="tab" aria-selected={tab.path === activePath} title={tab.path} onClick={() => setActivePath(tab.path)}>
                {isTabDirty(tab) ? <span className="code-app__dirty" aria-label="Unsaved changes" /> : null}
                {getPathName(tab.path)}
              </button>
              <button type="button" className="code-app__tab-close" aria-label={`Close ${getPathName(tab.path)}`} onClick={() => void closeTab(tab.path)}>
                <X size={13} />
              </button>
            </div>
          ))}
          {preview ? (
            <button type="button" className="code-app__preview-toggle" aria-pressed={previewOpen} aria-label="Toggle live preview" title="Live preview (Ctrl+Shift+V)" onClick={() => setPreviewOpen((value) => !value)}>
              <Columns2 size={15} />
            </button>
          ) : null}
        </div>

        <div className="code-app__panes">
          {activeTab ? (
            <div className="code-app__editor">
              <Editor
                height="100%"
                path={activeTab.path}
                language={languageForExtension(activeNode?.kind === "file" ? activeNode.extension : "")}
                value={activeTab.value}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 13, smoothScrolling: true, automaticLayout: true, readOnly }}
                onMount={handleMount}
                onChange={(value) => {
                  const path = activeTab.path;
                  setTabs((current) => current.map((tab) => (tab.path === path ? { ...tab, value: value ?? "" } : tab)));
                }}
              />
            </div>
          ) : (
            <div className="code-app__welcome">
              <Folder size={40} aria-hidden="true" />
              <h2>Code</h2>
              <p>Open a file from the sidebar, or start with a small website and watch it update as you type.</p>
              <button type="button" className="code-app__primary" onClick={() => void createSampleProject()}>
                Create a sample website
              </button>
              <p className="code-app__keys">
                <kbd>Ctrl</kbd>+<kbd>P</kbd> go to file · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> commands
              </p>
            </div>
          )}

          {previewOpen && activeTab && preview === "html" ? (
            <iframe className="code-app__preview" title={`Preview of ${getPathName(activeTab.path)}`} sandbox="allow-scripts" srcDoc={previewDocument} />
          ) : null}
          {previewOpen && activeTab && preview === "markdown" ? (
            <div className="code-app__preview code-app__preview--markdown">
              <ReactMarkdown skipHtml>{activeTab.value}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        <footer className="code-app__status">
          <span>{activeTab ? activeTab.path : "No file open"}</span>
          {activeTab ? (
            <span>
              {readOnly ? "Read-only · " : ""}Ln {cursor.line}, Col {cursor.column} · {languageForExtension(activeNode?.kind === "file" ? activeNode.extension : "")}
            </span>
          ) : null}
        </footer>
      </div>

      {palette ? <Palette mode={palette} items={paletteItems} onQuery={setPaletteQuery} onClose={closePalette} /> : null}
    </div>
  );
}
