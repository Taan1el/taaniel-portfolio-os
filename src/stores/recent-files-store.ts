import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const MAX_RECENT = 12;
const STORAGE_KEY = "taaniel-os:recent-files";

interface RecentFilesState {
  recentPaths: string[];
  trackFile: (path: string) => void;
  clearRecent: () => void;
}

export const useRecentFilesStore = create<RecentFilesState>()(
  persist(
    (set) => ({
      recentPaths: [],
      trackFile: (path) =>
        set((state) => {
          const filtered = state.recentPaths.filter((p) => p !== path);
          return { recentPaths: [path, ...filtered].slice(0, MAX_RECENT) };
        }),
      clearRecent: () => set({ recentPaths: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ recentPaths: state.recentPaths }),
    }
  )
);

/** Imperative helper — call outside React without hooks. */
export function trackRecentFile(path: string) {
  useRecentFilesStore.getState().trackFile(path);
}
