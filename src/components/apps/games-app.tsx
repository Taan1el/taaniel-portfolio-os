import type { CSSProperties } from "react";
import { Bird, Blocks, Gamepad2, Waypoints } from "lucide-react";
import { motion } from "framer-motion";
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
    id: "snake",
    title: "Snake",
    description: "Classic grid chase with quick keyboard controls.",
    icon: Waypoints,
    accent: "#8bff9f",
  },
  {
    id: "tetris",
    title: "Tetris",
    description: "Rotate, stack, and clear lines in a compact well.",
    icon: Blocks,
    accent: "#84b6ff",
  },
  {
    id: "dino",
    title: "Dino",
    description: "Jump cacti and keep pace as the desert speeds up.",
    icon: Bird,
    accent: "#ffd27d",
  },
];

export function GamesApp({ window }: AppComponentProps) {
  void window;

  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <div className="app-screen games-hub">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Arcade</p>
          <h1>In-browser games inside the OS shell</h1>
          <p className="lead">Each title launches in its own window and stays lightweight enough for the desktop shell.</p>
        </div>
        <div className="token-list">
          <span>Keyboard-first</span>
          <span>Windowed</span>
          <span>Browser-native</span>
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
    </div>
  );
}
