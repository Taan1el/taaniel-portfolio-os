import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  ListFilter,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import {
  AppContent,
  AppScaffold,
  EmptyState,
  GridView,
  ScrollArea,
  StatusBar,
} from "@/components/apps/app-layout";
import { ExplorerSidebar, type ExplorerSidebarLocation } from "@/components/apps/explorer/explorer-sidebar";
import { ExplorerToolbar, type ExplorerBreadcrumb, type ExplorerCommand } from "@/components/apps/explorer/explorer-toolbar";
import { FilesIcon, FolderIcon, MusicIcon, PhotosIcon, RecycleBinEmptyIcon, RecycleBinFullIcon } from "@/components/icons/apps";
import { describeFileType, getFileIcon } from "@/components/icons/file-icon";
import { TRASH_PATH } from "@/lib/system-workspace";
import { resolveShellPath, SHELL_USER, toWindowsPath } from "@/lib/windows-path";
import { getParentPath, joinPath, normalizePath } from "@/lib/filesystem";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { openFileSystemPath } from "@/lib/launchers";
import { hasPathDragPayload, readPathDragPayload, setPathDragPayload } from "@/lib/drag-payload";
import { cn } from "@/lib/utils";
import { useExplorerStore, type ExplorerSortKey } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useRecentFilesStore } from "@/stores/recent-files-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { toast } from "@/stores/toast-store";
import type { AppComponentProps, ContextMenuAction, FileNode, VirtualFile } from "@/types/system";

interface ItemEventHandlers {
  onOpen: (node: FileNode) => void;
  onPointerDown: (node: FileNode, event: React.PointerEvent) => void;
  onContextMenu: (node: FileNode, event: React.MouseEvent) => void;
  onDoubleClick: (node: FileNode) => void;
  onDragStart: (node: FileNode, event: React.DragEvent) => void;
  onDragOver: (node: FileNode, event: React.DragEvent) => void;
  onDragLeave: (node: FileNode, event: React.DragEvent) => void;
  onDrop: (node: FileNode, event: React.DragEvent) => void;
  onCommitRename: (node: FileNode, nextName: string) => void;
  onCancelRename: () => void;
}

interface ExplorerItemPropsBase extends ItemEventHandlers {
  node: FileNode;
  selected: boolean;
  renaming: boolean;
  dropTarget: boolean;
  /** On the clipboard from a Cut: drawn faded until pasted, as in Windows. */
  cut: boolean;
  /** Showing the Recycle Bin: Details shows original location and date deleted. */
  recycleBin?: boolean;
}

const explorerLocations: ExplorerSidebarLocation[] = [
  { label: SHELL_USER, path: "/", icon: FilesIcon },
  { label: "Desktop", path: "/Desktop", icon: FolderIcon },
  { label: "Documents", path: "/Documents", icon: FolderIcon },
  { label: "Portfolio", path: "/Portfolio", icon: FolderIcon },
  { label: "Pictures", path: "/Media/Photography", icon: PhotosIcon },
  { label: "Music", path: "/Media/Music", icon: MusicIcon },
  { label: "Games", path: "/Games", icon: FolderIcon },
  { label: "Recycle Bin", path: TRASH_PATH, icon: RecycleBinEmptyIcon },
];

function buildBreadcrumbs(path: string): ExplorerBreadcrumb[] {
  const normalized = normalizePath(path);

  if (normalized === "/") {
    return [{ label: SHELL_USER, path: "/" }];
  }

  const parts = normalized.split("/").filter(Boolean);

  return [
    { label: SHELL_USER, path: "/" },
    ...parts.map((part, index) => ({
      label: part,
      path: `/${parts.slice(0, index + 1).join("/")}`,
    })),
  ];
}

function hasOnlyExternalFiles(event: React.DragEvent) {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes("Files") && !types.includes("application/x-taaniel-path");
}

function getFileNodeSearchText(node: FileNode) {
  return [node.name, node.path, node.type, node.mimeType ?? "", node.extension ?? ""].join(" ").toLowerCase();
}

function getNodeMeta(node: FileNode) {
  if (node.type === "folder") {
    return "Folder";
  }

  if (node.mimeType?.startsWith("image/")) {
    return node.mimeType.replace("image/", "").toUpperCase();
  }

  if (node.mimeType?.startsWith("audio/")) {
    return node.mimeType.replace("audio/", "").toUpperCase();
  }

  if (node.extension) {
    return node.extension.toUpperCase();
  }

  return "File";
}

function getNodeIcon(node: FileNode, size = 16) {
  const Icon = getFileIcon(node);
  return <Icon size={size} />;
}

/** Best available byte size of a file: recorded size, text length, or decoded data-URL length. */
function getNodeSize(node: { size?: number; content?: unknown; source?: string }) {
  if (typeof node.size === "number") return node.size;
  if (typeof node.content === "string") return node.content.length;
  if (node.source?.startsWith("data:")) {
    const comma = node.source.indexOf(",");
    return Math.floor(((node.source.length - comma - 1) * 3) / 4);
  }
  return 0;
}

/** Status bar size: "512 bytes", "2.34 KB", "1.20 MB". */
function formatSize(size?: number) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

/** Details column size: whole kilobytes rounded up, like Windows ("1 KB" for 12 bytes). */
function formatDetailsSize(size: number) {
  return `${Math.max(1, Math.ceil(size / 1024)).toLocaleString()} KB`;
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function sortNodes(nodes: FileNode[], key: ExplorerSortKey, direction: "asc" | "desc"): FileNode[] {
  const mult = direction === "asc" ? 1 : -1;
  return [...nodes].sort((a, b) => {
    // Folders always sort above files, regardless of key.
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    let cmp = 0;
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        break;
      case "date":
        cmp = a.updatedAt - b.updatedAt;
        break;
      case "size":
        cmp = (a.size ?? 0) - (b.size ?? 0);
        break;
      case "type":
        cmp = (a.extension ?? "").localeCompare(b.extension ?? "");
        break;
    }
    return cmp === 0
      ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      : cmp * mult;
  });
}

/** Disallow moving a folder into itself or any of its descendants. */
function isInvalidMoveTarget(sourcePath: string, destinationDirectory: string) {
  const src = normalizePath(sourcePath);
  const dst = normalizePath(destinationDirectory);
  return dst === src || dst.startsWith(`${src}/`);
}

interface RenameInputProps {
  initialName: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}

function RenameInput({ initialName, onCommit, onCancel }: RenameInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // Select just the basename so users can quickly type a new name while
    // keeping the extension.
    const dot = initialName.lastIndexOf(".");
    if (dot > 0) {
      el.setSelectionRange(0, dot);
    } else {
      el.select();
    }
  }, [initialName]);

  return (
    <input
      ref={inputRef}
      className="explorer-rename-input"
      defaultValue={initialName}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={(event) => onCommit(event.currentTarget.value)}
    />
  );
}

const ExplorerGridItem = memo(function ExplorerGridItem({
  node,
  selected,
  renaming,
  dropTarget,
  cut,
  onOpen,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCommitRename,
  onCancelRename,
}: ExplorerItemPropsBase) {
  const canRenderThumbnail =
    node.type === "file" &&
    Boolean(node.mimeType?.startsWith("image/")) &&
    Boolean(node.extension && isBrowserRenderableImageExtension(node.extension)) &&
    Boolean(node.source);

  return (
    <div
      className={cn(
        "explorer-grid-item",
        selected && "is-selected",
        dropTarget && "is-drop-target",
        renaming && "is-renaming",
        cut && "is-cut"
      )}
      data-path={node.path}
      role="button"
      tabIndex={-1}
      title={node.name}
      draggable={!renaming}
      onDragStart={(event) => onDragStart(node, event)}
      onDragOver={(event) => onDragOver(node, event)}
      onDragLeave={(event) => onDragLeave(node, event)}
      onDrop={(event) => onDrop(node, event)}
      onPointerDown={(event) => onPointerDown(node, event)}
      onClick={(event) => {
        // Click is handled via onPointerDown to support multi-select modifier
        // keys consistently; here we just stop the event from bubbling and
        // optionally activate the item for single-click users.
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick(node);
      }}
      onContextMenu={(event) => onContextMenu(node, event)}
      onKeyDown={(event) => {
        if (renaming) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(node);
        }
      }}
    >
      <span className="explorer-grid-item__thumb">
        {canRenderThumbnail ? (
          <img
            src={node.source}
            alt={node.name}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          getNodeIcon(node, 48)
        )}
      </span>
      {renaming ? (
        <RenameInput
          initialName={node.name}
          onCommit={(next) => onCommitRename(node, next)}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="explorer-grid-item__label">{node.name}</span>
      )}
    </div>
  );
});

const ExplorerListItem = memo(function ExplorerListItem({
  node,
  selected,
  renaming,
  dropTarget,
  cut,
  recycleBin,
  onOpen,
  onPointerDown,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCommitRename,
  onCancelRename,
}: ExplorerItemPropsBase) {
  const size = getNodeSize(node);

  return (
    <div
      className={cn(
        "explorer-list-item w11-details__row",
        selected && "is-selected",
        dropTarget && "is-drop-target",
        renaming && "is-renaming",
        cut && "is-cut"
      )}
      data-path={node.path}
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      title={node.name}
      draggable={!renaming}
      onDragStart={(event) => onDragStart(node, event)}
      onDragOver={(event) => onDragOver(node, event)}
      onDragLeave={(event) => onDragLeave(node, event)}
      onDrop={(event) => onDrop(node, event)}
      onPointerDown={(event) => onPointerDown(node, event)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick(node);
      }}
      onContextMenu={(event) => onContextMenu(node, event)}
      onKeyDown={(event) => {
        if (renaming) return;
        if (event.key === "Enter") {
          event.preventDefault();
          onOpen(node);
        }
      }}
    >
      <span className="w11-details__cell w11-details__name" role="gridcell">
        <span className="w11-details__icon">{getNodeIcon(node, 16)}</span>
        {renaming ? (
          <RenameInput
            initialName={node.name}
            onCommit={(next) => onCommitRename(node, next)}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="w11-details__label">{node.name}</span>
        )}
      </span>
      {recycleBin ? (
        <>
          <span className="w11-details__cell" role="gridcell">
            {node.originalPath ? toWindowsPath(getParentPath(node.originalPath)) : ""}
          </span>
          <span className="w11-details__cell" role="gridcell">
            {node.deletedAt ? formatDateTime(node.deletedAt) : ""}
          </span>
        </>
      ) : (
        <>
          <span className="w11-details__cell" role="gridcell">{formatDateTime(node.updatedAt)}</span>
          <span className="w11-details__cell" role="gridcell">{describeFileType(node)}</span>
        </>
      )}
      <span className="w11-details__cell w11-details__size" role="gridcell">
        {node.type === "file" ? formatDetailsSize(size) : ""}
      </span>
    </div>
  );
});

export function FileExplorerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const mkdir = useFileSystemStore((state) => state.mkdir);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const importFiles = useFileSystemStore((state) => state.importFiles);
  const rename = useFileSystemStore((state) => state.rename);
  const deleteNode = useFileSystemStore((state) => state.deleteNode);
  const deleteNodePermanently = useFileSystemStore((state) => state.deleteNodePermanently);
  const restoreNode = useFileSystemStore((state) => state.restoreNode);
  const pasteNode = useFileSystemStore((state) => state.pasteNode);
  const canCutNode = useFileSystemStore((state) => state.canCutNode);
  const emptyTrash = useFileSystemStore((state) => state.emptyTrash);
  const launchApp = useSystemStore((state) => state.launchApp);
  const recentPaths = useRecentFilesStore((state) => state.recentPaths);
  const clearRecent = useRecentFilesStore((state) => state.clearRecent);

  const clipboard = useShellStore((state) => state.clipboard);
  const setClipboard = useShellStore((state) => state.setClipboard);
  const clearClipboard = useShellStore((state) => state.clearClipboard);
  const setContextMenu = useShellStore((state) => state.setContextMenu);

  const {
    session,
    ensureSession,
    navigate,
    goBack,
    goForward,
    setSelectedPath,
    setSelectedPaths,
    toggleSelected,
    extendSelection,
    clearSelection,
    beginRename,
    endRename,
    setSearchQuery,
    setViewMode,
    setSort,
  } = useExplorerStore(
    useShallow((state) => ({
      session: state.sessions[window.id],
      ensureSession: state.ensureSession,
      navigate: state.navigate,
      goBack: state.goBack,
      goForward: state.goForward,
      setSelectedPath: state.setSelectedPath,
      setSelectedPaths: state.setSelectedPaths,
      toggleSelected: state.toggleSelected,
      extendSelection: state.extendSelection,
      clearSelection: state.clearSelection,
      beginRename: state.beginRename,
      endRename: state.endRename,
      setSearchQuery: state.setSearchQuery,
      setViewMode: state.setViewMode,
      setSort: state.setSort,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const initialPath = window.payload?.directoryPath ?? "/Portfolio";
  const [externalDropActive, setExternalDropActive] = useState(false);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const [addressEditNonce, setAddressEditNonce] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const typeAheadRef = useRef({ text: "", at: 0 });

  useEffect(() => {
    ensureSession(window.id, initialPath);
  }, [ensureSession, initialPath, window.id]);

  const currentPath = session?.currentPath ?? normalizePath(initialPath);
  const searchQuery = session?.searchQuery ?? "";
  const selectedPaths = session?.selectedPaths ?? [];
  const renamingPath = session?.renamingPath ?? null;
  const viewMode = session?.viewMode ?? "grid";
  const sortKey = session?.sortKey ?? "name";
  const sortDirection = session?.sortDirection ?? "asc";
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const currentNode = nodes[currentPath];
  const currentDirectoryPath =
    currentNode?.kind === "directory" ? currentNode.path : "/";
  const isTrashView = currentDirectoryPath === TRASH_PATH || currentDirectoryPath.startsWith(`${TRASH_PATH}/`);
  const isRecycleBinRoot = currentDirectoryPath === TRASH_PATH;
  const recycleBinFull = Object.keys(nodes).some((path) => path.startsWith(`${TRASH_PATH}/`));
  const currentLabel = currentDirectoryPath === "/" ? SHELL_USER : isRecycleBinRoot ? "Recycle Bin" : (currentNode?.name ?? SHELL_USER);
  const cutPaths = useMemo(
    () => new Set(clipboard?.operation === "cut" ? clipboard.paths : []),
    [clipboard]
  );

  const children = useMemo(
    () => listDirectory(currentDirectoryPath),
    // refreshTick re-reads the folder on F5 / Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDirectoryPath, listDirectory, nodes, refreshTick]
  );

  const sortedChildren = useMemo(
    () => sortNodes(children, sortKey, sortDirection),
    [children, sortKey, sortDirection]
  );

  const filteredChildren = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedChildren;
    return sortedChildren.filter((node) => getFileNodeSearchText(node).includes(normalizedQuery));
  }, [sortedChildren, deferredSearchQuery]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentDirectoryPath), [currentDirectoryPath]);

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const selectedNode = selectedPaths.length > 0 ? nodes[selectedPaths[selectedPaths.length - 1]] ?? null : null;

  // Drop selection rectangles that point to deleted nodes.
  useEffect(() => {
    if (selectedPaths.length === 0) return;
    const valid = selectedPaths.filter((p) => nodes[p]);
    if (valid.length !== selectedPaths.length) {
      setSelectedPaths(window.id, valid);
    }
  }, [nodes, selectedPaths, setSelectedPaths, window.id]);

  const plural = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;
  const selectedNodes = selectedPaths.map((path) => nodes[path]).filter(Boolean);
  const selectedSize = selectedNodes.every((node) => node.kind === "file")
    ? selectedNodes.reduce((total, node) => total + getNodeSize(node as VirtualFile), 0)
    : 0;

  const openNode = (node: FileNode) => {
    if (node.type === "folder") {
      navigate(window.id, node.path);
      return;
    }
    openFileSystemPath(node.path, nodes, launchApp);
  };

  const uploadIntoCurrentDirectory = async (files: File[] | FileList) => {
    const importedPaths = await importFiles(currentDirectoryPath, Array.from(files));
    const latestPath = importedPaths.at(-1);
    if (latestPath) {
      setSelectedPath(window.id, latestPath);
    }
  };

  const createFolder = async () => {
    const createdPath = await mkdir(joinPath(currentDirectoryPath, "New folder"), { uniqueName: true });
    setSelectedPath(window.id, createdPath);
    beginRename(window.id, createdPath);
  };

  const createNote = async () => {
    const createdPath = await writeFile(joinPath(currentDirectoryPath, "New Text Document.txt"), "", {
      mimeType: "text/plain",
      extension: "txt",
      uniqueName: true,
    });
    setSelectedPath(window.id, createdPath);
    beginRename(window.id, createdPath);
  };

  const commitRename = async (node: FileNode, nextName: string) => {
    const trimmed = nextName.trim();
    endRename(window.id);

    if (!trimmed || trimmed === node.name) {
      return;
    }

    try {
      const nextPath = await rename(node.path, trimmed);
      setSelectedPath(window.id, nextPath);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not rename", "error");
    }
  };

  const moveSelectionToTrash = async () => {
    const targets = selectedPaths.slice();
    if (targets.length === 0) return;
    for (const path of targets) {
      // eslint-disable-next-line no-await-in-loop
      await deleteNode(path, { quiet: targets.length > 1 });
    }
    if (targets.length > 1) toast(`Moved ${targets.length} items to the Recycle Bin`, "success");
    clearSelection(window.id);
  };

  const duplicateSelection = async () => {
    const targets = selectedPaths.slice();
    if (targets.length === 0) return;
    for (const path of targets) {
      const parent = getParentPath(path);
      // eslint-disable-next-line no-await-in-loop
      await pasteNode(path, parent, "copy");
    }
  };

  const copySelection = () => {
    if (selectedPaths.length === 0) return;
    setClipboard({ paths: selectedPaths.slice(), operation: "copy" });
  };

  const cutSelection = () => {
    if (selectedPaths.length === 0) return;
    if (selectedPaths.some((path) => !canCutNode(path))) {
      toast("Read-only items can't be cut", "error");
      return;
    }
    setClipboard({ paths: selectedPaths.slice(), operation: "cut" });
  };

  const pasteIntoCurrentDirectory = async (destination = currentDirectoryPath) => {
    if (!clipboard) return;
    const sources = clipboard.paths.filter((path) => nodes[path]);
    if (sources.some((path) => isInvalidMoveTarget(path, destination))) {
      toast("The destination folder is a subfolder of the source folder", "error");
      return;
    }
    const quiet = sources.length > 1;
    for (const path of sources) {
      if (clipboard.operation === "cut" && getParentPath(path) === destination) continue;
      // Sequential on purpose: each paste reads the store the previous one wrote.
      // eslint-disable-next-line no-await-in-loop
      await pasteNode(path, destination, clipboard.operation, { quiet });
    }
    if (quiet) toast(`${clipboard.operation === "cut" ? "Moved" : "Copied"} ${sources.length} items`, "success");
    if (clipboard.operation === "cut") {
      clearClipboard();
    }
  };

  const restoreItems = async (paths: string[]) => {
    let restored = 0;
    for (const path of paths) {
      // eslint-disable-next-line no-await-in-loop
      if (await restoreNode(path)) restored += 1;
    }
    clearSelection(window.id);
    if (restored > 0) toast(restored === 1 ? "Restored 1 item" : `Restored ${restored} items`, "success");
  };

  const deletePermanently = async (paths: string[]) => {
    if (paths.length === 0) return;
    const message =
      paths.length === 1
        ? `Are you sure you want to permanently delete "${nodes[paths[0]]?.name ?? "this item"}"?`
        : `Are you sure you want to permanently delete these ${paths.length} items?`;
    if (!globalThis.confirm(message)) return;
    for (const path of paths) {
      // eslint-disable-next-line no-await-in-loop
      await deleteNodePermanently(path);
    }
    clearSelection(window.id);
  };

  const emptyRecycleBin = () => {
    const count = listDirectory(TRASH_PATH).length;
    if (count === 0) return;
    if (globalThis.confirm(`Are you sure you want to permanently delete ${count === 1 ? "this item" : `these ${count} items`}?`)) {
      void emptyTrash();
    }
  };

  const goUp = () => {
    if (currentDirectoryPath !== "/") navigate(window.id, getParentPath(currentDirectoryPath));
  };

  const submitAddress = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
      launchApp({ appId: "browser", payload: { externalUrl: trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed } });
      return;
    }
    const path = resolveShellPath(trimmed, currentDirectoryPath, nodes);
    const target = nodes[path];
    if (!target) {
      toast(`Can't find '${trimmed}'. Check the spelling and try again.`, "error");
      return;
    }
    if (target.kind === "directory") navigate(window.id, path);
    else openFileSystemPath(path, nodes, launchApp);
  };

  /** Command-bar dropdowns reuse the shell context menu, anchored under the button. */
  const openMenuAt = (event: React.MouseEvent<HTMLButtonElement>, title: string, actions: ContextMenuAction[]) => {
    // The desktop closes menus on click; keep this click from reaching it.
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, title, actions });
  };

  const moveDraggedPathsTo = async (paths: string[], destinationDirectoryPath: string) => {
    const destination = normalizePath(destinationDirectoryPath);

    let moved = 0;
    for (const raw of paths) {
      const source = normalizePath(raw);
      if (source === destination) continue;
      if (getParentPath(source) === destination) continue; // already there
      if (isInvalidMoveTarget(source, destination)) {
        toast(`Cannot move "${source}" into itself`, "error");
        continue;
      }
      if (!canCutNode(source)) {
        toast(`"${source}" is read-only`, "error");
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await pasteNode(source, destination, "cut", { quiet: true });
      moved += 1;
    }

    if (moved > 0) {
      toast(moved === 1 ? "Moved 1 item" : `Moved ${moved} items`, "success");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Context menu builders                                              */
  /* ------------------------------------------------------------------ */

  const buildItemContextMenu = (node: FileNode): ContextMenuAction[] => {
    const isSelected = selectedSet.has(node.path);
    const targets = isSelected && selectedPaths.length > 1 ? selectedPaths : [node.path];
    const multi = targets.length > 1;
    const inTrash = node.path.startsWith("/Trash/") || node.path === "/Trash";
    const isReadonly = !canCutNode(node.path);

    const actions: ContextMenuAction[] = [];

    if (inTrash && getParentPath(node.path) === TRASH_PATH) {
      actions.push({
        id: "restore",
        label: multi ? `Restore ${targets.length} items` : "Restore",
        icon: RotateCcw,
        onSelect: () => void restoreItems(targets),
      });
      actions.push({ id: "sep-restore", label: "", separator: true, onSelect: () => {} });
    }

    actions.push({
      id: "open",
      label: node.type === "folder" ? "Open" : "Open",
      icon: node.type === "folder" ? FolderOpen : ExternalLink,
      onSelect: () => openNode(node),
    });

    if (node.type === "folder") {
      actions.push({
        id: "open-new-window",
        label: "Open in new window",
        icon: ExternalLink,
        onSelect: () =>
          launchApp({
            appId: "files",
            payload: { directoryPath: node.path },
          }),
      });
    }

    actions.push({ id: "sep-1", label: "", separator: true, onSelect: () => {} });

    actions.push({
      id: "rename",
      label: "Rename",
      icon: Pencil,
      shortcut: "F2",
      disabled: multi || isReadonly,
      onSelect: () => beginRename(window.id, node.path),
    });

    actions.push({
      id: "duplicate",
      label: multi ? `Duplicate ${targets.length} items` : "Duplicate",
      icon: Copy,
      onSelect: () => void duplicateSelection(),
    });

    actions.push({ id: "sep-2", label: "", separator: true, onSelect: () => {} });

    actions.push({
      id: "cut",
      label: multi ? `Cut ${targets.length} items` : "Cut",
      icon: Scissors,
      shortcut: "Ctrl+X",
      disabled: isReadonly,
      onSelect: () => cutSelection(),
    });

    actions.push({
      id: "copy",
      label: multi ? `Copy ${targets.length} items` : "Copy",
      icon: Copy,
      shortcut: "Ctrl+C",
      onSelect: () => copySelection(),
    });

    if (clipboard && node.type === "folder") {
      actions.push({
        id: "paste-into",
        label: clipboard.operation === "cut" ? "Move here" : "Paste into folder",
        icon: ClipboardPaste,
        onSelect: () => void pasteIntoCurrentDirectory(node.path),
      });
    }

    actions.push({ id: "sep-3", label: "", separator: true, onSelect: () => {} });

    if (inTrash) {
      actions.push({
        id: "delete-permanent",
        label: multi ? `Delete ${targets.length} items permanently` : "Delete permanently",
        icon: Trash2,
        danger: true,
        onSelect: () => void deletePermanently(targets),
      });
    } else {
      actions.push({
        id: "trash",
        label: multi ? `Delete ${targets.length} items` : "Delete",
        icon: Trash2,
        shortcut: "Del",
        danger: true,
        disabled: isReadonly,
        onSelect: () => void moveSelectionToTrash(),
      });
    }

    if (!multi) {
      actions.push({ id: "sep-4", label: "", separator: true, onSelect: () => {} });
      actions.push({
        id: "reveal",
        label: "Open file location",
        icon: MapPin,
        onSelect: () => navigate(window.id, getParentPath(node.path)),
      });
    }

    return actions;
  };

  const buildEmptyAreaContextMenu = (): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = [];

    actions.push({
      id: "new-folder",
      label: "New folder",
      icon: FolderPlus,
      onSelect: () => void createFolder(),
    });

    actions.push({
      id: "new-note",
      label: "New text document",
      icon: FilePlus2,
      onSelect: () => void createNote(),
    });

    actions.push({
      id: "upload",
      label: "Upload files…",
      icon: Upload,
      onSelect: () => fileInputRef.current?.click(),
    });

    actions.push({ id: "sep-empty-1", label: "", separator: true, onSelect: () => {} });

    actions.push({
      id: "paste",
      label: "Paste",
      icon: ClipboardPaste,
      shortcut: "Ctrl+V",
      disabled: !clipboard,
      onSelect: () => void pasteIntoCurrentDirectory(),
    });

    actions.push({ id: "sep-empty-2", label: "", separator: true, onSelect: () => {} });

    const sortIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;
    const sortToggle = (key: ExplorerSortKey): ContextMenuAction => ({
      id: `sort-${key}`,
      label:
        key === "name"
          ? "Sort by name"
          : key === "date"
            ? "Sort by date modified"
            : key === "size"
              ? "Sort by size"
              : "Sort by type",
      icon: key === sortKey ? sortIcon : ListFilter,
      onSelect: () => {
        const nextDir: "asc" | "desc" = key === sortKey && sortDirection === "asc" ? "desc" : "asc";
        setSort(window.id, key, nextDir);
      },
    });

    actions.push(sortToggle("name"));
    actions.push(sortToggle("date"));
    actions.push(sortToggle("size"));
    actions.push(sortToggle("type"));

    actions.push({ id: "sep-empty-3", label: "", separator: true, onSelect: () => {} });

    actions.push({
      id: "select-all",
      label: "Select all",
      icon: CheckSquare,
      shortcut: "Ctrl+A",
      onSelect: () => setSelectedPaths(window.id, filteredChildren.map((c) => c.path)),
    });

    if (isTrashView) {
      actions.push({
        id: "empty-trash",
        label: "Empty Recycle Bin",
        icon: Trash2,
        danger: true,
        onSelect: emptyRecycleBin,
      });
    }

    return actions;
  };

  /* ------------------------------------------------------------------ */
  /*  Event handlers                                                     */
  /* ------------------------------------------------------------------ */

  const handleItemPointerDown = (node: FileNode, event: React.PointerEvent) => {
    if (renamingPath === node.path) return;
    if (event.button !== 0 && event.button !== 2) return;

    event.stopPropagation();

    if (event.button === 2) {
      // Right-click: select the item if not already selected, then let
      // onContextMenu open the menu.
      if (!selectedSet.has(node.path)) {
        setSelectedPath(window.id, node.path);
      }
      return;
    }

    if (event.shiftKey) {
      extendSelection(
        window.id,
        node.path,
        filteredChildren.map((c) => c.path)
      );
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      toggleSelected(window.id, node.path);
      return;
    }

    setSelectedPath(window.id, node.path);
  };

  const handleItemContextMenu = (node: FileNode, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // If the user right-clicks outside the current selection, snap selection
    // to just this item.
    if (!selectedSet.has(node.path)) {
      setSelectedPath(window.id, node.path);
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: node.name,
      actions: buildItemContextMenu(node),
    });
  };

  const handleItemDoubleClick = (node: FileNode) => {
    openNode(node);
  };

  const handleItemDragStart = (node: FileNode, event: React.DragEvent) => {
    // If dragging an item that isn't currently selected, drag just that item.
    const draggedPaths = selectedSet.has(node.path) ? selectedPaths.slice() : [node.path];
    setPathDragPayload(event.dataTransfer, draggedPaths);
    if (!selectedSet.has(node.path)) {
      setSelectedPath(window.id, node.path);
    }
  };

  const handleItemDragOver = (node: FileNode, event: React.DragEvent) => {
    // Only folders accept drops, and only if the drag carries one of our paths
    // or external files.
    const isFolder = node.type === "folder";
    const internal = hasPathDragPayload(event.dataTransfer);
    const external = hasOnlyExternalFiles(event);
    if (!isFolder || (!internal && !external)) return;

    // Don't accept drop into the same folder being dragged.
    if (internal) {
      const dragged = readPathDragPayload(event.dataTransfer);
      if (dragged.some((p) => isInvalidMoveTarget(p, node.path) || getParentPath(p) === node.path)) {
        return;
      }
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = internal ? "move" : "copy";
    if (dropTargetPath !== node.path) {
      setDropTargetPath(node.path);
    }
  };

  const handleItemDragLeave = (node: FileNode, _event: React.DragEvent) => {
    if (dropTargetPath === node.path) {
      setDropTargetPath(null);
    }
  };

  const handleItemDrop = (node: FileNode, event: React.DragEvent) => {
    if (node.type !== "folder") return;
    event.preventDefault();
    event.stopPropagation();
    setDropTargetPath(null);

    const internalPaths = readPathDragPayload(event.dataTransfer);
    if (internalPaths.length > 0) {
      void moveDraggedPathsTo(internalPaths, node.path);
      return;
    }

    if (hasOnlyExternalFiles(event)) {
      void (async () => {
        const importedPaths = await importFiles(node.path, Array.from(event.dataTransfer.files));
        if (importedPaths.length > 0) {
          toast(
            importedPaths.length === 1 ? `Imported into ${node.name}` : `Imported ${importedPaths.length} files`,
            "success"
          );
        }
      })();
    }
  };

  const handleEmptyAreaContextMenu = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(".explorer-grid-item, .explorer-list-item")) {
      return; // item handler will fire instead
    }
    event.preventDefault();
    clearSelection(window.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: currentDirectoryPath,
      actions: buildEmptyAreaContextMenu(),
    });
  };

  const handleBackgroundClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(".explorer-grid-item, .explorer-list-item")) {
      return;
    }
    clearSelection(window.id);
  };

  const scrollToPath = (path: string) => {
    const item = contentRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
    item?.scrollIntoView({ block: "nearest" });
  };

  /** Items per row in Large icons view, measured from the laid-out grid. */
  const measureColumns = () => {
    const items = contentRef.current?.querySelectorAll<HTMLElement>("[data-path]");
    if (!items || items.length === 0 || viewMode !== "grid") return 1;
    const top = items[0].offsetTop;
    let count = 0;
    for (const item of Array.from(items)) {
      if (item.offsetTop !== top) break;
      count += 1;
    }
    return Math.max(1, count);
  };

  const openSelection = () => {
    selectedPaths.forEach((path) => {
      const node = listDirectory(getParentPath(path)).find((entry) => entry.path === path);
      if (node) openNode(node);
    });
  };

  /** Window-wide shortcuts: they work while the address bar or toolbar has focus too. */
  const handleWindowKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;

    if (event.altKey && key === "ArrowLeft") {
      event.preventDefault();
      goBack(window.id);
    } else if (event.altKey && key === "ArrowRight") {
      event.preventDefault();
      goForward(window.id);
    } else if (event.altKey && key === "ArrowUp") {
      event.preventDefault();
      goUp();
    } else if ((ctrl && key.toLowerCase() === "l") || (event.altKey && key.toLowerCase() === "d") || key === "F4") {
      event.preventDefault();
      setAddressEditNonce((value) => value + 1);
    } else if ((ctrl && key.toLowerCase() === "f") || key === "F3") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>(".w11-explorer__search input")?.focus();
    } else if (ctrl && event.shiftKey && key.toLowerCase() === "n") {
      event.preventDefault();
      void createFolder();
    } else if (key === "F5") {
      event.preventDefault();
      setRefreshTick((value) => value + 1);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Don't hijack typing inside the search input, rename input, etc.
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (renamingPath) return;
    if (event.altKey) return;

    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;

    if (key === "Delete") {
      if (selectedPaths.length === 0) return;
      event.preventDefault();
      if (event.shiftKey || isTrashView) void deletePermanently(selectedPaths.slice());
      else void moveSelectionToTrash();
      return;
    }

    // Backspace goes back, as in Windows - it never deletes.
    if (key === "Backspace") {
      event.preventDefault();
      goBack(window.id);
      return;
    }

    if (key === "F2") {
      if (selectedPaths.length !== 1) return;
      event.preventDefault();
      beginRename(window.id, selectedPaths[0]);
      return;
    }

    if (key === "Enter") {
      if (selectedPaths.length === 0) return;
      event.preventDefault();
      openSelection();
      return;
    }

    if (key === "Escape") {
      event.preventDefault();
      clearSelection(window.id);
      return;
    }

    if (ctrl && key.toLowerCase() === "a") {
      event.preventDefault();
      setSelectedPaths(window.id, filteredChildren.map((c) => c.path));
      return;
    }

    if (ctrl && key.toLowerCase() === "c") {
      event.preventDefault();
      copySelection();
      return;
    }

    if (ctrl && key.toLowerCase() === "x") {
      event.preventDefault();
      cutSelection();
      return;
    }

    if (ctrl && key.toLowerCase() === "v") {
      event.preventDefault();
      void pasteIntoCurrentDirectory();
      return;
    }

    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) {
      if (filteredChildren.length === 0) return;
      event.preventDefault();
      const ordered = filteredChildren.map((c) => c.path);
      const anchor = selectedPaths.at(-1);
      const index = anchor ? ordered.indexOf(anchor) : -1;
      const columns = measureColumns();
      let next = index;

      if (index < 0) next = 0;
      else if (key === "ArrowRight") next = viewMode === "grid" ? index + 1 : index;
      else if (key === "ArrowLeft") next = viewMode === "grid" ? index - 1 : index;
      else if (key === "ArrowDown") next = index + columns;
      else if (key === "ArrowUp") next = index - columns;
      else if (key === "Home") next = 0;
      else if (key === "End") next = ordered.length - 1;

      next = Math.min(ordered.length - 1, Math.max(0, next));
      const path = ordered[next];
      if (event.shiftKey) extendSelection(window.id, path, ordered);
      else if (ctrl) return;
      else setSelectedPath(window.id, path);
      scrollToPath(path);
      return;
    }

    // Type-to-select: typing a name jumps to the first match.
    if (key.length === 1 && !ctrl && key !== " ") {
      const now = Date.now();
      const text = now - typeAheadRef.current.at < 900 ? typeAheadRef.current.text + key : key;
      typeAheadRef.current = { text, at: now };
      const match = filteredChildren.find((node) => node.name.toLowerCase().startsWith(text.toLowerCase()));
      if (match) {
        setSelectedPath(window.id, match.path);
        scrollToPath(match.path);
      }
    }
  };

  const hasSelection = selectedPaths.length > 0;
  const selectionReadonly = selectedPaths.some((path) => !canCutNode(path));
  const sortMenu = (): ContextMenuAction[] => {
    const option = (key: ExplorerSortKey, label: string): ContextMenuAction => ({
      id: `sort-${key}`,
      label,
      icon: sortKey === key ? Check : undefined,
      onSelect: () => setSort(window.id, key, sortDirection),
    });
    return [
      option("name", "Name"),
      option("date", isRecycleBinRoot ? "Date deleted" : "Date modified"),
      option("type", "Type"),
      option("size", "Size"),
      { id: "sep-sort", label: "", separator: true, onSelect: () => {} },
      { id: "asc", label: "Ascending", icon: sortDirection === "asc" ? Check : undefined, onSelect: () => setSort(window.id, sortKey, "asc") },
      { id: "desc", label: "Descending", icon: sortDirection === "desc" ? Check : undefined, onSelect: () => setSort(window.id, sortKey, "desc") },
    ];
  };
  const viewMenu = (): ContextMenuAction[] => [
    { id: "view-large", label: "Large icons", icon: viewMode === "grid" ? Check : LayoutGrid, onSelect: () => setViewMode(window.id, "grid") },
    { id: "view-details", label: "Details", icon: viewMode === "list" ? Check : List, onSelect: () => setViewMode(window.id, "list") },
  ];

  const commands: ExplorerCommand[] = isRecycleBinRoot
    ? [
        {
          id: "empty",
          label: "Empty Recycle Bin",
          icon: Trash2,
          showLabel: true,
          disabled: children.length === 0,
          onSelect: emptyRecycleBin,
        },
        {
          id: "restore",
          label: hasSelection ? "Restore the selected items" : "Restore all items",
          icon: RotateCcw,
          showLabel: true,
          disabled: children.length === 0,
          onSelect: () => void restoreItems(hasSelection ? selectedPaths.slice() : children.map((child) => child.path)),
        },
        { id: "delete", label: "Delete", icon: Trash2, groupStart: true, disabled: !hasSelection, onSelect: () => void deletePermanently(selectedPaths.slice()) },
        { id: "sort", label: "Sort", icon: ArrowUpDown, showLabel: true, hasMenu: true, groupStart: true, onSelect: (event) => openMenuAt(event, "Sort by", sortMenu()) },
        { id: "view", label: "View", icon: viewMode === "grid" ? LayoutGrid : List, showLabel: true, hasMenu: true, onSelect: (event) => openMenuAt(event, "View", viewMenu()) },
      ]
    : [
        {
          id: "new",
          label: "New",
          icon: Plus,
          showLabel: true,
          hasMenu: true,
          disabled: isTrashView,
          onSelect: (event) =>
            openMenuAt(event, "New", [
              { id: "new-folder", label: "Folder", icon: FolderPlus, shortcut: "Ctrl+Shift+N", onSelect: () => void createFolder() },
              { id: "new-text", label: "Text document", icon: FilePlus2, onSelect: () => void createNote() },
              { id: "sep-new", label: "", separator: true, onSelect: () => {} },
              { id: "upload", label: "Upload files…", icon: Upload, onSelect: () => fileInputRef.current?.click() },
            ]),
        },
        { id: "cut", label: "Cut (Ctrl+X)", icon: Scissors, groupStart: true, disabled: !hasSelection || selectionReadonly, onSelect: cutSelection },
        { id: "copy", label: "Copy (Ctrl+C)", icon: Copy, disabled: !hasSelection, onSelect: copySelection },
        { id: "paste", label: "Paste (Ctrl+V)", icon: ClipboardPaste, disabled: !clipboard, onSelect: () => void pasteIntoCurrentDirectory() },
        {
          id: "rename",
          label: "Rename (F2)",
          icon: Pencil,
          disabled: selectedPaths.length !== 1 || selectionReadonly,
          onSelect: () => beginRename(window.id, selectedPaths[0]),
        },
        { id: "delete", label: "Delete (Del)", icon: Trash2, disabled: !hasSelection || selectionReadonly, onSelect: () => void moveSelectionToTrash() },
        { id: "sort", label: "Sort", icon: ArrowUpDown, showLabel: true, hasMenu: true, groupStart: true, onSelect: (event) => openMenuAt(event, "Sort by", sortMenu()) },
        { id: "view", label: "View", icon: viewMode === "grid" ? LayoutGrid : List, showLabel: true, hasMenu: true, onSelect: (event) => openMenuAt(event, "View", viewMenu()) },
      ];

  const navLocations = explorerLocations.map((location) =>
    location.path === TRASH_PATH ? { ...location, icon: recycleBinFull ? RecycleBinFullIcon : RecycleBinEmptyIcon } : location
  );

  const detailsColumns: Array<{ label: string; sort?: ExplorerSortKey }> = isRecycleBinRoot
    ? [{ label: "Name", sort: "name" }, { label: "Original location" }, { label: "Date deleted", sort: "date" }, { label: "Size", sort: "size" }]
    : [{ label: "Name", sort: "name" }, { label: "Date modified", sort: "date" }, { label: "Type", sort: "type" }, { label: "Size", sort: "size" }];

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  const itemHandlers: ItemEventHandlers = {
    onOpen: openNode,
    onPointerDown: handleItemPointerDown,
    onContextMenu: handleItemContextMenu,
    onDoubleClick: handleItemDoubleClick,
    onDragStart: handleItemDragStart,
    onDragOver: handleItemDragOver,
    onDragLeave: handleItemDragLeave,
    onDrop: handleItemDrop,
    onCommitRename: commitRename,
    onCancelRename: () => endRename(window.id),
  };

  return (
    <AppScaffold className="explorer-window w11-explorer" onKeyDown={handleWindowKeyDown}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (!event.target.files?.length) {
            return;
          }
          void uploadIntoCurrentDirectory(event.target.files);
          event.target.value = "";
        }}
      />

      <ExplorerToolbar
        currentPath={currentDirectoryPath}
        breadcrumbs={breadcrumbs.map((crumb) => (crumb.path === TRASH_PATH ? { ...crumb, label: "Recycle Bin" } : crumb))}
        canGoBack={Boolean(session && session.historyIndex > 0)}
        canGoForward={Boolean(session && session.historyIndex < session.history.length - 1)}
        canGoUp={currentDirectoryPath !== "/"}
        onGoBack={() => goBack(window.id)}
        onGoForward={() => goForward(window.id)}
        onGoUp={goUp}
        onRefresh={() => setRefreshTick((value) => value + 1)}
        onNavigate={(path) => navigate(window.id, path)}
        onAddressSubmit={submitAddress}
        addressEditNonce={addressEditNonce}
        searchQuery={searchQuery}
        searchPlaceholder={`Search ${currentLabel}`}
        onSearchChange={(query) => setSearchQuery(window.id, query)}
        commands={commands}
      />

      <AppContent className="explorer-window__layout" padded={false} scrollable={false} stacked={false}>
        <ExplorerSidebar
          locations={navLocations}
          activePath={currentDirectoryPath}
          recentPaths={recentPaths}
          onNavigate={(path) => navigate(window.id, path)}
          onOpenFile={(path) => openFileSystemPath(path, nodes, launchApp)}
          onClearRecent={clearRecent}
          dropTargetPath={dropTargetPath}
          onItemDragOver={(path, event) => {
            const internal = hasPathDragPayload(event.dataTransfer);
            if (!internal) return;
            const dragged = readPathDragPayload(event.dataTransfer);
            if (dragged.some((p) => isInvalidMoveTarget(p, path) || getParentPath(p) === path)) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetPath(path);
          }}
          onItemDragLeave={(path) => {
            if (dropTargetPath === path) setDropTargetPath(null);
          }}
          onItemDrop={(path, event) => {
            event.preventDefault();
            setDropTargetPath(null);
            const dragged = readPathDragPayload(event.dataTransfer);
            if (dragged.length > 0) {
              void moveDraggedPathsTo(dragged, path);
            }
          }}
        />

        <section
          ref={contentRef}
          className={cn("explorer-window__content", externalDropActive && "is-drop-target")}
          tabIndex={0}
          role="presentation"
          onClick={handleBackgroundClick}
          onContextMenu={handleEmptyAreaContextMenu}
          onKeyDown={handleKeyDown}
          onDragEnter={(event) => {
            if (!hasOnlyExternalFiles(event)) return;
            event.preventDefault();
            dragDepthRef.current += 1;
            setExternalDropActive(true);
          }}
          onDragLeave={(event) => {
            if (!hasOnlyExternalFiles(event)) return;
            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setExternalDropActive(false);
          }}
          onDragOver={(event) => {
            const internal = hasPathDragPayload(event.dataTransfer);
            const external = hasOnlyExternalFiles(event);
            if (!internal && !external) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = internal ? "move" : "copy";
          }}
          onDrop={(event) => {
            if ((event.target as HTMLElement).closest(".explorer-grid-item, .explorer-list-item")) {
              return;
            }
            const internal = readPathDragPayload(event.dataTransfer);
            if (internal.length > 0) {
              event.preventDefault();
              void moveDraggedPathsTo(internal, currentDirectoryPath);
              return;
            }
            if (hasOnlyExternalFiles(event)) {
              event.preventDefault();
              dragDepthRef.current = 0;
              setExternalDropActive(false);
              void uploadIntoCurrentDirectory(event.dataTransfer.files);
            }
          }}
        >
          {externalDropActive ? (
            <div className="explorer-window__dropzone">
              <strong>Drop files to add them here</strong>
              <small>Images, notes, and other files are saved into the IndexedDB filesystem.</small>
            </div>
          ) : null}

          <ScrollArea className="explorer-window__scroll-area" padded>
            {filteredChildren.length > 0 ? (
              viewMode === "grid" ? (
                <GridView
                  className="explorer-grid"
                  minItemWidth={108}
                  role="list"
                  aria-label={`${currentDirectoryPath} contents`}
                >
                  {filteredChildren.map((node) => (
                    <ExplorerGridItem
                      key={node.path}
                      node={node}
                      selected={selectedSet.has(node.path)}
                      renaming={renamingPath === node.path}
                      dropTarget={dropTargetPath === node.path}
                      cut={cutPaths.has(node.path)}
                      {...itemHandlers}
                    />
                  ))}
                </GridView>
              ) : (
                <div className="explorer-list w11-details" role="grid" aria-label={`${currentLabel} contents`}>
                  <div className="w11-details__header" role="row">
                    {detailsColumns.map((column) => (
                      <button
                        key={column.label}
                        type="button"
                        role="columnheader"
                        className="w11-details__column"
                        disabled={!column.sort}
                        aria-sort={column.sort === sortKey ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                        onClick={() => {
                          if (!column.sort) return;
                          setSort(window.id, column.sort, column.sort === sortKey && sortDirection === "asc" ? "desc" : "asc");
                        }}
                      >
                        <span>{column.label}</span>
                        {column.sort === sortKey ? (sortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                      </button>
                    ))}
                  </div>
                  {filteredChildren.map((node) => (
                    <ExplorerListItem
                      key={node.path}
                      node={node}
                      selected={selectedSet.has(node.path)}
                      renaming={renamingPath === node.path}
                      dropTarget={dropTargetPath === node.path}
                      cut={cutPaths.has(node.path)}
                      recycleBin={isRecycleBinRoot}
                      {...itemHandlers}
                    />
                  ))}
                </div>
              )
            ) : children.length === 0 ? (
              <EmptyState
                className="explorer-window__empty"
                title={isRecycleBinRoot ? "The Recycle Bin is empty" : "This folder is empty."}
                description={isRecycleBinRoot ? "Deleted files and folders appear here until you empty it." : "Right-click to create a new folder or text document, or drag files in."}
              />
            ) : (
              <EmptyState
                className="explorer-window__empty"
                title={`No items match "${deferredSearchQuery.trim()}"`}
                description="Try another search or clear the filter to see everything in this folder."
              />
            )}
          </ScrollArea>
        </section>
      </AppContent>

      <StatusBar className="explorer-window__statusbar w11-explorer__status">
        <span>{plural(filteredChildren.length)}</span>
        {hasSelection ? (
          <span>
            {plural(selectedPaths.length)} selected
            {selectedSize > 0 ? <span className="w11-explorer__status-size">{formatSize(selectedSize)}</span> : null}
          </span>
        ) : null}
        <span className="w11-explorer__status-spacer" />
        <button
          type="button"
          className={cn("w11-explorer__status-view", viewMode === "list" && "is-active")}
          aria-label="Details"
          title="Details"
          onClick={() => setViewMode(window.id, "list")}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={cn("w11-explorer__status-view", viewMode === "grid" && "is-active")}
          aria-label="Large icons"
          title="Large icons"
          onClick={() => setViewMode(window.id, "grid")}
        >
          <LayoutGrid size={14} />
        </button>
      </StatusBar>
    </AppScaffold>
  );
}

