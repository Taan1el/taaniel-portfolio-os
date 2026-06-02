import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizePath } from "@/lib/filesystem";
import { getSafeLocalStorage } from "@/lib/safe-storage";

const MAX_RECENT = 12;
const STORAGE_KEY = "taaniel-os:recent-files";

interface RecentFilesState {
  recentPaths: string[];
  trackFile: (path: string) => void;
  clearRecent: () => void;
}

export function sanitizeRecentPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((path): path is string => typeof path === "string" && path.trim().length > 0)
        .map((path) => normalizePath(path))
        .filter((path) => path !== "/")
    )
  ).slice(0, MAX_RECENT);
}

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set) => ({
      recentPaths: [],
      trackFile: (path) =>
        set((state) => {
          const [normalizedPath] = sanitizeRecentPaths([path]);

          if (!normalizedPath) {
            return state;
          }

          const filtered = state.recentPaths.filter((p) => p !== normalizedPath);
          return { recentPaths: [normalizedPath, ...filtered].slice(0, MAX_RECENT) };
        }),
      clearRecent: () => set({ recentPaths: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(getSafeLocalStorage),
      merge: (persistedState, currentState) => {
        const state = persistedState as { recentPaths?: unknown } | undefined;
        return {
          ...currentState,
          recentPaths: sanitizeRecentPaths(state?.recentPaths),
        };
      },
      partialize: (state) => ({ recentPaths: state.recentPaths }),
    }
  )
);

/** Imperative helper — call outside React without hooks. */
export function trackRecentFile(path: string) {
  useRecentFilesStore.getState().trackFile(path);
}
