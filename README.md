# Taaniel OS

Browser-based desktop portfolio for Taaniel Vananurm—draggable icons, windows, a virtual filesystem (IndexedDB), taskbar with previews, Start menu, search, and bundled apps (terminal, Monaco editor, PDF/photo viewers, music player, games hub, and more).

## Stack

- React 18, TypeScript, Vite
- Zustand (shell, windows, filesystem)
- Framer Motion, react-rnd, xterm.js, Monaco, pdf.js

## Development

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## GitHub Pages

Project site base path:

```text
/taaniel-portfolio-os/
```

```bash
npm run build:gh
npm run deploy:gh
```

## Notes

- **Embedded browser**: Only same-origin, localhost, and selected embeds (e.g. YouTube) load inside an iframe. Other sites typically block embedding; use **Open in new tab** for the full page.
- **Themes**: Defaults to **Cloud Archive**; change wallpaper and accent in **Settings**.
- **Session data**: Desktop layout, windows, and the virtual filesystem persist in the browser (localStorage / IndexedDB). Use **Reset session** in the Start menu to clear.
