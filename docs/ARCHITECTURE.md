# Architecture

This repo is a browser-based desktop OS portfolio built with **React + TypeScript**. It runs entirely client-side (GitHub Pages compatible).

## High-level layers

- **Shell**: desktop surface, Start menu, taskbar, window host  
  `src/components/shell/`
- **Apps**: windowed applications (Files, Photos, PDF, Music, etc.)  
  `src/components/apps/`
- **State**: Zustand stores for shell/windows/processes/filesystem/system  
  `src/stores/`
- **Core logic**: filesystem helpers, launchers, search index, registries  
  `src/lib/`
- **Content + seeding**: portfolio copy, themes, bundled assets, seeded filesystem  
  `src/data/`

## Runtime flow

1. **Routing**: `/simple` renders the recruiter view, `/` renders the OS shell.  
   `src/app/App.tsx`
2. **Shell boot**: initializes filesystem + shell session state, then renders desktop + windows + overlays.  
   `src/components/shell/desktop-shell.tsx`
3. **Apps** are launched via a central `launchApp(...)` call with optional payload.

## Window manager

- Windows are draggable/resizable and keep z-order and focus.
- Window chrome lives in:  
  `src/components/shell/window-frame.tsx`
- The window host renders processes/windows:  
  `src/components/shell/window-host.tsx`

## App registry

Apps are defined in one place with metadata (title, icon, default size, category) and lazy-loaded implementations.

- `src/lib/app-registry.tsx`

This keeps the Start menu and launch logic consistent.

## Virtual filesystem + persistence

The filesystem is a virtual tree stored in memory and persisted to IndexedDB.

- Seeded nodes: `src/data/seedFileSystem.ts`
- Bundled assets: `src/data/bundled-assets.ts`
- Persistence and node operations: `src/stores/filesystem-store.ts`, `src/lib/filesystem.ts`

### Seed vs user files

- **Bundled/readonly** nodes are refreshed/migrated so older persisted sessions get updated asset paths.
- **User files** are stored in IndexedDB and survive reloads until “Reset session”.

## Search

- Start menu search uses an index built from apps and filesystem nodes.  
  `src/lib/shell-search.ts`
- An optional in-browser semantic reranker is included (Transformers + ONNX WASM).

## Known constraints

- Browser app is iframe-based; some sites block embedding via CSP/X-Frame-Options.
- Everything is static + client-side for GitHub Pages compatibility.

