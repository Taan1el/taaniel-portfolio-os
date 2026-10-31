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

1. **Routing**: `/portfolio` renders the recruiter view, `/` renders the OS shell.  
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

## Browser design

The Browser app is intentionally an iframe-based web viewer, not a full browser engine.

- **Why iframe is used**: it keeps the app lightweight, GitHub Pages-safe, and aligned with the rest of the OS window system. It also lets the Browser show local filesystem content through `srcDoc` without adding a server runtime.
- **Why some sites fail**: many third-party sites send `X-Frame-Options` or `Content-Security-Policy` headers that forbid embedding. Auth-heavy pages and complex web apps also tend to break inside iframe sandboxes. When that happens, the Browser shows a fallback panel instead of pretending the page loaded.
- **What the proxy does**: `Direct` loads the page as-is. `AllOrigins` and `Wayback` wrap the URL through external services that can sometimes return a frameable copy or archived snapshot. They are viewing aids, not a guarantee.
- **Tradeoffs**: this approach is honest and predictable, but it is not a replacement for Chrome. Some pages will render, some will need a proxy, and some should always be opened in a new tab.
