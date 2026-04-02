import { ChevronLeft, ChevronRight, FilePlus2, FolderPlus, Upload } from "lucide-react";
import { AppToolbar, IconButton, SearchInput } from "@/components/apps/app-layout";

export interface ExplorerBreadcrumb {
  label: string;
  path: string;
}

interface ExplorerToolbarProps {
  breadcrumbs: ExplorerBreadcrumb[];
  canGoBack: boolean;
  canGoForward: boolean;
  searchQuery: string;
  onGoBack: () => void;
  onGoForward: () => void;
  onNavigate: (path: string) => void;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
}

export function ExplorerToolbar({
  breadcrumbs,
  canGoBack,
  canGoForward,
  searchQuery,
  onGoBack,
  onGoForward,
  onNavigate,
  onSearchChange,
  onUpload,
  onCreateFolder,
  onCreateNote,
}: ExplorerToolbarProps) {
  return (
    <AppToolbar className="explorer-window__toolbar">
      <div className="explorer-window__nav">
        <IconButton
          type="button"
          className="explorer-window__nav-button"
          disabled={!canGoBack}
          onClick={onGoBack}
          aria-label="Go back"
        >
          <ChevronLeft size={14} />
        </IconButton>
        <IconButton
          type="button"
          className="explorer-window__nav-button"
          disabled={!canGoForward}
          onClick={onGoForward}
          aria-label="Go forward"
        >
          <ChevronRight size={14} />
        </IconButton>
      </div>

      <div className="explorer-window__path" aria-label="Current path">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="explorer-window__crumb">
            <button type="button" onClick={() => onNavigate(crumb.path)}>
              {crumb.label}
            </button>
            {index < breadcrumbs.length - 1 ? <span>/</span> : null}
          </div>
        ))}
      </div>

      <div className="explorer-window__controls">
        <SearchInput
          containerClassName="explorer-window__search"
          placeholder="Search folder"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <IconButton
          type="button"
          className="explorer-window__action"
          onClick={onUpload}
          aria-label="Upload files"
        >
          <Upload size={14} />
        </IconButton>
        <IconButton
          type="button"
          className="explorer-window__action"
          onClick={onCreateFolder}
          aria-label="Create folder"
        >
          <FolderPlus size={14} />
        </IconButton>
        <IconButton
          type="button"
          className="explorer-window__action"
          onClick={onCreateNote}
          aria-label="Create note"
        >
          <FilePlus2 size={14} />
        </IconButton>
      </div>
    </AppToolbar>
  );
}
