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
- Dino
- Hextris

## By Taaniel

- Next Stop: drive a steam train, explore country stations, restore a fence or fish by the lake.
- Open Next Stop from Games, Start, Search or /Games/Next Stop.lnk.
- WASD walks or adjusts power, E boards, Space brakes, J opens the journal and Esc pauses.
- Progress saves locally. Switching windows pauses the railway; closing releases graphics and sound.

## Notes

- Snake, Tetris, Dino and Hextris are written for this OS.
- Doom is a WebAssembly build of the GPL engine with the shareware episode.
`;

export const primaryGameIds = ["snake", "tetris", "doom", "dino", "hextris"] as const satisfies readonly AppId[];
export const originalGameIds = ["next-stop"] as const satisfies readonly AppId[];
export const boardGameIds = ["sudoku", "checkers"] as const satisfies readonly AppId[];
