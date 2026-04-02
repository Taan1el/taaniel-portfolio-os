import { create } from "zustand";
import { normalizePath } from "@/lib/filesystem";

export interface ExplorerSession {
  windowId: string;
  currentPath: string;
  history: string[];
  historyIndex: number;
  selectedPath: string | null;
  searchQuery: string;
  viewMode: "grid" | "list";
}

interface ExplorerStoreState {
  sessions: Record<string, ExplorerSession>;
  ensureSession: (windowId: string, initialPath: string) => void;
  navigate: (windowId: string, nextPath: string) => void;
  goBack: (windowId: string) => void;
  goForward: (windowId: string) => void;
  setSelectedPath: (windowId: string, path: string | null) => void;
  setSearchQuery: (windowId: string, query: string) => void;
  setViewMode: (windowId: string, viewMode: ExplorerSession["viewMode"]) => void;
}

function createSession(windowId: string, initialPath: string): ExplorerSession {
  const normalizedPath = normalizePath(initialPath);

  return {
    windowId,
    currentPath: normalizedPath,
    history: [normalizedPath],
    historyIndex: 0,
    selectedPath: null,
    searchQuery: "",
    viewMode: "grid",
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
              selectedPath: null,
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
            selectedPath: null,
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
            selectedPath: null,
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
            selectedPath: null,
            searchQuery: "",
          },
        },
      };
    }),
  setSelectedPath: (windowId, path) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            selectedPath: path ? normalizePath(path) : null,
          },
        },
      };
    }),
  setSearchQuery: (windowId, query) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            searchQuery: query,
          },
        },
      };
    }),
  setViewMode: (windowId, viewMode) =>
    set((state) => {
      const session = state.sessions[windowId];

      if (!session || session.viewMode === viewMode) {
        return state;
      }

      return {
        sessions: {
          ...state.sessions,
          [windowId]: {
            ...session,
            viewMode,
          },
        },
      };
    }),
}));
