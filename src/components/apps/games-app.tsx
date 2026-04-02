import type { CSSProperties } from "react";
import { Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  AppContent,
  AppScaffold,
  AppToolbar,
  GridView,
  StatusBar,
} from "@/components/apps/app-layout";
import { getAppDefinition } from "@/lib/app-registry";
import { bonusGameIds, primaryGameIds } from "@/lib/games";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, AppDefinition, AppId } from "@/types/system";

interface GameSectionDefinition {
  id: string;
  title: string;
  description: string;
  gameIds: readonly AppId[];
}

const gameSections: GameSectionDefinition[] = [
  {
    id: "arcade-classics",
    title: "Arcade classics",
    description: "Quick-launch games tuned to fill the window cleanly without wasted space.",
    gameIds: primaryGameIds,
  },
  {
    id: "reviewed-ports",
    title: "Ports under review",
    description: "These launchers stay visible, but unsafe third-party bundles have been disabled until safer local replacements are ready.",
    gameIds: bonusGameIds,
  },
];

function resolveGameDefinitions(gameIds: readonly AppId[]) {
  return gameIds
    .map((gameId) => getAppDefinition(gameId))
    .filter((definition): definition is AppDefinition => Boolean(definition));
}

export function GamesApp({ window }: AppComponentProps) {
  void window;

  const launchApp = useSystemStore((state) => state.launchApp);
  const bundledGames = gameSections.flatMap((section) => section.gameIds);

  return (
    <AppScaffold className="games-hub">
      <AppToolbar className="games-hub__toolbar">
        <div className="app-toolbar__title">
          <strong>Games</strong>
          <small>Bundled games that launch through the same shell, taskbar, and window runtime.</small>
        </div>
        <div className="app-toolbar__group">
          <span className="games-hub__chip">Registry-driven</span>
          <span className="games-hub__chip">Windowed</span>
          <span className="games-hub__chip">Keyboard-first</span>
        </div>
      </AppToolbar>

      <AppContent className="games-hub__content" padded>
        <section className="games-hub__intro">
          <p className="eyebrow">Arcade</p>
          <h2>Launch a game without leaving the desktop</h2>
          <p className="lead">
            Every title opens through the app registry and keeps the same shell controls. Arcade
            games stay playable, while older third-party ports are paused during the current
            security hardening pass.
          </p>
        </section>

        <div className="games-hub__sections">
          {gameSections.map((section, sectionIndex) => (
            <section key={section.id} className="games-hub__section">
              <div className="games-hub__section-header">
                <div className="games-hub__section-copy">
                  <strong>{section.title}</strong>
                  <small>{section.description}</small>
                </div>
                <span className="games-hub__chip">{section.gameIds.length} titles</span>
              </div>

              <GridView className="games-hub__grid" minItemWidth={220}>
                {resolveGameDefinitions(section.gameIds).map((game, gameIndex) => {
                  const Icon = game.icon;

                  return (
                    <motion.button
                      key={game.id}
                      type="button"
                      className="games-hub__card"
                      style={{ "--app-accent": game.accent } as CSSProperties}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: sectionIndex * 0.08 + gameIndex * 0.04,
                        duration: 0.18,
                      }}
                      onClick={() => launchApp({ appId: game.id })}
                    >
                      <span className="games-hub__card-icon">
                        <Icon size={20} />
                      </span>
                      <span className="games-hub__card-copy">
                        <strong>{game.title}</strong>
                        <small>{game.description}</small>
                      </span>
                      <Gamepad2 size={15} />
                    </motion.button>
                  );
                })}
              </GridView>
            </section>
          ))}
        </div>
      </AppContent>

      <StatusBar className="games-hub__statusbar">
        <span>{bundledGames.length} bundled games</span>
        <span>Launches through the app registry</span>
        <span>Unsafe third-party bundles are disabled instead of silently executing</span>
      </StatusBar>
    </AppScaffold>
  );
}
