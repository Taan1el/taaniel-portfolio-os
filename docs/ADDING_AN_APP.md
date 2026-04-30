# Adding an app

This OS uses a central app registry so apps can be discovered in the Start menu and launched consistently.

## 1) Create the app component

Add a new file in:

- `src/components/apps/<your-app>-app.tsx`

App components receive `AppComponentProps`:

- `window.id`, `window.title`
- `window.payload` (optional)

Most apps use:

- `AppScaffold`, `AppToolbar`, `AppContent`, `AppFooter` from `src/components/apps/app-layout.tsx`

## 2) Register the app

Edit:

- `src/lib/app-registry.tsx`

Add a new `defineApp({ ... })` entry with:

- `id`: unique string
- `title`, `description`, `category`
- `icon`: a `lucide-react` icon
- `defaultSize`: default window size
- `load`: lazy import pointing to your component

## 3) (Optional) Add a desktop shortcut

Edit:

- `src/data/portfolio.ts`

Add a `desktopEntries` item:

- `type: "app"` with `appId`
- set `defaultGridPosition`

## 4) (Optional) Associate files with your app

Edit:

- `src/lib/file-registry.ts`

Add extensions/mime-types to the file association map so a file opens in your app.

## 5) Test quickly

- `npm run dev` and launch the app from the Start menu.
- If the app uses filesystem nodes, verify it behaves in a persisted session and after “Reset session”.

