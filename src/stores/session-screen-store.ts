import { create } from "zustand";

/** What covers the desktop: the boot animation, the lock screen, or nothing. */
export type SessionScreen = "boot" | "lock" | "desktop";

const SESSION_KEY = "taaniel-os-session-started";

function hasStartedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Without storage the boot simply plays again next load.
  }
}

interface SessionScreenState {
  screen: SessionScreen;
  finishBoot: () => void;
  signIn: () => void;
  lock: () => void;
  restart: () => void;
}

export const useSessionScreenStore = create<SessionScreenState>()((set) => ({
  // A reload in the same tab goes straight back to work, like waking a PC.
  screen: hasStartedThisSession() ? "desktop" : "boot",
  finishBoot: () => set((state) => (state.screen === "boot" ? { screen: "lock" } : state)),
  signIn: () => {
    rememberSession();
    set({ screen: "desktop" });
  },
  lock: () => set({ screen: "lock" }),
  restart: () => set({ screen: "boot" }),
}));
