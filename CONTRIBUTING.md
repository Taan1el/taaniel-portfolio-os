# Contributing

Thanks for taking a look.

This repo is a portfolio OS and aims to stay **GitHub Pages friendly** (client-only).

## Setup

```bash
npm install
```

## Dev

```bash
npm run dev
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
```

## GitHub Pages build

```bash
npm run build:gh
npm run deploy:gh
```

## Code standards (quick)

- Keep changes focused (small PRs / small commits).
- Prefer existing patterns in `src/components/shell/`, `src/stores/`, and `src/lib/`.
- Avoid adding server dependencies (the demo must work on static hosting).
- Add/adjust tests when changing core behaviors (filesystem, window manager, search).

