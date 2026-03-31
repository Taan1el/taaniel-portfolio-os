# Taaniel OS

Immersive browser-desktop portfolio for Taaniel Vananurm.

## What it is

This rebuild turns the portfolio into an operating-system-style experience inspired by browser desktop environments such as Dustin Brett's daedalOS approach.

Current implementation includes:

- desktop wallpaper and draggable desktop icons
- window manager with focus, minimize, maximize, close, resize, and persisted bounds
- taskbar, start menu, clock, calendar popup, and show-desktop behavior
- virtual filesystem persisted with IndexedDB
- file explorer with create, rename, delete, and open-with behavior
- recruiter-facing apps for About, Projects, Contact, Resume, Settings
- terminal powered by xterm.js
- code editor powered by Monaco
- markdown viewer and image/video viewers

## Stack

- React
- TypeScript
- Vite
- Zustand
- Framer Motion
- react-rnd
- IndexedDB via `idb-keyval`
- xterm.js
- Monaco Editor

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages

The Vite config is already set up for the project-site base path:

```text
/taaniel-portfolio-os/
```

You can build and publish with:

```bash
npm run deploy:gh
```

If the portfolio later needs server functions, AI features, or richer file handling, Vercel or Netlify will be a better deployment target than GitHub Pages.

## Project structure

- `docs/audit-and-architecture.md` - audit and rebuild rationale
- `public/assets` - reused project images, icons, and CV
- `src/components/shell` - desktop, taskbar, start menu, and window manager
- `src/components/apps` - portfolio applications rendered inside windows
- `src/stores` - shell/session state and virtual filesystem state
- `src/lib` - app registry, filesystem helpers, and launch utilities
- `src/data` - portfolio content, themes, and seeded filesystem content
