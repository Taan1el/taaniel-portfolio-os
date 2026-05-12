import{d as e,f as t,m as n,n as r,o as i,s as a,u as o}from"./portfolio-C9RFC6GE.js";var s=`/Documents/Notes`,c=`/Documents`,l=`To-do list.txt`,u=`${s}/${l}`,d=`To-do list

`;function f(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function p(e,t){let n=f(e);return{kind:`directory`,path:n,name:n.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:t,updatedAt:t}}function ee(e,t,n){let r=f(e);return{kind:`file`,path:r,name:r.split(`/`).filter(Boolean).at(-1)??r,extension:`txt`,mimeType:`text/plain`,content:t,createdAt:n,updatedAt:n}}function m(e){return!!(e&&e.kind===`directory`)}function te(e){return!!(e&&e.kind===`file`&&typeof e.content==`string`)}function h(e){if(!e)return!1;let t=f(e);return t===`/Documents/Notes`||t.startsWith(`/Documents/Notes/`)}function g(e){return!!(e&&e.kind===`file`&&h(e.path))}function ne(e){let t=e,n=!1,r=Date.now();return m(t[`/Documents`])||(t={...t,[c]:p(c,r)},n=!0),m(t[`/Documents/Notes`])||(t={...t,[s]:p(s,r)},n=!0),te(t[u])||(t={...t,[u]:ee(u,d,r)},n=!0),n?t:e}var _={".bmp":{extension:`.bmp`,openWith:`photos`,editWith:`paint`,mimeType:`image/bmp`,family:`image`,label:`Bitmap image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".gif":{extension:`.gif`,openWith:`photos`,editWith:`paint`,mimeType:`image/gif`,family:`image`,label:`GIF image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".heic":{extension:`.heic`,openWith:`photos`,mimeType:`image/heic`,family:`image`,label:`HEIC image`,capabilities:[`open`,`preview`]},".heif":{extension:`.heif`,openWith:`photos`,mimeType:`image/heif`,family:`image`,label:`HEIF image`,capabilities:[`open`,`preview`]},".ico":{extension:`.ico`,openWith:`photos`,editWith:`paint`,mimeType:`image/x-icon`,family:`image`,label:`Icon image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpg":{extension:`.jpg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jpeg":{extension:`.jpeg`,openWith:`photos`,editWith:`paint`,mimeType:`image/jpeg`,family:`image`,label:`JPEG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".jxl":{extension:`.jxl`,openWith:`photos`,mimeType:`image/jxl`,family:`image`,label:`JPEG XL image`,capabilities:[`open`,`preview`]},".png":{extension:`.png`,openWith:`photos`,editWith:`paint`,mimeType:`image/png`,family:`image`,label:`PNG image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".qoi":{extension:`.qoi`,openWith:`photos`,mimeType:`image/qoi`,family:`image`,label:`QOI image`,capabilities:[`open`,`preview`]},".svg":{extension:`.svg`,openWith:`editor`,editWith:`editor`,mimeType:`image/svg+xml`,family:`code`,label:`SVG document`,browserRenderable:!0,textLike:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".tif":{extension:`.tif`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".tiff":{extension:`.tiff`,openWith:`photos`,mimeType:`image/tiff`,family:`image`,label:`TIFF image`,capabilities:[`open`,`preview`]},".webp":{extension:`.webp`,openWith:`photos`,editWith:`paint`,mimeType:`image/webp`,family:`image`,label:`WebP image`,browserRenderable:!0,capabilities:[`open`,`edit`,`preview`,`inline-preview`]},".pdf":{extension:`.pdf`,openWith:`pdf`,mimeType:`application/pdf`,family:`document`,label:`PDF document`,capabilities:[`open`,`preview`,`print`]},".md":{extension:`.md`,openWith:`markdown`,editWith:`editor`,mimeType:`text/markdown`,family:`text`,label:`Markdown document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".txt":{extension:`.txt`,openWith:`editor`,editWith:`editor`,mimeType:`text/plain`,family:`text`,label:`Text file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".json":{extension:`.json`,openWith:`editor`,editWith:`editor`,mimeType:`application/json`,family:`code`,label:`JSON file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".js":{extension:`.js`,openWith:`editor`,editWith:`editor`,mimeType:`text/javascript`,family:`code`,label:`JavaScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".jsx":{extension:`.jsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/jsx`,family:`code`,label:`JSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".ts":{extension:`.ts`,openWith:`editor`,editWith:`editor`,mimeType:`text/typescript`,family:`code`,label:`TypeScript file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".tsx":{extension:`.tsx`,openWith:`editor`,editWith:`editor`,mimeType:`text/tsx`,family:`code`,label:`TSX file`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".css":{extension:`.css`,openWith:`editor`,editWith:`editor`,mimeType:`text/css`,family:`code`,label:`Stylesheet`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".html":{extension:`.html`,openWith:`editor`,editWith:`editor`,mimeType:`text/html`,family:`code`,label:`HTML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".xml":{extension:`.xml`,openWith:`editor`,editWith:`editor`,mimeType:`application/xml`,family:`code`,label:`XML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yml":{extension:`.yml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".yaml":{extension:`.yaml`,openWith:`editor`,editWith:`editor`,mimeType:`application/yaml`,family:`code`,label:`YAML document`,textLike:!0,capabilities:[`open`,`edit`,`preview`]},".mp4":{extension:`.mp4`,openWith:`video`,mimeType:`video/mp4`,family:`video`,label:`MP4 video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mov":{extension:`.mov`,openWith:`video`,mimeType:`video/quicktime`,family:`video`,label:`QuickTime video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".webm":{extension:`.webm`,openWith:`video`,mimeType:`video/webm`,family:`video`,label:`WebM video`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".mp3":{extension:`.mp3`,openWith:`music`,mimeType:`audio/mpeg`,family:`audio`,label:`MP3 audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".wav":{extension:`.wav`,openWith:`music`,mimeType:`audio/wav`,family:`audio`,label:`WAV audio`,browserRenderable:!0,capabilities:[`open`,`preview`,`inline-preview`]},".zip":{extension:`.zip`,openWith:`files`,mimeType:`application/zip`,family:`other`,label:`ZIP archive`,capabilities:[`open`]},".img":{extension:`.img`,openWith:`v86`,mimeType:`application/octet-stream`,family:`other`,label:`Disk image (experimental)`,capabilities:[`open`]},".iso":{extension:`.iso`,openWith:`v86`,mimeType:`application/x-iso9660-image`,family:`other`,label:`ISO image (experimental)`,capabilities:[`open`]}};function v(e){return e?e.startsWith(`.`)?e.toLowerCase():`.${e.toLowerCase()}`:``}function y(e){return _[v(e)]}function b(e){return y(e)?.mimeType??`application/octet-stream`}function x(e){return!!y(e)?.textLike}function re(e){let t=y(e.startsWith(`.`)?e:`.${e}`);return!!(t?.family===`image`&&t.browserRenderable)}function ie(e){return e.kind===`directory`?`files`:e.mimeType.startsWith(`image/`)?`photos`:e.mimeType.startsWith(`audio/`)?`music`:e.mimeType.startsWith(`video/`)?`video`:e.mimeType===`application/pdf`?`pdf`:`editor`}function S(e){return!e||e.kind===`directory`?`files`:g(e)?`notes`:y(e.extension)?.openWith??ie(e)}function C(e){return!e||e.kind===`directory`?null:g(e)?`notes`:y(e.extension)?.editWith??(x(e.extension)?`editor`:null)}var ae={text:[`notes`,`editor`,`markdown`],code:[`editor`],image:[`photos`,`paint`]};function w(e){let t=new Set;for(let n of Object.values(_)){if(n.openWith===e||n.editWith===e){t.add(n.extension);continue}(ae[n.family]??[]).includes(e)&&t.add(n.extension)}return[...t].sort()}function oe(e,t){let n=v(t);return n?w(e).includes(n):!1}function se(e){if(e.kind===`directory`)return[];let t=y(e.extension),n=new Set,r=[],i=e=>{e&&!n.has(e)&&(n.add(e),r.push(e))};i(S(e)),i(C(e));for(let e of ae[t?.family??``]??[])i(e);return r}function T(e){return new Promise((t,n)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>n(e.error)})}function ce(e,t){let n,r=()=>{if(n)return n;let r=indexedDB.open(e);return r.onupgradeneeded=()=>r.result.createObjectStore(t),n=T(r),n.then(e=>{e.onclose=()=>n=void 0},()=>{}),n};return(e,n)=>r().then(r=>n(r.transaction(t,e).objectStore(t)))}var E;function D(){return E||=ce(`keyval-store`,`keyval`),E}function le(e,t=D()){return t(`readonly`,t=>T(t.get(e)))}function ue(e,t,n=D()){return n(`readwrite`,n=>(n.put(t,e),T(n.transaction)))}function de(e,t=D()){return t(`readwrite`,t=>(t.delete(e),T(t.transaction)))}var O=`/Portfolio/Workbench`,fe=[{path:`/Media/Music/Black Star.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:n(`assets/Music/Black Star.mp3`)},{path:`/Media/Music/Black Star Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Music/blackstar_img.jpg`)},{path:`/Media/Music/American Psycho.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:n(`assets/Music/American Psycho.mp3`)},{path:`/Media/Music/American Psycho Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Music/american psycho icon.jpg`)},{path:`/Media/Music/Life's Too Short.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:n(`assets/Music/Life's Too Short.mp3`)},{path:`/Media/Music/Life's Too Short Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Music/Life's Too Short icon.jpg`)},{path:`/Media/Music/Self Aware.mp3`,extension:`mp3`,mimeType:`audio/mpeg`,source:n(`assets/Music/Self Aware.mp3`)},{path:`/Media/Music/Self Aware Cover.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Music/Self_Aware_icon.jpg`)}],pe=[{path:`${O}/Group 16.png`,extension:`png`,mimeType:`image/png`,source:n(`assets/Work/Group 16.png`)},{path:`${O}/Sol Rem 1.png`,extension:`png`,mimeType:`image/png`,source:n(`assets/Work/Sol_Rem_1.png`)},{path:`${O}/Vivus Hero 202505.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Work/Vivus_hero_202505.jpg`)},{path:`${O}/Vivus OM MX Hero.jpg`,extension:`jpg`,mimeType:`image/jpeg`,source:n(`assets/Work/Vivus_om_mx_Hero.jpg`)}],k=[O],A=[...fe,...pe];function j(e){let t=e.split(`?`)[0]?.toLowerCase()??``;return t.endsWith(`.svg`)?{extension:`svg`,mimeType:`image/svg+xml`}:t.endsWith(`.png`)?{extension:`png`,mimeType:`image/png`}:(t.endsWith(`.jpg`)||t.endsWith(`.jpeg`),{extension:`jpg`,mimeType:`image/jpeg`})}var M=Date.now(),N=e=>({kind:`directory`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:M,updatedAt:M}),P=(e,t,n,r)=>({kind:`file`,path:e,name:e.split(`/`).filter(Boolean).at(-1)??e,extension:t,mimeType:n,createdAt:M,updatedAt:M,...r}),me=`# About Taaniel

${a.intro}

## Current context

${a.current}

## Strengths

${e.map(e=>`- ${e}`).join(`
`)}

## Availability

${a.availability}
`,he=`# Contact

- **Email:** ${a.emailText}
- **Phone:** ${a.phoneText}
- **Location:** ${a.location}

## Links

${t.map(e=>`- [${e.label}](${e.url})`).join(`
`)}
`,ge=`export const portfolioPositioning = {
  shell: "browser desktop as technical sample",
  fastPath: "/simple for recruiters",
  focus: ["React", "TypeScript", "UI systems", "design-to-code"],
};
`,_e="# Media folders\n\n- `/Media/Photography` is seeded from `public/assets/Photography`.\n- `/Media/Music` is seeded from `public/assets/Music`.\n- `/Portfolio/Workbench` contains workbench images you can open in the Photos app.\n",ve=`# Building a Portfolio OS

Turning a portfolio into a desktop-style product changes the expectation from "scroll and skim" to "explore and inspect".

## Why it matters

- It demonstrates interface architecture, not just visual taste.
- It shows how content can live inside a system instead of beside it.
- It gives recruiters more than screenshots. They can feel the product thinking directly.
`,ye=`# Frontend Notes

## Principles I care about

- Interface clarity before visual noise
- Motion that explains state, not motion for its own sake
- Design systems that still feel authored
- Fast iteration from concept to implementation

## What this OS portfolio is trying to prove

That frontend craft can be expressive, technical, and recruiter-friendly at the same time.
`,be=`# Taaniel OS — Case study

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

- **Browser-only** (GitHub Pages friendly): no server runtime, everything is client-side.
- **Embedded browser** uses iframes: some sites block embedding via CSP/X-Frame-Options; fallback UI is shown instead.
- **Performance**: heavy apps/workers are lazy-loaded to keep first paint fast.

## How to evaluate it quickly (30 seconds)

1. Open **Start menu** → type in search → launch an app.
2. Open **Files** → browse \`/Portfolio/Case Studies\`.
3. Open **Photos** and zoom/pan.
`,xe=`# Apps catalog

This OS is a portfolio, so each app is included to demonstrate a specific UI/system skill.

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
`,F=()=>{let e={"/":N(`/`),"/Desktop":N(`/Desktop`),"/Documents":N(`/Documents`),[s]:N(s),"/Users":N(`/Users`),"/Users/Public":N(`/Users/Public`),"/Users/Public/Blog":N(`/Users/Public/Blog`),"/Portfolio":N(`/Portfolio`),"/Portfolio/Case Studies":N(`/Portfolio/Case Studies`),"/Media":N(`/Media`),"/Media/Music":N(`/Media/Music`),"/Media/Photography":N(`/Media/Photography`),"/Media/Videos":N(`/Media/Videos`),"/Code":N(`/Code`)};return k.forEach(t=>{e[t]=N(t)}),e[`${s}/${l}`]=P(`${s}/${l}`,`txt`,`text/plain`,{content:d}),e[`/Portfolio/About.md`]=P(`/Portfolio/About.md`,`md`,`text/markdown`,{content:me}),e[`/Portfolio/Contact.md`]=P(`/Portfolio/Contact.md`,`md`,`text/markdown`,{content:he}),e[`/Portfolio/OS-Case-Study.md`]=P(`/Portfolio/OS-Case-Study.md`,`md`,`text/markdown`,{content:be}),e[`/Portfolio/Apps.md`]=P(`/Portfolio/Apps.md`,`md`,`text/markdown`,{content:xe}),e[`/Code/portfolio-positioning.ts`]=P(`/Code/portfolio-positioning.ts`,`ts`,`text/typescript`,{content:ge}),e[`/Users/Public/Blog/Building-a-Portfolio-OS.md`]=P(`/Users/Public/Blog/Building-a-Portfolio-OS.md`,`md`,`text/markdown`,{content:ve}),e[`/Users/Public/Blog/Frontend-Notes.md`]=P(`/Users/Public/Blog/Frontend-Notes.md`,`md`,`text/markdown`,{content:ye}),e[`/Users/Public/README.md`]=P(`/Users/Public/README.md`,`md`,`text/markdown`,{content:_e}),e[`/Documents/Taaniel-Vananurm-CV.pdf`]=P(`/Documents/Taaniel-Vananurm-CV.pdf`,`pdf`,`application/pdf`,{source:o,readonly:!0}),r.forEach(t=>{let n=`/Portfolio/Case Studies/${t.title}`;e[n]=N(n);let r=[t.problem?`## Problem\n\n${t.problem}`:``,t.architecture?.length?`## Architecture\n\n${t.architecture.map(e=>`### ${e.title}\n\n${e.body}`).join(`

`)}`:``,t.technicalHighlights?.length?`## Technical highlights\n\n${t.technicalHighlights.map(e=>`- ${e}`).join(`
`)}`:``,t.challengesAndTradeoffs?`## Challenges and tradeoffs\n\n${t.challengesAndTradeoffs}`:``,t.whatILearned?`## What I learned\n\n${t.whatILearned}`:``,t.measurableOutcome?`## Measurable outcome\n\n${t.measurableOutcome}`:``,t.liveUrl?`## Live\n\n${t.liveUrl}`:``,t.repoUrl?`## Repository\n\n${t.repoUrl}`:``].filter(Boolean).join(`

`);e[`${n}/Overview.md`]=P(`${n}/Overview.md`,`md`,`text/markdown`,{content:`# ${t.title}

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
`});let i=j(t.hero);e[`${n}/Hero.${i.extension}`]=P(`${n}/Hero.${i.extension}`,i.extension,i.mimeType,{source:t.hero,readonly:!0}),t.layouts.forEach((t,r)=>{let i=j(t);e[`${n}/Layout-${r+1}.${i.extension}`]=P(`${n}/Layout-${r+1}.${i.extension}`,i.extension,i.mimeType,{source:t,readonly:!0})})}),i.forEach(t=>{let n=t.src.endsWith(`.png`)?`png`:`jpg`;e[`/Media/Photography/${t.title}.${n}`]=P(`/Media/Photography/${t.title}.${n}`,n,n===`png`?`image/png`:`image/jpeg`,{source:t.src,readonly:!0})}),A.forEach(t=>{e[t.path]=P(t.path,t.extension,t.mimeType,{source:t.source,readonly:!0})}),e},I=`taaniel-os-filesystem-v1`;function L(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function R(e){let t=L(e);if(t===`/`)return`/`;let n=t.split(`/`).filter(Boolean);return n.length<=1?`/`:`/${n.slice(0,-1).join(`/`)}`}function z(e){let t=L(e);return t===`/`?`/`:t.split(`/`).filter(Boolean).at(-1)??t}function B(...e){return L(e.join(`/`))}function V(e,t){return e[L(t)]}function H(e){return e.kind===`directory`?{path:e.path,name:e.name,type:`folder`,createdAt:e.createdAt,updatedAt:e.updatedAt}:{path:e.path,name:e.name,type:`file`,mimeType:e.mimeType,content:e.content,createdAt:e.createdAt,updatedAt:e.updatedAt,extension:e.extension,source:e.source,size:e.size,readonly:e.readonly}}function Se(e,t){return U(e,t).map(H)}function Ce(e,t){let n=V(e,t);return!n||n.kind!==`file`?null:H(n)}function U(e,t){let n=L(t);return Object.values(e).filter(e=>e.path!==n&&R(e.path)===n).sort(we)}function W(e,t){let n=L(t);return Object.values(e).filter(e=>e.path===n||e.path.startsWith(`${n}/`)).sort((e,t)=>e.path.length-t.path.length)}function we(e,t){return e.kind===t.kind?e.name.localeCompare(t.name):e.kind===`directory`?-1:1}function G(e,t){return W(e,t).some(e=>e.kind===`file`&&!!e.readonly)}function K(e,t,n){let r=new Set(U(e,t).map(e=>e.name));if(!r.has(n))return n;let i=n.split(`.`),a=i.length>1?`.${i.pop()}`:``,o=i.join(`.`)||n.replace(a,``),s=1,c=`${o} ${s}${a}`;for(;r.has(c);)s+=1,c=`${o} ${s}${a}`;return c}function Te(e,t,n={}){let r=L(t);if(r===`/`||e[r])return{nodes:e,path:r};let i=R(r),a=e[i];if(!a||a.kind!==`directory`)return{nodes:e,path:r};let o=z(r),s=n.uniqueName?K(e,i,o):o,c=B(i,s),l=Date.now(),u={kind:`directory`,path:c,name:s,createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Ee(e,t,n=`New Folder`){let r=L(t),i=K(e,r,n),a=B(r,i),o=Date.now(),s={kind:`directory`,path:a,name:i,createdAt:o,updatedAt:o};return{...e,[a]:s}}function q(e,t,n=`New Note.txt`,r=``){let i=L(t),a=K(e,i,n),o=B(i,a),s=a.split(`.`).pop()?.toLowerCase()??`txt`,c=s===`md`?`text/markdown`:`text/plain`,l=Date.now(),u={kind:`file`,path:o,name:a,extension:s,mimeType:c,content:r,createdAt:l,updatedAt:l};return{...e,[o]:u}}function De(e,t,n,r={}){let i=L(t),a=e[i];if(a?.kind===`file`)return a.readonly?{nodes:e,path:i}:r.source||a.source?{nodes:Z(e,i,r.source??String(n),{mimeType:r.mimeType,extension:r.extension}),path:i}:{nodes:J(e,i,String(n)),path:i};let o=R(i),s=e[o];if(!s||s.kind!==`directory`)return{nodes:e,path:i};let c=z(i),l=r.uniqueName?K(e,o,c):c,u=B(o,l),d=r.extension??l.split(`.`).pop()?.toLowerCase()??`txt`,f=r.mimeType??b(d);return r.source||!Q(f,d)?X(e,o,l,r.source??String(n),f,d):{nodes:q(e,o,l,String(n)),path:u}}function J(e,t,n){let r=L(t),i=e[r];return!i||i.kind!==`file`?e:{...e,[r]:{...i,content:n,updatedAt:Date.now()}}}function Y(e){if(!e.startsWith(`data:`))return;let t=e.split(`,`)[1];if(!t)return;let n=t.replace(/\s/g,``),r=n.endsWith(`==`)?2:+!!n.endsWith(`=`);return Math.max(0,n.length*3/4-r)}function X(e,t,n,r,i,a){let o=L(t),s=K(e,o,n),c=B(o,s),l=Date.now(),u={kind:`file`,path:c,name:s,extension:a,mimeType:i,source:r,size:Y(r),createdAt:l,updatedAt:l};return{nodes:{...e,[c]:u},path:c}}function Z(e,t,n,r={}){let i=L(t),a=e[i];return!a||a.kind!==`file`||a.readonly?e:{...e,[i]:{...a,source:n,content:void 0,mimeType:r.mimeType??a.mimeType,extension:r.extension??a.extension,size:Y(n),updatedAt:Date.now()}}}function Oe(e,t,n){let r=L(t),i=e[r];if(!i)return e;let a=R(r),o=K(e,a,n),s=B(a,o);if(s===r)return e;let c={...e};return delete c[r],c[s]={...i,path:s,name:o,updatedAt:Date.now()},i.kind===`directory`&&Object.values(e).filter(e=>e.path.startsWith(`${r}/`)).forEach(e=>{delete c[e.path];let t=e.path.replace(r,s);c[t]={...e,path:t,updatedAt:Date.now()}}),c}function ke(e,t,n){let r=L(t);if(!e[r])return{nodes:e,path:r};let i=R(r),a=K(e,i,n),o=B(i,a);return{nodes:Oe(e,r,a),path:o}}function Ae(e,t){let n=L(t),r={...e};return Object.keys(e).forEach(e=>{(e===n||e.startsWith(`${n}/`))&&delete r[e]}),r}function je(e,t,n,r){let i=L(t),a=L(n),o=e[i],s=e[a];if(!o||!s||s.kind!==`directory`||i===`/`||i===a||o.kind===`directory`&&a.startsWith(`${i}/`)||r===`cut`&&(G(e,i)||R(i)===a))return e;let c=B(a,K(e,a,o.name)),l=W(e,i),u=Date.now(),d={};return l.forEach(e=>{let t=e.path===i?c:e.path.replace(`${i}/`,`${c}/`);if(e.kind===`directory`){d[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,updatedAt:u};return}d[t]={...e,path:t,name:t.split(`/`).filter(Boolean).at(-1)??e.name,createdAt:r===`copy`?u:e.createdAt,updatedAt:u}}),r===`copy`?{...e,...d}:{...Ae(e,i),...d}}function Q(e,t){return e.startsWith(`image/`)||e.startsWith(`video/`)||e.startsWith(`audio/`)||e===`application/pdf`?!1:e.startsWith(`text/`)?!0:x(t)}function Me(e){return new Promise((t,n)=>{let r=new FileReader;r.onload=()=>t(String(r.result??``)),r.onerror=()=>n(r.error??Error(`Failed to read ${e.name}`)),r.readAsDataURL(e)})}async function Ne(e,t,n){let r=L(t),i=e[r];if(!i||i.kind!==`directory`||n.length===0)return{nodes:e,importedPaths:[]};let a={...e},o=[];for(let e of n){let t=K(a,r,e.name?.trim()||`Upload-${Date.now()}`),n=B(r,t),i=t.split(`.`).pop()?.toLowerCase()??``,s=e.type||b(i),c=Date.now(),l={kind:`file`,path:n,name:t,extension:i,mimeType:s,size:e.size,createdAt:c,updatedAt:c};Q(s,i)?l.content=await e.text():l.source=await Me(e),a[n]=l,o.push(n)}return{nodes:a,importedPaths:o}}async function Pe(e){let t=``,n=``;if(e.source)if(e.source.startsWith(`data:`))t=e.source;else{let r=await(await fetch(e.source)).blob();n=URL.createObjectURL(r),t=n}else n=URL.createObjectURL(new Blob([e.content??``],{type:e.mimeType||`text/plain`})),t=n;let r=document.createElement(`a`);r.href=t,r.download=e.name,r.rel=`noreferrer`,document.body.append(r),r.click(),r.remove(),n&&URL.revokeObjectURL(n)}async function Fe(){return await le(`taaniel-os-filesystem-v1`)??F()}async function Ie(e){await ue(I,e)}async function Le(){await de(I)}var Re=`/Games/README.md`,ze=[`snake`,`tetris`],Be=[`dino`,`doom`,`hextris`],Ve=`/Desktop/Welcome.md`,He=[`/Media/Music/Studio Loop.mp3`,`/Media/Music/T-Rex Roar.mp3`],Ue=`/Trash`,We=[`/Media`,`/Media/Music`,`/Media/Photography`,Ue,...k],Ge=[...A,...i.map(e=>({path:`/Media/Photography/${e.title}.${e.src.endsWith(`.png`)?`png`:`jpg`}`,extension:e.src.endsWith(`.png`)?`png`:`jpg`,mimeType:e.src.endsWith(`.png`)?`image/png`:`image/jpeg`,source:e.src}))];function $(e){return!e||e===`/`?`/`:`/${e}`.replace(/\\/g,`/`).replace(/\/+/g,`/`).replace(/\/$/,``)||`/`}function Ke(e,t){let n=$(e);return{kind:`directory`,path:n,name:n.split(`/`).filter(Boolean).at(-1)??`/`,createdAt:t,updatedAt:t}}function qe(e,t,n,r,i){let a=$(e);return{kind:`file`,path:a,name:a.split(`/`).filter(Boolean).at(-1)??a,extension:t,mimeType:n,source:r,readonly:!0,createdAt:i,updatedAt:i}}function Je(e){let t=ne(e),n=t!==e,r=Date.now();return t[`/Desktop/Welcome.md`]&&(t={...t},delete t[Ve],n=!0),We.forEach(e=>{t[e]||(t={...t,[e]:Ke(e,r)},n=!0)}),He.forEach(e=>{t[e]&&(t={...t},delete t[e],n=!0)}),Ge.forEach(e=>{let i=t[e.path];if(!i){t={...t,[e.path]:qe(e.path,e.extension,e.mimeType,e.source,r)},n=!0;return}i.kind===`file`&&i.readonly===!0&&(i.source!==e.source||i.extension!==e.extension||i.mimeType!==e.mimeType)&&(t={...t,[e.path]:{...i,source:e.source,extension:e.extension,mimeType:e.mimeType,updatedAt:r}},n=!0)}),(t[Re]||t[`/Games`])&&(t={...t},delete t[Re],Object.keys(t).forEach(e=>{(e===`/Games`||e.startsWith(`/Games/`))&&delete t[e]}),n=!0),n?t:e}export{J as A,C as B,je as C,Ie as D,ke as E,w as F,h as G,d as H,y as I,f as K,se as L,F as M,j as N,H as O,oe as P,re as R,L as S,Oe as T,u as U,S as V,s as W,B as _,ze as a,Fe as b,Ee as c,Pe as d,V as f,Ne as g,G as h,Be as i,De as j,Z as k,q as l,z as m,Ue as n,Le as o,R as p,Je as r,X as s,Ve as t,Ae as u,U as v,Ce as w,Te as x,Se as y,x as z};