# Portfolio maintenance

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

[ ] Review PDF.js 6 migration. Risk: major upgrade drops Node 20 support; current
5.6.205 is covered by [GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j).
This application uses getDocument/canvas, not PDFScriptingManager; do not assume
the generic viewer scripting advisory proves an exploitable path here.

[ ] Track Transformers' Node-side sharp/onnxruntime-node/adm-zip advisories.
Risk: npm reports no compatible automatic fix; forcing transitive major versions
could break model loading. The recruiter route does not load these modules.

[ ] Review removal of historical campaign assets with the owner.
Risk: deleting current files does not remove old Git commits, cached deployments,
forks or clones. History rewriting requires a separate, coordinated decision.

[ ] Validate LinkedIn and Unsplash manually in a normal signed-in browser.
Risk: automated requests were blocked; this is not evidence that the links are dead.

[ ] Consider explicit opt-in before semantic-search model downloads.
Risk: changes search behavior; large model downloads need a separate UX decision.
