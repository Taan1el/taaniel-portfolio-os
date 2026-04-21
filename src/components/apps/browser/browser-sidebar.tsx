import { Star } from "lucide-react";
import { AppSidebar } from "@/components/apps/app-layout";
import type { BrowserBookmark } from "@/lib/browser/types";
import { getUrlOrSearch } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

interface BrowserSidebarProps {
  bookmarks: BrowserBookmark[];
  activeUrl: string;
  onVisit: (url: string) => void;
}

export function BrowserSidebar({
  bookmarks,
  activeUrl,
  onVisit,
}: BrowserSidebarProps) {
  return (
    <AppSidebar className="browser-app__sidebar">
      <div className="browser-app__sidebar-group">
        <p className="eyebrow">Bookmarks</p>
        <div className="browser-app__bookmark-list">
          {bookmarks.map((bookmark) => {
            const bookmarkUrl = getUrlOrSearch(bookmark.url);
            const isActive = activeUrl === bookmarkUrl;

            return (
              <button
                key={bookmark.label}
                type="button"
                className={cn("browser-app__bookmark", isActive && "is-active")}
                onClick={() => onVisit(bookmark.url)}
              >
                <Star size={14} />
                <span>{bookmark.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="browser-app__note">
        <strong>Browser model</strong>
        <p>
          This app is an iframe shell with optional proxy modes. It is not a real browser engine,
          so sites that block framing or depend on complex auth flows may fail.
        </p>
      </div>
    </AppSidebar>
  );
}
