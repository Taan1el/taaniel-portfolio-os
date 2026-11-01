import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  SquareTerminal,
  Copy,
  FilePlus2,
  FolderPlus,
  Info,
  LayoutGrid,
  List,
  ListFilter,
  PanelRight,
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
import { ExplorerGridItem, ExplorerListItem, type ExplorerItemHandlers } from "@/components/apps/explorer/explorer-items";
import { ExplorerPreview } from "@/components/apps/explorer/explorer-preview";
import {
  buildBreadcrumbs,
  formatSize,
  getNodeLabel,
  getNodeSize,
  getSearchText,
  selectPathRange,
  sortExplorerNodes,
} from "@/components/apps/explorer/explorer-model";
import { ExplorerSidebar, type ExplorerSidebarLocation } from "@/components/apps/explorer/explorer-sidebar";
import { ExplorerToolbar, type ExplorerCommand } from "@/components/apps/explorer/explorer-toolbar";
import { FilesIcon, FolderIcon, MusicIcon, PhotosIcon, RecycleBinEmptyIcon, RecycleBinFullIcon } from "@/components/icons/apps";
import { TRASH_PATH } from "@/lib/system-workspace";
import { resolveShellPath, SHELL_USER } from "@/lib/windows-path";
import { getParentPath, isLockedNode, joinPath, normalizePath } from "@/lib/filesystem";
import { getContextMenuPoint } from "@/lib/context-menu-point";
import { DND_SCROLL_ATTRIBUTE, folderDropProps } from "@/lib/dnd/dom";
import { armFileDrag } from "@/lib/dnd/controller";
import { useDragStore } from "@/lib/dnd/drag-store";
import { hasExternalFiles } from "@/lib/drag-payload";
import {
  copyItems,
  cutItems,
  deleteItems,
  emptyRecycleBin as emptyRecycleBinAction,
  isInTrash,
  pasteIntoFolder,
  restoreItems,
  transferItems,
} from "@/lib/file-actions";
import { buildFileMenu } from "@/lib/file-menu";
import { openFileSystemPath } from "@/lib/launchers";
import { resolveShortcutNode, toStoredName } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useMarqueeSelection } from "@/hooks/use-marquee-selection";
import { useExplorerStore, type ExplorerSortKey } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { usePropertiesStore } from "@/stores/properties-store";
import { useRecentFilesStore } from "@/stores/recent-files-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { toast } from "@/stores/toast-store";
import { createLaunchNonce } from "@/lib/terminal-profiles";
import type { AppComponentProps, ContextMenuAction, FileNode, VirtualFile } from "@/types/system";
import "@/styles/explorer-panes.css";

const explorerLocations: ExplorerSidebarLocation[] = [
  { label: SHELL_USER, path: "/", icon: FilesIcon },
  { label: "Desktop", path: "/Desktop", icon: FolderIcon },
  { label: "Documents", path: "/Documents", icon: FolderIcon },
  { label: "Portfolio", path: "/Portfolio", icon: FolderIcon },
  { label: "Pictures", path: "/Media/Photography", icon: PhotosIcon },
  { label: "Music", path: "/Media/Music", icon: MusicIcon },
  { label: "Recycle Bin", path: TRASH_PATH, icon: RecycleBinEmptyIcon },
];

const EMPTY_SET: ReadonlySet<string> = new Set();

export function FileExplorerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const mkdir = useFileSystemStore((state) => state.mkdir);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const importFiles = useFileSystemStore((state) => state.importFiles);
  const rename = useFileSystemStore((state) => state.rename);
  const launchApp = useSystemStore((state) => state.launchApp);
  const recentPaths = useRecentFilesStore((state) => state.recentPaths);
  const clearRecent = useRecentFilesStore((state) => state.clearRecent);

  const clipboard = useShellStore((state) => state.clipboard);
  const setContextMenu = useShellStore((state) => state.setContextMenu);
  const dragItems = useDragStore((state) => state.session?.items ?? null);

  const {
    session,
    ensureSession,
    navigate,
    goBack,
    goForward,
    setSelectedPath,
    setSelectedPaths,
    clearSelection,
    beginRename,
    endRename,
    setSearchQuery,
    setViewMode,
    setSort,
    togglePreview,
  } = useExplorerStore(
    useShallow((state) => ({
      session: state.sessions[window.id],
      ensureSession: state.ensureSession,
      navigate: state.navigate,
      goBack: state.goBack,
      goForward: state.goForward,
      setSelectedPath: state.setSelectedPath,
      setSelectedPaths: state.setSelectedPaths,
      clearSelection: state.clearSelection,
      beginRename: state.beginRename,
      endRename: state.endRename,
      setSearchQuery: state.setSearchQuery,
      setViewMode: state.setViewMode,
      setSort: state.setSort,
      togglePreview: state.togglePreview,
    }))
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemsRootRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const externalHighlightRef = useRef<HTMLElement | null>(null);
  const initialPath = window.payload?.directoryPath ?? "/Portfolio";
  const [externalDropActive, setExternalDropActive] = useState(false);
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
  const previewOpen = session?.previewOpen ?? false;
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
  const dragSourcePaths = useMemo(
    () => (dragItems ? new Set(dragItems.flatMap((item) => (item.path ? [item.path] : []))) : EMPTY_SET),
    [dragItems]
  );

  const children = useMemo(() => {
    const listed = listDirectory(currentDirectoryPath);
    // The Recycle Bin is not a folder inside the profile folder in Windows; the navigation pane has it.
    return currentDirectoryPath === "/" ? listed.filter((node) => node.path !== TRASH_PATH) : listed;
    // refreshTick re-reads the folder on F5 / Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDirectoryPath, listDirectory, nodes, refreshTick]);

  const sortedChildren = useMemo(
    () => sortExplorerNodes(children, sortKey, sortDirection),
    [children, sortKey, sortDirection]
  );

  const filteredChildren = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return sortedChildren;
    return sortedChildren.filter((node) => getSearchText(node).includes(normalizedQuery));
  }, [sortedChildren, deferredSearchQuery]);

  const orderedPaths = useMemo(() => filteredChildren.map((child) => child.path), [filteredChildren]);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentDirectoryPath), [currentDirectoryPath]);

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

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

    // A shortcut to a folder opens that folder right here, as it does in Windows.
    const saved = nodes[node.path];
    const target = saved?.kind === "file" && saved.shortcut ? resolveShortcutNode(nodes, saved) : null;

    if (target?.kind === "directory") {
      navigate(window.id, target.path);
      return;
    }

    openFileSystemPath(node.path, nodes, launchApp);
  };

  const uploadIntoFolder = async (files: File[] | FileList, destination = currentDirectoryPath) => {
    const importedPaths = await importFiles(destination, Array.from(files));
    const latestPath = importedPaths.at(-1);
    if (latestPath && destination === currentDirectoryPath) {
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
    endRename(window.id);

    // A shortcut keeps its hidden .lnk however the name was typed.
    const storedName = toStoredName(nextName, node);

    if (!storedName || storedName === node.name) {
      return;
    }

    try {
      const nextPath = await rename(node.path, storedName);
      setSelectedPath(window.id, nextPath);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not rename", "error");
    }
  };

  const deleteSelection = async (permanent = false) => {
    const targets = selectedPaths.slice();
    if (targets.length === 0) return;
    await deleteItems(targets, { permanent: permanent || isTrashView });
    clearSelection(window.id);
  };

  /** "Duplicate": a copy beside each item, named "notes - Copy.txt". */
  const duplicateItems = async (paths: string[]) => {
    const byFolder = new Map<string, string[]>();

    paths.forEach((path) => {
      const folder = getParentPath(path);
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), path]);
    });

    for (const [folder, sources] of byFolder) {
      // eslint-disable-next-line no-await-in-loop
      await transferItems(sources, folder, "copy");
    }
  };

  const copySelection = () => copyItems(selectedPaths);

  const cutSelection = () => {
    cutItems(selectedPaths);
  };

  const pasteIntoCurrentDirectory = () => {
    if (!isTrashView) void pasteIntoFolder(currentDirectoryPath);
  };

  const restoreSelection = async (paths: string[]) => {
    await restoreItems(paths);
    clearSelection(window.id);
  };

  const emptyRecycleBin = () => {
    void emptyRecycleBinAction();
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

  /* ------------------------------------------------------------------ */
  /*  Drag and drop                                                      */
  /* ------------------------------------------------------------------ */

  /** Everything here is a drop target for the pointer drag controller; the tags are all it needs. */
  const dropProps = (path: string) => folderDropProps(isInTrash(path) ? TRASH_PATH : path, { windowId: window.id });

  /** Files dragged in from the visitor's computer go through the browser's own drag events. */
  const clearExternalHighlight = () => {
    externalHighlightRef.current?.removeAttribute("data-drop-active");
    externalHighlightRef.current = null;
  };

  const getExternalDropFolder = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest<HTMLElement>("[data-path][data-drop-folder]") ?? null;

  /* ------------------------------------------------------------------ */
  /*  Context menu builders                                              */
  /* ------------------------------------------------------------------ */

  const openPaths = (paths: string[]) => {
    paths.forEach((path) => {
      const node = listDirectory(getParentPath(path)).find((entry) => entry.path === path);
      if (node) openNode(node);
    });
  };

  const buildItemContextMenu = (node: FileNode, targets: string[]): ContextMenuAction[] => {
    const menu = buildFileMenu({
      nodes,
      paths: targets,
      clipboard,
      onOpen: () => openPaths(targets),
      onRename: () => beginRename(window.id, node.path),
      onOpenInNewWindow: () => launchApp({ appId: "files", payload: { directoryPath: node.path } }),
    });

    // Duplicate is File Explorer's own convenience, next to Copy.
    const copyIndex = menu.findIndex((action) => action.id === "copy");

    if (copyIndex >= 0 && !isTrashView) {
      menu.splice(copyIndex + 1, 0, {
        id: "duplicate",
        label: targets.length > 1 ? `Duplicate ${targets.length} items` : "Duplicate",
        icon: Copy,
        onSelect: () => void duplicateItems(targets),
      });
    }

    return menu;
  };

  const buildEmptyAreaContextMenu = (): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = [];

    actions.push({
      id: "new-folder",
      label: "New folder",
      icon: FolderPlus,
      disabled: isTrashView,
      onSelect: () => void createFolder(),
    });

    actions.push({
      id: "new-note",
      label: "New text document",
      icon: FilePlus2,
      disabled: isTrashView,
      onSelect: () => void createNote(),
    });

    actions.push({
      id: "upload",
      label: "Upload files…",
      icon: Upload,
      disabled: isTrashView,
      onSelect: () => fileInputRef.current?.click(),
    });

    actions.push({ id: "sep-empty-1", label: "", separator: true, onSelect: () => {} });

    actions.push({
      id: "paste",
      label: "Paste",
      icon: ClipboardPaste,
      shortcut: "Ctrl+V",
      disabled: !clipboard || isTrashView,
      onSelect: pasteIntoCurrentDirectory,
    });

    actions.push({
      id: "open-terminal",
      label: "Open in Terminal",
      icon: SquareTerminal,
      disabled: isTrashView,
      onSelect: () => launchApp({ appId: "terminal", payload: { directoryPath: currentDirectoryPath, launchNonce: createLaunchNonce() } }),
    });

    actions.push({ id: "sep-empty-2", label: "", separator: true, onSelect: () => {} });

    const sortIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;
    const sortToggle = (key: ExplorerSortKey): ContextMenuAction => ({
      id: `sort-${key}`,
      label:
        key === "name"
          ? "Sort by name"
          : key === "date"
            ? isRecycleBinRoot
              ? "Sort by date deleted"
              : "Sort by date modified"
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
      onSelect: () => setSelectedPaths(window.id, orderedPaths),
    });

    if (isRecycleBinRoot) {
      actions.push({
        id: "empty-trash",
        label: "Empty Recycle Bin",
        icon: Trash2,
        danger: true,
        onSelect: emptyRecycleBin,
      });
    }

    if (!isRecycleBinRoot) {
      actions.push({ id: "sep-empty-properties", label: "", separator: true, onSelect: () => {} });
      actions.push({
        id: "properties",
        label: "Properties",
        icon: Info,
        shortcut: "Alt+Enter",
        onSelect: () => usePropertiesStore.getState().open([currentDirectoryPath]),
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

    const additive = event.ctrlKey || event.metaKey;
    const isSelected = selectedSet.has(node.path);
    let next = selectedPaths;
    // Pressing a selected item keeps the selection (so the group can be dragged); it narrows on release.
    let onRelease: (() => void) | null = null;

    if (event.button === 2) {
      // Right-click selects the item if it isn't selected; the context menu follows.
      if (!isSelected) next = [node.path];
    } else if (event.shiftKey && !additive) {
      next = selectPathRange(orderedPaths, selectedPaths.at(-1), node.path);
    } else if (additive) {
      if (isSelected) {
        onRelease = () => setSelectedPaths(window.id, selectedPaths.filter((path) => path !== node.path));
      } else {
        next = [...selectedPaths, node.path];
      }
    } else if (!isSelected) {
      next = [node.path];
    } else if (selectedPaths.length > 1) {
      onRelease = () => setSelectedPath(window.id, node.path);
    }

    if (next !== selectedPaths) {
      setSelectedPaths(window.id, next);
    }

    const dragPaths = next.includes(node.path) ? [node.path, ...next.filter((path) => path !== node.path)] : [node.path];
    let dragged = false;

    armFileDrag({
      event: event.nativeEvent,
      items: dragPaths.map((path) => ({ id: path, path })),
      origin: "explorer",
      originWindowId: window.id,
      contextTarget: event.currentTarget as Element,
      onStart: () => {
        dragged = true;
      },
    });

    if (onRelease) {
      const apply = onRelease;
      globalThis.addEventListener(
        "pointerup",
        () => {
          if (!dragged) apply();
        },
        { once: true }
      );
    }
  };

  const handleItemContextMenu = (node: FileNode, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Right-clicking outside the selection snaps it to just this item.
    const inSelection = selectedSet.has(node.path);
    const targets = inSelection ? selectedPaths.slice() : [node.path];

    if (!inSelection) {
      setSelectedPath(window.id, node.path);
    }

    const { x, y } = getContextMenuPoint(event);

    setContextMenu({
      x,
      y,
      title: targets.length > 1 ? plural(targets.length) : getNodeLabel(node),
      actions: buildItemContextMenu(node, targets),
    });
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

  const marquee = useMarqueeSelection({
    contentRef: itemsRootRef,
    scrollRef,
    itemSelector: "[data-path]",
    getItemId: (element) => element.dataset.path ?? null,
    getSelection: () => selectedPaths,
    onSelectionChange: (paths) => setSelectedPaths(window.id, paths),
    canStart: (target, event) => {
      if (target.closest("[data-path], .w11-details__header, input, textarea, button")) {
        return false;
      }

      // A press on the scrollbar scrolls; it doesn't start a selection.
      const scroller = scrollRef.current;
      return !(scroller && target === scroller && event.clientX > scroller.getBoundingClientRect().left + scroller.clientWidth);
    },
  });

  /** Focus follows the keyboard onto the item itself, which is what a screen reader reads out. */
  const focusPath = (path: string) => {
    const items = contentRef.current?.querySelectorAll<HTMLElement>("[data-path]");
    const item = Array.from(items ?? []).find((element) => element.dataset.path === path);
    item?.focus({ preventScroll: true });
    item?.scrollIntoView({ block: "nearest" });
  };

  // Deleting, renaming or leaving the focused item takes focus with it: keep the keyboard in this window.
  useEffect(() => {
    if (window.focused && !renamingPath && document.activeElement === document.body) {
      contentRef.current?.focus({ preventScroll: true });
    }
  }, [currentDirectoryPath, filteredChildren, renamingPath, window.focused]);

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

  /** Window-wide shortcuts: they work while the address bar or toolbar has focus too. */
  const handleWindowKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;

    if (event.altKey && key === "Enter") {
      event.preventDefault();
      usePropertiesStore.getState().open(selectedPaths.length ? selectedPaths : [currentDirectoryPath]);
    } else if (event.altKey && !ctrl && !event.shiftKey && event.code === "KeyP") {
      event.preventDefault();
      togglePreview(window.id);
    } else if (event.altKey && key === "ArrowLeft") {
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
      void deleteSelection(event.shiftKey);
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
      if (!isLockedNode(nodes, selectedPaths[0])) beginRename(window.id, selectedPaths[0]);
      return;
    }

    if (key === "Enter") {
      if (selectedPaths.length === 0) return;
      event.preventDefault();
      openPaths(selectedPaths);
      return;
    }

    if (key === "Escape") {
      event.preventDefault();
      clearSelection(window.id);
      return;
    }

    if (ctrl && key.toLowerCase() === "a") {
      event.preventDefault();
      setSelectedPaths(window.id, orderedPaths);
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
      pasteIntoCurrentDirectory();
      return;
    }

    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) {
      if (orderedPaths.length === 0) return;
      event.preventDefault();
      const anchor = selectedPaths.at(-1);
      const index = anchor ? orderedPaths.indexOf(anchor) : -1;
      const columns = measureColumns();
      let next = index;

      if (index < 0) next = 0;
      else if (key === "ArrowRight") next = viewMode === "grid" ? index + 1 : index;
      else if (key === "ArrowLeft") next = viewMode === "grid" ? index - 1 : index;
      else if (key === "ArrowDown") next = index + columns;
      else if (key === "ArrowUp") next = index - columns;
      else if (key === "Home") next = 0;
      else if (key === "End") next = orderedPaths.length - 1;

      next = Math.min(orderedPaths.length - 1, Math.max(0, next));
      const path = orderedPaths[next];
      if (event.shiftKey) setSelectedPaths(window.id, selectPathRange(orderedPaths, anchor, path));
      else if (ctrl) return;
      else setSelectedPath(window.id, path);
      focusPath(path);
      return;
    }

    // Type-to-select: typing a name jumps to the first match.
    if (key.length === 1 && !ctrl && key !== " ") {
      const now = Date.now();
      const text = now - typeAheadRef.current.at < 900 ? typeAheadRef.current.text + key : key;
      typeAheadRef.current = { text, at: now };
      const match = filteredChildren.find((node) => getNodeLabel(node).toLowerCase().startsWith(text.toLowerCase()));
      if (match) {
        setSelectedPath(window.id, match.path);
        focusPath(match.path);
      }
    }
  };

  const hasSelection = selectedPaths.length > 0;
  const selectionLocked = selectedPaths.some((path) => isLockedNode(nodes, path));
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
    { id: "sep-view", label: "", separator: true, onSelect: () => {} },
    { id: "view-preview", label: "Preview pane", icon: previewOpen ? Check : PanelRight, shortcut: "Alt+P", onSelect: () => togglePreview(window.id) },
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
          onSelect: () => void restoreSelection(hasSelection ? selectedPaths.slice() : children.map((child) => child.path)),
        },
        { id: "delete", label: "Delete", icon: Trash2, groupStart: true, disabled: !hasSelection, onSelect: () => void deleteSelection(true) },
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
        { id: "cut", label: "Cut (Ctrl+X)", icon: Scissors, groupStart: true, disabled: !hasSelection || selectionLocked, onSelect: cutSelection },
        { id: "copy", label: "Copy (Ctrl+C)", icon: Copy, disabled: !hasSelection, onSelect: copySelection },
        { id: "paste", label: "Paste (Ctrl+V)", icon: ClipboardPaste, disabled: !clipboard || isTrashView, onSelect: pasteIntoCurrentDirectory },
        {
          id: "rename",
          label: "Rename (F2)",
          icon: Pencil,
          disabled: selectedPaths.length !== 1 || selectionLocked,
          onSelect: () => beginRename(window.id, selectedPaths[0]),
        },
        { id: "delete", label: "Delete (Del)", icon: Trash2, disabled: !hasSelection || selectionLocked, onSelect: () => void deleteSelection() },
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

  const itemHandlers: ExplorerItemHandlers = {
    onOpen: openNode,
    onPointerDown: handleItemPointerDown,
    onContextMenu: handleItemContextMenu,
    onDoubleClick: openNode,
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
          void uploadIntoFolder(event.target.files);
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
        getCrumbDropProps={dropProps}
      />

      <AppContent className={cn("explorer-window__layout", previewOpen && "has-preview")} padded={false} scrollable={false} stacked={false}>
        <ExplorerSidebar
          locations={navLocations}
          activePath={currentDirectoryPath}
          recentPaths={recentPaths}
          onNavigate={(path) => navigate(window.id, path)}
          onOpenFile={(path) => openFileSystemPath(path, nodes, launchApp)}
          onClearRecent={clearRecent}
          getDropProps={dropProps}
        />

        <section
          ref={contentRef}
          className={cn("explorer-window__content", externalDropActive && "is-drop-target")}
          tabIndex={0}
          aria-label={`${currentLabel} folder`}
          // The folder this window shows takes drops anywhere there is no item to take them.
          {...dropProps(currentDirectoryPath)}
          onPointerDown={marquee.onPointerDown}
          onClick={handleBackgroundClick}
          onContextMenu={handleEmptyAreaContextMenu}
          onKeyDown={handleKeyDown}
          onDragEnter={(event) => {
            if (!hasExternalFiles(event.dataTransfer)) return;
            event.preventDefault();
            dragDepthRef.current += 1;
            setExternalDropActive(true);
          }}
          onDragLeave={(event) => {
            if (!hasExternalFiles(event.dataTransfer)) return;
            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) {
              setExternalDropActive(false);
              clearExternalHighlight();
            }
          }}
          onDragOver={(event) => {
            if (!hasExternalFiles(event.dataTransfer)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";

            // Files hovering a folder go into that folder: show which.
            const folder = getExternalDropFolder(event.target);

            if (folder !== externalHighlightRef.current) {
              clearExternalHighlight();
              folder?.setAttribute("data-drop-active", "true");
              externalHighlightRef.current = folder;
            }
          }}
          onDrop={(event) => {
            if (!hasExternalFiles(event.dataTransfer)) return;
            event.preventDefault();
            const destination = getExternalDropFolder(event.target)?.dataset.dropFolder ?? currentDirectoryPath;
            dragDepthRef.current = 0;
            setExternalDropActive(false);
            clearExternalHighlight();
            void uploadIntoFolder(event.dataTransfer.files, destination);
          }}
        >
          {externalDropActive ? (
            <div className="explorer-window__dropzone">
              <strong>Drop files to add them here</strong>
              <small>Images, notes, and other files are saved into the IndexedDB filesystem.</small>
            </div>
          ) : null}

          <ScrollArea ref={scrollRef} className="explorer-window__scroll-area" padded {...{ [DND_SCROLL_ATTRIBUTE]: "true" }}>
            <div ref={itemsRootRef} className="explorer-window__items">
              {filteredChildren.length > 0 ? (
                viewMode === "grid" ? (
                  <GridView
                    className="explorer-grid"
                    minItemWidth={108}
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label={`${currentLabel} contents`}
                  >
                    {filteredChildren.map((node) => (
                      <ExplorerGridItem
                        key={node.path}
                        node={node}
                        windowId={window.id}
                        selected={selectedSet.has(node.path)}
                        renaming={renamingPath === node.path}
                        cut={cutPaths.has(node.path)}
                        dragSource={dragSourcePaths.has(node.path)}
                        inTrash={isTrashView}
                        {...itemHandlers}
                      />
                    ))}
                  </GridView>
                ) : (
                  <div className="explorer-list w11-details" role="grid" aria-multiselectable="true" aria-label={`${currentLabel} contents`}>
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
                        windowId={window.id}
                        selected={selectedSet.has(node.path)}
                        renaming={renamingPath === node.path}
                        cut={cutPaths.has(node.path)}
                        dragSource={dragSourcePaths.has(node.path)}
                        recycleBin={isRecycleBinRoot}
                        inTrash={isTrashView}
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

              {marquee.rect ? (
                <div
                  className="explorer-window__marquee"
                  aria-hidden="true"
                  style={{ left: marquee.rect.left, top: marquee.rect.top, width: marquee.rect.width, height: marquee.rect.height }}
                />
              ) : null}
            </div>
          </ScrollArea>
        </section>

        {previewOpen ? <ExplorerPreview nodes={nodes} paths={selectedPaths} /> : null}
      </AppContent>

      <StatusBar className="explorer-window__statusbar w11-explorer__status">
        <span className="sr-only" role="status">
          {selectedPaths.length > 1 ? `${plural(selectedPaths.length)} selected` : `${currentLabel}, ${plural(filteredChildren.length)}`}
        </span>
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
