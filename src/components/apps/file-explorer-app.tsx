import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BookText,
  BriefcaseBusiness,
  CheckSquare,
  Clipboard,
  ClipboardPaste,
  Copy,
  ExternalLink,
  FileImage,
  FileText,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  Image,
  ListFilter,
  MapPin,
  Monitor,
  Music4,
  Pencil,
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
import { ExplorerToolbar, type ExplorerBreadcrumb } from "@/components/apps/explorer/explorer-toolbar";
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
import type { AppComponentProps, ContextMenuAction, FileNode } from "@/types/system";

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
}

const explorerLocations: ExplorerSidebarLocation[] = [
  { label: "Desktop", path: "/Desktop", icon: Monitor },
  { label: "Documents", path: "/Documents", icon: FolderOpen },
  { label: "Notes", path: "/Documents/Notes", icon: BookText },
  { label: "Portfolio", path: "/Portfolio", icon: BriefcaseBusiness },
  { label: "Photography", path: "/Media/Photography", icon: Image },
  { label: "Music", path: "/Media/Music", icon: Music4 },
  { label: "Games", path: "/Games", icon: Gamepad2 },
  { label: "Trash", path: "/Trash", icon: Trash2 },
];

function buildBreadcrumbs(path: string): ExplorerBreadcrumb[] {
  const normalized = normalizePath(path);

  if (normalized === "/") {
    return [{ label: "Root", path: "/" }];
  }

  const parts = normalized.split("/").filter(Boolean);

  return [
    { label: "Root", path: "/" },
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

function getNodeIcon(node: FileNode) {
  if (node.type === "folder") {
    return <Folder size={22} />;
  }

  if (node.mimeType?.startsWith("image/")) {
    return <FileImage size={20} />;
  }

  return <FileText size={20} />;
}

function formatSize(size?: number) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
        renaming && "is-renaming"
      )}
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
        ) : node.type === "folder" ? (
          <Folder size={26} />
        ) : node.mimeType?.startsWith("image/") ? (
          <FileImage size={24} />
        ) : (
          <FileText size={24} />
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
        "explorer-list-item",
        selected && "is-selected",
        dropTarget && "is-drop-target",
        renaming && "is-renaming"
      )}
      role="button"
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
      <span className="explorer-list-item__thumb">
        {canRenderThumbnail ? (
          <img src={node.source} alt={node.name} loading="lazy" decoding="async" draggable={false} />
        ) : (
          getNodeIcon(node)
        )}
      </span>
      <span className="explorer-list-item__copy">
        {renaming ? (
          <RenameInput
            initialName={node.name}
            onCommit={(next) => onCommitRename(node, next)}
            onCancel={onCancelRename}
          />
        ) : (
          <strong>{node.name}</strong>
        )}
        <small title={node.path}>{getNodeMeta(node)}</small>
      </span>
      <span className="explorer-list-item__path" title={node.path}>
        {node.path}
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
  const isTrashView = currentDirectoryPath === "/Trash" || currentDirectoryPath.startsWith("/Trash/");

  const children = useMemo(
    () => listDirectory(currentDirectoryPath),
    [currentDirectoryPath, listDirectory, nodes]
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

  const itemCountLabel =
    selectedPaths.length > 1
      ? `${selectedPaths.length} of ${filteredChildren.length} selected`
      : `${filteredChildren.length} item${filteredChildren.length === 1 ? "" : "s"}`;

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
    const createdPath = await mkdir(joinPath(currentDirectoryPath, "New Folder"), { uniqueName: true });
    setSelectedPath(window.id, createdPath);
    beginRename(window.id, createdPath);
  };

  const createNote = async () => {
    const createdPath = await writeFile(joinPath(currentDirectoryPath, "New Note.txt"), "", {
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
      await deleteNode(path);
    }
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
    const first = selectedPaths[0];
    if (!first) return;
    setClipboard({ path: first, operation: "copy" });
    toast(
      selectedPaths.length > 1 ? `${selectedPaths.length} items copied (first will be pasted)` : "Copied",
      "info"
    );
  };

  const cutSelection = () => {
    const first = selectedPaths[0];
    if (!first) return;
    if (!canCutNode(first)) {
      toast("This item is read-only and cannot be cut", "error");
      return;
    }
    setClipboard({ path: first, operation: "cut" });
  };

  const pasteIntoCurrentDirectory = async (destination = currentDirectoryPath) => {
    if (!clipboard) return;
    if (isInvalidMoveTarget(clipboard.path, destination)) {
      toast("Cannot paste a folder into itself", "error");
      return;
    }
    await pasteNode(clipboard.path, destination, clipboard.operation);
    if (clipboard.operation === "cut") {
      clearClipboard();
    }
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
      await pasteNode(source, destination, "cut");
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
      icon: Clipboard,
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
        onSelect: async () => {
          for (const p of targets) {
            // eslint-disable-next-line no-await-in-loop
            await deleteNode(p);
          }
          clearSelection(window.id);
        },
      });
    } else {
      actions.push({
        id: "trash",
        label: multi ? `Move ${targets.length} items to Trash` : "Move to Trash",
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
        label: "Reveal in parent folder",
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
      label: "New Folder",
      icon: FolderPlus,
      onSelect: () => void createFolder(),
    });

    actions.push({
      id: "new-note",
      label: "New Note",
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
      label: clipboard ? (clipboard.operation === "cut" ? "Move here" : "Paste") : "Paste",
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
        label: "Empty Trash",
        icon: Trash2,
        danger: true,
        onSelect: () => void emptyTrash(),
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Don't hijack typing inside the search input, rename input, etc.
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (renamingPath) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      if (selectedPaths.length === 0) return;
      event.preventDefault();
      void moveSelectionToTrash();
      return;
    }

    if (event.key === "F2") {
      if (selectedPaths.length !== 1) return;
      event.preventDefault();
      beginRename(window.id, selectedPaths[0]);
      return;
    }

    if (event.key === "Enter") {
      if (selectedPaths.length !== 1) return;
      const node = nodes[selectedPaths[0]];
      if (!node) return;
      event.preventDefault();
      openNode({
        path: node.path,
        name: node.name,
        type: node.kind === "directory" ? "folder" : "file",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        extension: node.kind === "file" ? node.extension : undefined,
        mimeType: node.kind === "file" ? node.mimeType : undefined,
        source: node.kind === "file" ? node.source : undefined,
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearSelection(window.id);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      goBack(window.id);
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "a" || event.key === "A")) {
      event.preventDefault();
      setSelectedPaths(window.id, filteredChildren.map((c) => c.path));
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "c" || event.key === "C")) {
      event.preventDefault();
      copySelection();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "x" || event.key === "X")) {
      event.preventDefault();
      cutSelection();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && (event.key === "v" || event.key === "V")) {
      event.preventDefault();
      void pasteIntoCurrentDirectory();
      return;
    }
  };

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
    <AppScaffold className="explorer-window">
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
        breadcrumbs={breadcrumbs}
        canGoBack={Boolean(session && session.historyIndex > 0)}
        canGoForward={Boolean(session && session.historyIndex < session.history.length - 1)}
        searchQuery={searchQuery}
        onGoBack={() => goBack(window.id)}
        onGoForward={() => goForward(window.id)}
        onNavigate={(path) => navigate(window.id, path)}
        onSearchChange={(query) => setSearchQuery(window.id, query)}
        onUpload={() => fileInputRef.current?.click()}
        onCreateFolder={() => void createFolder()}
        onCreateNote={() => void createNote()}
        viewMode={viewMode}
        onViewModeChange={(nextViewMode) => setViewMode(window.id, nextViewMode)}
      />

      <AppContent className="explorer-window__layout" padded={false} scrollable={false} stacked={false}>
        <ExplorerSidebar
          locations={explorerLocations}
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
                      {...itemHandlers}
                    />
                  ))}
                </GridView>
              ) : (
                <div className="explorer-list" role="list" aria-label={`${currentDirectoryPath} contents`}>
                  {filteredChildren.map((node) => (
                    <ExplorerListItem
                      key={node.path}
                      node={node}
                      selected={selectedSet.has(node.path)}
                      renaming={renamingPath === node.path}
                      dropTarget={dropTargetPath === node.path}
                      {...itemHandlers}
                    />
                  ))}
                </div>
              )
            ) : children.length === 0 ? (
              <EmptyState
                className="explorer-window__empty"
                title="This folder is empty"
                description="Right-click to create a new folder or note, or drag files in to upload."
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

      <StatusBar className="explorer-window__statusbar">
        <span>{itemCountLabel}</span>
        <span>
          <ArrowDownAZ size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          {sortKey} {sortDirection === "asc" ? "↑" : "↓"}
        </span>
        <span>{viewMode === "grid" ? "Grid view" : "List view"}</span>
        <span className="explorer-window__status-path" title={selectedNode?.path ?? currentDirectoryPath}>
          {selectedNode
            ? `${selectedNode.name}${selectedNode.kind === "file" && selectedNode.size ? ` · ${formatSize(selectedNode.size)}` : ""}`
            : currentDirectoryPath}
        </span>
      </StatusBar>
    </AppScaffold>
  );
}

