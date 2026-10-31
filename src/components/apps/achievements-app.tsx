import { Lock, Trophy } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { cn } from "@/lib/utils";
import { ACHIEVEMENTS, useAchievementsStore } from "@/stores/achievements-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/achievements.css";

export function AchievementsApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const unlocked = useAchievementsStore((state) => state.unlocked);

  return (
    <AppScaffold className="achievements-app">
      <AppContent padded scrollable>
        <h2 className="achievements-app__count">
          {unlocked.length} of {ACHIEVEMENTS.length} found
        </h2>
        <ul className="achievements-app__list">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = unlocked.includes(achievement.id);
            const hidden = achievement.secret && !earned;
            return (
              <li key={achievement.id} className={cn("achievements-app__item", earned && "is-earned")}>
                {earned ? <Trophy size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
                <div>
                  <strong>{hidden ? "Secret" : achievement.title}</strong>
                  <p>{hidden ? "Keep exploring. The terminal knows a few tricks." : achievement.description}</p>
                </div>
                <span className="sr-only">{earned ? "Found" : "Not found yet"}</span>
              </li>
            );
          })}
        </ul>
      </AppContent>
    </AppScaffold>
  );
}
