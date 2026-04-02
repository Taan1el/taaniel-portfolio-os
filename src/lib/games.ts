import { resolvePublicAssetUrl } from "@/lib/assets";

export const GAMES_DIRECTORY_PATH = "/Games";
export const GAMES_README_PATH = `${GAMES_DIRECTORY_PATH}/README.md`;

export const LEGACY_GAMES_README_CONTENT = `# Games

Arcade lives inside the OS now.

## Included

- Snake
- Tetris
- Dino

Open the Games app from Start or Search to launch each game in its own window.
`;

export const GAMES_README_CONTENT = `# Games

The arcade lineup now uses bundled open-source ports instead of in-house recreations.

## Included

- Dino
- Doom
- Hextris

## Credits

- Dino is the Chromium offline runner extracted for standalone play.
- Doom runs a local js-dos bundle with Freedoom content.
- Hextris is an open-source hex puzzle inspired by Tetris.

Everything is shipped from local assets so the games work in local development and on GitHub Pages.
`;

export const embeddedGameCatalog = {
  dino: {
    title: "Dino",
    subtitle: "Chromium's offline runner bundled as a local static game",
    src: resolvePublicAssetUrl("vendor/games/dino/index.html"),
    note: "The original Chromium runner is vendored locally so the game works in-window and on GitHub Pages.",
    creditsLabel: "Runner source",
    creditsHref: "https://github.com/wayou/t-rex-runner",
  },
  doom: {
    title: "Doom",
    subtitle: "Freedoom powered by a local js-dos bundle",
    src: resolvePublicAssetUrl("vendor/games/doom/index.html"),
    note: "This bundle runs Freedoom content inside a vendored js-dos runtime with no external CDN dependency.",
    creditsLabel: "Freedoom + js-dos",
    creditsHref: resolvePublicAssetUrl("vendor/games/doom/credits.html"),
  },
  hextris: {
    title: "Hextris",
    subtitle: "Open-source hex puzzle bundled into the desktop shell",
    src: resolvePublicAssetUrl("vendor/games/hextris/index.html"),
    note: "Hextris is shipped locally so the game loads the same way in dev and on GitHub Pages.",
    creditsLabel: "Hextris source",
    creditsHref: "https://github.com/Hextris/hextris",
  },
} as const;

