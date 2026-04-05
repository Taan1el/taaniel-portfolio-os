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
    description: "Snake and Tetris.",
    gameIds: primaryGameIds,
  },
  {
    id: "reviewed-ports",
    title: "Ports under review",
    description: "Hextris, Dino, and Doom—ports limited or disabled.",
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
          <small>Each title opens in its own window.</small>
        </div>
        <div className="app-toolbar__group">
          <span className="games-hub__chip">Local</span>
        </div>
      </AppToolbar>

      <AppContent className="games-hub__content" padded>
        <section className="games-hub__intro">
          <p className="eyebrow">Arcade</p>
          <h2>Pick a game</h2>
          <p className="lead">Arcade games run locally; some legacy ports are still disabled.</p>
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
