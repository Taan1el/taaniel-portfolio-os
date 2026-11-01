import { create } from "zustand";

interface PropertiesState {
  /** What the Properties dialog is showing, or null when it is closed. */
  paths: string[] | null;
  open: (paths: string[]) => void;
  close: () => void;
}

export const usePropertiesStore = create<PropertiesState>((set) => ({
  paths: null,
  open: (paths) => set({ paths }),
  close: () => set({ paths: null }),
}));
