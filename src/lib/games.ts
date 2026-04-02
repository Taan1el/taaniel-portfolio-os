import type { AppId } from "@/types/system";

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

export const PORTS_GAMES_README_CONTENT = `# Games

Some third-party ports have been paused during the current security hardening pass.

## Still playable

- Snake
- Tetris

## Temporarily unavailable

- Dino
- Doom
- Hextris
`;

export const GAMES_README_CONTENT = `# Games

The arcade lineup lives inside the OS and launches through the same window system as everything else.

## Arcade classics

- Snake
- Tetris

## Ports under review

- Dino
- Doom
- Hextris

## Notes

- Snake and Tetris are tuned for the compact desktop shell.
- Third-party ports are still listed in the hub, but they currently open a safe notice while local replacements are prepared.
`;

export const primaryGameIds = ["snake", "tetris"] as const satisfies readonly AppId[];
export const bonusGameIds = ["dino", "doom", "hextris"] as const satisfies readonly AppId[];
