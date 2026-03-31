import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FilePlus2, FolderPlus, FolderTree, Pencil, Trash2 } from "lucide-react";
import { getNodeByPath, getParentPath, isImageFile, listChildren, normalizePath } from "@/lib/filesystem";
import { openFileSystemPath } from "@/lib/launchers";
import { cn } from "@/lib/utils";
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

export function FileExplorerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const createDirectory = useFileSystemStore((state) => state.createDirectory);
  const createTextFile = useFileSystemStore((state) => state.createTextFile);
  const renameNode = useFileSystemStore((state) => state.renameNode);
  const deleteNode = useFileSystemStore((state) => state.deleteNode);
  const launchApp = useSystemStore((state) => state.launchApp);

  const [currentPath, setCurrentPath] = useState(window.payload?.directoryPath ?? "/Portfolio");
  const [history, setHistory] = useState<string[]>([window.payload?.directoryPath ?? "/Portfolio"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!window.payload?.directoryPath) {
      return;
    }

    setCurrentPath(window.payload.directoryPath);
    setHistory([window.payload.directoryPath]);
    setHistoryIndex(0);
  }, [window.payload?.directoryPath]);

  const currentNode = getNodeByPath(nodes, currentPath);
  const children = useMemo(() => listChildren(nodes, currentPath), [currentPath, nodes]);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath]);

  const navigate = (nextPath: string) => {
    const normalized = normalizePath(nextPath);
    setCurrentPath(normalized);
    setSelectedPath(null);
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

  return (
    <div className="app-screen explorer-app">
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

        <div className="app-toolbar__group">
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

        <section className="explorer-content">
          {children.length > 0 ? (
            <div className="explorer-grid">
              {children.map((node) => {
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
          ) : (
            <div className="explorer-empty">
              <strong>This folder is empty</strong>
              <p>Create a folder or a new note to keep exploring the system.</p>
              <div className="action-row">
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
          )}
        </section>
      </div>
    </div>
  );
}
