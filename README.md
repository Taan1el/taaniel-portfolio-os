# Taaniel OS

Immersive browser-desktop portfolio for Taaniel Vananurm.

## What it is

This rebuild turns the portfolio into an operating-system-style experience.

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
