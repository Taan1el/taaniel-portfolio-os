import { create } from "zustand";
import { createId } from "@/lib/utils";
import { getSystemSettings } from "@/stores/system-settings-store";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/** A toast that was raised, shown or not. Kept for this session only. */
export interface NotificationRecord extends Toast {
  at: number;
  /** Do not disturb held it back, so it never appeared on screen. */
  muted: boolean;
}

export const NOTIFICATION_HISTORY_LIMIT = 50;

interface ToastStore {
  toasts: Toast[];
  history: NotificationRecord[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearHistory: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  history: [],

  addToast: (message, type = "info") => {
    const id = createId("toast");
    const muted = getSystemSettings().doNotDisturb;
    const record: NotificationRecord = { id, message, type, at: Date.now(), muted };

    set((state) => ({
      history: [record, ...state.history].slice(0, NOTIFICATION_HISTORY_LIMIT),
      toasts: muted ? state.toasts : [...state.toasts, { id, message, type }],
    }));

    if (muted) {
      return;
    }

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clearHistory: () => set({ history: [] }),
}));

/** Convenience helper — call this anywhere without hooks. */
export function toast(message: string, type: ToastType = "info") {
  useToastStore.getState().addToast(message, type);
}
