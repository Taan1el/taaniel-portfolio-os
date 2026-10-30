# Next Stop minigame

Open **Games → Next Stop**, find **Next Stop** in Start/Search, or open `/Games/Next Stop.lnk` in File Explorer. Search also understands “steam train” and “railway”. The game is an original project by Taaniel, separate from the third-party ports that remain disabled.

The window embeds the local, MIT-licensed standalone HTML from `public/assets/games/next-stop/`. Its asset URL uses Vite's base path, including `/taaniel-portfolio-os/` for GitHub Pages. The bundled README records source commit, byte size and SHA-256. The game's renderer and dependencies stay out of the OS JavaScript bundle.

## Window behavior

- Switching windows pauses the player and stops the game's animation loop, including its title backdrop. Returning redraws the paused scene; the player chooses Resume.
- Minimizing unmounts apps in this OS. The adapter keeps that window's serialized journey in memory and restores it paused when the window returns. Indoor pose, cast/refill progress and other transient activities follow the game's normal save rules.
- Closing calls the game's destroy method to release graphics, listeners and audio. Reopening offers the game's saved local checkpoint through Continue last journey. Export/import JSON inside the game remains available.
- The game keeps its own sound controls. Their level is multiplied by the OS master volume; OS mute always silences it.
- Resize and maximize resize the iframe viewport. The game handles its normal resize event. Open full page offers the same local file in a separate tab.

WASD walks or adjusts power; E boards/delivers/leaves; Space brakes; B fires the boiler; J opens the journal; Esc pauses. Existing touch controls remain inside the game. First launch may take around a minute on a slow graphics driver. WebGL2 is required.

## Validation

`npm run test` includes adapter lifecycle/audio, search/shortcut integration and exact bundled-file checks. `npm run build` and `npm run build:gh` verify TypeScript and both asset bases. Browser QA should launch through Games, board/fire/drive, maximize, minimize/restore, switch to another app, close/reopen and continue a save. Inspect screenshots for the game inside the desktop frame. Unit tests do not substitute for WebGL drawing or real window interactions.

Checked on 30 October 2026 with Windows desktop Chromium 156.0.8078.4:

- Full Vitest suite: 105 files, 1,048 tests passed, including nine integration checks.
- Default production build and GitHub Pages build passed. Existing v86 externalization and large-chunk warnings remain.
- Actual browser inputs covered Games launch, boarding, firing, driving, braking, maximize, minimize/restore, switching to Calculator, returning paused, closing/reopening and continuing the saved journey. OS master mute held throughout. Screenshots of driving and restored/maximized views were inspected.
- The production preview launched and drew the game under `/taaniel-portfolio-os/assets/games/next-stop/next-stop.html`. Checked WebGL errors were zero, with no page errors in either browser run.
- The StrictMode regression was reproduced before its fix: an empty cleanup pass erased the minimized journey before the new iframe loaded. A component test now covers that restore and audio initialization on the first restored-frame gesture.

These are integration checks and a short drive, not a new complete railway circuit. Other browser families and physical mobile devices were not tested for this wrapper.
