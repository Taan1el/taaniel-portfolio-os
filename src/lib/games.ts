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
- Doom

## By Taaniel

- Next Stop: drive a steam train, explore country stations, restore a fence or fish by the lake.
- Open Next Stop from Games, Start, Search or /Games/Next Stop.lnk.
- WASD walks or adjusts power, E boards, Space brakes, J opens the journal and Esc pauses.
- Progress saves locally. Switching windows pauses the railway; closing releases graphics and sound.

## Ports under review

- Dino
- Hextris

## Notes

- Snake and Tetris are tuned for the compact desktop shell.
- Third-party ports are still listed in the hub, but they currently open a safe notice while local replacements are prepared.
`;

export const primaryGameIds = ["snake", "tetris", "doom"] as const satisfies readonly AppId[];
export const originalGameIds = ["next-stop"] as const satisfies readonly AppId[];
export const bonusGameIds = ["dino", "hextris"] as const satisfies readonly AppId[];
