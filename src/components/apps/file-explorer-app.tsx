import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus2,
  FolderPlus,
  FolderTree,
  Pencil,
  Scissors,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  downloadFileNode,
  getNodeByPath,
  getParentPath,
  isImageFile,
  listChildren,
  normalizePath,
} from "@/lib/filesystem";
import { openFileSystemPath } from "@/lib/launchers";
import { cn, formatBytes } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualNode } from "@/types/system";

const quickPlaces = [
  { label: "Desktop", path: "/Desktop" },
  { label: "Portfolio", path: "/Portfolio" },
  { label: "Case Studies", path: "/Portfolio/Case Studies" },
  { label: "Photography", path: "/Media/Photography" },
  { label: "Documents", path: "/Documents" },
  { label: "Code", path: "/Code" },
  { label: "Blog", path: "/Users/Public/Blog" },
];

function buildBreadcrumbs(path: string) {
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

function getNodeSize(node: VirtualNode | null) {
  if (!node || node.kind !== "file") {
    return undefined;
  }

  if (node.size != null) {
    return node.size;
  }

  if (node.content != null) {
    return new Blob([node.content]).size;
  }

  return undefined;
}

export function FileExplorerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const createDirectory = useFileSystemStore((state) => state.createDirectory);
  const createTextFile = useFileSystemStore((state) => state.createTextFile);
  const renameNode = useFileSystemStore((state) => state.renameNode);
  const deleteNode = useFileSystemStore((state) => state.deleteNode);
  const pasteNode = useFileSystemStore((state) => state.pasteNode);
  const importFiles = useFileSystemStore((state) => state.importFiles);
  const canCutNode = useFileSystemStore((state) => state.canCutNode);
  const launchApp = useSystemStore((state) => state.launchApp);
  const clipboard = useSystemStore((state) => state.clipboard);
  const setClipboard = useSystemStore((state) => state.setClipboard);
  const clearClipboard = useSystemStore((state) => state.clearClipboard);

  const initialPath = window.payload?.directoryPath ?? "/Portfolio";
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!window.payload?.directoryPath) {
      return;
    }

    setCurrentPath(window.payload.directoryPath);
    setHistory([window.payload.directoryPath]);
    setHistoryIndex(0);
    setSelectedPath(null);
    setFilterQuery("");
  }, [window.payload?.directoryPath]);

  const currentNode = getNodeByPath(nodes, currentPath);
  const children = useMemo(() => listChildren(nodes, currentPath), [currentPath, nodes]);
  const filteredChildren = useMemo(() => {
    const normalizedQuery = filterQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return children;
    }

    return children.filter((node) => getNodeSearchText(node).includes(normalizedQuery));
  }, [children, filterQuery]);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath]);
  const selectedNode = selectedPath ? nodes[selectedPath] : null;
  const selectedNodeSize = useMemo(() => getNodeSize(selectedNode), [selectedNode]);
  const selectedDirectoryChildren = useMemo(
    () =>
      selectedNode?.kind === "directory"
        ? listChildren(nodes, selectedNode.path).length
        : null,
    [nodes, selectedNode]
  );

  const navigate = (nextPath: string) => {
    const normalized = normalizePath(nextPath);
    setCurrentPath(normalized);
    setSelectedPath(null);
    setFilterQuery("");
    setHistory((previousHistory) => [...previousHistory.slice(0, historyIndex + 1), normalized]);
    setHistoryIndex((index) => index + 1);
  };

  const openNode = (node: VirtualNode) => {
    if (node.kind === "directory") {
      navigate(node.path);
      return;
    }

    openFileSystemPath(node.path, nodes, launchApp);
  };

  const uploadIntoCurrentDirectory = async (files: File[] | FileList) => {
    const importedPaths = await importFiles(currentPath, Array.from(files));
    const latestPath = importedPaths.at(-1);

    if (latestPath) {
      setSelectedPath(latestPath);
    }
  };

  const handlePaste = async () => {
    if (!clipboard) {
      return;
    }

    await pasteNode(clipboard.path, currentPath, clipboard.operation);

    if (clipboard.operation === "cut") {
      clearClipboard();
    }
  };

  return (
    <div className="app-screen explorer-app">
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

      <header className="app-toolbar">
        <div className="app-toolbar__group">
          <button
            type="button"
            className="icon-button"
            disabled={historyIndex <= 0}
            onClick={() => {
              const nextIndex = historyIndex - 1;
              setHistoryIndex(nextIndex);
              setCurrentPath(history[nextIndex]);
              setSelectedPath(null);
              setFilterQuery("");
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={historyIndex >= history.length - 1}
            onClick={() => {
              const nextIndex = historyIndex + 1;
              setHistoryIndex(nextIndex);
              setCurrentPath(history[nextIndex]);
              setSelectedPath(null);
              setFilterQuery("");
            }}
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={currentPath === "/" || currentNode?.path === "/"}
            onClick={() => navigate(getParentPath(currentPath))}
          >
            <FolderTree size={15} />
          </button>
        </div>

        <div className="breadcrumbs">
          {breadcrumbs.map((crumb) => (
            <button key={crumb.path} type="button" onClick={() => navigate(crumb.path)}>
              {crumb.label}
            </button>
          ))}
        </div>

        <label className="toolbar-input">
          <Search size={15} />
          <input
            type="search"
            placeholder={`Search ${currentNode?.name ?? "folder"}`}
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
          />
        </label>

        <div className="app-toolbar__group">
          <button
            type="button"
            className="icon-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!selectedNode || selectedNode.kind !== "file"}
            onClick={() => {
              if (selectedNode?.kind === "file") {
                void downloadFileNode(selectedNode);
              }
            }}
          >
            <Download size={15} />
          </button>
          <button type="button" className="icon-button" onClick={() => void createDirectory(currentPath)}>
            <FolderPlus size={15} />
          </button>
          <button type="button" className="icon-button" onClick={() => void createTextFile(currentPath)}>
            <FilePlus2 size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!selectedPath}
            onClick={() => {
              if (selectedPath) {
                setClipboard({ path: selectedPath, operation: "copy" });
              }
            }}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!selectedPath || !canCutNode(selectedPath)}
            onClick={() => {
              if (selectedPath && canCutNode(selectedPath)) {
                setClipboard({ path: selectedPath, operation: "cut" });
              }
            }}
          >
            <Scissors size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!clipboard}
            onClick={() => {
              void handlePaste();
            }}
          >
            <ClipboardPaste size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!selectedPath}
            onClick={() => {
              if (!selectedPath) {
                return;
              }

              const item = nodes[selectedPath];
              const nextName = globalThis.window.prompt("Rename item", item?.name);

              if (!nextName?.trim()) {
                return;
              }

              void renameNode(selectedPath, nextName.trim());
              setSelectedPath(null);
            }}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!selectedPath}
            onClick={() => {
              if (!selectedPath) {
                return;
              }

              void deleteNode(selectedPath);
              setSelectedPath(null);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <div className="explorer-layout">
        <aside className="explorer-sidebar">
          {quickPlaces.map((place) => (
            <button
              key={place.path}
              type="button"
              className={cn("sidebar-link", currentPath === place.path && "is-active")}
              onClick={() => navigate(place.path)}
            >
              {place.label}
            </button>
          ))}
        </aside>

        <section
          className={cn("explorer-content", dragActive && "is-drop-target")}
          onDragEnter={(event) => {
            if (!hasFilePayload(event)) {
              return;
            }

            event.preventDefault();
            dragDepthRef.current += 1;
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            if (!hasFilePayload(event)) {
              return;
            }

            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

            if (dragDepthRef.current === 0) {
              setDragActive(false);
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
            setDragActive(false);
            void uploadIntoCurrentDirectory(event.dataTransfer.files);
          }}
        >
          {dragActive ? (
            <div className="explorer-dropzone">
              <strong>Drop files to upload into {currentNode?.name ?? "this folder"}</strong>
              <small>Images, video, PDFs, and text/code files are persisted in the in-browser file system.</small>
            </div>
          ) : null}

          {filteredChildren.length > 0 ? (
            <div className="explorer-grid">
              {filteredChildren.map((node) => {
                const nodeLabel = node.kind === "directory" ? "DIR" : node.extension.toUpperCase();

                return (
                  <button
                    key={node.path}
                    type="button"
                    className={cn("explorer-item", selectedPath === node.path && "is-selected")}
                    onClick={() => setSelectedPath(node.path)}
                    onDoubleClick={() => openNode(node)}
                  >
                    <div className="explorer-item__preview">
                      {isImageFile(node) ? <img src={node.source} alt={node.name} /> : <span>{nodeLabel}</span>}
                    </div>
                    <strong>{node.name}</strong>
                    <small>{node.kind === "directory" ? "Folder" : node.mimeType}</small>
                  </button>
                );
              })}
            </div>
          ) : children.length === 0 ? (
            <div className="explorer-empty">
              <strong>This folder is empty</strong>
              <p>Create a folder, upload files, or add a new note to keep exploring the system.</p>
              <div className="action-row">
                <button type="button" className="pill-button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} />
                  Upload files
                </button>
                <button type="button" className="pill-button" onClick={() => void createDirectory(currentPath)}>
                  <FolderPlus size={15} />
                  New folder
                </button>
                <button type="button" className="pill-button" onClick={() => void createTextFile(currentPath)}>
                  <FilePlus2 size={15} />
                  New note
                </button>
              </div>
            </div>
          ) : (
            <div className="explorer-empty">
              <strong>No items match "{filterQuery.trim()}"</strong>
              <p>Try a different search term or clear the folder filter to see everything again.</p>
              <button type="button" className="pill-button" onClick={() => setFilterQuery("")}>
                Clear search
              </button>
            </div>
          )}

          {selectedNode ? (
            <div className="explorer-selection">
              <strong>Selected: {selectedNode.name}</strong>
              <div className="explorer-selection__meta">
                <span>{selectedNode.kind === "directory" ? "Folder" : selectedNode.mimeType}</span>
                <span>{selectedNode.path}</span>
                <span>Updated {new Date(selectedNode.updatedAt).toLocaleString()}</span>
                {selectedNode.kind === "directory" ? (
                  <span>{selectedDirectoryChildren} item(s)</span>
                ) : (
                  <span>{formatBytes(selectedNodeSize)}</span>
                )}
                {selectedNode.kind === "file" && selectedNode.readonly ? <span>Read only</span> : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
