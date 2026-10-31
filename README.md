# Taaniel OS

A desktop operating system that runs in the browser, built as the portfolio of Taaniel Vananurm. Files are real files on a virtual disk, windows snap and move between desktops, and the heavy apps use real engines: CPython, a Linux kernel, Doom and the Monaco editor. No server, no accounts: it all runs on GitHub Pages.

<div align="center">
 <br />
 <a href="https://taan1el.github.io/taaniel-portfolio-os/">
  <img src="docs/images/start-menu.png" width="760" alt="Taaniel OS desktop with the Start menu open" />
 </a>
 <br />
</div>

## Links

- **Live demo**: https://taan1el.github.io/taaniel-portfolio-os/
- **Quick portfolio (`/portfolio`)**: https://taan1el.github.io/taaniel-portfolio-os/portfolio/
- **Repository**: https://github.com/Taan1el/taaniel-portfolio-os
- **Download CV**: https://taan1el.github.io/taaniel-portfolio-os/assets/CV_Taaniel_Vananurm.pdf
- **Contributing**: `CONTRIBUTING.md`
- **Release / deploy**: `docs/RELEASE.md`
- **Next Stop minigame**: open Games or search for Next Stop; [integration and controls](docs/next-stop.md)
- **Performance notes**: `docs/PERFORMANCE.md`

## Start here (30 seconds)

- Open **Projects**: the briefcase opens onto one pocket per project
- Open **Start** and type to search, or browse **All** by category
- Open **OS Case Study.md** on the desktop for the architecture notes

## What's inside

| | |
| --- | --- |
| <img src="docs/images/projects-briefcase.png" width="400" alt="Projects open as a briefcase with a pocket per project" /> | <img src="docs/images/code.png" width="400" alt="Code editor beside a live preview" /> |
| **Projects** opens like a briefcase, one pocket per project | **Code** is Monaco with tabs, search and a sandboxed live preview |
| <img src="docs/images/terminal-python.png" width="400" alt="Terminal running Python" /> | <img src="docs/images/contact-inbox.png" width="400" alt="Contact app laid out as a mail inbox" /> |
| **Terminal** has hand-written PowerShell and Command Prompt shells, plus real Python | **Contact** is an inbox, with one-click email, phone and CV |
| <img src="docs/images/tv-radio.png" width="400" alt="TV and Radio app with Estonian channels" /> | <img src="docs/images/doom.png" width="400" alt="Doom running in a window" /> |
| **TV & Radio** plays live Estonian public channels | **Doom** runs as WebAssembly, with its own small loader |

Also here:

- **File Explorer** over a real virtual disk: drag between the desktop and folders, `.lnk` shortcuts, Recycle Bin, keyboard and screen reader support
- **Windows**: Snap Layouts, virtual desktops and Task View
- **Linux** in Virtual x86: a real kernel on the v86 emulator
- **Notepad** with Markdown formatting, plus Notes, Paint, Calculator, Photos, Music and Video
- **Games**: Doom, Next Stop, Dino, Hextris, Snake and Tetris
- **Settings** that do something: search, accent colours, taskbar alignment, clock formats, do not disturb, default apps, real storage figures, settings export and import

What's planned next is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Project map

- `src/components/shell/`: desktop shell, Start menu, taskbar, window host
- `src/components/apps/`: app windows (Photos, PDF, Music, Files, etc.)
- `src/lib/`: filesystem, launchers, app registry, search, system helpers
- `src/data/`: portfolio data + bundled assets + filesystem seeding
- `src/stores/`: Zustand stores (shell, windows, filesystem, processes)

## Stack

- React 19, TypeScript, Vite
- Zustand (shell, window, filesystem, explorer, process, system)
- Framer Motion, react-rnd, xterm.js, Monaco, pdf.js, hls.js
- Pyodide (Python), v86 (Linux), Doom compiled to WebAssembly. These load only when an app asks for them.
- `@huggingface/transformers` runs the `all-MiniLM-L6-v2` embedding model in-browser via ONNX WASM to rerank Start menu search results. Model files must first be downloaded; inference runs locally.

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
npm run preview -- --base=/taaniel-portfolio-os/
npm run deploy:gh
```

## Browser design

The Browser app is intentionally an iframe-based web viewer, not a full browser engine.

- **Why iframe is used**: it keeps the app lightweight, GitHub Pages-safe, and aligned with the rest of the OS window system. It also lets the Browser show local filesystem content through `srcDoc` without adding a server runtime.
- **Why some sites fail**: many third-party sites send `X-Frame-Options` or `Content-Security-Policy` headers that forbid embedding. Auth-heavy pages and complex web apps also tend to break inside iframe sandboxes. When that happens, the Browser shows a fallback panel instead of pretending the page loaded.
- **What the proxy does**: `Direct` loads the page as-is. `AllOrigins` and `Wayback` wrap the URL through external services that can sometimes return a frameable copy or archived snapshot. They are viewing aids, not a guarantee.
- **Tradeoffs**: this approach is honest and predictable, but it is not a replacement for Chrome. Some pages will render, some will need a proxy, and some should always be opened in a new tab.

## Security and limitations

- **No server / no accounts**: this portfolio runs fully client-side (GitHub Pages). There is no login/auth model.
- **Local persistence**: desktop layout, windows, and the virtual filesystem are stored in your browser (IndexedDB/localStorage). Use **Start → Power → Reset this PC** to clear.
- **Embedded browser limits**: many sites block iframes (CSP / X-Frame-Options). When blocked, the Browser app shows a fallback UI and suggests opening a new tab.
- **Untrusted content**: markdown and HTML previews are sanitized, but this is still a portfolio OS — avoid importing sensitive data.

## Notes

- **Portfolio content**: junior-role positioning and completed education/internship dates are shared by the portfolio and desktop views. Slow Pour's static demo is separate from its Express/SQLite backend.
- **CV source**: `docs/cv.html` is the editable Estonian CV; its A4 PDF is `public/assets/CV_Taaniel_Vananurm.pdf`.
- **Confidentiality**: campaign assets are not distributed. Removing files from a new build does not remove older deployments or Git history.

- **Embedded browser**: The Browser app uses capability detection before iframe loading. Known restricted hosts skip straight to fallback, while frame-friendly pages stay direct and no longer fall back after a successful load timeout cycle.
- **Local browser paths**: Enter `/`, `/Documents`, `/Media`, or any other filesystem directory path in the Browser to get a lightweight directory index and open local previews inside the same window.
- **Themes**: Defaults to **Bloom (dark)**; change wallpaper and accent in **Settings**, or pick **Retro** for a 1995 look.
- **TV & Radio**: streams come straight from the broadcasters to the visitor's browser. Some programmes have no web rights, so the broadcaster shows a slate instead, and some may be limited to Estonia.
