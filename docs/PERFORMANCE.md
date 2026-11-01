# Performance notes

This portfolio OS is designed to load quickly on static hosting (GitHub Pages).

## Strategy

- **Lazy-load apps**: most apps are loaded via dynamic import from the app registry (`src/lib/app-registry.tsx`).
- **On-demand workers**: the semantic search worker is only created when search query length is >= 3 (`src/hooks/use-shell-ai-search.ts`).
- **Separate entry points**: the desktop shell is dynamically imported, so opening `/portfolio` does not load the desktop or heavy app workers.
- **Static shell hosting**: the app runs client-side. Optional proxy modes and model downloads still depend on external services.

## Practical budget (targets)

- Fast first paint on the OS shell (desktop + Start menu usable quickly)
- Heavy apps (Monaco editor, pdf.js, v86) should not block initial interaction

## First-load measurements

Measured on 2026-11-01, before and after adding eleven apps and the File Explorer work
(`88e6fb4` against the release branch).

How: production builds under the Pages path, served locally with gzip, in headless
Chromium with the cache off. Each figure is the median of 7 cold visits, and each build
was measured twice. The lock screen is the first thing a visitor can use; its time
includes the short boot screen.

### First load, in bytes

| | Before | First attempt | Final |
| --- | --- | --- | --- |
| Everything, gzipped | 299 KB | 346 KB | 308 KB |
| JavaScript, gzipped | 241 KB | 288 KB | 250 KB |
| Requests | 51 | 59 | 58 |

### Fast desktop, no throttling

| Median | Before | Final |
| --- | --- | --- |
| First contentful paint | 164–172 ms | 168 ms |
| Largest contentful paint | 2124–2140 ms | 2128–2132 ms |
| Lock screen ready | 2420 ms | 2417–2421 ms |
| Sign-in to desktop | 324–325 ms | 322–324 ms |

### Phone on 4G (390px, 20 Mbps, 40 ms, CPU slowed 4x)

| Median | Before | Final |
| --- | --- | --- |
| First contentful paint | 472–508 ms | 508–520 ms |
| Largest contentful paint | 1036–1256 ms | 1120–1124 ms |
| Lock screen ready | 2990–3004 ms | 3067–3069 ms |
| Sign-in to desktop | 359–372 ms | 312–384 ms |

### What changed

The first attempt added 47 KB of JavaScript. Nearly all of it was the terminal's command
tables, pulled into the first load by the Run dialog. Run now loads when it is first opened.

The 9 KB left is real: the registry entries and icons for the new apps, which Start and
Search need straight away. The phone's lock screen came out about 70 ms slower in both
runs (2%), small enough that it may be noise but not proven so. The other timings overlap
with the first build's own run-to-run spread. The two measurements of each build are the
only samples, so read small differences with care.

## Tips for future optimizations

- Keep large optional apps hidden/collapsed in UX so recruiters hit the high-signal path first.
- Prefer moving rarely-used features behind explicit actions (open app, enable toggle) so they stay cold by default.
- If needed, split vendor chunks further in `vite.config.ts` using `manualChunks`.
- Anything the desktop shell imports directly lands on the first load. Check what a new dialog pulls in.
