# Project Notes

## Purpose
Interactive OS-style portfolio site with desktop shell, apps, media viewers, games, browser/proxy helpers, and recruiter-focused views.

## Stack
- React 19, TypeScript, Vite 8, Vitest.
- State modules under `src/stores/`; shell/app logic under `src/components/` and `src/lib/`.
- Large browser assets include v86, PDF.js, media, and portfolio files in `public/assets/`.

## Common Commands
- `npm run dev` - start Vite.
- `npm run test` - run Vitest suite.
- `npm run build` - typecheck and production build.
- `npm run build:gh` - GitHub Pages build with `/taaniel-portfolio-os/` base and 404 copy.

## Structure
- `src/app/` - application entry and tests.
- `src/components/apps/` - individual desktop apps.
- `src/components/shell/` - desktop, taskbar, windows, start menu.
- `src/lib/` - app registry, browser helpers, filesystem, launchers.
- `src/stores/` - Zustand/runtime stores.
- `public/assets/` - portfolio, music, photography, v86 assets.

## Coding Rules
- Keep app registry, launcher IDs, and seeded filesystem paths in sync.
- Use existing store/lib helpers instead of bypassing shell state.
- For browser-only dependencies that import Node modules, expect Vite externalization warnings and verify runtime behavior.
- Avoid broad asset churn; media files are large.

## Automation Checks
- Run `npm run test` and `npm run build`.
- Watch for chunk-size warnings, v86/PDF worker asset paths, GitHub Pages base path regressions, and dirty generated `dist/`.
- Current high audit status should stay clean through the `protobufjs` override in `package.json`; avoid force upgrades unless a normal patch path appears.
