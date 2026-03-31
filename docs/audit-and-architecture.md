# Portfolio OS Audit And Architecture

## Phase 1 Audit

### What the current repo does well

- Preserves real project visuals, photography, social links, and a downloadable CV.
- Already has concise recruiter-facing copy about Taaniel's role, focus, and current experience.
- Ships as a fast static GitHub Pages site with minimal complexity.

### What cannot scale into the requested experience

- The current codebase is a flat static site made of four HTML pages, one stylesheet, and one script.
- There is no application shell, component model, typed state, or persistence layer.
- The current interaction model is page-to-page navigation, not app/window/taskbar orchestration.
- Advanced desktop behaviors such as draggable windows, a virtual filesystem, and persistent session state would be difficult to add cleanly on top of the existing structure.

### Reuse vs replace

- Reuse:
  - `/public/assets` imagery
  - PDF CV
  - project descriptions and contact info as source material
- Replace:
  - all page templates
  - global static CSS architecture
  - untyped DOM scripting
  - navigation model

### Decision

This should be a **rebuild**, not a refactor.

The repo stays the same so the existing GitHub Pages path and assets remain useful, but the implementation shifts to a modular React + TypeScript application with a browser-desktop runtime.

## Phase 2 Architecture

### Product layers

1. `app/`
   - bootstraps the desktop shell
2. `components/shell/`
   - desktop surface, icons, taskbar, start menu, window manager
3. `components/apps/`
   - portfolio applications rendered inside windows
4. `stores/`
   - window/session UI store and filesystem store
5. `lib/`
   - virtual filesystem helpers, app registry, utility functions
6. `data/`
   - portfolio content, project data, wallpaper presets, seeded filesystem content
7. `styles/`
   - design tokens and global UI system

### Runtime architecture

- **System store**: Zustand store for shell UI, windows, focus order, icon positions, theme, and session persistence.
- **Filesystem store**: virtual file tree persisted to IndexedDB for file explorer, editor, markdown viewer, and terminal commands.
- **App registry**: central source of truth for app metadata, icons, default window bounds, and lazy-loaded app implementations.
- **Window manager**: draggable/resizable windows with focus, minimize, maximize, and persisted bounds.
- **Desktop manager**: wallpaper, desktop icons, selection state, context menus, and launch behaviors.
- **Taskbar/start**: app launch, task switching, session reset, clock/calendar, and quick recruiter links.

### Implementation priorities

1. Ship a stable shell and persistence primitives first.
2. Migrate the actual portfolio content into apps and virtual documents.
3. Add higher-cost apps like Monaco and xterm lazily.
4. Keep GitHub Pages compatibility through Vite static output and a project-site base path.
