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

## Browser design

The Browser app is intentionally an iframe-based web viewer, not a full browser engine.

- **Why iframe is used**: it keeps the app lightweight, GitHub Pages-safe, and aligned with the rest of the OS window system. It also lets the Browser show local filesystem content through `srcDoc` without adding a server runtime.
- **Why some sites fail**: many third-party sites send `X-Frame-Options` or `Content-Security-Policy` headers that forbid embedding. Auth-heavy pages and complex web apps also tend to break inside iframe sandboxes. When that happens, the Browser shows a fallback panel instead of pretending the page loaded.
- **What the proxy does**: `Direct` loads the page as-is. `AllOrigins` and `Wayback` wrap the URL through external services that can sometimes return a frameable copy or archived snapshot. They are viewing aids, not a guarantee.
- **Tradeoffs**: this approach is honest and predictable, but it is not a replacement for Chrome. Some pages will render, some will need a proxy, and some should always be opened in a new tab.

## Notes

- **Embedded browser**: The Browser app uses an iframe plus optional proxy modes. Google `?igu=1`, Wikipedia, and static sites are the best direct targets. Social/auth-heavy sites often still need **Open in new tab**.
- **Themes**: Defaults to **Cloud Archive**; change wallpaper and accent in **Settings**.
- **Session data**: Desktop layout, windows, and the virtual filesystem persist in the browser (localStorage / IndexedDB). Use **Reset session** in the Start menu to clear.
