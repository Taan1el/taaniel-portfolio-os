# Taaniel OS

A desktop operating system that runs in your browser, built as the portfolio of Taaniel Vananurm.

Files are real files on a virtual disk, windows snap and move between desktops, and the big apps use real engines: Python, a Linux kernel, Doom and the Monaco editor. There is no server and no account. It all runs on GitHub Pages.

**[Try it live](https://taan1el.github.io/taaniel-portfolio-os/)** · [Quick portfolio](https://taan1el.github.io/taaniel-portfolio-os/portfolio/) · [Download CV](https://taan1el.github.io/taaniel-portfolio-os/assets/CV_Taaniel_Vananurm_EN.pdf)

<p align="center">
  <a href="https://taan1el.github.io/taaniel-portfolio-os/">
    <img src="docs/images/start-menu.png" width="760" alt="Taaniel OS desktop with the Start menu open" />
  </a>
</p>

## What's inside

| | |
| --- | --- |
| <img src="docs/images/projects-briefcase.png" width="400" alt="Projects open as a briefcase with a pocket per project" /> | <img src="docs/images/code.png" width="400" alt="Code editor beside a live preview" /> |
| **Projects** opens like a briefcase, with a pocket for each project | **Code** is Monaco with tabs, search and a live preview |
| <img src="docs/images/terminal-python.png" width="400" alt="Terminal running Python" /> | <img src="docs/images/contact-inbox.png" width="400" alt="Contact app laid out as a mail inbox" /> |
| **Terminal** has two hand-written shells, plus real Python | **Contact** is an inbox with one-click email, phone and CV |
| <img src="docs/images/tv-radio.png" width="400" alt="TV and Radio app with a channel guide" /> | <img src="docs/images/doom.png" width="400" alt="Doom running in a window" /> |
| **TV & Radio** has 88 live channels from Estonia, the UK and the USA, plus ERR radio and what's on now | **Doom** runs as WebAssembly |
| <img src="docs/images/spreadsheet.png" width="400" alt="Spreadsheet with formulas" /> | <img src="docs/images/chess.png" width="400" alt="Chess against the computer" /> |
| **Spreadsheet** has its own formula engine, with no eval | **Chess** knows every rule and plays back |

Also on board:

- **File Explorer** with tabs, a preview pane, Properties, drag and drop, shortcuts and a Recycle Bin
- **Windows** with Snap Layouts, virtual desktops, Task View, a Task Manager and a Run dialog
- **Linux** running on an x86 emulator
- **Settings** with search, accent colours, clock formats, do not disturb and default apps
- **Documents, Spreadsheet, Whiteboard and Calendar**
- **Notepad, Notes, Paint, Calculator, Photos, Music and Video**
- **Games**: Doom, Next Stop, Chess, Sudoku, Checkers, Solitaire, Dino, Hextris, Snake and Tetris

## Run it yourself

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm test` | Runs the tests |
| `npm run build` | Builds for production |
| `npm run deploy:gh` | Builds and publishes to GitHub Pages |

## Built with

- **App:** React 19, TypeScript, Vite, Zustand
- **Motion and windows:** Framer Motion, GSAP, react-rnd
- **Apps:** Monaco, xterm.js, pdf.js, hls.js
- **Engines:** Pyodide (Python), v86 (Linux), Doom as WebAssembly. These download only when an app needs them.

## Project layout

| Folder | What's there |
| --- | --- |
| `src/components/shell` | Desktop, Start menu, taskbar and windows |
| `src/components/apps` | Every app |
| `src/stores` | App state |
| `src/lib` | Filesystem, shells, search and helpers |
| `src/data` | Portfolio content and the starting files |

## Good to know

- **Your data stays with you.** Everything you change is saved in your own browser. Use Start > Power > Reset this PC to clear it.
- **The Browser app is an iframe.** Many sites refuse to load inside one, so it offers to open them in a new tab instead.
- **TV streams come straight from each broadcaster.** Some programmes have no web rights, and some channels only open in their own country.
- **Two scheduled jobs look after TV.** One flags channels that stop playing in a GitHub issue. The other refreshes what's on now from public listings. A channel with no listing shows no programme name.

## More docs

[Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Adding an app](docs/ADDING_AN_APP.md) · [Performance](docs/PERFORMANCE.md) · [Releasing](docs/RELEASE.md) · [Maintenance](docs/MAINTENANCE.md) · [Next Stop](docs/next-stop.md) · [Contributing](CONTRIBUTING.md)
