import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import type { AppId } from "@/types/system";

export const START_VIEWS = ["category", "grid", "list"] as const;
export type StartView = (typeof START_VIEWS)[number];

export const DEFAULT_START_PINS: AppId[] = [
  "about",
  "projects",
  "contact",
  "files",
  "browser",
  "terminal",
  "editor",
  "settings",
  "markdown",
  "photos",
  "games",
  "doom",
  "notes",
  "paint",
  "calculator",
  "v86",
  "music",
  "tv",
];

interface StartMenuState {
  pinned: AppId[];
  view: StartView;
  pin: (appId: AppId) => void;
  unpin: (appId: AppId) => void;
  moveToFront: (appId: AppId) => void;
  setView: (view: StartView) => void;
}

export const useStartMenuStore = create<StartMenuState>()(
  persist(
    (set) => ({
      pinned: DEFAULT_START_PINS,
      view: "category",
      pin: (appId) => set((state) => (state.pinned.includes(appId) ? state : { pinned: [...state.pinned, appId] })),
      unpin: (appId) => set((state) => ({ pinned: state.pinned.filter((id) => id !== appId) })),
      moveToFront: (appId) => set((state) => ({ pinned: [appId, ...state.pinned.filter((id) => id !== appId)] })),
      setView: (view) => set({ view }),
    }),
    {
      name: "taaniel-os-start-v1",
      storage: createJSONStorage(getSafeLocalStorage),
      // Ids that are no longer apps drop out when the menu looks them up in the registry.
      merge: (persisted, current) => {
        const saved = persisted as { pinned?: unknown; view?: unknown } | undefined;
        const pinned = Array.isArray(saved?.pinned)
          ? (Array.from(new Set(saved.pinned.filter((id) => typeof id === "string"))) as AppId[])
          : current.pinned;
        const view = START_VIEWS.find((entry) => entry === saved?.view) ?? current.view;
        return { ...current, pinned, view };
      },
      partialize: (state) => ({ pinned: state.pinned, view: state.view }),
    }
  )
);
