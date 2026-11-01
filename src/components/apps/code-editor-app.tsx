import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  CircleX,
  Columns2,
  Command,
  Files,
  FilePlus,
  GitBranch,
  GitCompare,
  PanelBottom,
  PanelLeft,
  Search,
  SquareTerminal,
  Undo2,
  X,
} from "lucide-react";
import { CodeFileIcon } from "@/components/apps/code/code-file-icon";
import { CodeMenuBar, type CodeCommand, type CodeMenu } from "@/components/apps/code/code-menu-bar";
import { CODE_THEME, prepareMonaco } from "@/components/apps/code/code-monaco";
import { LogoMark } from "@/components/ui/logo-mark";
import {
  PROJECT_NAME,
  PROJECT_ROOT,
  applyProjectEdit,
  buildProjectNodes,
  discardProjectEdit,
  fetchProject,
  fromProjectPath,
  isProjectPath,
  isSafeProjectPath,
  projectChanges,
  readProjectEdits,
  toProjectPath,
  writeProjectEdits,
  type ProjectChange,
  type ProjectEdits,
  type ProjectSource,
} from "@/lib/code-project";
import {
  SAMPLE_PROJECT,
  buildPreviewDocument,
  childrenForTree,
  isEditableFile,
  isTabDirty,
  languageForExtension,
  languageLabel,
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
const FIRST_FILE = "src/app/App.tsx";
const COMPACT_WIDTH = 720;
const SEVERITY_ERROR = 8;
const SEVERITY_WARNING = 4;

type SideView = "files" | "search" | "scm";

interface EditorMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  resource: { path: string };
}

interface Problem {
  path: string;
  line: number;
  message: string;
  error: boolean;
}

const MENUS: CodeMenu[] = [
  { label: "File", items: ["new-file", "sample", "-", "save", "save-all", "-", "close", "close-all"] },
  { label: "Edit", items: ["undo", "redo", "-", "cut", "copy", "paste", "-", "find", "replace", "search", "-", "comment", "format"] },
  { label: "Selection", items: ["select-all", "expand", "shrink", "-", "line-up", "line-down", "line-copy"] },
  { label: "View", items: ["commands", "-", "files", "search", "scm", "-", "sidebar", "panel", "minimap", "wrap"] },
  { label: "Go", items: ["back", "forward", "-", "open", "go-line", "go-symbol"] },
  { label: "Run", items: ["preview"] },
  { label: "Terminal", items: ["terminal"] },
  { label: "Help", items: ["commands", "open"] },
];

interface FileTreeProps {
  nodes: FileSystemRecord;
  directory: string;
  depth: number;
  open: Set<string>;
  activePath: string | null;
  changes?: Map<string, ProjectChange["status"]>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
}

function FileTree({ nodes, directory, depth, open, activePath, changes, onToggle, onOpenFile }: FileTreeProps) {
  return (
    <ul className="code-app__tree" role={depth === 0 ? "tree" : "group"} aria-label={depth === 0 ? "Files" : undefined}>
      {childrenForTree(nodes, directory).map((node) => {
        const expanded = open.has(node.path);
        const folder = node.kind === "directory";
        const change = changes?.get(node.path);
        return (
          <li key={node.path} role="treeitem" aria-expanded={folder ? expanded : undefined}>
            <button
              type="button"
              className={cn("code-app__tree-row", node.path === activePath && "is-active", change && `is-${change.toLowerCase()}`)}
              style={{ paddingLeft: 8 + depth * 12 }}
              title={node.path}
              onClick={() => (folder ? onToggle(node.path) : onOpenFile(node.path))}
            >
              {folder ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <CodeFileIcon name={node.name} />}
              <span className="code-app__tree-name">{node.name}</span>
              {change ? <small>{change}</small> : null}
            </button>
            {folder && expanded ? (
              <FileTree nodes={nodes} directory={node.path} depth={depth + 1} open={open} activePath={activePath} changes={changes} onToggle={onToggle} onOpenFile={onOpenFile} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Section({ title, open, onToggle, actions, children }: { title: string; open: boolean; onToggle: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className={cn("code-app__section", open && "is-open")}>
      <div className="code-app__section-head">
        <button type="button" aria-expanded={open} onClick={onToggle}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {title}
        </button>
        {open ? actions : null}
      </div>
      {open ? <div className="code-app__section-body">{children}</div> : null}
    </section>
  );
}

function Palette({ mode, items, onQuery, onClose }: { mode: "files" | "commands"; items: CodeCommand[]; onQuery: (query: string) => void; onClose: () => void }) {
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

  const [project, setProject] = useState<ProjectSource | null>(null);
  const [projectMissing, setProjectMissing] = useState(false);
  const [edits, setEdits] = useState<ProjectEdits>(readProjectEdits);
  const [tabs, setTabs] = useState<CodeTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ paths: string[]; index: number }>({ paths: [], index: -1 });
  const [side, setSide] = useState<SideView | null>("files");
  const [sections, setSections] = useState({ editors: true, project: true, device: false });
  const [openFolders, setOpenFolders] = useState(() => new Set<string>([`${PROJECT_ROOT}/src`, `${PROJECT_ROOT}/src/app`, "/Documents"]));
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [palette, setPalette] = useState<"files" | "commands" | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [minimap, setMinimap] = useState(true);
  const [wrap, setWrap] = useState(false);
  const [compact, setCompact] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [fileFormat, setFileFormat] = useState({ tabSize: 2, eol: "LF" });
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const stopMarkers = useRef<(() => void) | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const projectNodes = useMemo(() => buildProjectNodes(project, edits), [edits, project]);
  const workspace = useMemo(() => ({ ...nodes, ...projectNodes }), [nodes, projectNodes]);
  const changes = useMemo(() => projectChanges(project, edits), [edits, project]);
  const changeByPath = useMemo(() => new Map(changes.map((change) => [change.path, change.status])), [changes]);

  const nodesRef = useRef(workspace);
  nodesRef.current = workspace;
  const projectRef = useRef(project);
  projectRef.current = project;
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;
  const compactRef = useRef(compact);
  compactRef.current = compact;

  const activeTab = tabs.find((tab) => tab.path === activePath) ?? null;
  const activeNode = activePath ? getNodeByPath(workspace, activePath) : undefined;
  const activeExtension = activeNode?.kind === "file" ? activeNode.extension : "";
  const readOnly = activeNode?.kind === "file" && Boolean(activeNode.readonly);
  const showingDiff = Boolean(activeTab) && diffPath === activePath;
  const editorOpen = Boolean(activeTab) && !showingDiff;

  const openFile = useCallback((path: string, line?: number, remember = true) => {
    const node = getNodeByPath(nodesRef.current, path);
    if (!isEditableFile(node)) return;
    setTabs((current) => openTab(current, path, node.content ?? ""));
    setActivePath(path);
    if (remember) setTrail(({ paths, index }) => (paths[index] === path ? { paths, index } : { paths: [...paths.slice(0, index + 1), path], index: index + 1 }));
    if (compactRef.current) setSide(null);
    if (line) {
      requestAnimationFrame(() => {
        editorRef.current?.revealLineInCenter(line);
        editorRef.current?.setPosition({ lineNumber: line, column: 1 });
        editorRef.current?.focus();
      });
    }
  }, []);

  const stepTrail = (direction: number) => {
    const index = trail.index + direction;
    const path = trail.paths[index];
    if (!path) return;
    setTrail({ ...trail, index });
    openFile(path, undefined, false);
  };

  // The project arrives after the first paint and only when Code is opened, so the OS never pays for it.
  useEffect(() => {
    let cancelled = false;
    void fetchProject().then((source) => {
      if (cancelled) return;
      setProject(source);
      setProjectMissing(!source);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (project && tabsRef.current.length === 0) openFile(fromProjectPath(FIRST_FILE));
  }, [openFile, project]);

  // Opening a file from Explorer or the terminal adds a tab to the running window.
  const payloadPath = appWindow.payload?.filePath;
  const payloadNonce = appWindow.payload?.launchNonce;
  useEffect(() => {
    if (payloadPath) openFile(payloadPath);
  }, [openFile, payloadNonce, payloadPath]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const observer = new ResizeObserver(() => setCompact(root.clientWidth < COMPACT_WIDTH));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => stopMarkers.current?.(), []);

  const storeEdits = (next: ProjectEdits) => {
    editsRef.current = next;
    setEdits(next);
    writeProjectEdits(next);
  };

  const save = useCallback(
    async (path: string) => {
      const tab = tabsRef.current.find((entry) => entry.path === path);
      if (!tab) return;
      const node = getNodeByPath(nodesRef.current, path);
      if (node?.kind !== "file" || node.readonly) return;
      if (isProjectPath(path)) {
        if (projectRef.current) storeEdits(applyProjectEdit(projectRef.current, editsRef.current, toProjectPath(path), tab.value));
      } else {
        await updateTextFile(path, tab.value);
      }
      setTabs((current) => current.map((entry) => (entry.path === path ? { ...entry, saved: tab.value } : entry)));
    },
    [updateTextFile]
  );

  const saveAll = () => tabs.filter(isTabDirty).forEach((tab) => void save(tab.path));

  const dropTab = (path: string) => {
    setActivePath((current) => nextActiveAfterClose(tabsRef.current, path, current));
    setTabs((current) => current.filter((entry) => entry.path !== path));
    setDiffPath((current) => (current === path ? null : current));
  };

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
    dropTab(path);
  };

  const closeAll = async () => {
    if (tabs.some(isTabDirty)) {
      const close = await confirmInOs({ title: "Unsaved changes", message: "Close every tab without saving?", confirmLabel: "Don't save" });
      if (!close) return;
    }
    setTabs([]);
    setActivePath(null);
    setDiffPath(null);
  };

  const toggleFolder = (path: string) =>
    setOpenFolders((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  const createProjectFile = (relative: string) => {
    if (!project) return;
    setCreating(false);
    if (!isSafeProjectPath(relative) || relative in project.files || relative in edits || project.listed.includes(relative)) return;
    const next = applyProjectEdit(project, edits, relative, "");
    storeEdits(next);
    const path = fromProjectPath(relative);
    nodesRef.current = { ...nodesRef.current, ...buildProjectNodes(project, next) };
    setOpenFolders((current) => {
      const expanded = new Set(current);
      for (let folder = getParentPath(path); folder !== PROJECT_ROOT && folder !== "/"; folder = getParentPath(folder)) expanded.add(folder);
      return expanded;
    });
    openFile(path);
  };

  const discardChange = async (change: ProjectChange) => {
    if (!project) return;
    const added = change.status === "U";
    const confirmed = await confirmInOs({
      title: added ? "Delete new file" : "Discard changes",
      message: added ? `Delete ${change.name}? It only exists in this browser.` : `Put ${change.name} back to the published version?`,
      confirmLabel: added ? "Delete" : "Discard",
    });
    if (!confirmed) return;
    const relative = toProjectPath(change.path);
    storeEdits(discardProjectEdit(edits, relative));
    if (added) dropTab(change.path);
    else {
      const original = project.files[relative];
      setTabs((current) => current.map((tab) => (tab.path === change.path ? { ...tab, saved: original, value: original } : tab)));
      setDiffPath((current) => (current === change.path ? null : current));
    }
  };

  const createSampleProject = async () => {
    const folder = await mkdir(SAMPLE_FOLDER, { uniqueName: true });
    for (const [name, content] of Object.entries(SAMPLE_PROJECT)) await writeFile(joinPath(folder, name), content);
    setOpenFolders((current) => new Set(current).add("/Documents").add(folder));
    setSections((current) => ({ ...current, device: true }));
    nodesRef.current = { ...useFileSystemStore.getState().nodes, ...projectNodes };
    openFile(joinPath(folder, "index.html"));
    setPreviewOpen(true);
  };

  const openTerminal = () => {
    const directoryPath = activePath && !isProjectPath(activePath) ? getParentPath(activePath) : "/";
    launchApp({ appId: "terminal", payload: { directoryPath, launchNonce: createLaunchNonce() } });
  };

  const showSide = (view: SideView) => {
    setSide((current) => (current === view ? null : view));
  };

  const showPalette = (mode: "files" | "commands") => {
    setPaletteQuery("");
    setPalette(mode);
  };

  const editorAction = (id: string) => () => {
    editorRef.current?.focus();
    editorRef.current?.trigger("menu", id, null);
  };

  const noEditor = !editorOpen;
  const commands: CodeCommand[] = [
    { id: "commands", label: "Command Palette...", hint: "Ctrl+Shift+P", run: () => showPalette("commands") },
    { id: "open", label: "Go to File...", hint: "Ctrl+P", run: () => showPalette("files") },
    { id: "new-file", label: "New File...", disabled: !project, run: () => {
      setSide("files");
      setSections((current) => ({ ...current, project: true }));
      setCreating(true);
    } },
    { id: "sample", label: "New Sample Website", run: () => void createSampleProject() },
    { id: "save", label: "Save", hint: "Ctrl+S", disabled: !activeTab, run: () => activePath && void save(activePath) },
    { id: "save-all", label: "Save All", disabled: !tabs.some(isTabDirty), run: saveAll },
    { id: "close", label: "Close Editor", disabled: !activeTab, run: () => activePath && void closeTab(activePath) },
    { id: "close-all", label: "Close All Editors", disabled: tabs.length === 0, run: () => void closeAll() },
    { id: "undo", label: "Undo", hint: "Ctrl+Z", disabled: noEditor, run: editorAction("undo") },
    { id: "redo", label: "Redo", hint: "Ctrl+Y", disabled: noEditor, run: editorAction("redo") },
    { id: "cut", label: "Cut", hint: "Ctrl+X", disabled: noEditor, run: editorAction("editor.action.clipboardCutAction") },
    { id: "copy", label: "Copy", hint: "Ctrl+C", disabled: noEditor, run: editorAction("editor.action.clipboardCopyAction") },
    { id: "paste", label: "Paste", hint: "Ctrl+V", disabled: noEditor, run: editorAction("editor.action.clipboardPasteAction") },
    { id: "find", label: "Find", hint: "Ctrl+F", disabled: noEditor, run: editorAction("actions.find") },
    { id: "replace", label: "Replace", hint: "Ctrl+H", disabled: noEditor, run: editorAction("editor.action.startFindReplaceAction") },
    { id: "search", label: "Search in Files", hint: "Ctrl+Shift+F", run: () => setSide("search") },
    { id: "comment", label: "Toggle Line Comment", hint: "Ctrl+/", disabled: noEditor, run: editorAction("editor.action.commentLine") },
    { id: "format", label: "Format Document", hint: "Shift+Alt+F", disabled: noEditor, run: editorAction("editor.action.formatDocument") },
    { id: "select-all", label: "Select All", hint: "Ctrl+A", disabled: noEditor, run: editorAction("editor.action.selectAll") },
    { id: "expand", label: "Expand Selection", hint: "Shift+Alt+Right", disabled: noEditor, run: editorAction("editor.action.smartSelect.expand") },
    { id: "shrink", label: "Shrink Selection", hint: "Shift+Alt+Left", disabled: noEditor, run: editorAction("editor.action.smartSelect.shrink") },
    { id: "line-up", label: "Move Line Up", hint: "Alt+Up", disabled: noEditor, run: editorAction("editor.action.moveLinesUpAction") },
    { id: "line-down", label: "Move Line Down", hint: "Alt+Down", disabled: noEditor, run: editorAction("editor.action.moveLinesDownAction") },
    { id: "line-copy", label: "Duplicate Line", disabled: noEditor, run: editorAction("editor.action.copyLinesDownAction") },
    { id: "files", label: "Explorer", run: () => setSide("files") },
    { id: "scm", label: "Source Control", run: () => setSide("scm") },
    { id: "sidebar", label: "Toggle Sidebar", hint: "Ctrl+B", run: () => setSide((value) => (value ? null : "files")) },
    { id: "panel", label: "Toggle Problems Panel", hint: "Ctrl+J", run: () => setProblemsOpen((value) => !value) },
    { id: "minimap", label: minimap ? "Hide Minimap" : "Show Minimap", run: () => setMinimap((value) => !value) },
    { id: "wrap", label: wrap ? "Turn Off Word Wrap" : "Turn On Word Wrap", hint: "Alt+Z", run: () => setWrap((value) => !value) },
    { id: "back", label: "Back", disabled: trail.index <= 0, run: () => stepTrail(-1) },
    { id: "forward", label: "Forward", disabled: trail.index >= trail.paths.length - 1, run: () => stepTrail(1) },
    { id: "go-line", label: "Go to Line...", hint: "Ctrl+G", disabled: noEditor, run: editorAction("editor.action.gotoLine") },
    { id: "go-symbol", label: "Go to Symbol...", hint: "Ctrl+Shift+O", disabled: noEditor, run: editorAction("editor.action.quickOutline") },
    { id: "preview", label: "Toggle Live Preview", hint: "Ctrl+Shift+V", disabled: !previewKind(activePath), run: () => setPreviewOpen((value) => !value) },
    { id: "terminal", label: "Open Terminal", hint: "Ctrl+`", run: openTerminal },
  ];

  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const runCommand = useCallback((id: string) => {
    const command = commandsRef.current.find((entry) => entry.id === id);
    if (command && !command.disabled) command.run();
  }, []);

  const relativeHint = (path: string) => {
    const folder = getParentPath(path);
    return folder === PROJECT_ROOT ? "" : isProjectPath(path) ? toProjectPath(folder) : folder;
  };

  const paletteItems: CodeCommand[] =
    palette === "files"
      ? quickOpenMatches(workspace, paletteQuery).map((file) => ({ id: file.path, label: file.name, hint: relativeHint(file.path), run: () => openFile(file.path) }))
      : palette === "commands"
        ? commands.filter((command) => !command.disabled && command.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()))
        : [];

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
    const run = (id: string) => {
      event.preventDefault();
      event.stopPropagation();
      runCommand(id);
    };
    if (event.shiftKey && key === "p") run("commands");
    else if (event.shiftKey && key === "f") run("search");
    else if (event.shiftKey && key === "v") run("preview");
    else if (!event.shiftKey && key === "p") run("open");
    else if (!event.shiftKey && key === "b") run("sidebar");
    else if (!event.shiftKey && key === "j") run("panel");
    else if (!event.shiftKey && key === "s") run("save");
    else if (!event.shiftKey && key === "`") run("terminal");
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      if (activePathRef.current) void save(activePathRef.current);
    });
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyP, () => runCommand("open"));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, () => runCommand("commands"));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyV, () => runCommand("preview"));
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyF, () => runCommand("search"));
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyB, () => runCommand("sidebar"));
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyJ, () => runCommand("panel"));
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Backquote, () => runCommand("terminal"));
    editor.addCommand(KeyMod.Alt | KeyCode.KeyZ, () => setWrap((value) => !value));
    editor.onDidChangeCursorPosition((event) => setCursor({ line: event.position.lineNumber, column: event.position.column }));

    const readFormat = () => {
      const model = editor.getModel();
      if (model) setFileFormat({ tabSize: model.getOptions().tabSize, eol: model.getEOL() === "\n" ? "LF" : "CRLF" });
    };
    readFormat();
    editor.onDidChangeModel(readFormat);

    const readMarkers = () => {
      setProblems(
        (monaco.editor.getModelMarkers({}) as EditorMarker[])
          .filter((marker) => marker.severity >= SEVERITY_WARNING)
          .map((marker) => ({ path: marker.resource.path, line: marker.startLineNumber, message: marker.message, error: marker.severity >= SEVERITY_ERROR }))
      );
    };
    stopMarkers.current?.();
    const subscription = monaco.editor.onDidChangeMarkers(readMarkers);
    stopMarkers.current = () => subscription.dispose();
  };

  const preview = previewKind(activePath);
  const previewDocument = useMemo(() => {
    if (!activeTab || preview !== "html") return "";
    const readOpen = (path: string) => tabs.find((tab) => tab.path === path)?.value;
    return buildPreviewDocument(activeTab.path, activeTab.value, workspace, readOpen);
  }, [activeTab, preview, tabs, workspace]);

  const searchResults = useMemo(() => (side === "search" ? searchFiles(workspace, query) : []), [query, side, workspace]);
  const crumbs = activePath ? (isProjectPath(activePath) ? toProjectPath(activePath) : activePath.slice(1)).split("/") : [];
  const errorCount = problems.filter((problem) => problem.error).length;
  const language = languageForExtension(activeExtension);
  const original = activeTab && project && isProjectPath(activeTab.path) ? (project.files[toProjectPath(activeTab.path)] ?? "") : "";

  return (
    <div ref={rootRef} className={cn("code-app", compact && "is-compact")} tabIndex={-1} onKeyDown={handleShortcut}>
      <header className="code-app__title">
        <LogoMark size={15} className="code-app__mark" />
        <CodeMenuBar menus={MENUS} commands={commands} />
        <div className="code-app__center">
          <button type="button" aria-label="Back" title="Back" disabled={trail.index <= 0} onClick={() => stepTrail(-1)}>
            <ArrowLeft size={15} />
          </button>
          <button type="button" aria-label="Forward" title="Forward" disabled={trail.index >= trail.paths.length - 1} onClick={() => stepTrail(1)}>
            <ArrowRight size={15} />
          </button>
          <button type="button" className="code-app__command-center" title="Go to file (Ctrl+P)" onClick={() => showPalette("files")}>
            <Search size={13} />
            <span>{project ? PROJECT_NAME : "Search files"}</span>
          </button>
        </div>
        <div className="code-app__layout">
          <button type="button" aria-label="Toggle sidebar" aria-pressed={Boolean(side)} title="Toggle sidebar (Ctrl+B)" onClick={() => runCommand("sidebar")}>
            <PanelLeft size={15} />
          </button>
          <button type="button" aria-label="Toggle problems panel" aria-pressed={problemsOpen} title="Toggle panel (Ctrl+J)" onClick={() => runCommand("panel")}>
            <PanelBottom size={15} />
          </button>
        </div>
      </header>

      <div className="code-app__body">
        <nav className="code-app__activity" aria-label="Code sidebar">
          <button type="button" aria-label="Files" aria-pressed={side === "files"} title="Explorer" onClick={() => showSide("files")}>
            <Files size={22} />
          </button>
          <button type="button" aria-label="Search in files" aria-pressed={side === "search"} title="Search (Ctrl+Shift+F)" onClick={() => showSide("search")}>
            <Search size={22} />
          </button>
          <button type="button" aria-label="Source Control" aria-pressed={side === "scm"} title="Source Control" onClick={() => showSide("scm")}>
            <GitBranch size={22} />
            {changes.length > 0 ? <span className="code-app__count">{changes.length}</span> : null}
          </button>
          <button type="button" aria-label="Open in Terminal" title="Open Terminal (Ctrl+`)" onClick={openTerminal}>
            <SquareTerminal size={22} />
          </button>
          <button type="button" className="code-app__activity-end" aria-label="Command palette" title="Commands (Ctrl+Shift+P)" onClick={() => showPalette("commands")}>
            <Command size={20} />
          </button>
        </nav>

        {side === "files" ? (
          <aside className="code-app__side" aria-label="Files">
            <h2>Explorer</h2>
            <div className="code-app__sections">
              <Section title="Open Editors" open={sections.editors} onToggle={() => setSections({ ...sections, editors: !sections.editors })}>
                <ul className="code-app__tree">
                  {tabs.map((tab) => (
                    <li key={tab.path} className="code-app__open-editor">
                      <button type="button" className={cn("code-app__tree-row", tab.path === activePath && "is-active")} style={{ paddingLeft: 22 }} title={tab.path} onClick={() => openFile(tab.path)}>
                        <CodeFileIcon name={getPathName(tab.path)} />
                        <span className="code-app__tree-name">{getPathName(tab.path)}</span>
                        <small>{relativeHint(tab.path)}</small>
                      </button>
                      <button type="button" className="code-app__row-action" aria-label={`Close ${getPathName(tab.path)} from Open Editors`} onClick={() => void closeTab(tab.path)}>
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>

              {project ? (
                <Section
                  title={PROJECT_NAME}
                  open={sections.project}
                  onToggle={() => setSections({ ...sections, project: !sections.project })}
                  actions={
                    <>
                      <button type="button" className="code-app__row-action" aria-label="New file" title="New File" onClick={() => setCreating(true)}>
                        <FilePlus size={15} />
                      </button>
                      <button type="button" className="code-app__row-action" aria-label="Collapse folders" title="Collapse Folders" onClick={() => setOpenFolders(new Set())}>
                        <ChevronsDownUp size={15} />
                      </button>
                    </>
                  }
                >
                  {creating ? (
                    <input
                      className="code-app__new-file"
                      autoFocus
                      aria-label="New file path"
                      placeholder="src/lib/new-file.ts"
                      onBlur={() => setCreating(false)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createProjectFile(event.currentTarget.value.trim());
                        else if (event.key === "Escape") setCreating(false);
                        event.stopPropagation();
                      }}
                    />
                  ) : null}
                  <FileTree nodes={projectNodes} directory={PROJECT_ROOT} depth={0} open={openFolders} activePath={activePath} changes={changeByPath} onToggle={toggleFolder} onOpenFile={openFile} />
                </Section>
              ) : (
                <p className="code-app__empty">{projectMissing ? "The project files could not be loaded." : "Loading the project"}</p>
              )}

              <Section title="This PC" open={sections.device} onToggle={() => setSections({ ...sections, device: !sections.device })}>
                <FileTree nodes={nodes} directory="/" depth={0} open={openFolders} activePath={activePath} onToggle={toggleFolder} onOpenFile={openFile} />
              </Section>
            </div>
          </aside>
        ) : null}

        {side === "search" ? (
          <aside className="code-app__side" aria-label="Search in files">
            <h2>Search</h2>
            <input className="code-app__search" autoFocus aria-label="Search in files" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
            <ul className="code-app__hits">
              {searchResults.map((hit) => (
                <li key={`${hit.path}:${hit.line}`}>
                  <button type="button" onClick={() => openFile(hit.path, hit.line)}>
                    <strong>
                      {getPathName(hit.path)}:{hit.line}
                    </strong>
                    <span>{hit.text}</span>
                  </button>
                </li>
              ))}
              {query.trim().length >= 2 && searchResults.length === 0 ? <li className="code-app__empty">No results</li> : null}
            </ul>
          </aside>
        ) : null}

        {side === "scm" ? (
          <aside className="code-app__side" aria-label="Source Control">
            <h2>Source Control</h2>
            <p className="code-app__note">Saved changes to this project stay in this browser. Nothing is sent anywhere.</p>
            <ul className="code-app__hits">
              {changes.map((change) => (
                <li key={change.path} className="code-app__change">
                  <button
                    type="button"
                    className="code-app__tree-row"
                    title={`Compare ${change.name}`}
                    onClick={() => {
                      openFile(change.path);
                      setDiffPath(change.status === "M" ? change.path : null);
                    }}
                  >
                    <CodeFileIcon name={change.name} />
                    <span className="code-app__tree-name">{change.name}</span>
                  </button>
                  <button type="button" className="code-app__row-action" aria-label={`Discard ${change.name}`} title="Discard Changes" onClick={() => void discardChange(change)}>
                    <Undo2 size={14} />
                  </button>
                  <small className={`is-${change.status.toLowerCase()}`}>{change.status}</small>
                </li>
              ))}
              {changes.length === 0 ? <li className="code-app__empty">No changes yet. Edit a file and save it.</li> : null}
            </ul>
          </aside>
        ) : null}

        <div className="code-app__main">
          <div className="code-app__tabs" role="tablist" aria-label="Open files">
            {tabs.map((tab) => (
              <div key={tab.path} className={cn("code-app__tab", tab.path === activePath && "is-active")}>
                <button type="button" role="tab" aria-selected={tab.path === activePath} title={tab.path} onClick={() => openFile(tab.path)}>
                  <CodeFileIcon name={getPathName(tab.path)} />
                  {getPathName(tab.path)}
                </button>
                {isTabDirty(tab) ? <span className="code-app__dirty" aria-label="Unsaved changes" /> : null}
                <button type="button" className="code-app__tab-close" aria-label={`Close ${getPathName(tab.path)}`} onClick={() => void closeTab(tab.path)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="code-app__tab-actions">
              {activePath && changeByPath.get(activePath) === "M" ? (
                <button type="button" aria-pressed={showingDiff} aria-label="Compare with the published version" title="Compare with the published version" onClick={() => setDiffPath(showingDiff ? null : activePath)}>
                  <GitCompare size={15} />
                </button>
              ) : null}
              {preview ? (
                <button type="button" className="code-app__preview-toggle" aria-pressed={previewOpen} aria-label="Toggle live preview" title="Live preview (Ctrl+Shift+V)" onClick={() => setPreviewOpen((value) => !value)}>
                  <Columns2 size={15} />
                </button>
              ) : null}
            </div>
          </div>

          {activeTab ? (
            <ol className="code-app__crumbs" aria-label="Path">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb}-${index}`}>
                  {index === crumbs.length - 1 ? <CodeFileIcon name={crumb} /> : null}
                  {crumb}
                  {index < crumbs.length - 1 ? <ChevronRight size={13} aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          ) : null}

          <div className="code-app__panes">
            {showingDiff && activeTab ? (
              <div className="code-app__editor">
                <DiffEditor
                  height="100%"
                  original={original}
                  modified={activeTab.value}
                  language={language}
                  theme={CODE_THEME}
                  beforeMount={prepareMonaco}
                  options={{ readOnly: true, renderSideBySide: !compact, automaticLayout: true, fontSize: 14, minimap: { enabled: false } }}
                />
              </div>
            ) : activeTab ? (
              <div className="code-app__editor">
                <Editor
                  height="100%"
                  path={activeTab.path}
                  language={language}
                  value={activeTab.value}
                  theme={CODE_THEME}
                  beforeMount={prepareMonaco}
                  options={{
                    automaticLayout: true,
                    bracketPairColorization: { enabled: true },
                    cursorSmoothCaretAnimation: "on",
                    fontFamily: "Consolas, 'Cascadia Mono', 'IBM Plex Mono', monospace",
                    fontSize: 14,
                    guides: { indentation: true },
                    lineHeight: 22,
                    minimap: { enabled: minimap && !compact },
                    padding: { top: 4 },
                    readOnly,
                    renderLineHighlight: "line",
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    wordWrap: wrap ? "on" : "off",
                  }}
                  onMount={handleMount}
                  onChange={(value) => {
                    const path = activeTab.path;
                    setTabs((current) => current.map((tab) => (tab.path === path ? { ...tab, value: value ?? "" } : tab)));
                  }}
                />
              </div>
            ) : (
              <div className="code-app__welcome">
                <LogoMark size={72} className="code-app__welcome-mark" />
                <dl>
                  <dt>Show All Commands</dt>
                  <dd>
                    <kbd>Ctrl</kbd>
                    <kbd>Shift</kbd>
                    <kbd>P</kbd>
                  </dd>
                  <dt>Go to File</dt>
                  <dd>
                    <kbd>Ctrl</kbd>
                    <kbd>P</kbd>
                  </dd>
                  <dt>Search in Files</dt>
                  <dd>
                    <kbd>Ctrl</kbd>
                    <kbd>Shift</kbd>
                    <kbd>F</kbd>
                  </dd>
                  <dt>Toggle Sidebar</dt>
                  <dd>
                    <kbd>Ctrl</kbd>
                    <kbd>B</kbd>
                  </dd>
                </dl>
                <button type="button" className="code-app__primary" onClick={() => void createSampleProject()}>
                  Create a sample website
                </button>
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

          {problemsOpen ? (
            <section className="code-app__panel" aria-label="Problems">
              <header>
                <span>Problems</span>
                <button type="button" aria-label="Close panel" onClick={() => setProblemsOpen(false)}>
                  <X size={14} />
                </button>
              </header>
              <ul>
                {problems.map((problem, index) => (
                  <li key={`${problem.path}-${problem.line}-${index}`}>
                    <button type="button" onClick={() => openFile(problem.path, problem.line)}>
                      {problem.error ? <CircleX size={14} color="#f14c4c" /> : <AlertTriangle size={14} color="#cca700" />}
                      <span>{problem.message}</span>
                      <small>
                        {getPathName(problem.path)} [Ln {problem.line}]
                      </small>
                    </button>
                  </li>
                ))}
                {problems.length === 0 ? <li className="code-app__empty">No problems have been detected in the open files.</li> : null}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="code-app__status">
        <span className="code-app__status-group">
          {project ? (
            <button type="button" title={`${project.branch} at ${project.commit}`} onClick={() => setSide("scm")}>
              <GitBranch size={13} />
              {project.branch}
              {changes.length > 0 ? "*" : ""}
            </button>
          ) : null}
          <button type="button" aria-label={`${errorCount} errors, ${problems.length - errorCount} warnings`} title="Toggle problems panel" onClick={() => runCommand("panel")}>
            <CircleX size={13} />
            {errorCount}
            <AlertTriangle size={13} />
            {problems.length - errorCount}
          </button>
        </span>
        {editorOpen ? (
          <span className="code-app__status-group">
            {readOnly ? <span>Read-only</span> : null}
            <span>
              Ln {cursor.line}, Col {cursor.column}
            </span>
            <span>Spaces: {fileFormat.tabSize}</span>
            <span>UTF-8</span>
            <span>{fileFormat.eol}</span>
            <span>{languageLabel(activeExtension)}</span>
          </span>
        ) : null}
      </footer>

      {palette ? <Palette mode={palette} items={paletteItems} onQuery={setPaletteQuery} onClose={closePalette} /> : null}
    </div>
  );
}
