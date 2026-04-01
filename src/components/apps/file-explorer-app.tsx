import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
  FilePlus2,
  Folder,
  FolderPlus,
  Search,
  Upload,
} from "lucide-react";
import {
  getNodeByPath,
  isImageFile,
  listChildren,
  normalizePath,
} from "@/lib/filesystem";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { openFileSystemPath } from "@/lib/launchers";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualNode } from "@/types/system";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface ExplorerGridItemProps {
  node: VirtualNode;
  selected: boolean;
  onOpen: (node: VirtualNode) => void;
  onSelect: (path: string) => void;
}

function buildBreadcrumbs(path: string): BreadcrumbItem[] {
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

function hasFilePayload(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function getNodeSearchText(node: VirtualNode) {
  return [
    node.name,
    node.path,
    node.kind === "file" ? node.mimeType : "folder",
    node.kind === "file" ? node.extension : "",
  ]
    .join(" ")
    .toLowerCase();
}

const ExplorerGridItem = memo(function ExplorerGridItem({
  node,
  selected,
  onOpen,
  onSelect,
}: ExplorerGridItemProps) {
  const canRenderThumbnail =
    isImageFile(node) &&
    isBrowserRenderableImageExtension(node.extension) &&
    Boolean(node.source);

  return (
    <button
      type="button"
      className={cn("explorer-grid-item", selected && "is-selected")}
      onClick={() => {
        onSelect(node.path);
        onOpen(node);
      }}
      onFocus={() => onSelect(node.path)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        onSelect(node.path);
        onOpen(node);
      }}
      title={node.name}
    >
      <span className="explorer-grid-item__thumb">
        {canRenderThumbnail ? (
          <img
            src={node.source}
            alt={node.name}
            loading="lazy"
            decoding="async"
          />
        ) : node.kind === "directory" ? (
          <Folder size={26} />
        ) : isImageFile(node) ? (
          <FileImage size={24} />
        ) : (
          <FileText size={24} />
        )}
      </span>
      <span className="explorer-grid-item__label">{node.name}</span>
    </button>
  );
});

export function FileExplorerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const createDirectory = useFileSystemStore((state) => state.createDirectory);
  const createTextFile = useFileSystemStore((state) => state.createTextFile);
  const importFiles = useFileSystemStore((state) => state.importFiles);
  const launchApp = useSystemStore((state) => state.launchApp);
  const {
    session,
    ensureSession,
    navigate,
    goBack,
    goForward,
    setSelectedPath,
    setSearchQuery,
  } = useExplorerStore(
    useShallow((state) => ({
      session: state.sessions[window.id],
      ensureSession: state.ensureSession,
      navigate: state.navigate,
      goBack: state.goBack,
      goForward: state.goForward,
      setSelectedPath: state.setSelectedPath,
      setSearchQuery: state.setSearchQuery,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const initialPath = window.payload?.directoryPath ?? "/Portfolio";

  useEffect(() => {
    ensureSession(window.id, initialPath);
  }, [ensureSession, initialPath, window.id]);

  const currentPath = session?.currentPath ?? normalizePath(initialPath);
  const searchQuery = session?.searchQuery ?? "";
  const selectedPath = session?.selectedPath ?? null;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const currentNode = getNodeByPath(nodes, currentPath);
  const currentDirectoryPath =
    currentNode?.kind === "directory" ? currentNode.path : "/";
  const children = useMemo(() => listChildren(nodes, currentDirectoryPath), [currentDirectoryPath, nodes]);
  const filteredChildren = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return children;
    }

    return children.filter((node) => getNodeSearchText(node).includes(normalizedQuery));
  }, [children, deferredSearchQuery]);
  const selectedNode = selectedPath ? nodes[selectedPath] ?? null : null;
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentDirectoryPath), [currentDirectoryPath]);
  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    if (nodes[selectedPath]) {
      return;
    }

    setSelectedPath(window.id, null);
  }, [nodes, selectedPath, setSelectedPath, window.id]);

  const itemCountLabel = `${filteredChildren.length} item${filteredChildren.length === 1 ? "" : "s"}`;

  const openNode = (node: VirtualNode) => {
    if (node.kind === "directory") {
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

  return (
    <div className="explorer-window">
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

      <header className="explorer-window__toolbar">
        <div className="explorer-window__nav">
          <button
            type="button"
            className="icon-button explorer-window__nav-button"
            disabled={!session || session.historyIndex <= 0}
            onClick={() => goBack(window.id)}
            aria-label="Go back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="icon-button explorer-window__nav-button"
            disabled={!session || session.historyIndex >= session.history.length - 1}
            onClick={() => goForward(window.id)}
            aria-label="Go forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="explorer-window__path" aria-label="Current path">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="explorer-window__crumb">
              <button type="button" onClick={() => navigate(window.id, crumb.path)}>
                {crumb.label}
              </button>
              {index < breadcrumbs.length - 1 ? <span>/</span> : null}
            </div>
          ))}
        </div>

        <div className="explorer-window__controls">
          <label className="explorer-window__search">
            <Search size={13} />
            <input
              type="search"
              placeholder="Search folder"
              value={searchQuery}
              onChange={(event) => setSearchQuery(window.id, event.target.value)}
            />
          </label>

          <button
            type="button"
            className="icon-button explorer-window__action"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload files"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            className="icon-button explorer-window__action"
            onClick={() => void createDirectory(currentDirectoryPath)}
            aria-label="Create folder"
          >
            <FolderPlus size={14} />
          </button>
          <button
            type="button"
            className="icon-button explorer-window__action"
            onClick={() => void createTextFile(currentDirectoryPath)}
            aria-label="Create note"
          >
            <FilePlus2 size={14} />
          </button>
        </div>
      </header>

      <section
        className={cn("explorer-window__content", isDropTarget && "is-drop-target")}
        onDragEnter={(event) => {
          if (!hasFilePayload(event)) {
            return;
          }

          event.preventDefault();
          dragDepthRef.current += 1;
          setIsDropTarget(true);
        }}
        onDragLeave={(event) => {
          if (!hasFilePayload(event)) {
            return;
          }

          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

          if (dragDepthRef.current === 0) {
            setIsDropTarget(false);
          }
        }}
        onDragOver={(event) => {
          if (!hasFilePayload(event)) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (!hasFilePayload(event)) {
            return;
          }

          event.preventDefault();
          dragDepthRef.current = 0;
          setIsDropTarget(false);
          void uploadIntoCurrentDirectory(event.dataTransfer.files);
        }}
      >
        {isDropTarget ? (
          <div className="explorer-window__dropzone">
            <strong>Drop files to add them here</strong>
            <small>Images, notes, and other files are saved into the IndexedDB filesystem.</small>
          </div>
        ) : null}

        {filteredChildren.length > 0 ? (
          <div className="explorer-grid" role="list" aria-label={`${currentDirectoryPath} contents`}>
            {filteredChildren.map((node) => (
              <ExplorerGridItem
                key={node.path}
                node={node}
                selected={selectedPath === node.path}
                onOpen={openNode}
                onSelect={(path) => setSelectedPath(window.id, path)}
              />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="explorer-window__empty">
            <strong>This folder is empty</strong>
            <p>Upload files or create a folder to keep building out the workspace.</p>
          </div>
        ) : (
          <div className="explorer-window__empty">
            <strong>No items match "{deferredSearchQuery.trim()}"</strong>
            <p>Try another search or clear the filter to see everything in this folder.</p>
          </div>
        )}
      </section>

      <footer className="explorer-window__statusbar">
        <span>{itemCountLabel}</span>
        <span className="explorer-window__status-path" title={selectedNode?.path ?? currentDirectoryPath}>
          {selectedNode?.name ?? currentDirectoryPath}
        </span>
      </footer>
    </div>
  );
}
