import { Star } from "lucide-react";
import { AppSidebar } from "@/components/apps/app-layout";
import type { BrowserBookmark } from "@/lib/browser/types";
import { getUrlOrSearch } from "@/lib/browser/urlUtils";
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
          This app is an iframe shell with optional proxy modes. Google iframe pages, Wikipedia,
          and static sites usually work best. Auth-heavy social platforms usually need a new tab.
        </p>
      </div>
    </AppSidebar>
  );
}
