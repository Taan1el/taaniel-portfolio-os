# Performance notes

This portfolio OS is designed to load quickly on static hosting (GitHub Pages).

## Strategy

- **Lazy-load apps**: most apps are loaded via dynamic import from the app registry (`src/lib/app-registry.tsx`).
- **On-demand workers**: the semantic search worker is only created when search query length is >= 3 (`src/hooks/use-shell-ai-search.ts`).
- **Avoid server dependencies**: all features run client-side.

## Practical budget (targets)

- Fast first paint on the OS shell (desktop + Start menu usable quickly)
- Heavy apps (Monaco editor, pdf.js, v86) should not block initial interaction

## Tips for future optimizations

- Keep large optional apps hidden/collapsed in UX so recruiters hit the high-signal path first.
- Prefer moving rarely-used features behind explicit actions (open app, enable toggle) so they stay cold by default.
- If needed, split vendor chunks further in `vite.config.ts` using `manualChunks`.

