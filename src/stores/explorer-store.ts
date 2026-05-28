import { create } from "zustand";
import { normalizePath } from "@/lib/filesystem";

export type ExplorerSortKey = "name" | "date" | "size" | "type";
export type ExplorerSortDirection = "asc" | "desc";

export interface ExplorerSession {
  windowId: string;
  currentPath: string;
  history: string[];
  historyIndex: number;
  /** Multi-select selection. The last entry is the "active" item (anchor for shift+click). */
  selectedPaths: string[];
  /** Legacy single-selection accessor — kept for backward-compat callers. Mirrors selectedPaths[selectedPaths.length - 1] ?? null. */
  selectedPath: string | null;
  /** Path currently in inline-rename mode, if any. */
  renamingPath: string | null;
  searchQuery: string;
  viewMode: "grid" | "list";
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
}

interface ExplorerStoreState {
  sessions: Record<string, ExplorerSession>;
  ensureSession: (windowId: string, initialPath: string) => void;
  destroySession: (windowId: string) => void;
  navigate: (windowId: string, nextPath: string) => void;
  goBack: (windowId: string) => void;
  goForward: (windowId: string) => void;
  /** Legacy single-path setter — replaces the selection with [path] (or clears it). */
  setSelectedPath: (windowId: string, path: string | null) => void;
  setSelectedPaths: (windowId: string, paths: string[]) => void;
  toggleSelected: (windowId: string, path: string) => void;
  /** Shift+click range selection. orderedPaths is the visible item order. */
  extendSelection: (windowId: string, path: string, orderedPaths: string[]) => void;
  clearSelection: (windowId: string) => void;
  beginRename: (windowId: string, path: string) => void;
  endRename: (windowId: string) => void;
  setSearchQuery: (windowId: string, query: string) => void;
  setViewMode: (windowId: string, viewMode: ExplorerSession["viewMode"]) => void;
  setSort: (windowId: string, key: ExplorerSortKey, direction: ExplorerSortDirection) => void;
}

function lastOf(paths: string[]): string | null {
  return paths.length > 0 ? paths[paths.length - 1] : null;
}

function createSession(windowId: string, initialPath: string): ExplorerSession {
  const normalizedPath = normalizePath(initialPath);

  return {
    windowId,
    currentPath: normalizedPath,
    history: [normalizedPath],
    historyIndex: 0,
    selectedPaths: [],
    selectedPath: null,
    renamingPath: null,
    searchQuery: "",
    viewMode: "grid",
    sortKey: "name",
    sortDirection: "asc",
  };
}

function updateSession(
  state: ExplorerStoreState,
  windowId: string,
  updater: (session: ExplorerSession) => ExplorerSession
): ExplorerStoreState {
  const session = state.sessions[windowId];

  if (!session) {
    return state;
  }

  return {
    ...state,
    sessions: {
      ...state.sessions,
      [windowId]: updater(session),
    },
  };
}

export const useExplorerStore = create<ExplorerStoreState>((set, get) => ({
  sessions: {},
  ensureSession: (windowId, initialPath) =>
    set((state) => {
      if (state.sessions[windowId]) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [windowId]: createSession(windowId, initialPath),
        },
      };
    }),
  destroySession: (windowId) =>
    set((state) => {
      if (!state.sessions[windowId]) {
        return state;
      }

      const { [windowId]: _, ...remaining } = state.sessions;
      return { sessions: remaining };
    }),
  navigate: (windowId, nextPath) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session) {
        return {
          sessions: {
            ...state.sessions,
            [windowId]: createSession(windowId, nextPath),
          },
        };
      }

      const normalizedPath = normalizePath(nextPath);

      if (session.currentPath === normalizedPath) {
        return {
          sessions: {
            ...state.sessions,
            [windowId]: {
              ...session,
              selectedPaths: [],
              selectedPath: null,
              renamingPath: null,
              searchQuery: "",
            },
          },
        };
      }

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            currentPath: normalizedPath,
            history: [...session.history.slice(0, session.historyIndex + 1), normalizedPath],
            historyIndex: session.historyIndex + 1,
            selectedPaths: [],
            selectedPath: null,
            renamingPath: null,
            searchQuery: "",
          },
        },
      };
    }),
  goBack: (windowId) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session || session.historyIndex <= 0) {
        return state;
      }

      const historyIndex = session.historyIndex - 1;

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            historyIndex,
            currentPath: session.history[historyIndex],
            selectedPaths: [],
            selectedPath: null,
            renamingPath: null,
            searchQuery: "",
          },
        },
      };
    }),
  goForward: (windowId) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session || session.historyIndex >= session.history.length - 1) {
        return state;
      }

      const historyIndex = session.historyIndex + 1;

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            historyIndex,
            currentPath: session.history[historyIndex],
            selectedPaths: [],
            selectedPath: null,
            renamingPath: null,
            searchQuery: "",
          },
        },
      };
    }),
  setSelectedPath: (windowId, path) =>
    set((state) =>
      updateSession(state, windowId, (session) => {
        const normalized = path ? normalizePath(path) : null;
        const selectedPaths = normalized ? [normalized] : [];

        return {
          ...session,
          selectedPaths,
          selectedPath: normalized,
        };
      })
    ),
  setSelectedPaths: (windowId, paths) =>
    set((state) =>
      updateSession(state, windowId, (session) => {
        const normalized = Array.from(new Set(paths.map((p) => normalizePath(p))));
        return {
          ...session,
          selectedPaths: normalized,
          selectedPath: lastOf(normalized),
        };
      })
    ),
  toggleSelected: (windowId, path) =>
    set((state) =>
      updateSession(state, windowId, (session) => {
        const normalized = normalizePath(path);
        const has = session.selectedPaths.includes(normalized);
        const nextPaths = has
          ? session.selectedPaths.filter((p) => p !== normalized)
          : [...session.selectedPaths, normalized];
        return {
          ...session,
          selectedPaths: nextPaths,
          selectedPath: lastOf(nextPaths),
        };
      })
    ),
  extendSelection: (windowId, path, orderedPaths) =>
    set((state) =>
      updateSession(state, windowId, (session) => {
        const normalized = normalizePath(path);
        const anchor = lastOf(session.selectedPaths);
        const normalizedOrder = orderedPaths.map((p) => normalizePath(p));
        const targetIndex = normalizedOrder.indexOf(normalized);

        if (targetIndex === -1) {
          return {
            ...session,
            selectedPaths: [normalized],
            selectedPath: normalized,
          };
        }

        if (!anchor) {
          return {
            ...session,
            selectedPaths: [normalized],
            selectedPath: normalized,
          };
        }

        const anchorIndex = normalizedOrder.indexOf(anchor);

        if (anchorIndex === -1) {
          return {
            ...session,
            selectedPaths: [normalized],
            selectedPath: normalized,
          };
        }

        const [lo, hi] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const range = normalizedOrder.slice(lo, hi + 1);
        return {
          ...session,
          selectedPaths: range,
          selectedPath: lastOf(range),
        };
      })
    ),
  clearSelection: (windowId) =>
    set((state) =>
      updateSession(state, windowId, (session) => ({
        ...session,
        selectedPaths: [],
        selectedPath: null,
        renamingPath: null,
      }))
    ),
  beginRename: (windowId, path) =>
    set((state) =>
      updateSession(state, windowId, (session) => {
        const normalized = normalizePath(path);
        return {
          ...session,
          renamingPath: normalized,
          selectedPaths: [normalized],
          selectedPath: normalized,
        };
      })
    ),
  endRename: (windowId) =>
    set((state) =>
      updateSession(state, windowId, (session) => ({
        ...session,
        renamingPath: null,
      }))
    ),
  setSearchQuery: (windowId, query) =>
    set((state) =>
      updateSession(state, windowId, (session) => ({
        ...session,
        searchQuery: query,
      }))
    ),
  setViewMode: (windowId, viewMode) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session || session.viewMode === viewMode) {
        return state;
      }

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            viewMode,
          },
        },
      };
    }),
  setSort: (windowId, key, direction) =>
    set((state) =>
      updateSession(state, windowId, (session) => ({
        ...session,
        sortKey: key,
        sortDirection: direction,
      }))
    ),
}));
