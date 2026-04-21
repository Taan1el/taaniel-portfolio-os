# Store Boundary Audit

**Verdict: boundaries are clean. No consolidation needed.**

## Store inventory

| Store | What it owns | Persistence |
|---|---|---|
| `window-store` | `windows[]`, `activeWindowId`, `nextZ` | localStorage |
| `process-store` | `processes[]` (`appId`, `status`, `launchPayload`) | localStorage |
| `shell-store` | UI overlays (`startMenuOpen`, `calendarOpen`, `searchQuery`, `contextMenu`, `clipboard`, `selectedIconId`), appearance (`themeId`, `wallpaper`, `desktopIconPositions`), plus `viewportMode`/`focusedWindowId`/`focusedProcessId` (see below) | localStorage (appearance only) |
| `system-store` | Facade — aggregates all three child stores, owns cross-domain actions (`launchApp`, `closeWindow`) | None (derived) |
| `system-runtime` | No state — pure utility functions and storage key constants | N/A |
| `explorer-store` | Per-window navigation history (`history`, `historyIndex`, `currentPath`, `searchQuery`, `selectedPath`) | None (session only) |
| `filesystem-store` | Virtual filesystem nodes (`FileSystemRecord`) | IndexedDB |

## Notable design decisions

### `focusedWindowId` / `focusedProcessId` in shell-store

These fields are owned by `window-store` (via `activeWindowId`) but appear in `shell-store` too. They are pushed there by `syncRuntimeState()` inside `system-store`'s `syncShellRuntime` subscription.

**Why this is intentional, not duplication:** Shell UI components (taskbar, titlebar) need to know which window is focused. Rather than subscribing to two stores (`shell-store` for theme/wallpaper and `window-store` for focus), components subscribe only to `system-store`, which aggregates everything. The shell-store copy is a write-through cache with `window-store.activeWindowId` as the canonical source.

The cost: one extra field per subscribe cycle. The benefit: shell components have a single subscription point.

### `process.status` derived from windows

`AppProcess.status` (focused / minimized / running) is computed from window state via `syncStatusesFromWindows`, but the field lives in `process-store`. This is correct — process status is display-level metadata needed by the taskbar and launcher, not raw window state. The window-store owns the truth; the process-store caches the rendered interpretation.

### `customWallpaperSource` in system-store

Appears in `SystemState` as a convenience derived field (`wallpaper.mode === "image" ? wallpaper.imageSource : null`). Not stored independently anywhere — it's computed from `shell-store.wallpaper` during facade sync. No duplication.

### system-store as orchestrator

`launchApp` and `closeWindow` must touch both `window-store` and `process-store` atomically. Placing this logic in `system-store` (the facade) rather than in either child store keeps each child store focused on a single domain.
