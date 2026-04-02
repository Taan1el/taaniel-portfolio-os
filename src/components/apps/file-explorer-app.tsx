import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  BookText,
  BriefcaseBusiness,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Gamepad2,
  Image,
  Monitor,
  Music4,
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
import { joinPath, normalizePath } from "@/lib/filesystem";
import { isBrowserRenderableImageExtension } from "@/lib/file-registry";
import { openFileSystemPath } from "@/lib/launchers";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, FileNode } from "@/types/system";

interface ExplorerGridItemProps {
  node: FileNode;
  selected: boolean;
  onOpen: (node: FileNode) => void;
  onSelect: (path: string) => void;
}

const explorerLocations: ExplorerSidebarLocation[] = [
  { label: "Desktop", path: "/Desktop", icon: Monitor },
  { label: "Documents", path: "/Documents", icon: FolderOpen },
  { label: "Notes", path: "/Documents/Notes", icon: BookText },
  { label: "Portfolio", path: "/Portfolio", icon: BriefcaseBusiness },
  { label: "Photography", path: "/Media/Photography", icon: Image },
  { label: "Music", path: "/Media/Music", icon: Music4 },
  { label: "Games", path: "/Games", icon: Gamepad2 },
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

function hasFilePayload(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function getFileNodeSearchText(node: FileNode) {
  return [node.name, node.path, node.type, node.mimeType ?? "", node.extension ?? ""].join(" ").toLowerCase();
}

const ExplorerGridItem = memo(function ExplorerGridItem({
  node,
  selected,
  onOpen,
  onSelect,
}: ExplorerGridItemProps) {
  const canRenderThumbnail =
    node.type === "file" &&
    Boolean(node.mimeType?.startsWith("image/")) &&
    Boolean(node.extension && isBrowserRenderableImageExtension(node.extension)) &&
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
        ) : node.type === "folder" ? (
          <Folder size={26} />
        ) : node.mimeType?.startsWith("image/") ? (
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
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const mkdir = useFileSystemStore((state) => state.mkdir);
  const writeFile = useFileSystemStore((state) => state.writeFile);
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
  const currentNode = nodes[currentPath];
  const currentDirectoryPath =
    currentNode?.kind === "directory" ? currentNode.path : "/";
  const children = useMemo(() => listDirectory(currentDirectoryPath), [currentDirectoryPath, listDirectory, nodes]);
  const filteredChildren = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return children;
    }

    return children.filter((node) => getFileNodeSearchText(node).includes(normalizedQuery));
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
  };

  const createNote = async () => {
    const createdPath = await writeFile(joinPath(currentDirectoryPath, "New Note.txt"), "", {
      mimeType: "text/plain",
      extension: "txt",
      uniqueName: true,
    });
    setSelectedPath(window.id, createdPath);
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
      />

      <AppContent className="explorer-window__layout" padded={false} scrollable={false} stacked={false}>
        <ExplorerSidebar
          locations={explorerLocations}
          activePath={currentDirectoryPath}
          onNavigate={(path) => navigate(window.id, path)}
        />

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

          <ScrollArea className="explorer-window__scroll-area" padded>
            {filteredChildren.length > 0 ? (
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
                    selected={selectedPath === node.path}
                    onOpen={openNode}
                    onSelect={(path) => setSelectedPath(window.id, path)}
                  />
                ))}
              </GridView>
            ) : children.length === 0 ? (
              <EmptyState
                className="explorer-window__empty"
                title="This folder is empty"
                description="Upload files or create a folder to keep building out the workspace."
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
        <span className="explorer-window__status-path" title={selectedNode?.path ?? currentDirectoryPath}>
          {selectedNode?.name ?? currentDirectoryPath}
        </span>
      </StatusBar>
    </AppScaffold>
  );
}
