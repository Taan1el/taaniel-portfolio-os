import type { CSSProperties } from "react";
import { Bird, Gamepad2, Hexagon, Skull } from "lucide-react";
import { motion } from "framer-motion";
import {
  AppContent,
  AppScaffold,
  AppToolbar,
  GridView,
  StatusBar,
} from "@/components/apps/app-layout";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, AppId } from "@/types/system";

const gameCards: Array<{
  id: AppId;
  title: string;
  description: string;
  icon: typeof Gamepad2;
  accent: string;
}> = [
  {
    id: "dino",
    title: "Dino",
    description: "The real Chromium runner, bundled locally for same-origin play.",
    icon: Bird,
    accent: "#8bff9f",
  },
  {
    id: "doom",
    title: "Doom",
    description: "Freedoom content running inside a local js-dos bundle.",
    icon: Skull,
    accent: "#ff8a5c",
  },
  {
    id: "hextris",
    title: "Hextris",
    description: "A polished open-source hex puzzler shipped as a local static build.",
    icon: Hexagon,
    accent: "#84b6ff",
  },
];

export function GamesApp({ window }: AppComponentProps) {
  void window;

  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <AppScaffold className="games-hub">
      <AppToolbar className="games-hub__toolbar">
        <div className="app-toolbar__title">
          <strong>Games</strong>
          <small>Bundled browser-ready titles that launch through the OS window system.</small>
        </div>
        <div className="app-toolbar__group">
          <span className="games-hub__chip">Vendored locally</span>
          <span className="games-hub__chip">Windowed</span>
          <span className="games-hub__chip">Keyboard-first</span>
        </div>
      </AppToolbar>

      <AppContent className="games-hub__content" padded>
        <section className="games-hub__intro">
          <p className="eyebrow">Arcade</p>
          <h2>Launch a game without leaving the desktop</h2>
          <p className="lead">
            Each title opens in its own managed window from a local build, so the lineup behaves the
            same in development and on the published site.
          </p>
        </section>

        <GridView className="games-hub__grid" minItemWidth={220}>
          {gameCards.map((game, index) => {
            const Icon = game.icon;

            return (
              <motion.button
                key={game.id}
                type="button"
                className="games-hub__card"
                style={{ "--app-accent": game.accent } as CSSProperties}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.18 }}
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
      </AppContent>

      <StatusBar className="games-hub__statusbar">
        <span>{gameCards.length} bundled games</span>
        <span>Launches through the app registry</span>
        <span>Taskbar previews fall back automatically for heavy canvases</span>
      </StatusBar>
    </AppScaffold>
  );
}
