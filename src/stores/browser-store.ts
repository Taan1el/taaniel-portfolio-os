import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { browserBookmarks } from "@/lib/browser/bookmarks";
import type { BrowserBookmark } from "@/lib/browser/types";
import { getSafeLocalStorage } from "@/lib/safe-storage";

export const BROWSER_STORAGE_KEY = "taaniel-os-browser-v1";
const HISTORY_LIMIT = 300;
const LABEL_LIMIT = 80;

export interface BrowserHistoryEntry {
  url: string;
  title: string;
  visitedAt: number;
}

interface BrowserStoreState {
  favorites: BrowserBookmark[];
  history: BrowserHistoryEntry[];
  toggleFavorite: (bookmark: BrowserBookmark) => void;
  removeFavorite: (url: string) => void;
  recordVisit: (url: string, title: string) => void;
  removeHistoryEntry: (visitedAt: number) => void;
  clearHistory: () => void;
}

export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const cleanLabel = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, LABEL_LIMIT) : fallback;

/**
 * Saved favorites and history are untrusted on read - anyone with devtools can
 * edit localStorage. Only well-formed http(s) entries survive, so nothing like
 * a javascript: URL can ever reach the address bar or an iframe from storage.
 */
export function sanitizeBrowserData(raw: unknown): Pick<BrowserStoreState, "favorites" | "history"> {
  const data = (raw && typeof raw === "object" ? raw : {}) as { favorites?: unknown; history?: unknown };

  const favorites = Array.isArray(data.favorites)
    ? data.favorites
        .filter((entry): entry is { url: string; label?: unknown } => isWebUrl((entry as { url?: unknown })?.url))
        .map((entry) => ({ url: entry.url, label: cleanLabel(entry.label, new URL(entry.url).hostname) }))
    : browserBookmarks;

  const history = Array.isArray(data.history)
    ? data.history
        .filter(
          (entry): entry is { url: string; title?: unknown; visitedAt: number } =>
            isWebUrl((entry as { url?: unknown })?.url) && Number.isFinite((entry as { visitedAt?: unknown })?.visitedAt)
        )
        .map((entry) => ({ url: entry.url, title: cleanLabel(entry.title, new URL(entry.url).hostname), visitedAt: entry.visitedAt }))
        .slice(0, HISTORY_LIMIT)
    : [];

  return { favorites, history };
}

export const useBrowserStore = create<BrowserStoreState>()(
  persist(
    (set) => ({
      favorites: browserBookmarks,
      history: [],
      toggleFavorite: (bookmark) => {
        if (!isWebUrl(bookmark.url)) return;
        set((state) =>
          state.favorites.some((entry) => entry.url === bookmark.url)
            ? { favorites: state.favorites.filter((entry) => entry.url !== bookmark.url) }
            : { favorites: [...state.favorites, { url: bookmark.url, label: cleanLabel(bookmark.label, bookmark.url) }] }
        );
      },
      removeFavorite: (url) => set((state) => ({ favorites: state.favorites.filter((entry) => entry.url !== url) })),
      recordVisit: (url, title) => {
        if (!isWebUrl(url)) return;
        set((state) => {
          const visitedAt = Date.now();
          const latest = state.history[0];
          // Reloading the same page refreshes its timestamp instead of adding a duplicate.
          const rest = latest?.url === url ? state.history.slice(1) : state.history;
          return { history: [{ url, title: cleanLabel(title, url), visitedAt }, ...rest].slice(0, HISTORY_LIMIT) };
        });
      },
      removeHistoryEntry: (visitedAt) =>
        set((state) => ({ history: state.history.filter((entry) => entry.visitedAt !== visitedAt) })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: BROWSER_STORAGE_KEY,
      storage: createJSONStorage(() => getSafeLocalStorage()),
      partialize: (state) => ({ favorites: state.favorites, history: state.history }),
      merge: (persisted, current) => ({ ...current, ...sanitizeBrowserData(persisted) }),
    }
  )
);
