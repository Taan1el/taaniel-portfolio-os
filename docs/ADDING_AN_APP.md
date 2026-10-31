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

The desktop is the `/Desktop` folder (shown as `C:\Users\Taaniel\Desktop`), exactly as in Windows. Every icon is a file, folder or `.lnk` shortcut in it, and File Explorer's Desktop folder lists the same items. The only extra icon is the Recycle Bin, which is a system icon, not a file.

Edit:

- `src/data/desktop-seed.ts`

Add a row to `desktopShortcutSeeds`:

- `name`: the stored file name, ending in `.lnk` (`"Notes.lnk"`). The desktop hides the `.lnk`, so the label is `Notes`.
- `target`: `{ type: "app", appId }` for an app, `{ type: "path", path }` for a file or folder, or `{ type: "route", route }` for a page of this site
- `legacyId`: any unique string (it only matters for icon positions saved before the desktop was built from `/Desktop`)
- `defaultGridPosition`: the starting cell
- `since`: the new `DESKTOP_SEED_VERSION` (leave it out for a shortcut that ships with version 1)

Then bump `DESKTOP_SEED_VERSION`. Shortcuts are placed on the desktop once, recorded by a version marker on the `/Desktop` folder, so a visitor who deleted one never sees it come back by itself. Bumping the version adds only the new rows, to new and returning visitors alike, and never overwrites a file with the same name. Visitors can move, rename and delete shortcuts like any other file; the Recycle Bin and Start → Reset session bring them back.

## 4) (Optional) Associate files with your app

Edit:

- `src/lib/file-registry.ts`

Add extensions/mime-types to the file association map so a file opens in your app.

## 5) Test quickly

- `npm run dev` and launch the app from the Start menu.
- If the app uses filesystem nodes, verify it behaves in a persisted session and after “Reset session”.

## 6) Overlays, drag and drop and questions

- Files are dragged with pointer events (`src/lib/dnd`), and what is under the pointer decides where a drop lands. A panel that floats over the desktop (a flyout, a popover, a dialog) must carry the `w11-flyout` class or a `data-dnd-barrier` attribute, or a file dropped on it would fall through to the desktop behind it.
- To make something a drop target, spread `folderDropProps(path)` (a folder), `windowDropProps` (an app window) or `appDropProps` (an icon that runs an app) onto it.
- Ask "Are you sure?" with `confirmInOs` from `src/stores/confirm-dialog-store.ts`, not `window.confirm`: the shell shows its own dialog, and the browser's is silently answered "no" where dialogs are blocked.
- Code that deletes or moves files and reports errors itself (the terminal) should ask `getChangeRefusal(nodes, path)` from `src/lib/filesystem.ts` first, or call `tryDeleteNode` / `tryPasteNode` on the file system store, which say why nothing happened.

