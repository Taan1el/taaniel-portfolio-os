import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import { toast } from "@/stores/toast-store";
import type { AppId } from "@/types/system";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Unlocked by opening this app. */
  app?: AppId;
  /** Kept hidden until found. */
  secret?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "files", title: "Spring cleaning", description: "Open File Explorer.", app: "files" },
  { id: "terminal", title: "Command line native", description: "Open the Terminal.", app: "terminal" },
  { id: "code", title: "Ship it", description: "Open Code.", app: "editor" },
  { id: "doom", title: "Knee-deep", description: "Play Doom.", app: "doom" },
  { id: "train", title: "All aboard", description: "Ride in Next Stop.", app: "next-stop" },
  { id: "linux", title: "Penguin spotted", description: "Boot Linux in Virtual x86.", app: "v86" },
  { id: "snap", title: "Tidy windows", description: "Snap a window into a layout." },
  { id: "desktops", title: "Room to think", description: "Add a second desktop." },
  { id: "python", title: "Pythonista", description: "Run Python in the Terminal.", secret: true },
  { id: "sudo", title: "Nice try", description: "Ask for sudo.", secret: true },
  { id: "matrix", title: "Follow the white rabbit", description: "Enter the matrix.", secret: true },
  { id: "retro", title: "Back to 1995", description: "Pick the Retro theme.", secret: true },
];

const KNOWN = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));

interface AchievementsState {
  unlocked: string[];
  unlock: (id: string) => void;
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      unlock: (id) => {
        if (!KNOWN.has(id) || get().unlocked.includes(id)) return;
        set({ unlocked: [...get().unlocked, id] });
        const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
        if (achievement) toast(`Achievement: ${achievement.title}`, "success");
      },
    }),
    {
      name: "taaniel-os-achievements-v1",
      storage: createJSONStorage(getSafeLocalStorage),
      merge: (persisted, current) => {
        const saved = (persisted as { unlocked?: unknown } | undefined)?.unlocked;
        const unlocked = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && KNOWN.has(id)) : [];
        return { ...current, unlocked: Array.from(new Set(unlocked)) };
      },
      partialize: (state) => ({ unlocked: state.unlocked }),
    }
  )
);

export function unlockAchievement(id: string) {
  useAchievementsStore.getState().unlock(id);
}
