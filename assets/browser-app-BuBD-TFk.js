import{o as e}from"./rolldown-runtime-BM3Ffeng.js";import{At as t,Gt as n,R as r,St as i,Tt as a,Ut as o,Wt as s,Y as c,f as l,k as u,y as d,yt as f}from"./vendor-icons-BaFfwlT3.js";import{r as p}from"./vendor-motion-ndUkRzG2.js";import{O as m,S as h,f as g,p as _,y as v}from"./system-workspace-BMKxDrkU.js";import{n as y}from"./utils-lPuAlucj.js";import{a as b,f as x,i as S,n as C,o as w,s as T,u as E,v as D}from"./index-L8FuWzpb.js";import{t as O}from"./sanitize-BfJqzFRc.js";var k=e(n(),1),A=`https://www.google.com/webhp?igu=1`,j=`https://www.google.com/search?igu=1&q=`,M=new Set([`http:`,`https:`]),ee=/^[a-z][a-z0-9+.-]*:/i,N=/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i,P=/(^|\.)google\./i;function F(e){let t=e.trim();return t?`${j}${encodeURIComponent(t)}`:A}function I(e){let t=e.trim();if(!t)return``;let n=t.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();if(n){if(!M.has(`${n}:`))return``;try{return new URL(t).toString()}catch{return``}}if(t.startsWith(`//`))try{return new URL(`https:${t}`).toString()}catch{return``}if(N.test(t))try{return new URL(`https://${t}`).toString()}catch{return``}return ee.test(t),``}function te(e){try{let t=new URL(e);return P.test(t.hostname)&&((t.pathname===`/`||t.pathname===``)&&(t.pathname=`/webhp`),t.searchParams.set(`igu`,`1`)),t.toString()}catch{return e}}function L(e){let t=I(e);return t?te(t):F(e)}function R(e){let t=e.trim();return t?t.startsWith(`/`)?h(t):L(t):``}function z(e){try{return new URL(e).hostname.replace(/^www\./i,``)||`Web Viewer`}catch{return`Web Viewer`}}var B=p();function ne({bookmarks:e,activeUrl:t,onVisit:n}){return(0,B.jsxs)(b,{className:`browser-app__sidebar`,children:[(0,B.jsx)(`p`,{className:`browser-app__sidebar-label`,children:`Saved links`}),(0,B.jsx)(`div`,{className:`browser-app__bookmark-list`,role:`toolbar`,"aria-label":`Browser bookmarks`,children:e.map(e=>(0,B.jsxs)(`button`,{type:`button`,className:y(`browser-app__bookmark`,t===R(e.url)&&`is-active`),onClick:()=>n(e.url),title:e.label,children:[(0,B.jsx)(l,{size:11}),(0,B.jsx)(`span`,{children:e.label})]},e.label))})]})}var V={direct:{kind:`direct`,label:`Direct`,note:`Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.`,transform:e=>e},allorigins:{kind:`proxy`,label:`AllOrigins`,note:`Public proxy preview through AllOrigins. Many pages render, but auth-heavy or script-heavy sites may still fail.`,transform:e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`},wayback:{kind:`proxy`,label:`Wayback`,note:`Loads the page through a web.archive.org wrapper. Archived pages may differ from the current live site.`,transform:e=>`https://web.archive.org/web/*/${encodeURI(e)}`}},H=Object.keys(V),U=Object.fromEntries(H.map(e=>[e,V[e].label])),W=Object.fromEntries(H.map(e=>[e,V[e].note]));function re(e,t){return V[t].transform(e)}function G(e){switch(e){case`direct`:return`allorigins`;case`allorigins`:return`wayback`;case`wayback`:return`allorigins`;default:return`allorigins`}}function ie({address:e,displayedUrl:t,proxyMode:n,loadState:r,securityIndicatorTitle:a,viewerStateLabel:l,viewerStateTitle:d,canGoBack:p,canGoForward:m,canOpenExternally:h,onAddressChange:g,onBack:_,onForward:v,onReload:y,onSubmit:b,onProxyModeChange:S,onOpenInNewTab:C}){return(0,B.jsxs)(w,{className:`browser-app__toolbar`,children:[(0,B.jsxs)(`div`,{className:`app-toolbar__group`,children:[(0,B.jsx)(E,{type:`button`,disabled:!p,onClick:_,"aria-label":`Back`,children:(0,B.jsx)(s,{size:15})}),(0,B.jsx)(E,{type:`button`,disabled:!m,onClick:v,"aria-label":`Forward`,children:(0,B.jsx)(o,{size:15})}),(0,B.jsx)(E,{type:`button`,onClick:y,"aria-label":`Reload`,children:(0,B.jsx)(u,{size:15})})]}),(0,B.jsx)(`form`,{className:`browser-app__address-form`,onSubmit:e=>{e.preventDefault(),b()},children:(0,B.jsx)(x,{containerClassName:`browser-app__address`,placeholder:`Enter a URL, search, or /local/path`,title:t,type:`text`,spellCheck:!1,autoCapitalize:`none`,autoCorrect:`off`,value:e,onChange:e=>g(e.target.value),icon:(0,B.jsx)(i,{size:14})})}),(0,B.jsxs)(`div`,{className:`browser-app__mode-cluster`,children:[(0,B.jsx)(`span`,{className:`browser-app__state-chip`,title:d,children:l}),(0,B.jsx)(`label`,{className:`browser-app__proxy-select-shell`,title:a,children:(0,B.jsx)(`select`,{className:`browser-app__proxy-select`,"aria-label":`Proxy mode`,value:n,onChange:e=>S(e.target.value),children:H.map(e=>(0,B.jsx)(`option`,{value:e,children:U[e]},e))})}),r===`loading`?(0,B.jsxs)(`span`,{className:`browser-app__loading-chip`,"aria-live":`polite`,children:[(0,B.jsx)(c,{size:13}),(0,B.jsx)(`span`,{children:`Loading`})]}):null]}),(0,B.jsxs)(T,{type:`button`,variant:`panel`,onClick:C,disabled:!h,children:[(0,B.jsx)(f,{size:15}),`Open externally`]})]})}function K({fallback:e,canOpenExternally:n,onOpenInNewTab:i,onRetryWithProxy:o}){let[s,c]=(0,k.useState)(!1),[l,u]=(0,k.useState)(!1);(0,k.useEffect)(()=>{c(!1),u(!1)},[e]);let p=async()=>{try{await navigator.clipboard.writeText(e.url),u(!0)}catch{u(!1)}},m=e.retryProxyMode&&e.retryProxyMode===`wayback`?`Try archived copy`:`Try proxy preview`;return(0,B.jsxs)(`div`,{className:`browser-app__fallback`,children:[(0,B.jsx)(`span`,{className:`browser-app__fallback-icon`,children:(0,B.jsx)(d,{size:22})}),(0,B.jsxs)(`div`,{className:`browser-app__fallback-copy`,children:[(0,B.jsx)(`p`,{className:`eyebrow`,children:e.eyebrow}),(0,B.jsx)(`h2`,{children:e.title}),(0,B.jsx)(`p`,{children:e.message}),(0,B.jsx)(`small`,{children:e.recommendation}),s&&e.details?(0,B.jsx)(`div`,{className:`browser-app__fallback-details`,role:`note`,children:e.details}):null,(0,B.jsx)(`code`,{children:e.url})]}),(0,B.jsxs)(`div`,{className:`browser-app__fallback-actions`,children:[(0,B.jsxs)(T,{type:`button`,variant:`panel`,onClick:i,disabled:!n,children:[(0,B.jsx)(f,{size:15}),`Open externally`]}),(0,B.jsxs)(T,{type:`button`,variant:`ghost`,onClick:o,disabled:!e.retryProxyMode,children:[(0,B.jsx)(r,{size:15}),e.retryProxyMode?m:`Retry with proxy`]}),(0,B.jsxs)(T,{type:`button`,variant:`ghost`,onClick:()=>void p(),children:[(0,B.jsx)(a,{size:15}),l?`Copied`:`Copy link`]}),(0,B.jsxs)(T,{type:`button`,variant:`ghost`,onClick:()=>c(e=>!e),disabled:!e.details,children:[(0,B.jsx)(t,{size:15}),s?`Hide reason`:`Why this failed`]})]}),e.retryProxyMode?(0,B.jsxs)(`p`,{className:`browser-app__fallback-footnote`,children:[`Suggested next mode: `,U[e.retryProxyMode]]}):null]})}function ae({document:e,viewMode:t,loadState:n,fallback:r,refreshToken:i,canOpenExternally:a,onLocalNavigate:o,onFrameLoad:s,onFrameError:c,onOpenInNewTab:l,onRetryWithProxy:u}){let d=(0,k.useRef)(null),f=typeof HTMLIFrameElement<`u`&&`credentialless`in HTMLIFrameElement.prototype,p=(0,k.useCallback)(()=>{if(e?.kind===`local`&&e.localKind===`directory`)try{let e=d.current?.contentDocument;e&&e.body.dataset.browserLocalBound!==`true`&&(e.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-browser-path]`);if(!(n instanceof HTMLElement))return;let r=n.getAttribute(`data-browser-path`);r&&(e.preventDefault(),o(r))}),e.body.dataset.browserLocalBound=`true`)}catch{}s()},[e,s,o]);return t===`fallback`?(0,B.jsx)(K,{fallback:r??{kind:`missing`,eyebrow:`Unavailable`,recommendation:`Try a different destination or return to a known local path.`,title:e?.title??`Unable to open page`,url:e?.displayUrl??`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u}):e?(0,B.jsxs)(`div`,{className:`browser-app__frame-shell`,"data-state":n,children:[n===`loading`?(0,B.jsx)(`div`,{className:`browser-app__loading-bar`,"aria-hidden":`true`,children:(0,B.jsx)(`span`,{})}):null,(0,B.jsx)(`div`,{className:`browser-app__frame-badge`,children:e.kind===`local`?e.localKind===`directory`?`Local directory preview`:`Local document preview`:`Embedded web preview`}),(0,B.jsx)(`iframe`,{ref:d,src:e.frameSource.kind===`src`?e.frameSource.value:void 0,srcDoc:e.frameSource.kind===`srcDoc`?e.frameSource.value:void 0,title:e.title,sandbox:`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts`,referrerPolicy:`no-referrer`,credentialless:f?`credentialless`:void 0,onLoad:p,onError:c},`${e.displayUrl}:${e.frameSource.kind}:${e.frameSource.value}:${i}`)]}):(0,B.jsx)(K,{fallback:{kind:`missing`,eyebrow:`Unavailable`,recommendation:`Try a different destination or return to a known local path.`,title:`Unable to open page`,url:`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}var q=`portfolio-browser-embed-memory`,oe=1e3*60*60*24*14;function J(e){try{return new URL(e).hostname.toLowerCase()}catch{return null}}function Y(){if(typeof localStorage>`u`)return{};try{let e=localStorage.getItem(q);if(!e)return{};let t=JSON.parse(e);return typeof t==`object`&&t?t:{}}catch{return{}}}function se(e){if(!(typeof localStorage>`u`))try{localStorage.setItem(q,JSON.stringify(e))}catch{}}function ce(e){let t=J(e);if(!t)return null;let n=Y()[t];return!n?.directOutcome||!n.directUpdatedAt||Date.now()-n.directUpdatedAt>oe?null:n.directOutcome}function X(e,t){let n=J(e);if(!n)return;let r=Y();r[n]={...r[n],directOutcome:t,directUpdatedAt:Date.now()},se(r)}var le=[{disposition:`direct`,note:`Local and GitHub Pages sites usually render directly inside the Browser window.`,test:e=>e.hostname===`localhost`||e.hostname===`127.0.0.1`||e.hostname.endsWith(`.github.io`)},{disposition:`direct`,note:`Google pages using igu=1 are routed through the iframe-friendly variant.`,test:e=>/(^|\.)google\./i.test(e.hostname)&&e.searchParams.get(`igu`)===`1`},{disposition:`direct`,note:`Wikipedia is a reliable direct target for the Browser viewer.`,test:e=>/(^|\.)wikipedia\.org$/i.test(e.hostname)},{disposition:`direct`,note:`Internet Archive pages are generally safe to try in direct mode.`,test:e=>/(^|\.)archive\.org$/i.test(e.hostname)}],ue=[{disposition:`blocked`,message:`GitHub cannot be embedded directly in the Web Viewer`,details:`GitHub sends frame protections, so the Web Viewer switches straight to fallback instead of waiting on a blank iframe.`,retryProxyMode:`allorigins`,test:e=>/(^|\.)github\.com$/i.test(e.hostname)},{disposition:`blocked`,message:`This social or auth-heavy site is known to block iframe embedding`,details:`Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.`,retryProxyMode:`allorigins`,test:e=>[`linkedin.com`,`instagram.com`,`facebook.com`,`x.com`,`twitter.com`,`tiktok.com`,`discord.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This streaming platform does not embed cleanly inside the Web Viewer`,details:`Video platforms typically require full browser privileges or special embeds. The Web Viewer shows fallback immediately to avoid a dead panel.`,retryProxyMode:`allorigins`,test:e=>[`youtube.com`,`youtu.be`,`twitch.tv`,`open.spotify.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This Google workspace page is not a reliable iframe target`,details:`Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.`,retryProxyMode:`allorigins`,test:e=>[`docs.google.com`,`drive.google.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))}];function Z(e){try{let t=new URL(e),n=le.find(e=>e.test(t));if(n)return n;let r=ue.find(e=>e.test(t));if(r)return r}catch{}return{disposition:`unknown`}}function de(e){return Z(e).disposition!==`blocked`}var fe=new Set([`htm`,`html`]);function Q(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function $(e,t){return`<!doctype html>
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
</html>`}function pe(e){return e.type===`folder`?`Folder`:typeof e.size==`number`?`${e.extension?.toUpperCase()??`FILE`} · ${e.size} bytes`:typeof e.content==`string`?`${e.extension?.toUpperCase()??`TEXT`} · ${e.content.length} chars`:e.extension?.toUpperCase()??`FILE`}function me(e){let t=h(e),n=t===`/`?[]:t.split(`/`).filter(Boolean),r=[{label:`Root`,path:`/`}],i=``;for(let e of n)i=`${i}/${e}`,r.push({label:e,path:i});return r.map((e,t)=>{let n=t===r.length-1,i=n?`<strong>${Q(e.label)}</strong>`:`<a href="${Q(e.path)}" data-browser-path="${Q(e.path)}">${Q(e.label)}</a>`;return n?i:`${i}<span class="is-separator">/</span>`}).join(``)}function he(e,t){let n=[];if(e!==`/`){let t=_(e);n.push(`
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
          <small>${Q(pe(e))}</small>
        </span>
      </a>
    `)}return n.length===0?`<div class="browser-local-directory__empty">This directory is empty.</div>`:`<div class="browser-local-directory__list">${n.join(``)}</div>`}function ge(e,t){let n=h(e),r=n===`/`?`Root`:n.split(`/`).filter(Boolean).at(-1)??n,i=me(n),a=he(n,t),o=`${t.length} ${t.length===1?`item`:`items`}`;return{kind:`local`,localKind:`directory`,title:r,displayUrl:n,note:`Local filesystem directory index rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(r,`
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
        `)}}}function _e(e){if(typeof e.content==`string`){if(fe.has(e.extension??``)||e.mimeType?.includes(`html`)){let t=O(e.content);return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Local filesystem preview rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(e.name,t)}}}return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Text file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<pre>${Q(e.content)}</pre>`)}}}if(typeof e.source==`string`){let t=Q(e.source);if(e.mimeType?.startsWith(`image/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Image file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><img src="${t}" alt="${Q(e.name)}" /></div>`)}};if(e.mimeType?.startsWith(`video/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Video file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><video src="${t}" controls playsinline></video></div>`)}};if(e.mimeType?.startsWith(`audio/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Audio file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><audio src="${t}" controls></audio></div>`)}}}return null}function ve(e,t){let n=e.trim();if(!n.startsWith(`/`))return{document:null,error:null};let r=h(n),i=g(t,r);if(!i)return{document:null,error:`Local file not found: ${r}`};if(i.kind===`directory`)return{document:ge(r,v(t,r)),error:null};let a=_e(m(i));return a?{document:a,error:null}:{document:null,error:`${i.name} cannot be rendered inside the Browser app.`}}var ye=9e3,be=12;function xe(e){switch(e){case`blocked`:return`Known restriction`;case`cached`:return`Likely blocked`;case`timeout`:return`No response`;case`error`:return`Load failed`;case`local`:return`Local preview`;default:return`Unavailable`}}function Se(e){switch(e){case`blocked`:case`cached`:return`Open the live page externally or switch to a proxy preview.`;case`timeout`:return`Try again, switch to a proxy preview, or open the live page externally.`;case`error`:return`This page did not render cleanly in the Web Viewer. External open is the safest option.`;case`local`:return`Open the file with its native app or use File Explorer for a different preview path.`;default:return`Try a different destination or return to a known local path.`}}function Ce(e){switch(e){case`blocked`:return`blocked`;case`cached`:return`cached`;case`error`:return`error`;case`local`:return`local`;case`timeout`:return`timeout`;default:return`missing`}}function we(e){switch(e){case`blocked`:return`blocked`;case`error`:return`error`;case`timeout`:return`timeout`;default:return null}}function Te({initialAddress:e,nodes:t}){let n=R(e??``)||`https://www.google.com/webhp?igu=1`,[r,i]=(0,k.useState)(n),[a,o]=(0,k.useState)([n]),[s,c]=(0,k.useState)(0),[l,u]=(0,k.useState)(`direct`),[d,f]=(0,k.useState)(`web`),[p,m]=(0,k.useState)(`idle`),[h,g]=(0,k.useState)(null),[_,v]=(0,k.useState)(0),[y,b]=(0,k.useState)([]),x=(0,k.useRef)(null),S=(0,k.useCallback)(()=>{x.current!=null&&(globalThis.window.clearTimeout(x.current),x.current=null)},[]);(0,k.useEffect)(()=>{S(),i(n),o([n]),c(0),u(`direct`),f(`web`),m(`idle`),g(null),v(0),b([])},[S,n]);let C=a[s]??n;(0,k.useEffect)(()=>{i(C)},[C]);let w=(0,k.useMemo)(()=>{let e=ve(C,t);if(e.document||e.error)return e;let n=L(C),r=Z(n);return{document:{kind:`remote`,title:z(n),displayUrl:n,note:l===`direct`?r.note??W[l]:W[l],frameSource:{kind:`src`,value:re(n,l)}},error:null}},[C,t,l]),T=w.document,E=(0,k.useCallback)((e,t)=>{if(!t)return;let n={url:t.displayUrl,proxyMode:l,reason:e,timestamp:Date.now()};if(b(e=>[...e.slice(-(be-1)),n]),t.kind===`remote`&&l===`direct`){let n=we(e);n&&X(t.displayUrl,n)}},[l]),D=(0,k.useCallback)((e,t,n,r)=>{S();let i=T?.title??(C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??C:z(L(C))),a=T?.displayUrl??C,o=Ce(n);f(`fallback`),m(`blocked`),g({kind:o,eyebrow:xe(o),recommendation:Se(o),title:i,url:a,message:e,details:t,retryProxyMode:T?.kind===`remote`?r??G(l):null}),E(n,T)},[T,S,C,l,E]);(0,k.useEffect)(()=>{if(S(),!w.document){f(`fallback`),m(`blocked`),g({kind:`missing`,eyebrow:`Unavailable`,recommendation:`Try a different destination or return to a known local path.`,title:C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??`Local file`:`Unable to open page`,url:C,message:w.error??`This page could not be resolved.`,details:C.startsWith(`/`)?`The requested local file could not be rendered in the Web Viewer.`:void 0,retryProxyMode:null});return}if(w.document.frameSource.kind===`srcDoc`){if(w.error){D(w.error,`The requested local file could not be rendered in the Web Viewer.`,`local`);return}f(`web`),m(`ready`),g(null);return}if(w.document.kind===`remote`&&l===`direct`){let e=ce(w.document.displayUrl);if(e&&e!==`ready`){D(`This site is likely to block the Web Viewer in direct mode`,`The site failed recently on this device, so the viewer is skipping the dead iframe step and sending you straight to safer options.`,`cached`,G(l));return}let t=Z(w.document.displayUrl);if(!de(w.document.displayUrl)&&t.disposition===`blocked`){D(t.message??`This site is restricted and cannot be embedded`,t.details,`blocked`,t.retryProxyMode??G(l));return}}return f(`web`),m(`loading`),g(null),x.current=globalThis.window.setTimeout(()=>{D(`This site did not finish rendering in the Web Viewer`,`The iframe did not finish loading before the timeout. Try opening the live page externally or switching to a different preview mode.`,`timeout`)},ye),()=>S()},[D,S,C,l,_,w]);let O=(0,k.useCallback)(()=>{S(),f(`web`),m(`idle`),g(null)},[S]),A=(0,k.useCallback)(e=>{let t=R(e);if(t){if(t===C){O(),v(e=>e+1);return}O(),v(0),i(t),o(e=>[...e.slice(0,s+1),t]),c(s+1)}},[C,s,O]),j=(0,k.useCallback)(()=>{O(),v(0),c(e=>Math.max(0,e-1))},[O]),M=(0,k.useCallback)(()=>{O(),v(0),c(e=>Math.min(a.length-1,e+1))},[a.length,O]),ee=(0,k.useCallback)(()=>{O(),v(e=>e+1)},[O]),N=(0,k.useCallback)(e=>{O(),u(e),v(e=>e+1)},[O]),P=(0,k.useCallback)(()=>{N(h?.retryProxyMode??G(l))},[N,h?.retryProxyMode,l]),F=(0,k.useCallback)(()=>{S(),T?.kind===`remote`&&l===`direct`&&X(T.displayUrl,`ready`),f(`web`),m(`ready`),g(null)},[T,S,l]),I=(0,k.useCallback)(()=>{S(),D(`This site reported a frame error in the Web Viewer`,`The iframe reported a loading error. Try opening the live page externally or switching to a different preview mode.`,`error`)},[D,S]);return{address:r,setAddress:i,currentUrl:C,proxyMode:l,setProxyMode:N,viewMode:d,loadState:p,fallback:h,resolvedDocument:T,refreshToken:_,failureHistory:y,canGoBack:s>0,canGoForward:s<a.length-1,visit:A,goBack:j,goForward:M,reload:ee,retryWithProxy:P,handleFrameLoad:F,handleFrameError:I}}var Ee=[{label:`Google`,url:`https://www.google.com/webhp?igu=1`},{label:`Wikipedia`,url:`https://www.wikipedia.org/`},{label:`Internet Archive`,url:`https://archive.org/`},{label:`Live portfolio`,url:`https://taan1el.github.io/taaniel-portfolio-os/`},{label:`GitHub profile`,url:`https://github.com/Taan1el`},{label:`Portfolio repo`,url:`https://github.com/Taan1el/taaniel-portfolio-os`}];function De({window:e}){let t=D(e=>e.nodes),{address:n,setAddress:r,currentUrl:i,proxyMode:a,setProxyMode:o,viewMode:s,loadState:c,fallback:l,resolvedDocument:u,refreshToken:d,canGoBack:f,canGoForward:p,visit:m,goBack:h,goForward:g,reload:_,retryWithProxy:v,handleFrameLoad:y,handleFrameError:b}=Te({initialAddress:(0,k.useMemo)(()=>e.payload?.externalUrl?.trim()||e.payload?.filePath?.trim()||`https://www.google.com/webhp?igu=1`,[e.payload?.externalUrl,e.payload?.filePath]),nodes:t}),x=u?.kind===`remote`,w=u?.displayUrl??i??n??`No URL loaded`,T=W[a],E=u?.kind===`local`?`Local`:a===`direct`?`Direct`:a===`wayback`?`Archive`:`Proxy`,O=u?.kind===`local`?`Local portfolio files render inside the viewer without iframe restrictions.`:W[a],A=()=>{!u||u.kind!==`remote`||globalThis.window.open(u.displayUrl,`_blank`,`noopener,noreferrer`)};return(0,B.jsxs)(S,{className:`browser-app`,children:[(0,B.jsx)(ie,{address:n,displayedUrl:w,proxyMode:a,loadState:c,securityIndicatorTitle:T,viewerStateLabel:E,viewerStateTitle:O,canGoBack:f,canGoForward:p,canOpenExternally:!!x,onAddressChange:r,onBack:h,onForward:g,onReload:_,onSubmit:()=>m(n),onProxyModeChange:o,onOpenInNewTab:A}),(0,B.jsxs)(C,{className:`browser-app__content`,padded:!1,scrollable:!1,stacked:!1,children:[(0,B.jsx)(ne,{bookmarks:Ee,activeUrl:u?.displayUrl??i,onVisit:m}),(0,B.jsx)(`section`,{className:`browser-app__viewport`,children:(0,B.jsx)(ae,{document:u,viewMode:s,loadState:c,fallback:l,refreshToken:d,canOpenExternally:!!x,onLocalNavigate:m,onFrameLoad:y,onFrameError:b,onOpenInNewTab:A,onRetryWithProxy:v})})]})]})}export{De as BrowserApp};