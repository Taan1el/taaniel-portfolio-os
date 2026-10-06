import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronRight, RotateCw, Search } from "lucide-react";
import { FolderIcon } from "@/components/icons/apps";
import { cn } from "@/lib/utils";
import { toWindowsPath } from "@/lib/windows-path";
import type { AppIcon } from "@/types/system";

export interface ExplorerBreadcrumb {
  label: string;
  path: string;
}

export interface ExplorerCommand {
  id: string;
  label: string;
  icon: AppIcon;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Show the label next to the icon (New, Sort, View), as Windows does. */
  showLabel?: boolean;
  /** Draw a dropdown chevron: the command opens a menu. */
  hasMenu?: boolean;
  /** Start a new group: a divider is drawn before this command. */
  groupStart?: boolean;
}

interface ExplorerToolbarProps {
  currentPath: string;
  breadcrumbs: ExplorerBreadcrumb[];
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  /** Typed path from the address bar. */
  onAddressSubmit: (input: string) => void;
  /** Bumped by Ctrl+L / Alt+D / F4 to put the address bar into edit mode. */
  addressEditNonce: number;
  searchQuery: string;
  searchPlaceholder: string;
  onSearchChange: (query: string) => void;
  commands: ExplorerCommand[];
}

export function ExplorerToolbar({
  currentPath,
  breadcrumbs,
  canGoBack,
  canGoForward,
  canGoUp,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onNavigate,
  onAddressSubmit,
  addressEditNonce,
  searchQuery,
  searchPlaceholder,
  onSearchChange,
  commands,
}: ExplorerToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const startEditing = () => {
    setDraft(toWindowsPath(currentPath));
    setEditing(true);
  };

  useEffect(() => {
    if (addressEditNonce > 0) startEditing();
    // Only a new nonce should open the editor, not a path change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressEditNonce]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  return (
    <div className="w11-explorer__chrome">
      <div className="w11-explorer__address-row">
        <div className="w11-explorer__nav">
          <button type="button" className="w11-explorer__nav-button" disabled={!canGoBack} onClick={onGoBack} aria-label="Back (Alt+Left)" title="Back (Alt+Left)">
            <ArrowLeft size={16} />
          </button>
          <button type="button" className="w11-explorer__nav-button" disabled={!canGoForward} onClick={onGoForward} aria-label="Forward (Alt+Right)" title="Forward (Alt+Right)">
            <ArrowRight size={16} />
          </button>
          <button type="button" className="w11-explorer__nav-button" disabled={!canGoUp} onClick={onGoUp} aria-label="Up to parent folder (Alt+Up)" title="Up to parent folder (Alt+Up)">
            <ArrowUp size={16} />
          </button>
          <button type="button" className="w11-explorer__nav-button" onClick={onRefresh} aria-label="Refresh (F5)" title="Refresh (F5)">
            <RotateCw size={15} />
          </button>
        </div>

        <div
          className={cn("w11-explorer__address", editing && "is-editing")}
          onClick={(event) => {
            // Clicking the empty part of the bar switches to a typed path, as in Windows.
            if (!editing && event.target === event.currentTarget) startEditing();
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              className="w11-explorer__address-input"
              value={draft}
              aria-label="Address"
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  setEditing(false);
                  onAddressSubmit(draft);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setEditing(false);
                }
              }}
            />
          ) : (
            <>
              <span className="w11-explorer__address-icon" aria-hidden="true">
                <FolderIcon size={16} />
              </span>
              <nav className="w11-explorer__crumbs" aria-label="Current folder">
                {breadcrumbs.map((crumb) => (
                  <span key={crumb.path} className="w11-explorer__crumb-group">
                    <ChevronRight size={12} className="w11-explorer__crumb-separator" aria-hidden="true" />
                    <button type="button" className="w11-explorer__crumb" onClick={() => onNavigate(crumb.path)}>
                      {crumb.label}
                    </button>
                  </span>
                ))}
              </nav>
              <button
                type="button"
                className="w11-explorer__address-fill"
                aria-label="Edit address (Ctrl+L)"
                onClick={startEditing}
              />
            </>
          )}
        </div>

        <label className="w11-explorer__search">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label={searchPlaceholder}
          />
          <Search size={14} aria-hidden="true" />
        </label>
      </div>

      <div className="w11-explorer__commandbar" role="toolbar" aria-label="Commands">
        {commands.map((command) => {
          const Icon = command.icon;
          return (
            <span key={command.id} className="w11-explorer__command-slot">
              {command.groupStart ? <span className="w11-explorer__command-divider" aria-hidden="true" /> : null}
              <button
                type="button"
                className={cn("w11-explorer__command", command.showLabel && "has-label")}
                disabled={command.disabled}
                aria-label={command.label}
                title={command.label}
                onClick={command.onSelect}
              >
                <Icon size={16} />
                {command.showLabel ? <span>{command.label}</span> : null}
                {command.hasMenu ? <ChevronDown size={12} aria-hidden="true" /> : null}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
