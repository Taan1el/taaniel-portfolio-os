import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ArrowRight, FileText, Home, Lock, MoreHorizontal, RotateCw, Search, Star, TriangleAlert } from "lucide-react";
import { NEW_TAB_URL } from "@/lib/browser/urlUtils";
import type { BrowserLoadState } from "@/lib/browser/types";
import { cn } from "@/lib/utils";

export type SiteSecurity = "secure" | "insecure" | "local" | "internal";

interface BrowserToolbarProps {
  address: string;
  security: SiteSecurity;
  loadState: BrowserLoadState;
  canGoBack: boolean;
  canGoForward: boolean;
  isFavorite: boolean;
  canFavorite: boolean;
  /** Bumped by Ctrl+L to focus and select the address. */
  focusAddressNonce: number;
  onAddressChange: (value: string) => void;
  onSubmit: () => void;
  onRevert: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onToggleFavorite: () => void;
  onMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

const SECURITY = {
  secure: { icon: Lock, label: "Connection is secure" },
  insecure: { icon: TriangleAlert, label: "Not secure" },
  local: { icon: FileText, label: "File on this PC" },
  internal: { icon: Search, label: "Browser page" },
} as const;

export function BrowserToolbar({
  address,
  security,
  loadState,
  canGoBack,
  canGoForward,
  isFavorite,
  canFavorite,
  focusAddressNonce,
  onAddressChange,
  onSubmit,
  onRevert,
  onBack,
  onForward,
  onReload,
  onHome,
  onToggleFavorite,
  onMenu,
}: BrowserToolbarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const SecurityIcon = SECURITY[security].icon;
  // The new tab page shows an empty address bar, as real browsers do.
  const shown = address === NEW_TAB_URL ? "" : address;

  useEffect(() => {
    if (focusAddressNonce === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusAddressNonce]);

  return (
    <div className="w11-browser__toolbar">
      <button type="button" className="w11-browser__tool" onClick={onBack} disabled={!canGoBack} aria-label="Back (Alt+Left)" title="Back (Alt+Left)">
        <ArrowLeft size={16} />
      </button>
      <button type="button" className="w11-browser__tool" onClick={onForward} disabled={!canGoForward} aria-label="Forward (Alt+Right)" title="Forward (Alt+Right)">
        <ArrowRight size={16} />
      </button>
      <button type="button" className="w11-browser__tool" onClick={onReload} aria-label="Refresh (F5)" title="Refresh (F5)">
        <RotateCw size={15} className={cn(loadState === "loading" && "is-spinning")} />
      </button>
      <button type="button" className="w11-browser__tool" onClick={onHome} aria-label="Home (Alt+Home)" title="Home (Alt+Home)">
        <Home size={16} />
      </button>

      <form
        className={cn("w11-browser__address", editing && "is-editing")}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
          inputRef.current?.blur();
        }}
      >
        <span
          className={cn("w11-browser__security", `is-${security}`)}
          title={SECURITY[security].label}
          aria-label={SECURITY[security].label}
          role="img"
        >
          <SecurityIcon size={14} />
          {security === "insecure" ? <span>Not secure</span> : null}
        </span>
        <input
          ref={inputRef}
          value={shown}
          placeholder="Search or enter web address"
          aria-label="Address and search bar"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onAddressChange(event.target.value)}
          onFocus={(event) => {
            setEditing(true);
            event.currentTarget.select();
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onRevert();
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className={cn("w11-browser__star", isFavorite && "is-favorite")}
          onClick={onToggleFavorite}
          disabled={!canFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Remove from favorites (Ctrl+D)" : "Add this page to favorites (Ctrl+D)"}
          title={isFavorite ? "Remove from favorites (Ctrl+D)" : "Add this page to favorites (Ctrl+D)"}
        >
          <Star size={15} />
        </button>
      </form>

      <button type="button" className="w11-browser__tool" onClick={onMenu} aria-label="Settings and more" title="Settings and more" aria-haspopup="menu">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
