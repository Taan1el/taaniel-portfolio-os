import type { CSSProperties } from "react";
import { Bird, Gamepad2, Hexagon, Skull } from "lucide-react";
import { motion } from "framer-motion";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
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
      <AppContent padded>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Arcade</p>
          <h1>Real open-source games inside the OS shell</h1>
          <p className="lead">Each title launches in its own window from a vendored same-origin build so the lineup works locally and on GitHub Pages.</p>
        </div>
        <div className="token-list">
          <span>Vendored locally</span>
          <span>Windowed</span>
          <span>Keyboard-first</span>
        </div>
      </section>

      <div className="games-hub__grid">
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
                <Icon size={22} />
              </span>
              <span className="games-hub__card-copy">
                <strong>{game.title}</strong>
                <small>{game.description}</small>
              </span>
              <Gamepad2 size={16} />
            </motion.button>
          );
        })}
      </div>
      </AppContent>
    </AppScaffold>
  );
}
