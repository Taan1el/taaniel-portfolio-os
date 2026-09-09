import{a as e,d as t,l as n,n as r,o as i,p as a,u as o}from"./portfolio-XodZCWr_.js";var s=`/Documents/Notes`,c=`/Documents`,l=`To-do list.txt`,u=`${s}/${l}`,d=`To-do list

`;function f(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function p(e,t){let n=f(e);return{kind:`directory`,path:n,name:n.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:t,updatedAt:t}}function ee(e,t,n){let r=f(e);return{kind:`file`,path:r,name:r.split(`/`).filter(Boolean).at(-1)??r,extension:`txt`,mimeType:`text/plain`,content:t,createdAt:n,updatedAt:n}}function m(e){return!!(e&&e.kind===`directory`)}function te(e){return!!(e&&e.kind===`file`&&typeof e.content==`string`)}function h(e){if(!e)return!1;let t=f(e);return t===`/Documents/Notes`||t.startsWith(`/Documents/Notes/`)}function g(e){return!!(e&&e.kind===`file`&&h(e.path))}function ne(e){let t=e,n=!1,r=Date.now();return m(t[`/Documents`])||(t={...t,[c]:p(c,r)},n=!0),m(t[`/Documents/Notes`])||(t={...t,[s]:p(s,r)},n=!0),te(t[u])||(t={...t,[u]:ee(u,d,r)},n=!0),n?t:e}var re={".bmp":{extension:`.bmp`,openWith:`photos`,editWith:`paint`,mimeType:`image/bmp`,family:`image`,label:`Bitmap image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".gif":{extension:`.gif`,openWith:`photos`,editWith:`paint`,mimeType:`image/gif`,family:`image`,label:`GIF image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".heic":{extension:`.heic`,openWith:`photos`,mimeType:`image/heic`,family:`image`,label:`HEIC image`,capabilities:[`open`,`preview`]},".heif":{extension:`.heif`,openWith:`photos`,mimeType:`image/heif`,family:`image`,label:`HEIF image`,capabilities:[`open`,`preview`]},".ico":{extension:`.ico`,openWith:`photos`,editWith:`paint`,mimeType:`image/x-icon`,family:`image`,label:`Icon image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpg":{extension:`.jpg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpeg":{extension:`.jpeg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jxl":{extension:`.jxl`,openWith:`photos`,mimeType:`image/jxl`,family:`image`,label:`JPEG XL image`,capabilities:[`open`,`preview`]},".png":{extension:`.png`,openWith:`photos`,editWith:`paint`,mimeType:`image/png`,family:`image`,label:`PNG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".qoi":{extension:`.qoi`,openWith:`photos`,mimeType:`image/qoi`,family:`image`,label:`QOI image`,capabilities:[`open`,`preview`]},".svg":{extension:`.svg`,openWith:`editor`,editWith:`editor`,mimeType:`image/svg+xml`,family:`code`,label:`SVG document`,browserRenderable:!0,textLike:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".tif":{extension:`.tif`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".tiff":{extension:`.tiff`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".webp":{extension:`.webp`,openWith:`photos`,editWith:`paint`,mimeType:`image/webp`,family:`image`,label:`WebP image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".pdf":{extension:`.pdf`,openWith:`pdf`,mimeType:`application/pdf`,family:`document`,label:`PDF document`,capabilities:[`open`,`preview`,`print`]},".md":{extension:`.md`,openWith:`markdown`,editWith:`editor`,mimeType:`text/markdown`,family:`text`,label:`Markdown document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".txt":{extension:`.txt`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Text file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".json":{extension:`.json`,openWith:`editor`,editWith:`editor`,mimeType:`application/json`,family:`code`,label:`JSON file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".js":{extension:`.js`,openWith:`editor`,editWith:`editor`,mimeType:`text/javascript`,family:`code`,label:`JavaScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".jsx":{extension:`.jsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/jsx`,family:`code`,label:`JSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".ts":{extension:`.ts`,openWith:`editor`,editWith:`editor`,mimeType:`text/typescript`,family:`code`,label:`TypeScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".tsx":{extension:`.tsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/tsx`,family:`code`,label:`TSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".css":{extension:`.css`,openWith:`editor`,editWith:`editor`,mimeType:`text/css`,family:`code`,label:`Stylesheet`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".html":{extension:`.html`,openWith:`editor`,editWith:`editor`,mimeType:`text/html`,family:`code`,label:`HTML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".xml":{extension:`.xml`,openWith:`editor`,editWith:`editor`,mimeType:`application/xml`,family:`code`,label:`XML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yml":{extension:`.yml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yaml":{extension:`.yaml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".mp4":{extension:`.mp4`,openWith:`video`,mimeType:`video/mp4`,family:`video`,label:`MP4 video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mov":{extension:`.mov`,openWith:`video`,mimeType:`video/quicktime`,family:`video`,label:`QuickTime video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".webm":{extension:`.webm`,openWith:`video`,mimeType:`video/webm`,family:`video`,label:`WebM video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mp3":{extension:`.mp3`,openWith:`music`,mimeType:`audio/mpeg`,family:`audio`,label:`MP3 audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".wav":{extension:`.wav`,openWith:`music`,mimeType:`audio/wav`,family:`audio`,label:`WAV audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".zip":{extension:`.zip`,openWith:`files`,mimeType:`application/zip`,family:`other`,label:`ZIP archive`,capabilities:[`open`]},".img":{extension:`.img`,openWith:`v86`,mimeType:`application/octet-stream`,family:`other`,label:`Disk image (experimental)`,capabilities:[`open`]},".iso":{extension:`.iso`,openWith:`v86`,mimeType:`application/x-iso9660-image`,family:`other`,label:`ISO image (experimental)`,capabilities:[`open`]}};function ie(e){return e?e.startsWith(`.`)?e.toLowerCase():`.${e.toLowerCase()}`:``}function _(e){return re[ie(e)]}function v(e){return _(e)?.mimeType??`application/octet-stream`}function y(e){return!!_(e)?.textLike}function ae(e){let t=_(e.startsWith(`.`)?e:`.${e}`);return!!(t?.family===`image`&&t.browserRenderable)}function oe(e){return e.kind===`directory`?`files`:e.mimeType.startsWith(`image/`)?`photos`:e.mimeType.startsWith(`audio/`)?`music`:e.mimeType.startsWith(`video/`)?`video`:e.mimeType===`application/pdf`?`pdf`:`editor`}function b(e){return!e||e.kind===`directory`?`files`:g(e)?`notes`:_(e.extension)?.openWith??oe(e)}function x(e){return!e||e.kind===`directory`?null:g(e)?`notes`:_(e.extension)?.editWith??(y(e.extension)?`editor`:null)}var se={text:[`notes`,`editor`,`markdown`],code:[`editor`],image:[`photos`,`paint`]};function ce(e){if(e.kind===`directory`)return[];let t=_(e.extension),n=new Set,r=[],i=e=>{e&&!n.has(e)&&(n.add(e),r.push(e))};i(b(e)),i(x(e));for(let e of se[t?.family??``]??[])i(e);return r}function S(e){return new Promise((t,n)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>n(e.error)})}function le(e,t){let n,r=()=>{if(n)return n;let r=indexedDB.open(e);return r.onupgradeneeded=()=>r.result.createObjectStore(t),n=S(r),n.then(e=>{e.onclose=()=>n=void 0},()=>{}),n};return(e,n)=>r().then(r=>n(r.transaction(t,e).objectStore(t)))}var C;function w(){return C||=le(`keyval-store`,`keyval`),C}function ue(e,t=w()){return t(`readonly`,t=>S(t.get(e)))}function de(e,t,n=w()){return n(`readwrite`,n=>(n.put(t,e),S(n.transaction)))}function fe(e,t=w()){return t(`readwrite`,t=>(t.delete(e),S(t.transaction)))}var pe=`/Portfolio/Workbench`,me=[{path:`/Media/Music/Black Star.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:a(`assets/Music/Black Star.mp3`)},{path:`/Media/Music/Black Star Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:a(`assets/Music/blackstar_img.jpg`)},{path:`/Media/Music/American Psycho.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:a(`assets/Music/American Psycho.mp3`)},{path:`/Media/Music/American Psycho Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:a(`assets/Music/american psycho icon.jpg`)},{path:`/Media/Music/Life's Too Short.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:a(`assets/Music/Life's Too Short.mp3`)},{path:`/Media/Music/Life's Too Short Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:a(`assets/Music/Life's Too Short icon.jpg`)},{path:`/Media/Music/Self Aware.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:a(`assets/Music/Self Aware.mp3`)},{path:`/Media/Music/Self Aware Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:a(`assets/Music/Self_Aware_icon.jpg`)}],he=[],T=[pe],E=[...me,...he];function D(e){let t=e.split(`?`)[0]?.toLowerCase()??``;return t.endsWith(`.svg`)?{extension:`svg`,mimeType:`image/svg+xml`}:t.endsWith(`.png`)?{extension:`png`,mimeType:`image/png`}:(t.endsWith(`.jpg`)||t.endsWith(`.jpeg`),{extension:`jpg`,mimeType:`image/jpeg`})}var O=Date.now(),k=e=>({kind:`directory`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:O,updatedAt:O}),A=(e,t,n,r)=>({kind:`file`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??e,extension:t,mimeType:n,createdAt:O,updatedAt:O,...r}),ge=`# About Taaniel

${i.intro}

## Current context

${i.current}

## Strengths

${o.map(e=>`- ${e}`).join(`
`)}

## Availability

${i.availability}
`,_e=`# Contact

- **Email:** ${i.emailText}
- **Phone:** ${i.phoneText}
- **Location:** ${i.location}

## Links

${t.map(e=>`- [${e.label}](${e.url})`).join(`
`)}
`,ve=`export const portfolioPositioning = {
  shell: "browser desktop as technical sample",
  fastPath: "/portfolio for recruiters",
  focus: ["React", "TypeScript", "UI systems", "design-to-code"],
};
`,ye="# Media folders\n\n- `/Media/Photography` is seeded from `public/assets/Photography`.\n- `/Media/Music` is seeded from `public/assets/Music`.\n- Campaign materials are not bundled in this public portfolio.\n",be=`# Building a Portfolio OS

Turning a portfolio into a desktop-style product changes the expectation from "scroll and skim" to "explore and inspect".

## Why it matters

- It demonstrates interface architecture, not just visual taste.
- It shows how content can live inside a system instead of beside it.
- It gives recruiters more than screenshots. They can try the window manager and file explorer.
`,xe=`# Frontend Notes

## Principles I care about

- Interface clarity before visual noise
- Motion that explains state, not motion for its own sake
- Design systems that still feel authored
- Fast iteration from concept to implementation

## What this OS portfolio is trying to prove

That frontend craft can be expressive, technical, and recruiter-friendly at the same time.
`,Se=`# Taaniel OS — Case study

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
`,Ce=`# Apps catalog

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
`,j=()=>{let t={"/":k(`/`),"/Desktop":k(`/Desktop`),"/Documents":k(`/Documents`),[s]:k(s),"/Users":k(`/Users`),"/Users/Public":k(`/Users/Public`),"/Users/Public/Blog":k(`/Users/Public/Blog`),"/Portfolio":k(`/Portfolio`),"/Portfolio/Case Studies":k(`/Portfolio/Case Studies`),"/Media":k(`/Media`),"/Media/Music":k(`/Media/Music`),"/Media/Photography":k(`/Media/Photography`),"/Media/Videos":k(`/Media/Videos`),"/Code":k(`/Code`)};return T.forEach(e=>{t[e]=k(e)}),t[`${s}/${l}`]=A(`${s}/${l}`,`txt`,`text/plain`,{content:d}),t[`/Portfolio/About.md`]=A(`/Portfolio/About.md`,`md`,`text/markdown`,{content:ge}),t[`/Portfolio/Contact.md`]=A(`/Portfolio/Contact.md`,`md`,`text/markdown`,{content:_e}),t[`/Portfolio/OS-Case-Study.md`]=A(`/Portfolio/OS-Case-Study.md`,`md`,`text/markdown`,{content:Se}),t[`/Portfolio/Apps.md`]=A(`/Portfolio/Apps.md`,`md`,`text/markdown`,{content:Ce}),t[`/Code/portfolio-positioning.ts`]=A(`/Code/portfolio-positioning.ts`,`ts`,`text/typescript`,{content:ve}),t[`/Users/Public/Blog/Building-a-Portfolio-OS.md`]=A(`/Users/Public/Blog/Building-a-Portfolio-OS.md`,`md`,`text/markdown`,{content:be}),t[`/Users/Public/Blog/Frontend-Notes.md`]=A(`/Users/Public/Blog/Frontend-Notes.md`,`md`,`text/markdown`,{content:xe}),t[`/Users/Public/README.md`]=A(`/Users/Public/README.md`,`md`,`text/markdown`,{content:ye}),t[`/Documents/Taaniel-Vananurm-CV.pdf`]=A(`/Documents/Taaniel-Vananurm-CV.pdf`,`pdf`,`application/pdf`,{source:n,readonly:!0}),r.forEach(e=>{let n=`/Portfolio/Case Studies/${e.title}`;t[n]=k(n);let r=[e.problem?`## Problem\n\n${e.problem}`:``,e.architecture?.length?`## Architecture\n\n${e.architecture.map(e=>`### ${e.title}\n\n${e.body}`).join(`

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
`});let i=D(e.hero);t[`${n}/Hero.${i.extension}`]=A(`${n}/Hero.${i.extension}`,i.extension,i.mimeType,{source:e.hero,readonly:!0}),e.layouts.forEach((e,r)=>{let i=D(e);t[`${n}/Layout-${r+1}.${i.extension}`]=A(`${n}/Layout-${r+1}.${i.extension}`,i.extension,i.mimeType,{source:e,readonly:!0})})}),e.forEach(e=>{let n=e.src.endsWith(`.png`)?`png`:`jpg`;t[`/Media/Photography/${e.title}.${n}`]=A(`/Media/Photography/${e.title}.${n}`,n,n===`png`?`image/png`:`image/jpeg`,{source:e.src,readonly:!0})}),E.forEach(e=>{t[e.path]=A(e.path,e.extension,e.mimeType,{source:e.source,readonly:!0})}),t},M=`taaniel-os-filesystem-v1`;function N(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function P(e){let t=N(e);if(t===`/`)return`/`;let n=t.split(`/`).filter(Boolean);return n.length<=1?`/`:`/${n.slice(0,-1).join(`/`)}`}function F(e){let t=N(e);return t===`/`?`/`:t.split(`/`).filter(Boolean).at(-1)??t}function I(...e){return N(e.join(`/`))}function L(e,t){return e[N(t)]}function R(e){return e.kind===`directory`?{path:e.path,name:e.name,type:`folder`,createdAt:e.createdAt,updatedAt:e.updatedAt}:{path:e.path,name:e.name,type:`file`,mimeType:e.mimeType,content:e.content,createdAt:e.createdAt,updatedAt:e.updatedAt,extension:e.extension,source:e.source,size:e.size,readonly:e.readonly}}function we(e,t){return z(e,t).map(R)}function Te(e,t){let n=L(e,t);return!n||n.kind!==`file`?null:R(n)}function z(e,t){let n=N(t);return Object.values(e).filter(e=>e.path!==n&&P(e.path)===n).sort(Ee)}function B(e,t){let n=N(t);return Object.values(e).filter(e=>e.path===n||e.path.startsWith(`${n}/`)).sort((e,t)=>e.path.length-t.path.length)}function Ee(e,t){return e.kind===t.kind?e.name.localeCompare(t.name):e.kind===`directory`?-1:1}function V(e,t){return B(e,t).some(e=>e.kind===`file`&&!!e.readonly)}function H(e,t,n){let r=new Set(z(e,t).map(e=>e.name));if(!r.has(n))return n;let i=n.split(`.`),a=i.length>1?`.${i.pop()}`:``,o=i.join(`.`)||n.replace(a,``),s=1,c=`${o} ${s}${a}`;for(;r.has(c);)s+=1,c=`${o} ${s}${a}`;return c}function De(e,t,n={}){let r=N(t);if(r===`/`||e[r])return{nodes:e,path:r};let i=P(r),a=e[i];if(!a||a.kind!==`directory`)return{nodes:e,path:r};let o=F(r),s=n.uniqueName?H(e,i,o):o,c=I(i,s),l=Date.now(),u={kind:`directory`,path:c,name:s,createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Oe(e,t,n=`New Folder`){let r=N(t),i=H(e,r,n),a=I(r,i),o=Date.now(),s={kind:`directory`,path:a,name:i,createdAt:o,updatedAt:o};return{...e,[a]:s}}function U(e,t,n=`New Note.txt`,r=``){let i=N(t),a=H(e,i,n),o=I(i,a),s=a.split(`.`).pop()?.toLowerCase()??`txt`,c=s===`md`?`text/markdown`:`text/plain`,l=Date.now(),u={kind:`file`,path:o,name:a,extension:s,mimeType:c,content:r,createdAt:l,updatedAt:l};return{...e,[o]:u}}function ke(e,t,n,r={}){let i=N(t),a=e[i];if(a?.kind===`file`)return a.readonly?{nodes:e,path:i}:r.source||a.source?{nodes:q(e,i,r.source??String(n),{mimeType:r.mimeType,extension:r.extension}),path:i}:{nodes:W(e,i,String(n)),path:i};let o=P(i),s=e[o];if(!s||s.kind!==`directory`)return{nodes:e,path:i};let c=F(i),l=r.uniqueName?H(e,o,c):c,u=I(o,l),d=r.extension??l.split(`.`).pop()?.toLowerCase()??`txt`,f=r.mimeType??v(d);return r.source||!X(f,d)?K(e,o,l,r.source??String(n),f,d):{nodes:U(e,o,l,String(n)),path:u}}function W(e,t,n){let r=N(t),i=e[r];return!i||i.kind!==`file`?e:{...e,[r]:{...i,content:n,updatedAt:Date.now()}}}function G(e){if(!e.startsWith(`data:`))return;let t=e.split(`,`)[1];if(!t)return;let n=t.replace(/\s/g,``),r=n.endsWith(`==`)?2:+!!n.endsWith(`=`);return Math.max(0,n.length*3/4-r)}function K(e,t,n,r,i,a){let o=N(t),s=H(e,o,n),c=I(o,s),l=Date.now(),u={kind:`file`,path:c,name:s,extension:a,mimeType:i,source:r,size:G(r),createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function q(e,t,n,r={}){let i=N(t),a=e[i];return!a||a.kind!==`file`||a.readonly?e:{...e,[i]:{...a,source:n,content:void 0,mimeType:r.mimeType??a.mimeType,extension:r.extension??a.extension,size:G(n),updatedAt:Date.now()}}}function J(e,t,n){let r=N(t),i=e[r];if(!i)return e;let a=P(r),o=H(e,a,n),s=I(a,o);if(s===r)return e;let c={...e};return delete c[r],c[s]={...i,path:s,name:o,updatedAt:Date.now()},i.kind===`directory`&&Object.values(e).filter(e=>e.path.startsWith(`${r}/`)).forEach(e=>{delete c[e.path];let t=e.path.replace(r,s);c[t]={...e,path:t,updatedAt:Date.now()}}),c}function Ae(e,t,n){let r=N(t);if(!e[r])return{nodes:e,path:r};let i=P(r),a=H(e,i,n),o=I(i,a);return{nodes:J(e,r,a),path:o}}function Y(e,t){let n=N(t),r={...e};return Object.keys(e).forEach(e=>{(e===n||e.startsWith(`${n}/`))&&delete r[e]}),r}function je(e,t,n,r){let i=N(t),a=N(n),o=e[i],s=e[a];if(!o||!s||s.kind!==`directory`||i===`/`||i===a||o.kind===`directory`&&a.startsWith(`${i}/`)||r===`cut`&&(V(e,i)||P(i)===a))return e;let c=I(a,H(e,a,o.name)),l=B(e,i),u=Date.now(),d={};return l.forEach(e=>{let t=e.path===i?c:e.path.replace(`${i}/`,`${c}/`);if(e.kind===`directory`){d[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,updatedAt:u};return}d[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,createdAt:r===`copy`?u:e.createdAt,updatedAt:u}}),r===`copy`?{...e,...d}:{...Y(e,i),...d}}function X(e,t){return e.startsWith(`image/`)||e.startsWith(`video/`)||e.startsWith(`audio/`)||e===`application/pdf`?!1:e.startsWith(`text/`)?!0:y(t)}function Me(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result??``)),r.onerror=()=>n(r.error??Error(`Failed to read ${e.name}`)),r.readAsDataURL(e)})}async function Ne(e,t,n){let r=N(t),i=e[r];if(!i||i.kind!==`directory`||n.length===0)return{nodes:e,importedPaths:[]};let a={...e},o=[];for(let e of n){let t=H(a,r,e.name?.trim()||`Upload-${Date.now()}`),n=I(r,t),i=t.split(`.`).pop()?.toLowerCase()??``,s=e.type||v(i),c=Date.now(),l={kind:`file`,path:n,name:t,extension:i,mimeType:s,size:e.size,createdAt:c,updatedAt:c};X(s,i)?l.content=await e.text():l.source=await Me(e),a[n]=l,o.push(n)}return{nodes:a,importedPaths:o}}async function Pe(e){let t=``,n=``;if(e.source)if(e.source.startsWith(`data:`))t=e.source;else{let r=await(await fetch(e.source)).blob();n=URL.createObjectURL(r),t=n}else n=URL.createObjectURL(new Blob([e.content??``],{type:e.mimeType||`text/plain`})),t=n;let r=document.createElement(`a`);r.href=t,r.download=e.name,r.rel=`noreferrer`,document.body.append(r),r.click(),r.remove(),n&&URL.revokeObjectURL(n)}async function Fe(){return await ue(`taaniel-os-filesystem-v1`)??j()}async function Ie(e){await de(M,e)}async function Le(){await fe(M)}var Z=`/Games/README.md`,Re=[`snake`,`tetris`],ze=[`dino`,`doom`,`hextris`],Q=`/Desktop/Welcome.md`,Be=[`/Media/Music/Studio Loop.mp3`,`/Media/Music/T-Rex Roar.mp3`],$=`/Trash`,Ve=[`/Media`,`/Media/Music`,`/Media/Photography`,$,...T],He=[...E,...e.map(e=>({path:`/Media/Photography/${e.title}.${e.src.endsWith(`.png`)?`png`:`jpg`}`,extension:e.src.endsWith(`.png`)?`png`:`jpg`,mimeType:e.src.endsWith(`.png`)?`image/png`:`image/jpeg`,source:e.src}))];function Ue(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function We(e,t){let n=Ue(e);return{kind:`directory`,path:n,name:n.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:t,updatedAt:t}}function Ge(e,t,n,r,i){let a=Ue(e);return{kind:`file`,path:a,name:a.split(`/`).filter(Boolean).at(-1)??a,extension:t,mimeType:n,source:r,readonly:!0,createdAt:i,updatedAt:i}}function Ke(e){let t=ne(e),n=t!==e,r=Date.now();return t[`/Desktop/Welcome.md`]&&(t={...t},delete t[Q],n=!0),Ve.forEach(e=>{t[e]||(t={...t,[e]:We(e,r)},n=!0)}),Be.forEach(e=>{t[e]&&(t={...t},delete t[e],n=!0)}),He.forEach(e=>{let i=t[e.path];if(!i){t={...t,[e.path]:Ge(e.path,e.extension,e.mimeType,e.source,r)},n=!0;return}i.kind===`file`&&i.readonly===!0&&(i.source!==e.source||i.extension!==e.extension||i.mimeType!==e.mimeType)&&(t={...t,[e.path]:{...i,source:e.source,extension:e.extension,mimeType:e.mimeType,updatedAt:r}},n=!0)}),(t[Z]||t[`/Games`])&&(t={...t},delete t[Z],Object.keys(t).forEach(e=>{(e===`/Games`||e.startsWith(`/Games/`))&&delete t[e]}),n=!0),n?t:e}export{W as A,d as B,je as C,Ie as D,Ae as E,ce as F,s as H,ae as I,y as L,j as M,D as N,R as O,_ as P,x as R,N as S,J as T,h as U,u as V,f as W,I as _,Re as a,Fe as b,Oe as c,Pe as d,L as f,Ne as g,V as h,ze as i,ke as j,q as k,U as l,F as m,$ as n,Le as o,P as p,Ke as r,K as s,Q as t,Y as u,z as v,Te as w,De as x,we as y,b as z};