import {
  Boxes,
  Code2,
  ExternalLink,
  FolderTree,
  Keyboard,
  LayoutGrid,
  Layers,
  Music4,
  Sparkles,
  Terminal,
} from "lucide-react";
import { AppContent, AppScaffold, AppToolbar } from "@/components/apps/app-layout";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

/**
 * Tour stop — a clickable card that demoes one capability of the OS.
 * Each one launches a real app/window so the visitor immediately sees
 * the feature in action instead of reading about it.
 */
interface TourStop {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  action: { label: string; run: () => void };
}

/** Tech stack rows. Kept short — the build itself is the demo. */
const TECH_STACK: Array<{ label: string; detail: string }> = [
  { label: "React 19 + TypeScript", detail: "Strict mode, lazy app routes" },
  { label: "Vite 8 + Rolldown", detail: "Manual vendor chunks, ~32 KB gzipped main" },
  { label: "Zustand", detail: "Slice-per-domain stores (system, filesystem, shell)" },
  { label: "Framer Motion", detail: "Window enter/exit, popovers, snap ghost" },
  { label: "react-rnd", detail: "Window drag + resize, custom snap zones" },
  { label: "IndexedDB", detail: "Filesystem + session state persistence" },
  { label: "Web Worker", detail: "Background AI-style search reranking" },
  { label: "Pure CSS glass", detail: "Backdrop-filter + GPU layer hints" },
];

export function AboutOsApp({ window: _w }: AppComponentProps) {
  void _w;
  const launchApp = useSystemStore((s) => s.launchApp);

  const tour: TourStop[] = [
    {
      id: "files",
      title: "Browse a virtual filesystem",
      description:
        "Everything lives in an in-memory tree that persists to IndexedDB. Drag files between windows — apps register accepted types in a single registry.",
      icon: FolderTree,
      action: {
        label: "Open File Explorer",
        run: () => launchApp({ appId: "files", payload: { directoryPath: "/" } }),
      },
    },
    {
      id: "music",
      title: "Open a media app on a file",
      description:
        "Apps load lazily — the player chunk only fetches when you launch it. The same launchApp() call you'd use from a button works from the public SDK.",
      icon: Music4,
      action: {
        label: "Play a track",
        run: () => launchApp({ appId: "music", payload: { filePath: "/Media/Music/Black Star.mp3" } }),
      },
    },
    {
      id: "terminal",
      title: "Drop into the terminal",
      description:
        "A working xterm.js terminal with a tiny in-OS shell. Try `help`, `ls /`, `cat /Documents/notes.md`.",
      icon: Terminal,
      action: { label: "Launch Terminal", run: () => launchApp({ appId: "terminal" }) },
    },
    {
      id: "sdk",
      title: "Drive the OS from devtools",
      description:
        "Inspired by Puter's public app API. Run `taanielOS.help()` in the console — every desktop action is callable, from launchApp to showOpenFilePicker.",
      icon: Code2,
      action: {
        label: "Print SDK help",
        run: () => {
          // eslint-disable-next-line no-console
          (window as unknown as { taanielOS?: { help: () => void } }).taanielOS?.help();
        },
      },
    },
    {
      id: "shortcuts",
      title: "Keyboard-first",
      description:
        "Spotlight-style search lives in the taskbar. Ctrl/Cmd+K from anywhere focuses it; Escape closes any open popover.",
      icon: Keyboard,
      action: {
        label: "Open shortcut cheatsheet",
        run: () => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true }));
        },
      },
    },
  ];

  return (
    <AppScaffold className="about-os-app">
      <AppToolbar>
        <div className="app-toolbar__group">
          <div className="app-toolbar__title">
            <strong>About this OS</strong>
            <small>Built end-to-end as a portfolio piece</small>
          </div>
        </div>
        <div className="app-toolbar__group">
          <a
            className="pill-button"
            href="https://github.com/Taan1el/taaniel-portfolio-os"
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={14} />
            Source on GitHub
          </a>
        </div>
      </AppToolbar>

      <AppContent padded>
        <section className="about-os__hero">
          <div className="about-os__hero-icon">
            <LayoutGrid size={28} />
          </div>
          <div className="about-os__hero-copy">
            <p className="eyebrow">Portfolio OS</p>
            <h1>A browser desktop, made to be read by recruiters</h1>
            <p className="about-os__lead">
              Every window, app, and animation is hand-written React +
              TypeScript. No frameworks-on-frameworks — the goal is to be
              poke-able, not glossy. Tour the stops below; each opens a real
              window so you can prod the implementation.
            </p>
          </div>
        </section>

        <section className="about-os__section">
          <header className="about-os__section-header">
            <Sparkles size={16} />
            <h2>Try a feature</h2>
          </header>
          <div className="about-os__tour">
            {tour.map((stop) => {
              const Icon = stop.icon;
              return (
                <article key={stop.id} className="about-os__stop">
                  <span className="about-os__stop-icon">
                    <Icon size={18} />
                  </span>
                  <div className="about-os__stop-body">
                    <h3>{stop.title}</h3>
                    <p>{stop.description}</p>
                    <button
                      type="button"
                      className="about-os__stop-cta"
                      onClick={stop.action.run}
                    >
                      {stop.action.label}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-os__section">
          <header className="about-os__section-header">
            <Layers size={16} />
            <h2>Stack</h2>
          </header>
          <ul className="about-os__stack">
            {TECH_STACK.map((row) => (
              <li key={row.label} className="about-os__stack-row">
                <strong>{row.label}</strong>
                <span>{row.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-os__section about-os__section--footer">
          <header className="about-os__section-header">
            <Boxes size={16} />
            <h2>What's inside</h2>
          </header>
          <p className="about-os__lead">
            22 lazy-loaded apps, 6 vendor chunks, ~440 KB gzipped total. The
            first paint ships a 32&nbsp;KB main bundle. Drag windows between
            snap zones, drop files across apps, hit <code>?</code> for the
            keyboard map.
          </p>
        </section>
      </AppContent>
    </AppScaffold>
  );
}
