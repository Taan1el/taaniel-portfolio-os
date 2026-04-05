# AGENTS.md

## Cursor Cloud specific instructions

This is a fully client-side React + TypeScript SPA (no backend, no database). All development commands are in `package.json` scripts and documented in `README.md`.

### Quick reference

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite, port 5173) |
| Type check | `npx tsc --noEmit` |
| Tests | `npm test` (Vitest, 7 test files, 27 tests) |
| Build | `npm run build` |

### Node version

CI uses Node 24. Use `nvm use 24` (or install with `nvm install 24`) before running commands.

### Notes

- There is no linter (ESLint/Prettier) configured in this repo; type checking via `tsc` is the primary static analysis.
- The Vite dev server supports HMR; changes to `.tsx`/`.ts`/`.css` files are reflected instantly.
- Tests run with `vitest run` (not watch mode). All tests are co-located with source files under `src/`.
- The app uses path aliases (`@/*` → `./src/*`) configured in both `tsconfig.json` and `vite.config.ts`.
- No environment variables or secrets are required to run the app locally.
