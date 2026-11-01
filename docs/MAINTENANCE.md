# Portfolio maintenance

## 2026-11-01

Completed:
- Phone taskbar: running apps scroll instead of sliding under the tray.
- English CV PDF for English visitors, with a test that keeps its facts in line with the Estonian one.
- New apps: Sudoku, Checkers, Solitaire, Chess, Task Manager, Whiteboard, Calendar, Spreadsheet and Documents.
- Run dialog, Paint undo and redo. File Explorer gained Properties, a preview pane and tabs.
- TV: a daily channel check and a what's on now guide.
- 406 lines of old Start menu CSS removed. Screenshots of Start were byte-identical before and after.
- First-load speed measured in `docs/PERFORMANCE.md`. The Run dialog now loads when opened.

### Scheduled jobs

- **Check TV channels** (`.github/workflows/channel-check.yml`) runs daily. It walks each stream to a real
  video segment, and retries failures after 90 seconds. It keeps one issue, "TV channels not playing", up to date, and
  closes it when every channel is back. Removing a channel stays a person's decision.
- A channel that answers 401, 403 or 451 is listed as refused, not dead, and does not open an issue by itself. The
  runner is in the USA, and region locking looks just like this. So a region-locked channel that really dies stays hidden
  until someone reads the report.
- **Deploy GitHub Pages** now also runs every four hours to rebuild `tv-guide.json`, which is not in git. The free
  listings mostly look only five or six hours ahead, so one run a day would leave the guide empty most of the day.
- GitHub turns off scheduled jobs after 60 days with no activity in the repo. Re-enable them on the Actions tab.

### TV guide sources

Telia's public guide for ETV, ETV2 and ETV+, and XMLTV from i.mjh.nz, epgshare01 and epg.pw for the UK and USA. None
of them promises to stay up, and Telia's is an unofficial endpoint. A source that fails is skipped, and its channels
show their category instead of a programme.

Names must match exactly within a region, so the wrong programme should not appear. Listings are for the same channel
on other services, so a regional schedule can still differ. Four channels were played and compared with their listing, and all four matched.

### Validation

- Figures for the final branch are in the pull request. Every app has a real-input Chromium check at desktop and 390px.
- Not tested on a physical phone, or with a real screen reader.
- `terminal-app-integration` ("opens a Command Prompt tab") failed once under load and passed 3 of 3 alone, so it is a
  known flaky test, not a fixed one.

## 2026-10-31

Completed:
- Code app: Monaco with tabs, quick open, search, a command palette and a live
  preview in a sandbox with no network access.
- Snap Layouts, virtual desktops and Task View.
- Bundled a Linux image for Virtual x86, and a self-hosted Pyodide in a worker
  behind the terminal's `python` command.
- Own canvas Dino and Hextris replace the paused ports. Next Stop is an app.
- Achievements, terminal extras, a Retro theme, and text size and contrast settings.
- Explorer: focus moves onto items so screen readers read them, and it stays in
  the window after the focused item goes away. Taskbar buttons take arrow keys.
- Start menu rebuilt: pins, Recommended, All by category, grid or list, account bar.
- Notepad replaces the Markdown viewer. New TV & Radio app with 88 channels and ERR radio (adds hls.js, gsap and @gsap/react).
- Settings grew six pages and a search box.
- Contact is an inbox, Projects is a briefcase. Popup tips and achievement toasts removed.
The CV has two sources, `docs/cv.html` (Estonian) and `docs/cv.en.html` (English). Print each to an A4 PDF in
`public/assets` after an edit; a test checks that both keep the same links, dates and numbers.

A changed shipped document only reaches returning visitors if the hash of its old
text is listed in `src/lib/portfolio-workspace.ts`. Add one whenever seed text changes.

### Validation

- `tsc`, 124 test files (1432 tests) and `build:gh` pass.
- Real-input Chromium runs pass for the desktop, windows, Code, the extras and
  the About, Projects, CV, Contact and case study path, plus a 390px phone.
- Not tested on a physical phone, or with a real screen reader.

## 2026-10-07

Completed:
- Moved PDF.js to the 6.x line; documents are torn down through the loading task.
- Updated Transformers, which pulls patched sharp, onnxruntime-node and adm-zip
  and drops the roarr/sprintf-js chain. No overrides or forced majors.
- Repaired the Browser's Wayback fallback (frame-friendly `2if_` snapshots) and
  stopped re-encoding addresses that were already normalized.

### Dependency changes

| Package | Before | After |
| --- | --- | --- |
| pdfjs-dist | 5.6.205 | 6.4.299 |
| DOMPurify | 3.4.15 | 3.4.16 |
| @huggingface/transformers | 4.2.0 | 4.3.1 |
| onnxruntime-web (transitive) | 1.26.0-dev | 1.31.0-dev |
| onnxruntime-node (transitive) | 1.24.3 | 1.30.0 |
| sharp (transitive) | 0.34.5 | 0.35.5 |
| adm-zip (transitive) | 0.5.17 | 0.6.1 |
| sprintf-js (transitive) | 1.1.3 | removed |
| source-map-js (transitive) | 1.2.1 | 1.2.2 |

Vite stayed on 8.0.16 at the time; it moved to 8.3 on 2026-10-31 to clear its dev-server advisories.

`npm audit --omit=dev` went from 7 findings to 0. The full audit reports one
advisory (braces, through gh-pages) as 5 entries; see the backlog.

### Validation

- Node 24.14.1 locally; the Pages workflow builds on Node 24.
- `npx vitest run`: 34 files, 210 tests passed. `npm run build:gh` passed.
- Semantic search reranked in the dev server and in a `vite preview` of the
  Pages build ("download my cv" ranks the CV first), with no console errors.

## 2026-09-09

Completed:
- Replaced outdated employment, education and role claims with the owner's supplied facts.
- Verified Slow Pour against its static frontend and separate module-4 Express/SQLite source.
- Replaced campaign assets with public project screenshots; retained originals in an ignored local archive.
- Updated the one-page Estonian CV and retained its editable HTML source.
- Fixed image fallbacks, landmark/control names, mobile window bounds and PDF first-page rendering.
- Split the recruiter route from the desktop shell and generated its own static directory entry.
- Kept the existing desktop applications and browser-storage model.

### Dependency changes

| Package | Before | After |
| --- | --- | --- |
| DOMPurify | 3.4.8 | 3.4.15 |
| React Router DOM | 7.17.0 | 7.18.3 |
| Vite | 8.0.10 | 8.0.16 |
| Vitest | 4.1.5 | 4.1.11 |
| protobufjs override | 8.4.2 | 8.6.6 |
| undici (transitive) | 7.25.0 | 7.29.1 |

No major-version upgrades or application migrations. Vite stays on the 8.0 patch line.
DOMPurify hardens XML sanitization; Router and tooling updates include fixes.
Stricter sanitization can change previously accepted markup. Browser rendering and
the existing sanitization tests were checked after updating.

Release references:
- [DOMPurify 3.4.15](https://github.com/cure53/DOMPurify/releases/tag/3.4.15)
- [React Router 7.18.3](https://github.com/remix-run/react-router/releases/tag/react-router@7.18.3)
- [Vite 8.0.16](https://github.com/vitejs/vite/releases/tag/v8.0.16)
- [Vitest 4.1.11](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11)

The local npm audit decreased from 17 findings (10 high) to 5 high findings.
This is a dependency report, not a claim that every advisory is reachable.

### Validation

- Node 24.14.1; versions read from package-lock.json.
- `npm test -- --maxWorkers=2`: 29 files, 128 tests passed.
- `npm run build` and `npm run build:gh`: TypeScript and production builds.
- No lint script exists; no claim of an ESLint pass.
- Recruiter route checked at 320, 390, 768 and 1440 pixels, including keyboard
  focus, image loading, console errors and automated accessibility checks.
- Mobile OS checked for usable window controls and non-overlapping taskbar.
- CV downloaded and compared byte-for-byte with the local PDF.

### Backlog

[x] Review PDF.js 6 migration. Done 2026-10-07 (6.4.299); CI already runs Node 24.

[x] Track Transformers' Node-side sharp/onnxruntime-node/adm-zip advisories.
Done 2026-10-07: Transformers 4.3.1 depends on patched versions directly.

[ ] Track braces [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
via gh-pages > globby > fast-glob > micromatch. No patched braces exists yet, and
npm's suggested fix is a gh-pages downgrade. Only the manual `deploy:gh` script
uses it (CI deploys with peaceiris/actions-gh-pages), and it is never shipped.

[ ] Review removal of historical campaign assets with the owner.
Risk: deleting current files does not remove old Git commits, cached deployments,
forks or clones. History rewriting requires a separate, coordinated decision.

[ ] Validate LinkedIn and Unsplash manually in a normal signed-in browser.
Risk: automated requests were blocked; this is not evidence that the links are dead.

[ ] Consider explicit opt-in before semantic-search model downloads.
Risk: changes search behavior; large model downloads need a separate UX decision.
