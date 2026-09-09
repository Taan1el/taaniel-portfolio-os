import{o as e}from"./chunk-CMxvf4Kt.js";import{o as t,t as n}from"./index-Bgqsehkd.js";import{h as r,v as i}from"./portfolio-XodZCWr_.js";import{t as a}from"./earth-BCeCPE1G.js";import{a as o,d as s,i as c,l,o as u,r as d,t as f}from"./app-layout-DoGeHLiE.js";import{t as p}from"./shield-alert-DsCWEQ9B.js";import{n as m}from"./utils-CGD0Lafm.js";import{O as h,S as g,f as _,p as v,y}from"./system-workspace-BvQql66_.js";import{t as b}from"./filesystem-store-1Ze2TPHw.js";import{t as x}from"./sanitize-C1R_Of_8.js";var S=i(`arrow-left`,[[`path`,{d:`m12 19-7-7 7-7`,key:`1l729n`}],[`path`,{d:`M19 12H5`,key:`x3x0zl`}]]),C=i(`arrow-right`,[[`path`,{d:`M5 12h14`,key:`1ays0h`}],[`path`,{d:`m12 5 7 7-7 7`,key:`xquz4c`}]]),w=i(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),T=i(`network`,[[`rect`,{x:`16`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`4q2zg0`}],[`rect`,{x:`2`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`8cvhb9`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`6`,rx:`1`,key:`1egb70`}],[`path`,{d:`M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3`,key:`1jsf9p`}],[`path`,{d:`M12 12V8`,key:`2874zd`}]]),E=i(`refresh-ccw`,[[`path`,{d:`M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`14sxne`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}],[`path`,{d:`M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16`,key:`1hlbsb`}],[`path`,{d:`M16 16h5v5`,key:`ccwih5`}]]),D=i(`star`,[[`path`,{d:`M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z`,key:`r04s7s`}]]),O=e(t(),1),k=`https://www.google.com/webhp?igu=1`,A=`https://www.google.com/search?igu=1&q=`,j=new Set([`http:`,`https:`]),M=/^[a-z][a-z0-9+.-]*:/i,N=/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i,P=/(^|\.)google\./i;function F(e){let t=e.trim();return t?`${A}${encodeURIComponent(t)}`:k}function I(e){let t=e.trim();if(!t)return``;let n=t.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();if(n){if(!j.has(`${n}:`))return``;try{return new URL(t).toString()}catch{return``}}if(t.startsWith(`//`))try{return new URL(`https:${t}`).toString()}catch{return``}if(N.test(t))try{return new URL(`https://${t}`).toString()}catch{return``}return M.test(t),``}function L(e){try{let t=new URL(e);return P.test(t.hostname)&&((t.pathname===`/`||t.pathname===``)&&(t.pathname=`/webhp`),t.searchParams.set(`igu`,`1`)),t.toString()}catch{return e}}function R(e){let t=I(e);return t?L(t):F(e)}function z(e){let t=e.trim();return t?t.startsWith(`/`)?g(t):R(t):``}function B(e){try{return new URL(e).hostname.replace(/^www\./i,``)||`Browser`}catch{return`Browser`}}var V=n();function H({bookmarks:e,activeUrl:t,onVisit:n}){return(0,V.jsxs)(c,{className:`browser-app__sidebar`,children:[(0,V.jsx)(`p`,{className:`browser-app__sidebar-label`,children:`Bookmarks`}),(0,V.jsx)(`div`,{className:`browser-app__bookmark-list`,role:`toolbar`,"aria-label":`Browser bookmarks`,children:e.map(e=>(0,V.jsxs)(`button`,{type:`button`,className:m(`browser-app__bookmark`,t===z(e.url)&&`is-active`),onClick:()=>n(e.url),title:e.label,children:[(0,V.jsx)(D,{size:11}),(0,V.jsx)(`span`,{children:e.label})]},e.label))})]})}var U={direct:{kind:`direct`,label:`Direct`,note:`Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.`,transform:e=>e},allorigins:{kind:`proxy`,label:`AllOrigins`,note:`Public proxy preview through AllOrigins. Many pages render, but auth-heavy or script-heavy sites may still fail.`,transform:e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`},wayback:{kind:`proxy`,label:`Wayback`,note:`Loads the page through a web.archive.org wrapper. Archived pages may differ from the current live site.`,transform:e=>`https://web.archive.org/web/*/${encodeURI(e)}`}},W=Object.keys(U),G=Object.fromEntries(W.map(e=>[e,U[e].label])),K=Object.fromEntries(W.map(e=>[e,U[e].note]));function q(e,t){return U[t].transform(e)}function J(e){switch(e){case`direct`:return`allorigins`;case`allorigins`:return`wayback`;case`wayback`:return`allorigins`;default:return`allorigins`}}function Y({address:e,displayedUrl:t,proxyMode:n,loadState:i,securityIndicatorTitle:c,canGoBack:d,canGoForward:f,canOpenExternally:p,onAddressChange:m,onBack:h,onForward:g,onReload:_,onSubmit:v,onProxyModeChange:y,onOpenInNewTab:b}){return(0,V.jsxs)(o,{className:`browser-app__toolbar`,children:[(0,V.jsxs)(`div`,{className:`app-toolbar__group`,children:[(0,V.jsx)(l,{type:`button`,disabled:!d,onClick:h,"aria-label":`Back`,children:(0,V.jsx)(S,{size:15})}),(0,V.jsx)(l,{type:`button`,disabled:!f,onClick:g,"aria-label":`Forward`,children:(0,V.jsx)(C,{size:15})}),(0,V.jsx)(l,{type:`button`,onClick:_,"aria-label":`Reload`,children:(0,V.jsx)(E,{size:15})})]}),(0,V.jsx)(`form`,{className:`browser-app__address-form`,onSubmit:e=>{e.preventDefault(),v()},children:(0,V.jsx)(s,{containerClassName:`browser-app__address`,placeholder:`Enter a URL, search, or /local/path`,title:t,type:`text`,spellCheck:!1,autoCapitalize:`none`,autoCorrect:`off`,value:e,onChange:e=>m(e.target.value),icon:(0,V.jsx)(a,{size:14})})}),(0,V.jsxs)(`div`,{className:`browser-app__mode-cluster`,children:[(0,V.jsx)(`label`,{className:`browser-app__proxy-select-shell`,title:c,children:(0,V.jsx)(`select`,{className:`browser-app__proxy-select`,"aria-label":`Proxy mode`,value:n,onChange:e=>y(e.target.value),children:W.map(e=>(0,V.jsx)(`option`,{value:e,children:G[e]},e))})}),i===`loading`?(0,V.jsxs)(`span`,{className:`browser-app__loading-chip`,"aria-live":`polite`,children:[(0,V.jsx)(w,{size:13}),(0,V.jsx)(`span`,{children:`Loading`})]}):null]}),(0,V.jsxs)(u,{type:`button`,variant:`panel`,onClick:b,disabled:!p,children:[(0,V.jsx)(r,{size:15}),`Open in new tab`]})]})}function X({fallback:e,canOpenExternally:t,onOpenInNewTab:n,onRetryWithProxy:i}){return(0,V.jsxs)(`div`,{className:`browser-app__fallback`,children:[(0,V.jsx)(`span`,{className:`browser-app__fallback-icon`,children:(0,V.jsx)(p,{size:22})}),(0,V.jsxs)(`div`,{className:`browser-app__fallback-copy`,children:[(0,V.jsx)(`p`,{className:`eyebrow`,children:`Preview`}),(0,V.jsx)(`h2`,{children:e.title}),(0,V.jsx)(`p`,{children:e.message}),e.details?(0,V.jsx)(`small`,{children:e.details}):null,(0,V.jsx)(`code`,{children:e.url})]}),(0,V.jsxs)(`div`,{className:`browser-app__fallback-actions`,children:[(0,V.jsxs)(u,{type:`button`,variant:`panel`,onClick:n,disabled:!t,children:[(0,V.jsx)(r,{size:15}),`Open in new tab`]}),(0,V.jsxs)(u,{type:`button`,variant:`ghost`,onClick:i,disabled:!e.retryProxyMode,children:[(0,V.jsx)(T,{size:15}),e.retryProxyMode?`Retry with ${G[e.retryProxyMode]}`:`Retry with proxy`]})]})]})}var ee=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts`,te=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin`;function ne({document:e,viewMode:t,loadState:n,fallback:r,refreshToken:i,canOpenExternally:a,onLocalNavigate:o,onFrameLoad:s,onFrameError:c,onOpenInNewTab:l,onRetryWithProxy:u}){let d=(0,O.useRef)(null),f=typeof HTMLIFrameElement<`u`&&`credentialless`in HTMLIFrameElement.prototype,p=(0,O.useCallback)(()=>{if(e?.kind===`local`&&e.localKind===`directory`)try{let e=d.current?.contentDocument;e&&e.body.dataset.browserLocalBound!==`true`&&(e.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-browser-path]`);if(!(n instanceof HTMLElement))return;let r=n.getAttribute(`data-browser-path`);r&&(e.preventDefault(),o(r))}),e.body.dataset.browserLocalBound=`true`)}catch{}s()},[e,s,o]);return t===`fallback`?(0,V.jsx)(X,{fallback:r??{title:e?.title??`Unable to open page`,url:e?.displayUrl??`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u}):e?(0,V.jsxs)(`div`,{className:`browser-app__frame-shell`,"data-state":n,children:[n===`loading`?(0,V.jsx)(`div`,{className:`browser-app__loading-bar`,"aria-hidden":`true`,children:(0,V.jsx)(`span`,{})}):null,(0,V.jsx)(`iframe`,{ref:d,src:e.frameSource.kind===`src`?e.frameSource.value:void 0,srcDoc:e.frameSource.kind===`srcDoc`?e.frameSource.value:void 0,title:e.title,sandbox:e.kind===`local`?te:ee,referrerPolicy:`no-referrer`,credentialless:f?`credentialless`:void 0,onLoad:p,onError:c},`${e.displayUrl}:${e.frameSource.kind}:${e.frameSource.value}:${i}`)]}):(0,V.jsx)(X,{fallback:{title:`Unable to open page`,url:`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}var re=[{disposition:`direct`,note:`Local and GitHub Pages sites usually render directly inside the Browser window.`,test:e=>e.hostname===`localhost`||e.hostname===`127.0.0.1`||e.hostname.endsWith(`.github.io`)},{disposition:`direct`,note:`Google pages using igu=1 are routed through the iframe-friendly variant.`,test:e=>/(^|\.)google\./i.test(e.hostname)&&e.searchParams.get(`igu`)===`1`},{disposition:`direct`,note:`Wikipedia is a reliable direct target for the Browser viewer.`,test:e=>/(^|\.)wikipedia\.org$/i.test(e.hostname)},{disposition:`direct`,note:`Internet Archive pages are generally safe to try in direct mode.`,test:e=>/(^|\.)archive\.org$/i.test(e.hostname)}],ie=[{disposition:`blocked`,message:`GitHub cannot be embedded directly in this Browser window`,details:`GitHub sends frame protections, so the Browser switches straight to fallback instead of waiting on a blank iframe.`,retryProxyMode:`allorigins`,test:e=>/(^|\.)github\.com$/i.test(e.hostname)},{disposition:`blocked`,message:`This social or auth-heavy site is known to block iframe embedding`,details:`Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.`,retryProxyMode:`allorigins`,test:e=>[`linkedin.com`,`instagram.com`,`facebook.com`,`x.com`,`twitter.com`,`tiktok.com`,`discord.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This streaming platform does not embed cleanly inside the Browser window`,details:`Video platforms typically require full browser privileges or special embeds. The Browser shows fallback immediately to avoid a dead panel.`,retryProxyMode:`allorigins`,test:e=>[`youtube.com`,`youtu.be`,`twitch.tv`,`open.spotify.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This Google workspace page is not a reliable iframe target`,details:`Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.`,retryProxyMode:`allorigins`,test:e=>[`docs.google.com`,`drive.google.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))}];function Z(e){try{let t=new URL(e),n=re.find(e=>e.test(t));if(n)return n;let r=ie.find(e=>e.test(t));if(r)return r}catch{}return{disposition:`unknown`}}function ae(e){return Z(e).disposition!==`blocked`}var oe=new Set([`htm`,`html`]),se=/^(?:https?:\/\/|blob:|\/|data:(?:image|video|audio)\/)/i;function Q(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function $(e,t){return`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${Q(e)}</title>
    <style>
      :root {
        color-scheme: dark light;
        font-family: "IBM Plex Sans", system-ui, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        background: #f7f8fb;
        color: #111827;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: 14px/1.6 "IBM Plex Mono", monospace;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .browser-local-media {
        display: grid;
        min-height: calc(100vh - 48px);
        place-items: center;
      }

      .browser-local-media img,
      .browser-local-media video {
        max-width: 100%;
        max-height: calc(100vh - 48px);
        object-fit: contain;
      }

      .browser-local-media audio {
        width: min(520px, 100%);
      }

      .browser-local-directory {
        display: grid;
        gap: 18px;
      }

      .browser-local-directory__hero {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
      }

      .browser-local-directory__hero h1,
      .browser-local-directory__hero p {
        margin: 0;
      }

      .browser-local-directory__hero p {
        color: #6b7280;
        font-size: 13px;
      }

      .browser-local-breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        font: 13px/1.4 "IBM Plex Mono", monospace;
        color: #4b5563;
      }

      .browser-local-breadcrumbs span.is-separator {
        color: #9ca3af;
      }

      .browser-local-breadcrumbs a {
        color: #1f2937;
      }

      .browser-local-directory__list {
        display: grid;
        gap: 10px;
      }

      .browser-local-entry {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) minmax(0, 180px);
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.82);
        transition: border-color 120ms ease, transform 120ms ease, background 120ms ease;
      }

      .browser-local-entry:hover {
        border-color: rgba(37, 99, 235, 0.24);
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-1px);
      }

      .browser-local-entry__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 46px;
        min-height: 32px;
        padding: 0 10px;
        border-radius: 999px;
        background: #e5e7eb;
        color: #111827;
        font: 12px/1 "IBM Plex Mono", monospace;
        letter-spacing: 0.04em;
      }

      .browser-local-entry__badge.is-folder {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .browser-local-entry__copy,
      .browser-local-entry__meta {
        display: grid;
        min-width: 0;
        gap: 3px;
      }

      .browser-local-entry__copy strong,
      .browser-local-entry__meta strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .browser-local-entry__copy small,
      .browser-local-entry__meta small {
        color: #6b7280;
      }

      .browser-local-directory__empty {
        padding: 20px;
        border: 1px dashed rgba(15, 23, 42, 0.14);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.62);
        color: #6b7280;
      }

      @media (max-width: 780px) {
        .browser-local-entry {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .browser-local-entry__meta {
          grid-column: 1 / -1;
        }
      }
    </style>
  </head>
  <body>${t}</body>
</html>`}function ce(e){return e.type===`folder`?`Folder`:typeof e.size==`number`?`${e.extension?.toUpperCase()??`FILE`} · ${e.size} bytes`:typeof e.content==`string`?`${e.extension?.toUpperCase()??`TEXT`} · ${e.content.length} chars`:e.extension?.toUpperCase()??`FILE`}function le(e){let t=g(e),n=t===`/`?[]:t.split(`/`).filter(Boolean),r=[{label:`Root`,path:`/`}],i=``;for(let e of n)i=`${i}/${e}`,r.push({label:e,path:i});return r.map((e,t)=>{let n=t===r.length-1,i=n?`<strong>${Q(e.label)}</strong>`:`<a href="${Q(e.path)}" data-browser-path="${Q(e.path)}">${Q(e.label)}</a>`;return n?i:`${i}<span class="is-separator">/</span>`}).join(``)}function ue(e,t){let n=[];if(e!==`/`){let t=v(e);n.push(`
      <a class="browser-local-entry" href="${Q(t)}" data-browser-path="${Q(t)}">
        <span class="browser-local-entry__badge is-folder">UP</span>
        <span class="browser-local-entry__copy">
          <strong>..</strong>
          <small>Parent directory</small>
        </span>
        <span class="browser-local-entry__meta">
          <strong>${Q(t)}</strong>
          <small>Move one level up</small>
        </span>
      </a>
    `)}for(let e of t){let t=e.type===`folder`;n.push(`
      <a class="browser-local-entry" href="${Q(e.path)}" data-browser-path="${Q(e.path)}">
        <span class="browser-local-entry__badge ${t?`is-folder`:``}">
          ${t?`DIR`:Q(e.extension?.slice(0,4).toUpperCase()??`FILE`)}
        </span>
        <span class="browser-local-entry__copy">
          <strong>${Q(e.name)}</strong>
          <small>${t?`Directory`:`File preview`}</small>
        </span>
        <span class="browser-local-entry__meta">
          <strong>${Q(e.path)}</strong>
          <small>${Q(ce(e))}</small>
        </span>
      </a>
    `)}return n.length===0?`<div class="browser-local-directory__empty">This directory is empty.</div>`:`<div class="browser-local-directory__list">${n.join(``)}</div>`}function de(e,t){let n=g(e),r=n===`/`?`Root`:n.split(`/`).filter(Boolean).at(-1)??n,i=le(n),a=ue(n,t),o=`${t.length} ${t.length===1?`item`:`items`}`;return{kind:`local`,localKind:`directory`,title:r,displayUrl:n,note:`Local filesystem directory index rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(r,`
          <section class="browser-local-directory">
            <div class="browser-local-directory__hero">
              <div>
                <h1>${Q(r)}</h1>
                <p>${Q(n)}</p>
              </div>
              <p>${o}</p>
            </div>
            <nav class="browser-local-breadcrumbs" aria-label="Local path">${i}</nav>
            ${a}
          </section>
        `)}}}function fe(e){if(typeof e.content==`string`){if(oe.has(e.extension??``)||e.mimeType?.includes(`html`)){let t=x(e.content);return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Local filesystem preview rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(e.name,t)}}}return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Text file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<pre>${Q(e.content)}</pre>`)}}}if(typeof e.source==`string`&&se.test(e.source.trim())){let t=Q(e.source);if(e.mimeType?.startsWith(`image/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Image file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><img src="${t}" alt="${Q(e.name)}" /></div>`)}};if(e.mimeType?.startsWith(`video/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Video file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><video src="${t}" controls playsinline></video></div>`)}};if(e.mimeType?.startsWith(`audio/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Audio file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><audio src="${t}" controls></audio></div>`)}}}return null}function pe(e,t){let n=e.trim();if(!n.startsWith(`/`))return{document:null,error:null};let r=g(n),i=_(t,r);if(!i)return{document:null,error:`Local file not found: ${r}`};if(i.kind===`directory`)return{document:de(r,y(t,r)),error:null};let a=fe(h(i));return a?{document:a,error:null}:{document:null,error:`${i.name} cannot be rendered inside the Browser app.`}}var me=9e3;function he({initialAddress:e,nodes:t}){let n=z(e??``)||`https://www.google.com/webhp?igu=1`,[r,i]=(0,O.useState)(n),[a,o]=(0,O.useState)([n]),[s,c]=(0,O.useState)(0),[l,u]=(0,O.useState)(`direct`),[d,f]=(0,O.useState)(`web`),[p,m]=(0,O.useState)(`idle`),[h,g]=(0,O.useState)(null),[_,v]=(0,O.useState)(0),[y,b]=(0,O.useState)([]),x=(0,O.useRef)(null),S=(0,O.useCallback)(()=>{x.current!=null&&(globalThis.window.clearTimeout(x.current),x.current=null)},[]);(0,O.useEffect)(()=>{S(),i(n),o([n]),c(0),u(`direct`),f(`web`),m(`idle`),g(null),v(0),b([])},[S,n]);let C=a[s]??n;(0,O.useEffect)(()=>{i(C)},[C]);let w=(0,O.useMemo)(()=>{let e=pe(C,t);if(e.document||e.error)return e;let n=R(C),r=Z(n);return{document:{kind:`remote`,title:B(n),displayUrl:n,note:l===`direct`?r.note??K[l]:K[l],frameSource:{kind:`src`,value:q(n,l)}},error:null}},[C,t,l]),T=w.document,E=(0,O.useCallback)((e,t)=>{if(!t)return;let n={url:t.displayUrl,proxyMode:l,reason:e,timestamp:Date.now()};b(e=>[...e.slice(-11),n])},[l]),D=(0,O.useCallback)((e,t,n,r)=>{S();let i=T?.title??(C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??C:B(R(C))),a=T?.displayUrl??C;f(`fallback`),m(`blocked`),g({title:i,url:a,message:e,details:t,retryProxyMode:T?.kind===`remote`?r??J(l):null}),E(n,T)},[T,S,C,l,E]);(0,O.useEffect)(()=>{if(S(),!w.document){f(`fallback`),m(`blocked`),g({title:C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??`Local file`:`Unable to open page`,url:C,message:w.error??`This page could not be resolved.`,details:C.startsWith(`/`)?`The requested local file could not be rendered in the Browser app.`:void 0,retryProxyMode:null});return}if(w.document.frameSource.kind===`srcDoc`){if(w.error){D(w.error,`The requested local file could not be rendered in the Browser app.`,`local`);return}f(`web`),m(`ready`),g(null);return}if(w.document.kind===`remote`&&l===`direct`){let e=Z(w.document.displayUrl);if(!ae(w.document.displayUrl)&&e.disposition===`blocked`){D(e.message??`This site is restricted and cannot be embedded`,e.details,`blocked`,e.retryProxyMode??J(l));return}}return f(`web`),m(`loading`),g(null),x.current=globalThis.window.setTimeout(()=>{D(`This site cannot be embedded due to browser restrictions`,`The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.`,`timeout`)},me),()=>S()},[D,S,C,l,_,w]);let k=(0,O.useCallback)(()=>{S(),f(`web`),m(`idle`),g(null)},[S]),A=(0,O.useCallback)(e=>{let t=z(e);if(t){if(t===C){k(),v(e=>e+1);return}k(),v(0),i(t),o(e=>[...e.slice(0,s+1),t]),c(s+1)}},[C,s,k]),j=(0,O.useCallback)(()=>{k(),v(0),c(e=>Math.max(0,e-1))},[k]),M=(0,O.useCallback)(()=>{k(),v(0),c(e=>Math.min(a.length-1,e+1))},[a.length,k]),N=(0,O.useCallback)(()=>{k(),v(e=>e+1)},[k]),P=(0,O.useCallback)(e=>{k(),u(e),v(e=>e+1)},[k]),F=(0,O.useCallback)(()=>{P(h?.retryProxyMode??J(l))},[P,h?.retryProxyMode,l]),I=(0,O.useCallback)(()=>{S(),f(`web`),m(`ready`),g(null)},[S]),L=(0,O.useCallback)(()=>{S(),D(`This site cannot be embedded due to browser restrictions`,`The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.`,`error`)},[D,S]);return{address:r,setAddress:i,currentUrl:C,proxyMode:l,setProxyMode:P,viewMode:d,loadState:p,fallback:h,resolvedDocument:T,refreshToken:_,failureHistory:y,canGoBack:s>0,canGoForward:s<a.length-1,visit:A,goBack:j,goForward:M,reload:N,retryWithProxy:F,handleFrameLoad:I,handleFrameError:L}}var ge=[{label:`Google`,url:`https://www.google.com/webhp?igu=1`},{label:`Wikipedia`,url:`https://www.wikipedia.org/`},{label:`Internet Archive`,url:`https://archive.org/`},{label:`Live portfolio`,url:`https://taan1el.github.io/taaniel-portfolio-os/`},{label:`GitHub profile`,url:`https://github.com/Taan1el`},{label:`Portfolio repo`,url:`https://github.com/Taan1el/taaniel-portfolio-os`}];function _e({window:e}){let t=b(e=>e.nodes),{address:n,setAddress:r,currentUrl:i,proxyMode:a,setProxyMode:o,viewMode:s,loadState:c,fallback:l,resolvedDocument:u,refreshToken:p,canGoBack:m,canGoForward:h,visit:g,goBack:_,goForward:v,reload:y,retryWithProxy:x,handleFrameLoad:S,handleFrameError:C}=he({initialAddress:(0,O.useMemo)(()=>e.payload?.externalUrl?.trim()||e.payload?.filePath?.trim()||`https://www.google.com/webhp?igu=1`,[e.payload?.externalUrl,e.payload?.filePath]),nodes:t}),w=u?.kind===`remote`,T=u?.displayUrl??i??n??`No URL loaded`,E=K[a],D=()=>{!u||u.kind!==`remote`||globalThis.window.open(u.displayUrl,`_blank`,`noopener,noreferrer`)};return(0,V.jsxs)(d,{className:`browser-app`,children:[(0,V.jsx)(Y,{address:n,displayedUrl:T,proxyMode:a,loadState:c,securityIndicatorTitle:E,canGoBack:m,canGoForward:h,canOpenExternally:!!w,onAddressChange:r,onBack:_,onForward:v,onReload:y,onSubmit:()=>g(n),onProxyModeChange:o,onOpenInNewTab:D}),(0,V.jsxs)(f,{className:`browser-app__content`,padded:!1,scrollable:!1,stacked:!1,children:[(0,V.jsx)(H,{bookmarks:ge,activeUrl:u?.displayUrl??i,onVisit:g}),(0,V.jsx)(`section`,{className:`browser-app__viewport`,children:(0,V.jsx)(ne,{document:u,viewMode:s,loadState:c,fallback:l,refreshToken:p,canOpenExternally:!!w,onLocalNavigate:g,onFrameLoad:S,onFrameError:C,onOpenInNewTab:D,onRetryWithProxy:x})})]})]})}export{_e as BrowserApp};