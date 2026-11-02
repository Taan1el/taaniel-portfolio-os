import{B as e,Et as t,F as n,I as r,J as i,L as a,Ot as o,P as s,R as c,V as l,gt as u,ht as d,i as f,lt as p,mt as m,ot as h,q as ee,sn as te,ut as g}from"./index-D8gz7Vzr.js";import{t as _}from"./toast-store-CEoa3_0L.js";var v={".bmp":{extension:`.bmp`,openWith:`photos`,editWith:`paint`,mimeType:`image/bmp`,family:`image`,label:`Bitmap image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".gif":{extension:`.gif`,openWith:`photos`,editWith:`paint`,mimeType:`image/gif`,family:`image`,label:`GIF image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".heic":{extension:`.heic`,openWith:`photos`,mimeType:`image/heic`,family:`image`,label:`HEIC image`,capabilities:[`open`,`preview`]},".heif":{extension:`.heif`,openWith:`photos`,mimeType:`image/heif`,family:`image`,label:`HEIF image`,capabilities:[`open`,`preview`]},".ico":{extension:`.ico`,openWith:`photos`,editWith:`paint`,mimeType:`image/x-icon`,family:`image`,label:`Icon image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpg":{extension:`.jpg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpeg":{extension:`.jpeg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jxl":{extension:`.jxl`,openWith:`photos`,mimeType:`image/jxl`,family:`image`,label:`JPEG XL image`,capabilities:[`open`,`preview`]},".png":{extension:`.png`,openWith:`photos`,editWith:`paint`,mimeType:`image/png`,family:`image`,label:`PNG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".qoi":{extension:`.qoi`,openWith:`photos`,mimeType:`image/qoi`,family:`image`,label:`QOI image`,capabilities:[`open`,`preview`]},".svg":{extension:`.svg`,openWith:`editor`,editWith:`editor`,mimeType:`image/svg+xml`,family:`code`,label:`SVG document`,browserRenderable:!0,textLike:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".tif":{extension:`.tif`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".tiff":{extension:`.tiff`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".webp":{extension:`.webp`,openWith:`photos`,editWith:`paint`,mimeType:`image/webp`,family:`image`,label:`WebP image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".board":{extension:`.board`,openWith:`whiteboard`,mimeType:`application/json`,family:`document`,label:`Whiteboard`,textLike:!0,capabilities:[`open`,`edit`]},".sheet":{extension:`.sheet`,openWith:`spreadsheet`,mimeType:`application/json`,family:`document`,label:`Spreadsheet`,textLike:!0,capabilities:[`open`,`edit`]},".document":{extension:`.document`,openWith:`documents`,mimeType:`text/html`,family:`document`,label:`Document`,textLike:!0,capabilities:[`open`,`edit`]},".pdf":{extension:`.pdf`,openWith:`pdf`,mimeType:`application/pdf`,family:`document`,label:`PDF document`,capabilities:[`open`,`preview`,`print`]},".md":{extension:`.md`,openWith:`markdown`,editWith:`editor`,mimeType:`text/markdown`,family:`text`,label:`Markdown document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".txt":{extension:`.txt`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Text file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".json":{extension:`.json`,openWith:`editor`,editWith:`editor`,mimeType:`application/json`,family:`code`,label:`JSON file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".js":{extension:`.js`,openWith:`editor`,editWith:`editor`,mimeType:`text/javascript`,family:`code`,label:`JavaScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".jsx":{extension:`.jsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/jsx`,family:`code`,label:`JSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".ts":{extension:`.ts`,openWith:`editor`,editWith:`editor`,mimeType:`text/typescript`,family:`code`,label:`TypeScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".tsx":{extension:`.tsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/tsx`,family:`code`,label:`TSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".css":{extension:`.css`,openWith:`editor`,editWith:`editor`,mimeType:`text/css`,family:`code`,label:`Stylesheet`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".html":{extension:`.html`,openWith:`editor`,editWith:`editor`,mimeType:`text/html`,family:`code`,label:`HTML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".xml":{extension:`.xml`,openWith:`editor`,editWith:`editor`,mimeType:`application/xml`,family:`code`,label:`XML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yml":{extension:`.yml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yaml":{extension:`.yaml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".py":{extension:`.py`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`code`,label:`Python script`,capabilities:[`open`,`edit`,`preview`]},".ps1":{extension:`.ps1`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`code`,label:`PowerShell script`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".sh":{extension:`.sh`,openWith:`editor`,editWith:`editor`,mimeType:`text/x-sh`,family:`code`,label:`Shell script`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".log":{extension:`.log`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Log file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".csv":{extension:`.csv`,openWith:`spreadsheet`,editWith:`editor`,mimeType:`text/csv`,family:`text`,label:`CSV file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".mp4":{extension:`.mp4`,openWith:`video`,mimeType:`video/mp4`,family:`video`,label:`MP4 video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mov":{extension:`.mov`,openWith:`video`,mimeType:`video/quicktime`,family:`video`,label:`QuickTime video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".webm":{extension:`.webm`,openWith:`video`,mimeType:`video/webm`,family:`video`,label:`WebM video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mp3":{extension:`.mp3`,openWith:`music`,mimeType:`audio/mpeg`,family:`audio`,label:`MP3 audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".wav":{extension:`.wav`,openWith:`music`,mimeType:`audio/wav`,family:`audio`,label:`WAV audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".zip":{extension:`.zip`,openWith:`files`,mimeType:`application/zip`,family:`other`,label:`ZIP archive`,capabilities:[`open`]},".lnk":{extension:`.lnk`,openWith:`files`,mimeType:`application/x-shortcut`,family:`other`,label:`Shortcut`,capabilities:[`open`]},".img":{extension:`.img`,openWith:`v86`,mimeType:`application/octet-stream`,family:`other`,label:`Disk image (experimental)`,capabilities:[`open`]},".iso":{extension:`.iso`,openWith:`v86`,mimeType:`application/x-iso9660-image`,family:`other`,label:`ISO image (experimental)`,capabilities:[`open`]}};function y(e){return e?e.startsWith(`.`)?e.toLowerCase():`.${e.toLowerCase()}`:``}function b(e){return v[y(e)]}function ne(e){return b(e)?.mimeType??`application/octet-stream`}function x(e){return!!b(e)?.textLike}function re(e){let t=b(e.startsWith(`.`)?e:`.${e}`);return!!(t?.family===`image`&&t.browserRenderable)}function ie(e){return e.kind===`directory`?`files`:e.mimeType.startsWith(`image/`)?`photos`:e.mimeType.startsWith(`audio/`)?`music`:e.mimeType.startsWith(`video/`)?`video`:e.mimeType===`application/pdf`?`pdf`:`editor`}function S(e){if(!e||e.kind===`directory`)return`files`;if(l(e))return`notes`;let t=f().defaultApps[y(e.extension)];return t&&oe(e.extension).includes(t)?t:b(e.extension)?.openWith??ie(e)}function C(e){return!e||e.kind===`directory`?null:l(e)?`notes`:b(e.extension)?.editWith??(x(e.extension)?`editor`:null)}var ae={text:[`notes`,`editor`,`markdown`],code:[`editor`],image:[`photos`,`paint`]};function oe(e){let t=b(e),n=[],r=e=>{e&&!n.includes(e)&&n.push(e)};r(t?.openWith),r(t?.editWith);for(let e of ae[t?.family??``]??[])r(e);return n}function se(){return Object.keys(v)}function ce(e){if(e.kind===`directory`)return[];let t=b(e.extension),n=new Set,r=[],i=e=>{e&&!n.has(e)&&(n.add(e),r.push(e))};i(S(e)),i(C(e));for(let e of ae[t?.family??``]??[])i(e);return r}function w(e){return new Promise((t,n)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>n(e.error)})}function le(e,t){let n,r=()=>{if(n)return n;let r=indexedDB.open(e);return r.onupgradeneeded=()=>r.result.createObjectStore(t),n=w(r),n.then(e=>{e.onclose=()=>n=void 0},()=>{}),n};return(e,n)=>r().then(r=>n(r.transaction(t,e).objectStore(t)))}var T;function E(){return T||=le(`keyval-store`,`keyval`),T}function ue(e,t=E()){return t(`readonly`,t=>w(t.get(e)))}function de(e,t,n=E()){return n(`readwrite`,n=>(n.put(t,e),w(n.transaction)))}function fe(e,t=E()){return t(`readwrite`,t=>(t.delete(e),w(t.transaction)))}function D(e){let t=e.split(`?`)[0]?.toLowerCase()??``;return t.endsWith(`.svg`)?{extension:`svg`,mimeType:`image/svg+xml`}:t.endsWith(`.png`)?{extension:`png`,mimeType:`image/png`}:(t.endsWith(`.jpg`)||t.endsWith(`.jpeg`),{extension:`jpg`,mimeType:`image/jpeg`})}var O=Date.now(),k=e=>({kind:`directory`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:O,updatedAt:O}),A=(e,t,n,r)=>({kind:`file`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??e,extension:t,mimeType:n,createdAt:O,updatedAt:O,...r}),pe=`# About Taaniel

${g.intro}

## Current context

${g.current}

## Strengths

${d.map(e=>`- ${e}`).join(`
`)}

## Availability

${g.availability}
`,me=`# Contact

- **Email:** ${g.emailText}
- **Phone:** ${g.phoneText}
- **Location:** ${g.location}

## Links

${u.map(e=>`- [${e.label}](${e.url})`).join(`
`)}
`,he=`export const portfolioPositioning = {
  shell: "browser desktop as technical sample",
  fastPath: "/portfolio for recruiters",
  focus: ["React", "TypeScript", "UI systems", "design-to-code"],
};
`,ge="# Media folders\n\n- `/Media/Photography` is seeded from `public/assets/Photography`.\n- `/Media/Music` is seeded from `public/assets/Music`.\n- Campaign materials are not bundled in this public portfolio.\n",_e=`# Building a Portfolio OS

Turning a portfolio into a desktop-style product changes the expectation from "scroll and skim" to "explore and inspect".

## Why it matters

- It demonstrates interface architecture, not just visual taste.
- It shows how content can live inside a system instead of beside it.
- It gives recruiters more than screenshots. They can try the window manager and file explorer.
`,ve=`# Frontend Notes

## Principles I care about

- Interface clarity before visual noise
- Motion that explains state, not motion for its own sake
- Design systems that still feel authored
- Fast iteration from concept to implementation

## What this OS portfolio is trying to prove

That frontend craft can be expressive, technical, and recruiter-friendly at the same time.
`,ye=`# Taaniel OS — Case study

This portfolio is a browser-based desktop environment built in **React + TypeScript**.
It’s designed as a technical sample: you can click around, open apps, inspect the virtual filesystem, and see how the UI system is structured.

## What this OS proves

- **State architecture**: window/process lifecycle, shell UI, and filesystem state are centralized (Zustand) with clear boundaries.
- **Persistence**: desktop layout + filesystem persist in the browser (IndexedDB/localStorage) with migration support.
- **Complex UI**: draggable windows, snapping, taskbar previews, Start menu search, and app isolation.
- **Media handling**: PDF + image viewing, audio playback, and safe asset loading from \`public/\`.
- **Failure modes**: fallbacks for iframe restrictions, missing assets, and render errors.

## Architecture overview

- **Shell**: desktop surface, Start menu, taskbar, window host.
- **Window manager**: window bounds, z-index, focus, drag/resize, snapping.
- **Virtual filesystem**: seeded read-only assets + user files in IndexedDB.
- **App registry**: lazy-loaded apps with default sizing + metadata.

## Where to look in the code

- Shell + routing: \`src/app/App.tsx\`, \`src/components/shell/desktop-shell.tsx\`
- Window chrome: \`src/components/shell/window-frame.tsx\`
- App registry: \`src/lib/app-registry.tsx\`
- FS seeding + bundled assets: \`src/data/seedFileSystem.ts\`, \`src/data/bundled-assets.ts\`
- FS rules (move/rename/collisions): \`src/lib/filesystem.ts\`

## Constraints and tradeoffs

- **Hosting**: the shell runs client-side on GitHub Pages. Optional proxy modes depend on external services.
- **Embedded browser** uses iframes: some sites block embedding via CSP/X-Frame-Options; fallback UI is shown instead.
- **Loading**: app modules and heavy workers use dynamic imports; the desktop shell is separate from the portfolio route.

## How to evaluate it quickly (30 seconds)

1. Open **Start menu** → type in search → launch an app.
2. Open **Files** → browse \`/Portfolio/Case Studies\`.
3. Open **Photos** and zoom/pan.

## What grew out of it

The first version looked like a desktop. The later work made it behave like one, using real engines rather than imitations wherever a browser allows it.

- **Files are real.** The desktop is a folder on a virtual disk, stored in IndexedDB. Shortcuts are \`.lnk\` files, and one pointer-based drag controller moves, copies and links across the desktop, File Explorer and app windows, with Windows' Ctrl and Alt rules.
- **Two shells written from scratch.** A PowerShell-style and a Command Prompt interpreter with pipelines of objects, hand-written expression parsing and no eval, plus tabs, find and Windows Terminal's colour schemes.
- **Real engines in the browser.** CPython through Pyodide, in a worker so that Ctrl+C can stop a runaway loop. A Linux kernel on the v86 x86 emulator. Doom's engine as WebAssembly behind a small loader I wrote so it can pause and shut down cleanly.
- **Code.** Monaco with tabs, search, a command palette and a live preview in a sandbox with no network access.
- **A window system.** Snap Layouts, virtual desktops, and focus that moves the way keyboard and screen reader users expect.

Large downloads load only when an app asks for them, so the first visit stays light.
`,be=`# Apps catalog

The portfolio combines custom interface code with third-party libraries and embedded games. These integrations are not claims that their underlying engines were built from scratch.

## Portfolio

- **About** — structured content + cross-linking into the filesystem
- **Projects** — case study launcher patterns + responsive layout
- **Contact** — fast CTAs + link cards + copy-to-clipboard

## Core system

- **File Explorer** — virtual filesystem tree, drag/drop, collisions, open-with routing
- **Markdown Viewer** — safe markdown rendering and document previews
- **PDF Viewer** — browser iframe preview + pdf.js renderer fallback
- **Photos** — pan/zoom interaction + media gallery navigation
- **Browser** — iframe viewer + CSP/X-Frame fallbacks + local path browsing

## Workspace / tooling

- **Terminal** — command parsing + filesystem actions + UI layout under constraints
- **Code Editor** — Monaco integration + file persistence
- **Notes** — quick text editing + persistence

## Optional extras

- **Music Player** — audio playback + folder-based playlist
- **Settings** — theme and wallpaper controls
- **Paint** — canvas tool + file export

## What to try (fast)

1. Start menu search → launch **Files**
2. Open **OS Case Study.md**
3. Open **Photos** and zoom/pan
`,j=()=>{let t={"/":k(`/`),"/Desktop":k(`/Desktop`),"/Documents":k(`/Documents`),[e]:k(e),"/Users":k(`/Users`),"/Users/Public":k(`/Users/Public`),"/Users/Public/Blog":k(`/Users/Public/Blog`),"/Portfolio":k(`/Portfolio`),"/Portfolio/Case Studies":k(`/Portfolio/Case Studies`),"/Media":k(`/Media`),"/Media/Music":k(`/Media/Music`),"/Media/Photography":k(`/Media/Photography`),"/Media/Videos":k(`/Media/Videos`),"/Code":k(`/Code`)};return i.forEach(e=>{t[e]=k(e)}),t[`${e}/${c}`]=A(`${e}/${c}`,`txt`,`text/plain`,{content:a}),t[`/Portfolio/About.md`]=A(`/Portfolio/About.md`,`md`,`text/markdown`,{content:pe}),t[`/Portfolio/Contact.md`]=A(`/Portfolio/Contact.md`,`md`,`text/markdown`,{content:me}),t[`/Portfolio/OS-Case-Study.md`]=A(`/Portfolio/OS-Case-Study.md`,`md`,`text/markdown`,{content:ye}),t[`/Portfolio/Apps.md`]=A(`/Portfolio/Apps.md`,`md`,`text/markdown`,{content:be}),t[`/Code/portfolio-positioning.ts`]=A(`/Code/portfolio-positioning.ts`,`ts`,`text/typescript`,{content:he}),t[`/Users/Public/Blog/Building-a-Portfolio-OS.md`]=A(`/Users/Public/Blog/Building-a-Portfolio-OS.md`,`md`,`text/markdown`,{content:_e}),t[`/Users/Public/Blog/Frontend-Notes.md`]=A(`/Users/Public/Blog/Frontend-Notes.md`,`md`,`text/markdown`,{content:ve}),t[`/Users/Public/README.md`]=A(`/Users/Public/README.md`,`md`,`text/markdown`,{content:ge}),t[`/Documents/Taaniel-Vananurm-CV.pdf`]=A(`/Documents/Taaniel-Vananurm-CV.pdf`,`pdf`,`application/pdf`,{source:m,readonly:!0}),h.forEach(e=>{let n=`/Portfolio/Case Studies/${e.title}`;t[n]=k(n);let r=[e.problem?`## Problem\n\n${e.problem}`:``,e.architecture?.length?`## Architecture\n\n${e.architecture.map(e=>`### ${e.title}\n\n${e.body}`).join(`

`)}`:``,e.technicalHighlights?.length?`## Technical highlights\n\n${e.technicalHighlights.map(e=>`- ${e}`).join(`
`)}`:``,e.challengesAndTradeoffs?`## Challenges and tradeoffs\n\n${e.challengesAndTradeoffs}`:``,e.whatILearned?`## What I learned\n\n${e.whatILearned}`:``,e.measurableOutcome?`## Measurable outcome\n\n${e.measurableOutcome}`:``,e.liveUrl?`## Live\n\n${e.liveUrl}`:``,e.repoUrl?`## Repository\n\n${e.repoUrl}`:``].filter(Boolean).join(`

`);t[`${n}/Overview.md`]=A(`${n}/Overview.md`,`md`,`text/markdown`,{content:`# ${e.title}

## Type

${e.type}

## Role

${e.role}

## One-line summary

${e.oneLiner}

## Challenge

${e.challenge}

## Outcome

${e.outcome}

${r?`${r}\n\n`:``}## Stack

${e.stack.map(e=>`- ${e}`).join(`
`)}
`});let i=D(e.hero);t[`${n}/Hero.${i.extension}`]=A(`${n}/Hero.${i.extension}`,i.extension,i.mimeType,{source:e.hero,readonly:!0}),e.layouts.forEach((e,r)=>{let i=D(e);t[`${n}/Layout-${r+1}.${i.extension}`]=A(`${n}/Layout-${r+1}.${i.extension}`,i.extension,i.mimeType,{source:e,readonly:!0})})}),p.forEach(e=>{let n=e.src.endsWith(`.png`)?`png`:`jpg`;t[`/Media/Photography/${e.title}.${n}`]=A(`/Media/Photography/${e.title}.${n}`,n,n===`png`?`image/png`:`image/jpeg`,{source:e.src,readonly:!0})}),ee.forEach(e=>{t[e.path]=A(e.path,e.extension,e.mimeType,{source:e.source,readonly:!0})}),t},M=`taaniel-os-filesystem-v1`;function N(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function P(e){let t=N(e);if(t===`/`)return`/`;let n=t.split(`/`).filter(Boolean);return n.length<=1?`/`:`/${n.slice(0,-1).join(`/`)}`}function F(e){let t=N(e);return t===`/`?`/`:t.split(`/`).filter(Boolean).at(-1)??t}function I(...e){return N(e.join(`/`))}function L(e,t){return e[N(t)]}function R(e){return e.kind===`directory`?{path:e.path,name:e.name,type:`folder`,createdAt:e.createdAt,updatedAt:e.updatedAt,originalPath:e.originalPath,deletedAt:e.deletedAt}:{path:e.path,name:e.name,type:`file`,mimeType:e.mimeType,content:e.content,createdAt:e.createdAt,updatedAt:e.updatedAt,extension:e.extension,source:e.source,size:e.size,readonly:e.readonly,originalPath:e.originalPath,deletedAt:e.deletedAt,shortcut:e.shortcut}}function z(e,t){return B(e,t).map(R)}function xe(e,t){let n=L(e,t);return!n||n.kind!==`file`?null:R(n)}function B(e,t){let n=N(t);return Object.values(e).filter(e=>e.path!==n&&P(e.path)===n).sort(Se)}function V(e,t){let n=N(t);return Object.values(e).filter(e=>e.path===n||e.path.startsWith(`${n}/`)).sort((e,t)=>e.path.length-t.path.length)}function Se(e,t){return e.kind===t.kind?e.name.localeCompare(t.name):e.kind===`directory`?-1:1}function H(e,t){return V(e,t).some(e=>e.kind===`file`&&!!e.readonly)}function U(e){return s.has(N(e))}function W(e,t){return U(t)||H(e,t)}function G(e,t){let n=N(t);return e[n]?U(n)?`protected`:H(e,n)?`read-only`:null:`missing`}function K(e,t){let n=e.lastIndexOf(`.`);return!t&&n>0?{stem:e.slice(0,n),extension:e.slice(n)}:{stem:e,extension:``}}function q(e,t,n,r=!1,i){let a=new Set(B(e,t).filter(e=>e.path!==i).map(e=>e.name.toLowerCase()));if(!a.has(n.toLowerCase()))return n;let{stem:o,extension:s}=K(n,r),c=o.replace(/ \(\d+\)$/,``),l=2;for(;a.has(`${c} (${l})${s}`.toLowerCase());)l+=1;return`${c} (${l})${s}`}function Ce(e,t,n,r){let{stem:i,extension:a}=K(n,r);return q(e,t,`${i} - Copy${a}`,r)}function we(e,t,n={}){let r=N(t);if(r===`/`||e[r])return{nodes:e,path:r};let i=P(r),a=e[i];if(!a||a.kind!==`directory`)return{nodes:e,path:r};let o=F(r),s=n.uniqueName?q(e,i,o,!0):o,c=I(i,s),l=Date.now(),u={kind:`directory`,path:c,name:s,createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Te(e,t,n=`New folder`){let r=N(t),i=q(e,r,n,!0),a=I(r,i),o=Date.now(),s={kind:`directory`,path:a,name:i,createdAt:o,updatedAt:o};return{...e,[a]:s}}function Ee(e,t,n=`New Text Document.txt`,r=``){let i=N(t),a=q(e,i,n),o=I(i,a),s=a.split(`.`).pop()?.toLowerCase()??`txt`,c=s===`md`?`text/markdown`:`text/plain`,l=Date.now(),u={kind:`file`,path:o,name:a,extension:s,mimeType:c,content:r,createdAt:l,updatedAt:l};return{...e,[o]:u}}function De(e,t,n,r={}){let i=N(t),a=e[i];if(a?.kind===`file`)return a.readonly?{nodes:e,path:i}:r.source||a.source?{nodes:je(e,i,r.source??String(n),{mimeType:r.mimeType,extension:r.extension}),path:i}:{nodes:Oe(e,i,String(n)),path:i};let o=P(i),s=e[o];if(!s||s.kind!==`directory`)return{nodes:e,path:i};let c=F(i),l=r.uniqueName?q(e,o,c):c,u=I(o,l),d=r.extension??l.split(`.`).pop()?.toLowerCase()??`txt`,f=r.mimeType??ne(d);return r.source||!Re(f,d)?Ae(e,o,l,r.source??String(n),f,d):{nodes:Ee(e,o,l,String(n)),path:u}}function Oe(e,t,n){let r=N(t),i=e[r];return!i||i.kind!==`file`?e:{...e,[r]:{...i,content:n,updatedAt:Date.now()}}}function ke(e){if(!e.startsWith(`data:`))return;let t=e.split(`,`)[1];if(!t)return;let n=t.replace(/\s/g,``),r=n.endsWith(`==`)?2:+!!n.endsWith(`=`);return Math.max(0,n.length*3/4-r)}function Ae(e,t,n,r,i,a){let o=N(t),s=q(e,o,n),c=I(o,s),l=Date.now(),u={kind:`file`,path:c,name:s,extension:a,mimeType:i,source:r,size:ke(r),createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function je(e,t,n,r={}){let i=N(t),a=e[i];return!a||a.kind!==`file`||a.readonly?e:{...e,[i]:{...a,source:n,content:void 0,mimeType:r.mimeType??a.mimeType,extension:r.extension??a.extension,size:ke(n),updatedAt:Date.now()}}}function Me(e,t,n){let r=N(t),i=e[r];if(!i||U(r))return e;let a=P(r),o=q(e,a,n,i.kind===`directory`,r),s=I(a,o);if(s===r)return e;let c={...e};return delete c[r],c[s]={...i,path:s,name:o,updatedAt:Date.now()},i.kind===`directory`&&Object.values(e).filter(e=>e.path.startsWith(`${r}/`)).forEach(e=>{delete c[e.path];let t=e.path.replace(r,s);c[t]={...e,path:t,updatedAt:Date.now()}}),c}function Ne(e,t,n){let r=N(t),i=e[r];if(!i||U(r))return{nodes:e,path:r};let a=P(r),o=q(e,a,n,i.kind===`directory`,r),s=I(a,o);return{nodes:Me(e,r,o),path:s}}function Pe(e,t,n){let r=N(t),i=e[r];if(!i||P(r)!==N(n))return{nodes:e,path:null};let a=N(i.originalPath??`/Desktop/${i.name}`),o=P(a),s=e,c=``;for(let t of o.split(`/`).filter(Boolean)){c=`${c}/${t}`;let n=s[c];if(!n)s=we(s,c).nodes;else if(n.kind!==`directory`)return{nodes:e,path:null}}let l=q(s,o,F(a),i.kind===`directory`),u=I(o,l),d=Date.now(),f={};return V(s,r).forEach(e=>{let t=e.path===r?u:e.path.replace(`${r}/`,`${u}/`),{originalPath:n,deletedAt:i,...a}=e;f[t]={...a,path:t,name:t===u?l:a.name,updatedAt:d}}),{nodes:{...J(s,r),...f},path:u}}function J(e,t){let n=N(t),r={...e};return Object.keys(e).forEach(e=>{(e===n||e.startsWith(`${n}/`))&&delete r[e]}),r}function Y(e,t,n,r){let i=N(t),a=N(n),o=e[i],s=e[a];if(!o||!s||s.kind!==`directory`||i===`/`||i===a||o.kind===`directory`&&a.startsWith(`${i}/`)||r===`cut`&&(W(e,i)||P(i)===a))return e;let c=o.kind===`directory`,l=I(a,r===`copy`&&P(i)===a?Ce(e,a,o.name,c):q(e,a,o.name,c)),u=V(e,i),d=Date.now(),f={};return u.forEach(e=>{let t=e.path===i?l:e.path.replace(`${i}/`,`${l}/`);if(e.kind===`directory`){f[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,updatedAt:d};return}let n={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,createdAt:r===`copy`?d:e.createdAt,updatedAt:d};r===`copy`&&delete n.readonly,f[t]=n}),r===`copy`?{...e,...f}:{...J(e,i),...f}}function Fe(e){let t=Array.from(new Set(e.map(N)));return t.filter(e=>!t.some(t=>t!==e&&e.startsWith(`${t}/`)))}function Ie(e){let{originalPath:t,deletedAt:n,...r}=e;return r}function Le(e,n,r,i,a={}){let s=N(r),c=a.trashPath?N(a.trashPath):null,l=a.now??Date.now(),u=[],d=[],f=e[s],p=c!==null&&s===c,m=c!==null&&s.startsWith(`${c}/`),h=e;if(!f||f.kind!==`directory`||m)return{nodes:e,transferred:u,skipped:n.map(e=>({path:N(e),reason:`not-allowed`}))};for(let e of Fe(n)){let n=h[e];if(!n||e===`/`){d.push({path:e,reason:`missing`});continue}if(i!==`link`&&(e===s||s.startsWith(`${e}/`))){d.push({path:e,reason:`into-itself`});continue}if(p&&i!==`move`){d.push({path:e,reason:`not-allowed`});continue}if(i===`link`){let r=n.kind===`file`&&n.shortcut?n.shortcut:{type:`path`,path:e},i=I(s,q(h,s,o(n.name,!!(n.kind===`file`&&n.shortcut))));h={...h,[i]:t(i,r,l)},u.push({from:e,to:i});continue}if(i===`move`&&W(h,e)){d.push({path:e,reason:`locked`});continue}if(i===`move`&&P(e)===s){d.push({path:e,reason:`same-folder`});continue}let r=n.kind===`directory`,a=I(s,i===`copy`&&P(e)===s?Ce(h,s,n.name,r):q(h,s,n.name,r)),f=Y(h,e,s,i===`move`?`cut`:`copy`);if(f===h||!f[a]){d.push({path:e,reason:`not-allowed`});continue}let m=c!==null&&P(e)===c&&!p;h={...f,[a]:p?{...f[a],originalPath:e,deletedAt:l}:m||i===`copy`?Ie(f[a]):f[a]},u.push({from:e,to:a})}return{nodes:h,transferred:u,skipped:d}}function Re(e,t){return e.startsWith(`image/`)||e.startsWith(`video/`)||e.startsWith(`audio/`)||e===`application/pdf`?!1:e.startsWith(`text/`)?!0:x(t)}function ze(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result??``)),r.onerror=()=>n(r.error??Error(`Failed to read ${e.name}`)),r.readAsDataURL(e)})}async function Be(e,t,n){let r=N(t),i=e[r];if(!i||i.kind!==`directory`||n.length===0)return{nodes:e,importedPaths:[]};let a={...e},o=[];for(let e of n){let t=q(a,r,e.name?.trim()||`Upload-${Date.now()}`),n=I(r,t),i=t.split(`.`).pop()?.toLowerCase()??``,s=e.type||ne(i),c=Date.now(),l={kind:`file`,path:n,name:t,extension:i,mimeType:s,size:e.size,createdAt:c,updatedAt:c};Re(s,i)?l.content=await e.text():l.source=await ze(e),a[n]=l,o.push(n)}return{nodes:a,importedPaths:o}}async function Ve(e){let t=``,n=``;if(e.source){if(e.source.startsWith(`data:`))t=e.source;else{let r=await(await fetch(e.source)).blob();n=URL.createObjectURL(r),t=n}}else n=URL.createObjectURL(new Blob([e.content??``],{type:e.mimeType||`text/plain`})),t=n;let r=document.createElement(`a`);r.href=t,r.download=e.name,r.rel=`noreferrer`,document.body.append(r),r.click(),r.remove(),n&&URL.revokeObjectURL(n)}async function He(){return await ue(`taaniel-os-filesystem-v1`)??j()}async function Ue(e){await de(M,e)}async function We(){await fe(M)}var Ge={"/Portfolio/About.md":[`a78665400474a3cfa730d635977ac20c054d5cecad352a69be9362dac8ad5917`],"/Portfolio/Contact.md":[`4312888197a3f21ffd6a718f0b0a16f47f8652236fe5ec5eef1da3f0c4cf4731`],"/Portfolio/OS-Case-Study.md":[`ecb7684d5ebd72015c7abb1d21552eb08247a825858ec76158cbb875a3fa5f29`,`2424e51fc7532be5288f0c5e156f2769805383a8b341930eb2820b6151c8acbf`],"/Portfolio/Apps.md":[`ce2ac94db35a29a0a420b58d896cca865f4561ac751ef47f252e351298e1a6da`],"/Portfolio/Case Studies/Fintech Email Campaign (0% Offer)/Overview.md":[`e771883725dc72afb4e90fc7400daefe6bf747105a3153dd52d72f030112cce5`],"/Portfolio/Case Studies/Fast-Loan Hero + Template/Overview.md":[`517c2589d4ced612cf4f5d2783d86a7355108e5092dd5a63637d7cfe3afc8a16`],"/Portfolio/Case Studies/Mascot-Driven Email Campaign/Overview.md":[`82343b3cc3b2945bfddf043c2d825555c460f128e285190ecceb87a1b7ba7a5f`]};async function Ke(e){let t=j(),n={...e},r=!1;for(let[e,i]of Object.entries(n)){if(i.kind!==`file`)continue;if(i.readonly&&i.source?.includes(`/assets/Work/`)){delete n[e],r=!0;continue}if(!Ge[e]||!i.content||!globalThis.crypto?.subtle)continue;let a=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(i.content)),o=Array.from(new Uint8Array(a),e=>e.toString(16).padStart(2,`0`)).join(``);if(!Ge[e].includes(o))continue;let s=t[e]??{...i,content:`# Campaign work

This material is no longer included in the public portfolio. See the Fiizy internship summary on the portfolio page.`};JSON.stringify(s)!==JSON.stringify(i)&&(n[e]=s,r=!0)}for(let[e,i]of Object.entries(t))(e===`/Portfolio`||e.startsWith(`/Portfolio/`))&&!n[e]&&(n[e]=i,r=!0);return r?n:e}function X(e,t){return e===`protected`?`This folder is part of the system and can't be ${t}`:`This item is read-only and can't be ${t}`}function qe(e,t,n,r){let i=e[N(n)];return!e[N(t)]||!i?`missing`:i.kind===`directory`?(r===`cut`?G(e,t):null)??`invalid`:`invalid`}function Je(e,t,n){let r=e.transferred.length,i=e=>e===1?`1 item`:`${e} items`;if(r>0){let a=e.skipped.filter(e=>e.reason===`locked`).length,o=e=>a>0?`${e}. ${a===1?`1 read-only item was`:`${a} read-only items were`} left in place`:e;return n?{text:o(r===1?`Moved to Recycle Bin`:`Moved ${i(r)} to the Recycle Bin`),tone:`success`}:t===`link`?{text:r===1?`Shortcut created`:`Created ${r} shortcuts`,tone:`success`}:{text:o(`${t===`move`?`Moved`:`Copied`} ${i(r)}`),tone:`success`}}let a=new Set(e.skipped.map(e=>e.reason));return a.has(`into-itself`)?{text:`The destination folder is a subfolder of the source folder`,tone:`error`}:a.has(`locked`)?{text:`This item is read-only and can't be moved`,tone:`error`}:null}var Z=new Set;function Ye(e){return Z.add(e),()=>{Z.delete(e)}}function Q(e){e.length>0&&Z.forEach(t=>t(e))}async function $(e){try{await Ue(e)}catch{}}var Xe=te((e,t)=>({nodes:{},initialized:!1,initialize:async()=>{if(t().initialized)return;let n;try{n=await He()}catch{console.warn(`[fs] IndexedDB unavailable — falling back to seed filesystem`),n=null}let i=r(n?await Ke(n):j());n!==null&&i!==n&&await $(i),e({nodes:i,initialized:!0})},listDirectory:e=>z(t().nodes,e),readFile:e=>xe(t().nodes,e),writeFile:async(n,r,i)=>{let a=De(t().nodes,n,r,i);return e({nodes:a.nodes}),await $(a.nodes),a.path},mkdir:async(n,r)=>{let i=we(t().nodes,n,r);return e({nodes:i.nodes}),await $(i.nodes),i.path},rename:async(n,r)=>{let i=Ne(t().nodes,n,r);return i.path!==N(n)&&Q([{from:N(n),to:i.path}]),e({nodes:i.nodes}),await $(i.nodes),i.path},createDirectory:async(n,r)=>{let i=Te(t().nodes,n,r);e({nodes:i}),await $(i),_(`Folder created`,`success`)},createTextFile:async(n,r,i)=>{let a=Ee(t().nodes,n,r,i);e({nodes:a}),await $(a)},createBinaryFile:async(n,r,i,a,o)=>{let s=Ae(t().nodes,n,r,i,a,o),c=s.nodes;return e({nodes:c}),await $(c),s.path},renameNode:async(n,r)=>{let i=Me(t().nodes,n,r);e({nodes:i}),await $(i)},deleteNode:async(e,n)=>{await t().tryDeleteNode(e,n)},tryDeleteNode:async(r,i)=>{let a=N(r),o=t().nodes,s=G(o,a);if(s===`missing`)return{ok:!1,reason:s};if(s===`protected`)return i?.quiet||_(X(s,`deleted`),`error`),{ok:!1,reason:s};if(a.startsWith(`/Trash/`)){let t=J(o,a);return e({nodes:t}),await $(t),i?.quiet||_(`Permanently deleted`,`success`),{ok:!0}}if(s)return i?.quiet||_(X(s,`deleted`),`error`),{ok:!1,reason:s};let c=Y(o,a,n,`cut`);if(c===o)return{ok:!1,reason:`invalid`};let l=Object.keys(c).find(e=>!(e in o)&&P(e)===`/Trash`),u=l?{...c,[l]:{...c[l],originalPath:a,deletedAt:Date.now()}}:c;return e({nodes:u}),await $(u),i?.quiet||_(`Moved to Recycle Bin`,`success`),{ok:!0}},deleteNodePermanently:async n=>{let r=t().nodes,i=G(r,n);if(i===`missing`)return;if(i){_(X(i,`deleted`),`error`);return}let a=J(r,n);e({nodes:a}),await $(a),_(`Permanently deleted`,`success`)},restoreNode:async r=>{let i=Pe(t().nodes,r,n);return i.path?(e({nodes:i.nodes}),await $(i.nodes),i.path):null},emptyTrash:async()=>{let n=t().nodes,r=Object.keys(n).filter(e=>e!==`/Trash`&&e.startsWith(`/Trash/`)&&!e.slice(7).includes(`/`));if(r.length===0){_(`The Recycle Bin is already empty`,`info`);return}let i={...n};r.forEach(e=>{Object.keys(i).forEach(t=>{(t===e||t.startsWith(`${e}/`))&&delete i[t]})}),e({nodes:i}),await $(i),_(`Recycle Bin emptied`,`success`)},updateTextFile:async(n,r)=>{let i=Oe(t().nodes,n,r);e({nodes:i}),await $(i)},updateBinaryFile:async(n,r,i)=>{let a=je(t().nodes,n,r,i);e({nodes:a}),await $(a)},pasteNode:async(e,n,r,i)=>{await t().tryPasteNode(e,n,r,i)},tryPasteNode:async(n,r,i,a)=>{let o=t().nodes,s=Y(o,n,r,i);return s===o?{ok:!1,reason:qe(o,n,r,i)}:(e({nodes:s}),await $(s),a?.quiet||_(i===`cut`?`Moved`:`Copied`,`success`),{ok:!0})},transferNodes:async(r,i,a,o)=>{let s=Le(t().nodes,r,i,a,{trashPath:n});if(s.transferred.length>0&&(a===`move`&&Q(s.transferred),e({nodes:s.nodes}),await $(s.nodes)),!o?.quiet){let e=Je(s,a,N(i)===n);e&&_(e.text,e.tone)}return s},importFiles:async(n,r)=>{let{nodes:i,importedPaths:a}=await Be(t().nodes,n,r);return e({nodes:i}),await $(i),_(r.length===1?`Imported "${r[0].name}"`:`Imported ${r.length} files`,`success`),a},canCutNode:e=>!W(t().nodes,e),reset:async()=>{let t=r(j());e({nodes:t,initialized:!0}),await We(),await $(t)}}));export{S,ce as _,L as a,x as b,W as c,z as d,N as f,se as g,b as h,G as i,I as l,D as m,Xe as n,P as o,R as p,Ve as r,F as s,Ye as t,B as u,oe as v,C as x,re as y};