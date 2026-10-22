import{A as e,C as t,D as n,E as r,F as i,I as a,J as o,Q as s,T as c,Z as l,ht as u,k as d,nt as f,pt as ee,qt as p,rt as m,tt as te,w as h}from"./index-LUnA3B8S.js";import{t as g}from"./toast-store-C5-hNWWL.js";var ne={".bmp":{extension:`.bmp`,openWith:`photos`,editWith:`paint`,mimeType:`image/bmp`,family:`image`,label:`Bitmap image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".gif":{extension:`.gif`,openWith:`photos`,editWith:`paint`,mimeType:`image/gif`,family:`image`,label:`GIF image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".heic":{extension:`.heic`,openWith:`photos`,mimeType:`image/heic`,family:`image`,label:`HEIC image`,capabilities:[`open`,`preview`]},".heif":{extension:`.heif`,openWith:`photos`,mimeType:`image/heif`,family:`image`,label:`HEIF image`,capabilities:[`open`,`preview`]},".ico":{extension:`.ico`,openWith:`photos`,editWith:`paint`,mimeType:`image/x-icon`,family:`image`,label:`Icon image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpg":{extension:`.jpg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpeg":{extension:`.jpeg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jxl":{extension:`.jxl`,openWith:`photos`,mimeType:`image/jxl`,family:`image`,label:`JPEG XL image`,capabilities:[`open`,`preview`]},".png":{extension:`.png`,openWith:`photos`,editWith:`paint`,mimeType:`image/png`,family:`image`,label:`PNG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".qoi":{extension:`.qoi`,openWith:`photos`,mimeType:`image/qoi`,family:`image`,label:`QOI image`,capabilities:[`open`,`preview`]},".svg":{extension:`.svg`,openWith:`editor`,editWith:`editor`,mimeType:`image/svg+xml`,family:`code`,label:`SVG document`,browserRenderable:!0,textLike:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".tif":{extension:`.tif`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".tiff":{extension:`.tiff`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".webp":{extension:`.webp`,openWith:`photos`,editWith:`paint`,mimeType:`image/webp`,family:`image`,label:`WebP image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".pdf":{extension:`.pdf`,openWith:`pdf`,mimeType:`application/pdf`,family:`document`,label:`PDF document`,capabilities:[`open`,`preview`,`print`]},".md":{extension:`.md`,openWith:`markdown`,editWith:`editor`,mimeType:`text/markdown`,family:`text`,label:`Markdown document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".txt":{extension:`.txt`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Text file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".json":{extension:`.json`,openWith:`editor`,editWith:`editor`,mimeType:`application/json`,family:`code`,label:`JSON file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".js":{extension:`.js`,openWith:`editor`,editWith:`editor`,mimeType:`text/javascript`,family:`code`,label:`JavaScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".jsx":{extension:`.jsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/jsx`,family:`code`,label:`JSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".ts":{extension:`.ts`,openWith:`editor`,editWith:`editor`,mimeType:`text/typescript`,family:`code`,label:`TypeScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".tsx":{extension:`.tsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/tsx`,family:`code`,label:`TSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".css":{extension:`.css`,openWith:`editor`,editWith:`editor`,mimeType:`text/css`,family:`code`,label:`Stylesheet`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".html":{extension:`.html`,openWith:`editor`,editWith:`editor`,mimeType:`text/html`,family:`code`,label:`HTML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".xml":{extension:`.xml`,openWith:`editor`,editWith:`editor`,mimeType:`application/xml`,family:`code`,label:`XML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yml":{extension:`.yml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yaml":{extension:`.yaml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".ps1":{extension:`.ps1`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`code`,label:`PowerShell script`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".sh":{extension:`.sh`,openWith:`editor`,editWith:`editor`,mimeType:`text/x-sh`,family:`code`,label:`Shell script`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".log":{extension:`.log`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Log file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".csv":{extension:`.csv`,openWith:`editor`,editWith:`editor`,mimeType:`text/csv`,family:`text`,label:`CSV file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".mp4":{extension:`.mp4`,openWith:`video`,mimeType:`video/mp4`,family:`video`,label:`MP4 video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mov":{extension:`.mov`,openWith:`video`,mimeType:`video/quicktime`,family:`video`,label:`QuickTime video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".webm":{extension:`.webm`,openWith:`video`,mimeType:`video/webm`,family:`video`,label:`WebM video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mp3":{extension:`.mp3`,openWith:`music`,mimeType:`audio/mpeg`,family:`audio`,label:`MP3 audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".wav":{extension:`.wav`,openWith:`music`,mimeType:`audio/wav`,family:`audio`,label:`WAV audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".zip":{extension:`.zip`,openWith:`files`,mimeType:`application/zip`,family:`other`,label:`ZIP archive`,capabilities:[`open`]},".lnk":{extension:`.lnk`,openWith:`files`,mimeType:`application/x-shortcut`,family:`other`,label:`Shortcut`,capabilities:[`open`]},".img":{extension:`.img`,openWith:`v86`,mimeType:`application/octet-stream`,family:`other`,label:`Disk image (experimental)`,capabilities:[`open`]},".iso":{extension:`.iso`,openWith:`v86`,mimeType:`application/x-iso9660-image`,family:`other`,label:`ISO image (experimental)`,capabilities:[`open`]}};function re(e){return e?e.startsWith(`.`)?e.toLowerCase():`.${e.toLowerCase()}`:``}function _(e){return ne[re(e)]}function v(e){return _(e)?.mimeType??`application/octet-stream`}function y(e){return!!_(e)?.textLike}function ie(e){let t=_(e.startsWith(`.`)?e:`.${e}`);return!!(t?.family===`image`&&t.browserRenderable)}function ae(e){return e.kind===`directory`?`files`:e.mimeType.startsWith(`image/`)?`photos`:e.mimeType.startsWith(`audio/`)?`music`:e.mimeType.startsWith(`video/`)?`video`:e.mimeType===`application/pdf`?`pdf`:`editor`}function b(t){return!t||t.kind===`directory`?`files`:e(t)?`notes`:_(t.extension)?.openWith??ae(t)}function x(t){return!t||t.kind===`directory`?null:e(t)?`notes`:_(t.extension)?.editWith??(y(t.extension)?`editor`:null)}var oe={text:[`notes`,`editor`,`markdown`],code:[`editor`],image:[`photos`,`paint`]};function se(e){if(e.kind===`directory`)return[];let t=_(e.extension),n=new Set,r=[],i=e=>{e&&!n.has(e)&&(n.add(e),r.push(e))};i(b(e)),i(x(e));for(let e of oe[t?.family??``]??[])i(e);return r}function S(e){return new Promise((t,n)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>n(e.error)})}function ce(e,t){let n,r=()=>{if(n)return n;let r=indexedDB.open(e);return r.onupgradeneeded=()=>r.result.createObjectStore(t),n=S(r),n.then(e=>{e.onclose=()=>n=void 0},()=>{}),n};return(e,n)=>r().then(r=>n(r.transaction(t,e).objectStore(t)))}var C;function w(){return C||=ce(`keyval-store`,`keyval`),C}function le(e,t=w()){return t(`readonly`,t=>S(t.get(e)))}function ue(e,t,n=w()){return n(`readwrite`,n=>(n.put(t,e),S(n.transaction)))}function de(e,t=w()){return t(`readwrite`,t=>(t.delete(e),S(t.transaction)))}function T(e){let t=e.split(`?`)[0]?.toLowerCase()??``;return t.endsWith(`.svg`)?{extension:`svg`,mimeType:`image/svg+xml`}:t.endsWith(`.png`)?{extension:`png`,mimeType:`image/png`}:(t.endsWith(`.jpg`)||t.endsWith(`.jpeg`),{extension:`jpg`,mimeType:`image/jpeg`})}var E=Date.now(),D=e=>({kind:`directory`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:E,updatedAt:E}),O=(e,t,n,r)=>({kind:`file`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??e,extension:t,mimeType:n,createdAt:E,updatedAt:E,...r}),fe=`# About Taaniel

${s.intro}

## Current context

${s.current}

## Strengths

${f.map(e=>`- ${e}`).join(`
`)}

## Availability

${s.availability}
`,pe=`# Contact

- **Email:** ${s.emailText}
- **Phone:** ${s.phoneText}
- **Location:** ${s.location}

## Links

${m.map(e=>`- [${e.label}](${e.url})`).join(`
`)}
`,me=`export const portfolioPositioning = {
  shell: "browser desktop as technical sample",
  fastPath: "/portfolio for recruiters",
  focus: ["React", "TypeScript", "UI systems", "design-to-code"],
};
`,he="# Media folders\n\n- `/Media/Photography` is seeded from `public/assets/Photography`.\n- `/Media/Music` is seeded from `public/assets/Music`.\n- Campaign materials are not bundled in this public portfolio.\n",ge=`# Building a Portfolio OS

Turning a portfolio into a desktop-style product changes the expectation from "scroll and skim" to "explore and inspect".

## Why it matters

- It demonstrates interface architecture, not just visual taste.
- It shows how content can live inside a system instead of beside it.
- It gives recruiters more than screenshots. They can try the window manager and file explorer.
`,_e=`# Frontend Notes

## Principles I care about

- Interface clarity before visual noise
- Motion that explains state, not motion for its own sake
- Design systems that still feel authored
- Fast iteration from concept to implementation

## What this OS portfolio is trying to prove

That frontend craft can be expressive, technical, and recruiter-friendly at the same time.
`,ve=`# Taaniel OS — Case study

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
`,ye=`# Apps catalog

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
`,k=()=>{let e={"/":D(`/`),"/Desktop":D(`/Desktop`),"/Documents":D(`/Documents`),[d]:D(d),"/Users":D(`/Users`),"/Users/Public":D(`/Users/Public`),"/Users/Public/Blog":D(`/Users/Public/Blog`),"/Portfolio":D(`/Portfolio`),"/Portfolio/Case Studies":D(`/Portfolio/Case Studies`),"/Media":D(`/Media`),"/Media/Music":D(`/Media/Music`),"/Media/Photography":D(`/Media/Photography`),"/Media/Videos":D(`/Media/Videos`),"/Code":D(`/Code`)};return a.forEach(t=>{e[t]=D(t)}),e[`${d}/${n}`]=O(`${d}/${n}`,`txt`,`text/plain`,{content:r}),e[`/Portfolio/About.md`]=O(`/Portfolio/About.md`,`md`,`text/markdown`,{content:fe}),e[`/Portfolio/Contact.md`]=O(`/Portfolio/Contact.md`,`md`,`text/markdown`,{content:pe}),e[`/Portfolio/OS-Case-Study.md`]=O(`/Portfolio/OS-Case-Study.md`,`md`,`text/markdown`,{content:ve}),e[`/Portfolio/Apps.md`]=O(`/Portfolio/Apps.md`,`md`,`text/markdown`,{content:ye}),e[`/Code/portfolio-positioning.ts`]=O(`/Code/portfolio-positioning.ts`,`ts`,`text/typescript`,{content:me}),e[`/Users/Public/Blog/Building-a-Portfolio-OS.md`]=O(`/Users/Public/Blog/Building-a-Portfolio-OS.md`,`md`,`text/markdown`,{content:ge}),e[`/Users/Public/Blog/Frontend-Notes.md`]=O(`/Users/Public/Blog/Frontend-Notes.md`,`md`,`text/markdown`,{content:_e}),e[`/Users/Public/README.md`]=O(`/Users/Public/README.md`,`md`,`text/markdown`,{content:he}),e[`/Documents/Taaniel-Vananurm-CV.pdf`]=O(`/Documents/Taaniel-Vananurm-CV.pdf`,`pdf`,`application/pdf`,{source:te,readonly:!0}),o.forEach(t=>{let n=`/Portfolio/Case Studies/${t.title}`;e[n]=D(n);let r=[t.problem?`## Problem\n\n${t.problem}`:``,t.architecture?.length?`## Architecture\n\n${t.architecture.map(e=>`### ${e.title}\n\n${e.body}`).join(`

`)}`:``,t.technicalHighlights?.length?`## Technical highlights\n\n${t.technicalHighlights.map(e=>`- ${e}`).join(`
`)}`:``,t.challengesAndTradeoffs?`## Challenges and tradeoffs\n\n${t.challengesAndTradeoffs}`:``,t.whatILearned?`## What I learned\n\n${t.whatILearned}`:``,t.measurableOutcome?`## Measurable outcome\n\n${t.measurableOutcome}`:``,t.liveUrl?`## Live\n\n${t.liveUrl}`:``,t.repoUrl?`## Repository\n\n${t.repoUrl}`:``].filter(Boolean).join(`

`);e[`${n}/Overview.md`]=O(`${n}/Overview.md`,`md`,`text/markdown`,{content:`# ${t.title}

## Type

${t.type}

## Role

${t.role}

## One-line summary

${t.oneLiner}

## Challenge

${t.challenge}

## Outcome

${t.outcome}

${r?`${r}\n\n`:``}## Stack

${t.stack.map(e=>`- ${e}`).join(`
`)}
`});let i=T(t.hero);e[`${n}/Hero.${i.extension}`]=O(`${n}/Hero.${i.extension}`,i.extension,i.mimeType,{source:t.hero,readonly:!0}),t.layouts.forEach((t,r)=>{let i=T(t);e[`${n}/Layout-${r+1}.${i.extension}`]=O(`${n}/Layout-${r+1}.${i.extension}`,i.extension,i.mimeType,{source:t,readonly:!0})})}),l.forEach(t=>{let n=t.src.endsWith(`.png`)?`png`:`jpg`;e[`/Media/Photography/${t.title}.${n}`]=O(`/Media/Photography/${t.title}.${n}`,n,n===`png`?`image/png`:`image/jpeg`,{source:t.src,readonly:!0})}),i.forEach(t=>{e[t.path]=O(t.path,t.extension,t.mimeType,{source:t.source,readonly:!0})}),e},A=`taaniel-os-filesystem-v1`;function j(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function M(e){let t=j(e);if(t===`/`)return`/`;let n=t.split(`/`).filter(Boolean);return n.length<=1?`/`:`/${n.slice(0,-1).join(`/`)}`}function N(e){let t=j(e);return t===`/`?`/`:t.split(`/`).filter(Boolean).at(-1)??t}function P(...e){return j(e.join(`/`))}function F(e,t){return e[j(t)]}function I(e){return e.kind===`directory`?{path:e.path,name:e.name,type:`folder`,createdAt:e.createdAt,updatedAt:e.updatedAt,originalPath:e.originalPath,deletedAt:e.deletedAt}:{path:e.path,name:e.name,type:`file`,mimeType:e.mimeType,content:e.content,createdAt:e.createdAt,updatedAt:e.updatedAt,extension:e.extension,source:e.source,size:e.size,readonly:e.readonly,originalPath:e.originalPath,deletedAt:e.deletedAt,shortcut:e.shortcut}}function L(e,t){return R(e,t).map(I)}function be(e,t){let n=F(e,t);return!n||n.kind!==`file`?null:I(n)}function R(e,t){let n=j(t);return Object.values(e).filter(e=>e.path!==n&&M(e.path)===n).sort(xe)}function z(e,t){let n=j(t);return Object.values(e).filter(e=>e.path===n||e.path.startsWith(`${n}/`)).sort((e,t)=>e.path.length-t.path.length)}function xe(e,t){return e.kind===t.kind?e.name.localeCompare(t.name):e.kind===`directory`?-1:1}function Se(e,t){return z(e,t).some(e=>e.kind===`file`&&!!e.readonly)}function B(e){return t.has(j(e))}function V(e,t){return B(t)||Se(e,t)}function H(e,t){let n=e.lastIndexOf(`.`);return!t&&n>0?{stem:e.slice(0,n),extension:e.slice(n)}:{stem:e,extension:``}}function U(e,t,n,r=!1,i){let a=new Set(R(e,t).filter(e=>e.path!==i).map(e=>e.name.toLowerCase()));if(!a.has(n.toLowerCase()))return n;let{stem:o,extension:s}=H(n,r),c=o.replace(/ \(\d+\)$/,``),l=2;for(;a.has(`${c} (${l})${s}`.toLowerCase());)l+=1;return`${c} (${l})${s}`}function W(e,t,n,r){let{stem:i,extension:a}=H(n,r);return U(e,t,`${i} - Copy${a}`,r)}function G(e,t,n={}){let r=j(t);if(r===`/`||e[r])return{nodes:e,path:r};let i=M(r),a=e[i];if(!a||a.kind!==`directory`)return{nodes:e,path:r};let o=N(r),s=n.uniqueName?U(e,i,o,!0):o,c=P(i,s),l=Date.now(),u={kind:`directory`,path:c,name:s,createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Ce(e,t,n=`New folder`){let r=j(t),i=U(e,r,n,!0),a=P(r,i),o=Date.now(),s={kind:`directory`,path:a,name:i,createdAt:o,updatedAt:o};return{...e,[a]:s}}function K(e,t,n=`New Text Document.txt`,r=``){let i=j(t),a=U(e,i,n),o=P(i,a),s=a.split(`.`).pop()?.toLowerCase()??`txt`,c=s===`md`?`text/markdown`:`text/plain`,l=Date.now(),u={kind:`file`,path:o,name:a,extension:s,mimeType:c,content:r,createdAt:l,updatedAt:l};return{...e,[o]:u}}function we(e,t,n,r={}){let i=j(t),a=e[i];if(a?.kind===`file`)return a.readonly?{nodes:e,path:i}:r.source||a.source?{nodes:Ee(e,i,r.source??String(n),{mimeType:r.mimeType,extension:r.extension}),path:i}:{nodes:q(e,i,String(n)),path:i};let o=M(i),s=e[o];if(!s||s.kind!==`directory`)return{nodes:e,path:i};let c=N(i),l=r.uniqueName?U(e,o,c):c,u=P(o,l),d=r.extension??l.split(`.`).pop()?.toLowerCase()??`txt`,f=r.mimeType??v(d);return r.source||!Z(f,d)?Te(e,o,l,r.source??String(n),f,d):{nodes:K(e,o,l,String(n)),path:u}}function q(e,t,n){let r=j(t),i=e[r];return!i||i.kind!==`file`?e:{...e,[r]:{...i,content:n,updatedAt:Date.now()}}}function J(e){if(!e.startsWith(`data:`))return;let t=e.split(`,`)[1];if(!t)return;let n=t.replace(/\s/g,``),r=n.endsWith(`==`)?2:+!!n.endsWith(`=`);return Math.max(0,n.length*3/4-r)}function Te(e,t,n,r,i,a){let o=j(t),s=U(e,o,n),c=P(o,s),l=Date.now(),u={kind:`file`,path:c,name:s,extension:a,mimeType:i,source:r,size:J(r),createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Ee(e,t,n,r={}){let i=j(t),a=e[i];return!a||a.kind!==`file`||a.readonly?e:{...e,[i]:{...a,source:n,content:void 0,mimeType:r.mimeType??a.mimeType,extension:r.extension??a.extension,size:J(n),updatedAt:Date.now()}}}function De(e,t,n){let r=j(t),i=e[r];if(!i||B(r))return e;let a=M(r),o=U(e,a,n,i.kind===`directory`,r),s=P(a,o);if(s===r)return e;let c={...e};return delete c[r],c[s]={...i,path:s,name:o,updatedAt:Date.now()},i.kind===`directory`&&Object.values(e).filter(e=>e.path.startsWith(`${r}/`)).forEach(e=>{delete c[e.path];let t=e.path.replace(r,s);c[t]={...e,path:t,updatedAt:Date.now()}}),c}function Oe(e,t,n){let r=j(t),i=e[r];if(!i||B(r))return{nodes:e,path:r};let a=M(r),o=U(e,a,n,i.kind===`directory`,r),s=P(a,o);return{nodes:De(e,r,o),path:s}}function ke(e,t,n){let r=j(t),i=e[r];if(!i||M(r)!==j(n))return{nodes:e,path:null};let a=j(i.originalPath??`/Desktop/${i.name}`),o=M(a),s=e,c=``;for(let t of o.split(`/`).filter(Boolean)){c=`${c}/${t}`;let n=s[c];if(!n)s=G(s,c).nodes;else if(n.kind!==`directory`)return{nodes:e,path:null}}let l=U(s,o,N(a),i.kind===`directory`),u=P(o,l),d=Date.now(),f={};return z(s,r).forEach(e=>{let t=e.path===r?u:e.path.replace(`${r}/`,`${u}/`),{originalPath:n,deletedAt:i,...a}=e;f[t]={...a,path:t,name:t===u?l:a.name,updatedAt:d}}),{nodes:{...Y(s,r),...f},path:u}}function Y(e,t){let n=j(t),r={...e};return Object.keys(e).forEach(e=>{(e===n||e.startsWith(`${n}/`))&&delete r[e]}),r}function X(e,t,n,r){let i=j(t),a=j(n),o=e[i],s=e[a];if(!o||!s||s.kind!==`directory`||i===`/`||i===a||o.kind===`directory`&&a.startsWith(`${i}/`)||r===`cut`&&(V(e,i)||M(i)===a))return e;let c=o.kind===`directory`,l=P(a,r===`copy`&&M(i)===a?W(e,a,o.name,c):U(e,a,o.name,c)),u=z(e,i),d=Date.now(),f={};return u.forEach(e=>{let t=e.path===i?l:e.path.replace(`${i}/`,`${l}/`);if(e.kind===`directory`){f[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,updatedAt:d};return}let n={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,createdAt:r===`copy`?d:e.createdAt,updatedAt:d};r===`copy`&&delete n.readonly,f[t]=n}),r===`copy`?{...e,...f}:{...Y(e,i),...f}}function Ae(e){let t=Array.from(new Set(e.map(j)));return t.filter(e=>!t.some(t=>t!==e&&e.startsWith(`${t}/`)))}function je(e){let{originalPath:t,deletedAt:n,...r}=e;return r}function Me(e,t,n,r,i={}){let a=j(n),o=i.trashPath?j(i.trashPath):null,s=i.now??Date.now(),c=[],l=[],d=e[a],f=o!==null&&a===o,p=e;if(!d||d.kind!==`directory`)return{nodes:e,transferred:c,skipped:t.map(e=>({path:j(e),reason:`not-allowed`}))};for(let e of Ae(t)){let t=p[e];if(!t||e===`/`){l.push({path:e,reason:`missing`});continue}if(r!==`link`&&(e===a||a.startsWith(`${e}/`))){l.push({path:e,reason:`into-itself`});continue}if(f&&r!==`move`){l.push({path:e,reason:`not-allowed`});continue}if(r===`link`){let n=t.kind===`file`&&t.shortcut?t.shortcut:{type:`path`,path:e},r=P(a,U(p,a,u(t.name,!!(t.kind===`file`&&t.shortcut))));p={...p,[r]:ee(r,n,s)},c.push({from:e,to:r});continue}if(r===`move`&&V(p,e)){l.push({path:e,reason:`locked`});continue}if(r===`move`&&M(e)===a){l.push({path:e,reason:`same-folder`});continue}let n=t.kind===`directory`,i=P(a,r===`copy`&&M(e)===a?W(p,a,t.name,n):U(p,a,t.name,n)),d=X(p,e,a,r===`move`?`cut`:`copy`);if(d===p||!d[i]){l.push({path:e,reason:`not-allowed`});continue}let m=o!==null&&M(e)===o&&!f;p={...d,[i]:f?{...d[i],originalPath:e,deletedAt:s}:m||r===`copy`?je(d[i]):d[i]},c.push({from:e,to:i})}return{nodes:p,transferred:c,skipped:l}}function Z(e,t){return e.startsWith(`image/`)||e.startsWith(`video/`)||e.startsWith(`audio/`)||e===`application/pdf`?!1:e.startsWith(`text/`)?!0:y(t)}function Ne(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result??``)),r.onerror=()=>n(r.error??Error(`Failed to read ${e.name}`)),r.readAsDataURL(e)})}async function Pe(e,t,n){let r=j(t),i=e[r];if(!i||i.kind!==`directory`||n.length===0)return{nodes:e,importedPaths:[]};let a={...e},o=[];for(let e of n){let t=U(a,r,e.name?.trim()||`Upload-${Date.now()}`),n=P(r,t),i=t.split(`.`).pop()?.toLowerCase()??``,s=e.type||v(i),c=Date.now(),l={kind:`file`,path:n,name:t,extension:i,mimeType:s,size:e.size,createdAt:c,updatedAt:c};Z(s,i)?l.content=await e.text():l.source=await Ne(e),a[n]=l,o.push(n)}return{nodes:a,importedPaths:o}}async function Fe(e){let t=``,n=``;if(e.source)if(e.source.startsWith(`data:`))t=e.source;else{let r=await(await fetch(e.source)).blob();n=URL.createObjectURL(r),t=n}else n=URL.createObjectURL(new Blob([e.content??``],{type:e.mimeType||`text/plain`})),t=n;let r=document.createElement(`a`);r.href=t,r.download=e.name,r.rel=`noreferrer`,document.body.append(r),r.click(),r.remove(),n&&URL.revokeObjectURL(n)}async function Ie(){return await le(`taaniel-os-filesystem-v1`)??k()}async function Le(e){await ue(A,e)}async function Re(){await de(A)}var ze={"/Portfolio/About.md":`a78665400474a3cfa730d635977ac20c054d5cecad352a69be9362dac8ad5917`,"/Portfolio/Contact.md":`4312888197a3f21ffd6a718f0b0a16f47f8652236fe5ec5eef1da3f0c4cf4731`,"/Portfolio/OS-Case-Study.md":`ecb7684d5ebd72015c7abb1d21552eb08247a825858ec76158cbb875a3fa5f29`,"/Portfolio/Apps.md":`ce2ac94db35a29a0a420b58d896cca865f4561ac751ef47f252e351298e1a6da`,"/Portfolio/Case Studies/Fintech Email Campaign (0% Offer)/Overview.md":`e771883725dc72afb4e90fc7400daefe6bf747105a3153dd52d72f030112cce5`,"/Portfolio/Case Studies/Fast-Loan Hero + Template/Overview.md":`517c2589d4ced612cf4f5d2783d86a7355108e5092dd5a63637d7cfe3afc8a16`,"/Portfolio/Case Studies/Mascot-Driven Email Campaign/Overview.md":`82343b3cc3b2945bfddf043c2d825555c460f128e285190ecceb87a1b7ba7a5f`};async function Be(e){let t=k(),n={...e},r=!1;for(let[e,i]of Object.entries(n)){if(i.kind!==`file`)continue;if(i.readonly&&i.source?.includes(`/assets/Work/`)){delete n[e],r=!0;continue}if(!ze[e]||!i.content||!globalThis.crypto?.subtle)continue;let a=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(i.content));if(Array.from(new Uint8Array(a),e=>e.toString(16).padStart(2,`0`)).join(``)!==ze[e])continue;let o=t[e]??{...i,content:`# Campaign work

This material is no longer included in the public portfolio. See the Fiizy internship summary on the portfolio page.`};JSON.stringify(o)!==JSON.stringify(i)&&(n[e]=o,r=!0)}for(let[e,i]of Object.entries(t))(e===`/Portfolio`||e.startsWith(`/Portfolio/`))&&!n[e]&&(n[e]=i,r=!0);return r?n:e}function Ve(e,t,n){let r=e.transferred.length,i=e=>e===1?`1 item`:`${e} items`;if(r>0){let a=e.skipped.filter(e=>e.reason===`locked`).length,o=e=>a>0?`${e}. ${a===1?`1 read-only item was`:`${a} read-only items were`} left in place`:e;return n?{text:o(r===1?`Moved to Recycle Bin`:`Moved ${i(r)} to the Recycle Bin`),tone:`success`}:t===`link`?{text:r===1?`Shortcut created`:`Created ${r} shortcuts`,tone:`success`}:{text:o(`${t===`move`?`Moved`:`Copied`} ${i(r)}`),tone:`success`}}let a=new Set(e.skipped.map(e=>e.reason));return a.has(`into-itself`)?{text:`The destination folder is a subfolder of the source folder`,tone:`error`}:a.has(`locked`)?{text:`This item is read-only and can't be moved`,tone:`error`}:null}var Q=new Set;function He(e){return Q.add(e),()=>{Q.delete(e)}}function Ue(e){e.length>0&&Q.forEach(t=>t(e))}async function $(e){try{await Le(e)}catch{}}var We=p((e,t)=>({nodes:{},initialized:!1,initialize:async()=>{if(t().initialized)return;let n;try{n=await Ie()}catch{console.warn(`[fs] IndexedDB unavailable — falling back to seed filesystem`),n=null}let r=c(n?await Be(n):k());n!==null&&r!==n&&await $(r),e({nodes:r,initialized:!0})},listDirectory:e=>L(t().nodes,e),readFile:e=>be(t().nodes,e),writeFile:async(n,r,i)=>{let a=we(t().nodes,n,r,i);return e({nodes:a.nodes}),await $(a.nodes),a.path},mkdir:async(n,r)=>{let i=G(t().nodes,n,r);return e({nodes:i.nodes}),await $(i.nodes),i.path},rename:async(n,r)=>{let i=Oe(t().nodes,n,r);return i.path!==j(n)&&Ue([{from:j(n),to:i.path}]),e({nodes:i.nodes}),await $(i.nodes),i.path},createDirectory:async(n,r)=>{let i=Ce(t().nodes,n,r);e({nodes:i}),await $(i),g(`Folder created`,`success`)},createTextFile:async(n,r,i)=>{let a=K(t().nodes,n,r,i);e({nodes:a}),await $(a)},createBinaryFile:async(n,r,i,a,o)=>{let s=Te(t().nodes,n,r,i,a,o),c=s.nodes;return e({nodes:c}),await $(c),s.path},renameNode:async(n,r)=>{let i=De(t().nodes,n,r);e({nodes:i}),await $(i)},deleteNode:async(n,r)=>{let i=n.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``);if(i===`/Trash`||i.startsWith(`/Trash/`)){let i=Y(t().nodes,n);e({nodes:i}),await $(i),r?.quiet||g(`Permanently deleted`,`success`);return}let a=t().nodes,o=X(a,n,h,`cut`);if(o===a){g(`This item is read-only and can't be deleted`,`error`);return}let s=Object.keys(o).find(e=>!(e in a)&&M(e)===`/Trash`),c=s?{...o,[s]:{...o[s],originalPath:i,deletedAt:Date.now()}}:o;e({nodes:c}),await $(c),r?.quiet||g(`Moved to Recycle Bin`,`success`)},deleteNodePermanently:async n=>{let r=t().nodes;if(V(r,n)){g(`This item is read-only and can't be deleted`,`error`);return}let i=Y(r,n);e({nodes:i}),await $(i),g(`Permanently deleted`,`success`)},restoreNode:async n=>{let r=ke(t().nodes,n,h);return r.path?(e({nodes:r.nodes}),await $(r.nodes),r.path):null},emptyTrash:async()=>{let n=t().nodes,r=Object.keys(n).filter(e=>e!==`/Trash`&&e.startsWith(`/Trash/`)&&!e.slice(7).includes(`/`));if(r.length===0){g(`The Recycle Bin is already empty`,`info`);return}let i={...n};r.forEach(e=>{Object.keys(i).forEach(t=>{(t===e||t.startsWith(`${e}/`))&&delete i[t]})}),e({nodes:i}),await $(i),g(`Recycle Bin emptied`,`success`)},updateTextFile:async(n,r)=>{let i=q(t().nodes,n,r);e({nodes:i}),await $(i)},updateBinaryFile:async(n,r,i)=>{let a=Ee(t().nodes,n,r,i);e({nodes:a}),await $(a)},pasteNode:async(n,r,i,a)=>{let o=X(t().nodes,n,r,i);e({nodes:o}),await $(o),a?.quiet||g(i===`cut`?`Moved`:`Copied`,`success`)},transferNodes:async(n,r,i,a)=>{let o=Me(t().nodes,n,r,i,{trashPath:h});if(o.transferred.length>0&&(i===`move`&&Ue(o.transferred),e({nodes:o.nodes}),await $(o.nodes)),!a?.quiet){let e=Ve(o,i,j(r)===h);e&&g(e.text,e.tone)}return o},importFiles:async(n,r)=>{let{nodes:i,importedPaths:a}=await Pe(t().nodes,n,r);return e({nodes:i}),await $(i),g(r.length===1?`Imported "${r[0].name}"`:`Imported ${r.length} files`,`success`),a},canCutNode:e=>!V(t().nodes,e),reset:async()=>{let t=c(k());e({nodes:t,initialized:!0}),await Re(),await $(t)}}));export{y as _,M as a,P as c,j as d,I as f,ie as g,se as h,F as i,R as l,_ as m,We as n,N as o,T as p,Fe as r,V as s,He as t,L as u,x as v,b as y};