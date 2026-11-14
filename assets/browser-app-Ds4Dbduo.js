import{c as e,n as t,t as n}from"./jsx-runtime-BjLPPWvc.js";import{Ht as r,in as i,mn as a,nn as o}from"./index-D8gz7Vzr.js";import{t as s}from"./createLucideIcon-ChQmOrrd.js";import{t as c}from"./plus-C58sNzzO.js";import{t as l}from"./x-BbFZJtUu.js";import{r as u,t as d}from"./app-layout-D2NNAa5i.js";import{n as f}from"./titlebar-slot-BGlG-F2s.js";import{t as p}from"./check-VGi6m4GN.js";import{t as m}from"./copy-hBEesPUA.js";import{t as h}from"./external-link-DWupd0HU.js";import{t as g}from"./search-xdBW-yQm.js";import{t as _}from"./trash-2-DHtU6YXq.js";import{a as v,d as y,f as b,n as x,o as S,p as C}from"./filesystem-store-ufF_4ce8.js";import{t as w}from"./browser-store-rbtb-Vmw.js";import{t as T}from"./arrow-left-BBaE9LpR.js";import{t as E}from"./arrow-right-JKBdU2KJ.js";import{t as D}from"./file-text-D0WpMZF3.js";import{t as O}from"./lock-tQ24UA12.js";import{t as k}from"./rotate-cw-BmM4yew6.js";import{t as A}from"./star-BIARBRul.js";import{t as j}from"./triangle-alert-C-oXrflJ.js";import{n as M,r as N,t as P}from"./wifi-CMEEb26d.js";import{t as F}from"./settings-DwRUUGr-.js";import{a as I,r as ee}from"./device-store-BoyylHaN.js";import{n as te,t as L}from"./system-store-DPmnk6Sa.js";import{t as R}from"./sanitize-XyYEfoa5.js";var ne=s(`ellipsis`,[[`circle`,{cx:`12`,cy:`12`,r:`1`,key:`41hilf`}],[`circle`,{cx:`19`,cy:`12`,r:`1`,key:`1wjl8i`}],[`circle`,{cx:`5`,cy:`12`,r:`1`,key:`1pcz8c`}]]),re=s(`history`,[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}],[`path`,{d:`M12 7v5l4 2`,key:`1fdv2h`}]]),ie=s(`house`,[[`path`,{d:`M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8`,key:`5wwlr5`}],[`path`,{d:`M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z`,key:`r6nss1`}]]),z=s(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),B=s(`network`,[[`rect`,{x:`16`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`4q2zg0`}],[`rect`,{x:`2`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`8cvhb9`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`6`,rx:`1`,key:`1egb70`}],[`path`,{d:`M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3`,key:`1jsf9p`}],[`path`,{d:`M12 12V8`,key:`2874zd`}]]),V=e(t(),1),ae=e(a(),1),oe=`https://www.google.com/webhp?igu=1`,H=`browser://newtab`,U=`browser://history`,se=new Set([H,U]);function W(e){return se.has(e)}var ce=`https://www.google.com/search?igu=1&q=`,le=new Set([`http:`,`https:`]),ue=/^[a-z][a-z0-9+.-]*:/i,de=/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i,fe=/(^|\.)google\./i;function pe(e){let t=e.trim();return t?`${ce}${encodeURIComponent(t)}`:oe}function me(e){let t=e.trim();if(!t)return``;let n=t.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();if(n){if(!le.has(`${n}:`))return``;try{return new URL(t).toString()}catch{return``}}if(t.startsWith(`//`))try{return new URL(`https:${t}`).toString()}catch{return``}if(de.test(t))try{return new URL(`https://${t}`).toString()}catch{return``}return ue.test(t),``}function he(e){try{let t=new URL(e);return fe.test(t.hostname)&&((t.pathname===`/`||t.pathname===``)&&(t.pathname=`/webhp`),t.searchParams.set(`igu`,`1`)),t.toString()}catch{return e}}function G(e){let t=me(e);return t?he(t):pe(e)}function ge(e){let t=e.trim();return t?W(t.toLowerCase())?t.toLowerCase():t.startsWith(`/`)?b(t):G(t):``}function K(e){if(e===`browser://newtab`)return`New tab`;if(e===`browser://history`)return`History`;try{return new URL(e).hostname.replace(/^www\./i,``)||`Browser`}catch{return`Browser`}}var q=n();function _e(e){try{return new URL(e).hostname.replace(/^www\./i,``)}catch{return``}}function ve(e){let t=0;for(let n of e)t=t*31+n.charCodeAt(0)>>>0;return t%360}function J({url:e,size:t=16}){if(W(e))return(0,q.jsx)(i,{size:t});if(e.startsWith(`/`))return(0,q.jsx)(o,{size:t});let n=_e(e),r=(n[0]??`?`).toUpperCase();return(0,q.jsx)(`span`,{className:`w11-site-badge`,"aria-hidden":`true`,style:{width:t,height:t,fontSize:Math.round(t*.56),background:`hsl(${ve(n)} 52% 42%)`},children:r})}function Y(e){return _e(e)||e}function ye({onVisit:e}){let t=w(e=>e.favorites),n=w(e=>e.history),[r,i]=(0,V.useState)(``),a=(0,V.useMemo)(()=>{let e=new Set;return n.filter(t=>!e.has(t.url)&&(e.add(t.url),!0)).slice(0,5)},[n]);return(0,q.jsxs)(`div`,{className:`w11-newtab`,children:[(0,q.jsxs)(`form`,{className:`w11-newtab__search`,role:`search`,onSubmit:t=>{t.preventDefault(),r.trim()&&e(r)},children:[(0,q.jsx)(g,{size:18,"aria-hidden":`true`}),(0,q.jsx)(`input`,{autoFocus:!0,value:r,onChange:e=>i(e.target.value),placeholder:`Search the web or type a URL`,"aria-label":`Search the web or type a URL`})]}),t.length>0?(0,q.jsx)(`section`,{className:`w11-newtab__links`,"aria-label":`Quick links`,children:t.slice(0,8).map(t=>(0,q.jsxs)(`button`,{type:`button`,className:`w11-newtab__link`,title:t.url,onClick:()=>e(t.url),children:[(0,q.jsx)(J,{url:t.url,size:40}),(0,q.jsx)(`span`,{children:t.label})]},t.url))}):null,a.length>0?(0,q.jsxs)(`section`,{className:`w11-newtab__recent`,"aria-labelledby":`w11-newtab-recent`,children:[(0,q.jsx)(`h2`,{id:`w11-newtab-recent`,children:`Recently visited`}),a.map(t=>(0,q.jsxs)(`button`,{type:`button`,className:`w11-newtab__recent-row`,onClick:()=>e(t.url),children:[(0,q.jsx)(J,{url:t.url,size:20}),(0,q.jsx)(`span`,{children:t.title}),(0,q.jsx)(`small`,{children:Y(t.url)})]},t.visitedAt))]}):null,(0,q.jsx)(`p`,{className:`w11-newtab__note`,children:`Sites open inside this window when they allow it. If one refuses, use the … menu to open it in your own browser.`})]})}function be(e){let t=new Date(e),n=new Date,r=e=>new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime(),i=Math.round((r(n)-r(t))/864e5);return i===0?`Today`:i===1?`Yesterday`:t.toLocaleDateString([],{weekday:`long`,day:`numeric`,month:`long`})}function xe({onVisit:e}){let t=w(e=>e.history),n=w(e=>e.removeHistoryEntry),r=w(e=>e.clearHistory),[i,a]=(0,V.useState)(``),o=(0,V.useMemo)(()=>{let e=i.trim().toLowerCase(),n=e?t.filter(t=>`${t.title} ${t.url}`.toLowerCase().includes(e)):t,r=new Map;return n.forEach(e=>{let t=be(e.visitedAt);r.set(t,[...r.get(t)??[],e])}),Array.from(r.entries())},[i,t]);return(0,q.jsxs)(`div`,{className:`w11-history`,children:[(0,q.jsxs)(`header`,{className:`w11-history__header`,children:[(0,q.jsx)(`h1`,{children:`History`}),(0,q.jsxs)(`label`,{className:`w11-history__search`,children:[(0,q.jsx)(g,{size:14,"aria-hidden":`true`}),(0,q.jsx)(`input`,{value:i,onChange:e=>a(e.target.value),placeholder:`Search history`,"aria-label":`Search history`})]}),(0,q.jsxs)(`button`,{type:`button`,className:`w11-button`,disabled:t.length===0,onClick:()=>{globalThis.confirm(`Clear your browsing history in this browser?`)&&r()},children:[(0,q.jsx)(_,{size:14,"aria-hidden":`true`}),`Clear browsing data`]})]}),o.length===0?(0,q.jsx)(`p`,{className:`w11-history__empty`,children:t.length===0?`Pages you visit will show up here.`:`No history matches your search.`}):o.map(([t,r])=>(0,q.jsxs)(`section`,{className:`w11-history__group`,"aria-label":t,children:[(0,q.jsx)(`h2`,{children:t}),r.map(t=>(0,q.jsxs)(`div`,{className:`w11-history__row`,children:[(0,q.jsxs)(`button`,{type:`button`,className:`w11-history__open`,onClick:()=>e(t.url),title:t.url,children:[(0,q.jsx)(J,{url:t.url,size:16}),(0,q.jsx)(`span`,{className:`w11-history__title`,children:t.title}),(0,q.jsx)(`span`,{className:`w11-history__host`,children:Y(t.url)})]}),(0,q.jsx)(`time`,{dateTime:new Date(t.visitedAt).toISOString(),children:new Date(t.visitedAt).toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}),(0,q.jsx)(`button`,{type:`button`,className:`w11-history__remove`,"aria-label":`Remove ${t.title} from history`,onClick:()=>n(t.visitedAt),children:(0,q.jsx)(l,{size:14})})]},t.visitedAt))]},t))]})}var X={secure:{icon:O,label:`Connection is secure`},insecure:{icon:j,label:`Not secure`},local:{icon:D,label:`File on this PC`},internal:{icon:g,label:`Browser page`}};function Se({address:e,security:t,loadState:n,canGoBack:i,canGoForward:a,isFavorite:o,canFavorite:s,focusAddressNonce:c,onAddressChange:l,onSubmit:u,onRevert:d,onBack:f,onForward:p,onReload:m,onHome:h,onToggleFavorite:g,onMenu:_}){let v=(0,V.useRef)(null),[y,b]=(0,V.useState)(!1),x=X[t].icon,S=e===`browser://newtab`?``:e;return(0,V.useEffect)(()=>{c!==0&&(v.current?.focus(),v.current?.select())},[c]),(0,q.jsxs)(`div`,{className:`w11-browser__toolbar`,children:[(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:f,disabled:!i,"aria-label":`Back (Alt+Left)`,title:`Back (Alt+Left)`,children:(0,q.jsx)(T,{size:16})}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:p,disabled:!a,"aria-label":`Forward (Alt+Right)`,title:`Forward (Alt+Right)`,children:(0,q.jsx)(E,{size:16})}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:m,"aria-label":`Refresh (F5)`,title:`Refresh (F5)`,children:(0,q.jsx)(k,{size:15,className:r(n===`loading`&&`is-spinning`)})}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:h,"aria-label":`Home (Alt+Home)`,title:`Home (Alt+Home)`,children:(0,q.jsx)(ie,{size:16})}),(0,q.jsxs)(`form`,{className:r(`w11-browser__address`,y&&`is-editing`),onSubmit:e=>{e.preventDefault(),u(),v.current?.blur()},children:[(0,q.jsxs)(`span`,{className:r(`w11-browser__security`,`is-${t}`),title:X[t].label,"aria-label":X[t].label,role:`img`,children:[(0,q.jsx)(x,{size:14}),t===`insecure`?(0,q.jsx)(`span`,{children:`Not secure`}):null]}),(0,q.jsx)(`input`,{ref:v,value:S,placeholder:`Search or enter web address`,"aria-label":`Address and search bar`,spellCheck:!1,autoComplete:`off`,onChange:e=>l(e.target.value),onFocus:e=>{b(!0),e.currentTarget.select()},onBlur:()=>b(!1),onKeyDown:e=>{e.key===`Escape`&&(e.preventDefault(),d(),e.currentTarget.blur())}}),(0,q.jsx)(`button`,{type:`button`,className:r(`w11-browser__star`,o&&`is-favorite`),onClick:g,disabled:!s,"aria-pressed":o,"aria-label":o?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,title:o?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,children:(0,q.jsx)(A,{size:15})})]}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:_,"aria-label":`Settings and more`,title:`Settings and more`,"aria-haspopup":`menu`,children:(0,q.jsx)(ne,{size:16})})]})}var Z={direct:{kind:`direct`,label:`Direct`,note:`Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.`,transform:e=>e},allorigins:{kind:`proxy`,label:`AllOrigins`,note:`Public proxy preview through AllOrigins. When the service is degraded it can show its own timeout page — reload or switch to Wayback if that happens.`,transform:e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`},wayback:{kind:`proxy`,label:`Wayback`,note:`Loads the latest web.archive.org snapshot in a frame-friendly view. Archived pages may differ from the current live site.`,transform:e=>`https://web.archive.org/web/2if_/${Ce(e)}`}};function Ce(e){try{return new URL(e).href}catch{return encodeURI(e)}}var we=Object.keys(Z),Te=Object.fromEntries(we.map(e=>[e,Z[e].label])),Ee=Object.fromEntries(we.map(e=>[e,Z[e].note]));function De(e,t){return Z[t].transform(e)}function Oe(e){switch(e){case`direct`:return`allorigins`;case`allorigins`:return`wayback`;case`wayback`:return`allorigins`;default:return`allorigins`}}var ke={airplane:{label:`Turn off airplane mode`,icon:N,apply:()=>I.getState().setAirplaneMode(!1)},"wifi-off":{label:`Turn Wi-Fi on`,icon:P,apply:()=>I.getState().setWifiEnabled(!0)},"no-internet":null};function Ae({fallback:e,status:t}){let n=L(e=>e.launchApp),r=ke[t];return(0,q.jsxs)(`div`,{className:`w11-browser__error`,role:`alert`,children:[t===`airplane`?(0,q.jsx)(N,{className:`w11-browser__error-art`,size:72,strokeWidth:1.4,color:`#8a8a8a`,"aria-hidden":`true`}):(0,q.jsx)(M,{className:`w11-browser__error-art`,size:72,strokeWidth:1.4,color:`#8a8a8a`,"aria-hidden":`true`}),(0,q.jsx)(`h2`,{children:e.title}),(0,q.jsx)(`p`,{children:e.message}),e.details?(0,q.jsx)(`p`,{className:`w11-browser__error-details`,children:e.details}):null,(0,q.jsx)(`code`,{children:e.url}),(0,q.jsxs)(`div`,{className:`w11-browser__error-actions`,children:[r?(0,q.jsxs)(`button`,{type:`button`,className:`w11-button w11-button--accent`,onClick:r.apply,children:[(0,q.jsx)(r.icon,{size:14,"aria-hidden":`true`}),r.label]}):null,(0,q.jsxs)(`button`,{type:`button`,className:r?`w11-button`:`w11-button w11-button--accent`,onClick:()=>n({appId:`settings`,payload:{section:`network`}}),children:[(0,q.jsx)(F,{size:14,"aria-hidden":`true`}),`Network settings`]})]})]})}function je({fallback:e,canOpenExternally:t,onOpenInNewTab:n,onRetryWithProxy:r}){if(e.offlineStatus)return(0,q.jsx)(Ae,{fallback:e,status:e.offlineStatus});let i=Y(e.url);return(0,q.jsxs)(`div`,{className:`w11-browser__error`,role:`alert`,children:[(0,q.jsxs)(`svg`,{className:`w11-browser__error-art`,width:`72`,height:`72`,viewBox:`0 0 48 48`,"aria-hidden":`true`,children:[(0,q.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`28`,rx:`4`,fill:`#3a3a3a`}),(0,q.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`7`,rx:`3`,fill:`#4a4a4a`}),(0,q.jsx)(`circle`,{cx:`11`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,q.jsx)(`circle`,{cx:`15.5`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,q.jsx)(`path`,{d:`M18 24l12 10M30 24L18 34`,stroke:`#8a8a8a`,strokeWidth:`2.6`,strokeLinecap:`round`})]}),(0,q.jsx)(`h2`,{children:t?`${i} refused to connect inside this window`:e.title}),(0,q.jsx)(`p`,{children:e.message}),e.details?(0,q.jsx)(`p`,{className:`w11-browser__error-details`,children:e.details}):null,(0,q.jsx)(`code`,{children:e.url}),(0,q.jsxs)(`div`,{className:`w11-browser__error-actions`,children:[(0,q.jsxs)(`button`,{type:`button`,className:`w11-button w11-button--accent`,onClick:n,disabled:!t,children:[(0,q.jsx)(h,{size:14,"aria-hidden":`true`}),`Open in your browser`]}),(0,q.jsxs)(`button`,{type:`button`,className:`w11-button`,onClick:r,disabled:!e.retryProxyMode,children:[(0,q.jsx)(B,{size:14,"aria-hidden":`true`}),e.retryProxyMode?`Try ${Te[e.retryProxyMode]}`:`Try a proxy`]})]})]})}var Me=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts`,Ne=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin`;function Pe({document:e,viewMode:t,loadState:n,fallback:r,refreshToken:i,canOpenExternally:a,onLocalNavigate:o,onFrameLoad:s,onFrameError:c,onOpenInNewTab:l,onRetryWithProxy:u}){let d=(0,V.useRef)(null),f=typeof HTMLIFrameElement<`u`&&`credentialless`in HTMLIFrameElement.prototype,p=(0,V.useCallback)(()=>{if(e?.kind===`local`&&e.localKind===`directory`)try{let e=d.current?.contentDocument;e&&e.body.dataset.browserLocalBound!==`true`&&(e.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-browser-path]`);if(!(n instanceof HTMLElement))return;let r=n.getAttribute(`data-browser-path`);r&&(e.preventDefault(),o(r))}),e.body.dataset.browserLocalBound=`true`)}catch{}s()},[e,s,o]);if(t===`fallback`){let t=r??{title:e?.title??`Unable to open page`,url:e?.displayUrl??`No URL available`,message:`This site cannot be embedded due to browser restrictions`};return(0,q.jsx)(je,{fallback:t,canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}return e?(0,q.jsxs)(`div`,{className:`browser-app__frame-shell`,"data-state":n,children:[n===`loading`?(0,q.jsx)(`div`,{className:`browser-app__loading-bar`,"aria-hidden":`true`,children:(0,q.jsx)(`span`,{})}):null,(0,q.jsx)(`iframe`,{ref:d,src:e.frameSource.kind===`src`?e.frameSource.value:void 0,srcDoc:e.frameSource.kind===`srcDoc`?e.frameSource.value:void 0,title:e.title,sandbox:e.kind===`local`?Ne:Me,referrerPolicy:`no-referrer`,credentialless:f?`credentialless`:void 0,onLoad:p,onError:c},`${e.displayUrl}:${e.frameSource.kind}:${e.frameSource.value}:${i}`)]}):(0,q.jsx)(je,{fallback:{title:`Unable to open page`,url:`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}var Fe=[{disposition:`direct`,note:`Local and GitHub Pages sites usually render directly inside the Browser window.`,test:e=>e.hostname===`localhost`||e.hostname===`127.0.0.1`||e.hostname.endsWith(`.github.io`)},{disposition:`direct`,note:`Google pages using igu=1 are routed through the iframe-friendly variant.`,test:e=>/(^|\.)google\./i.test(e.hostname)&&e.searchParams.get(`igu`)===`1`},{disposition:`direct`,note:`Wikipedia is a reliable direct target for the Browser viewer.`,test:e=>/(^|\.)wikipedia\.org$/i.test(e.hostname)},{disposition:`direct`,note:`Internet Archive pages are generally safe to try in direct mode.`,test:e=>/(^|\.)archive\.org$/i.test(e.hostname)}],Ie=[{disposition:`blocked`,message:`GitHub cannot be embedded directly in this Browser window`,details:`GitHub sends frame protections, so the Browser switches straight to fallback instead of waiting on a blank iframe.`,retryProxyMode:`allorigins`,test:e=>/(^|\.)github\.com$/i.test(e.hostname)},{disposition:`blocked`,message:`This social or auth-heavy site is known to block iframe embedding`,details:`Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.`,retryProxyMode:`allorigins`,test:e=>[`linkedin.com`,`instagram.com`,`facebook.com`,`x.com`,`twitter.com`,`tiktok.com`,`discord.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This streaming platform does not embed cleanly inside the Browser window`,details:`Video platforms typically require full browser privileges or special embeds. The Browser shows fallback immediately to avoid a dead panel.`,retryProxyMode:`allorigins`,test:e=>[`youtube.com`,`youtu.be`,`twitch.tv`,`open.spotify.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This Google workspace page is not a reliable iframe target`,details:`Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.`,retryProxyMode:`allorigins`,test:e=>[`docs.google.com`,`drive.google.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))}];function Le(e){try{let t=new URL(e),n=Fe.find(e=>e.test(t));if(n)return n;let r=Ie.find(e=>e.test(t));if(r)return r}catch{}return{disposition:`unknown`}}function Re(e){return Le(e).disposition!==`blocked`}var ze=new Set([`htm`,`html`]),Be=/^(?:https?:\/\/|blob:|\/|data:(?:image|video|audio)\/)/i;function Q(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function $(e,t){return`<!doctype html>
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
</html>`}function Ve(e){return e.type===`folder`?`Folder`:typeof e.size==`number`?`${e.extension?.toUpperCase()??`FILE`} · ${e.size} bytes`:typeof e.content==`string`?`${e.extension?.toUpperCase()??`TEXT`} · ${e.content.length} chars`:e.extension?.toUpperCase()??`FILE`}function He(e){let t=b(e),n=t===`/`?[]:t.split(`/`).filter(Boolean),r=[{label:`Root`,path:`/`}],i=``;for(let e of n)i=`${i}/${e}`,r.push({label:e,path:i});return r.map((e,t)=>{let n=t===r.length-1,i=n?`<strong>${Q(e.label)}</strong>`:`<a href="${Q(e.path)}" data-browser-path="${Q(e.path)}">${Q(e.label)}</a>`;return n?i:`${i}<span class="is-separator">/</span>`}).join(``)}function Ue(e,t){let n=[];if(e!==`/`){let t=S(e);n.push(`
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
          <small>${Q(Ve(e))}</small>
        </span>
      </a>
    `)}return n.length===0?`<div class="browser-local-directory__empty">This directory is empty.</div>`:`<div class="browser-local-directory__list">${n.join(``)}</div>`}function We(e,t){let n=b(e),r=n===`/`?`Root`:n.split(`/`).filter(Boolean).at(-1)??n,i=He(n),a=Ue(n,t),o=`${t.length} ${t.length===1?`item`:`items`}`;return{kind:`local`,localKind:`directory`,title:r,displayUrl:n,note:`Local filesystem directory index rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(r,`
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
        `)}}}function Ge(e){if(typeof e.content==`string`){if(ze.has(e.extension??``)||e.mimeType?.includes(`html`)){let t=R(e.content);return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Local filesystem preview rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(e.name,t)}}}return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Text file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<pre>${Q(e.content)}</pre>`)}}}if(typeof e.source==`string`&&Be.test(e.source.trim())){let t=Q(e.source);if(e.mimeType?.startsWith(`image/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Image file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><img src="${t}" alt="${Q(e.name)}" /></div>`)}};if(e.mimeType?.startsWith(`video/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Video file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><video src="${t}" controls playsinline></video></div>`)}};if(e.mimeType?.startsWith(`audio/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Audio file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><audio src="${t}" controls></audio></div>`)}}}return null}function Ke(e,t){let n=e.trim();if(!n.startsWith(`/`))return{document:null,error:null};let r=b(n),i=v(t,r);if(!i)return{document:null,error:`Local file not found: ${r}`};if(i.kind===`directory`)return{document:We(r,y(t,r)),error:null};let a=Ge(C(i));return a?{document:a,error:null}:{document:null,error:`${i.name} cannot be rendered inside the Browser app.`}}var qe={"no-internet":{message:`You're not connected to the internet`,details:`Check your network cables, modem and router, or reconnect to Wi-Fi. The page loads by itself once you're back online.`},"wifi-off":{message:`Wi-Fi is turned off`,details:`Turn Wi-Fi on to browse the web. The page loads by itself once you're connected.`},airplane:{message:`Airplane mode is on`,details:`Turn off airplane mode to browse the web. The page loads by itself once you're connected.`}};function Je(e,t){let{message:n,details:r}=qe[t];return{title:`No internet`,url:e,message:n,details:r,retryProxyMode:null,offlineStatus:t}}var Ye=9e3,Xe=16e3;function Ze({initialAddress:e,nodes:t}){let n=ge(e??``)||`https://www.google.com/webhp?igu=1`,[r,i]=(0,V.useState)(n),[a,o]=(0,V.useState)([n]),[s,c]=(0,V.useState)(0),[l,u]=(0,V.useState)(`direct`),[d,f]=(0,V.useState)(`web`),[p,m]=(0,V.useState)(`idle`),[h,g]=(0,V.useState)(null),[_,v]=(0,V.useState)(0),[y,b]=(0,V.useState)([]),x=(0,V.useRef)(null),S=I(ee),C=(0,V.useCallback)(()=>{x.current!=null&&(globalThis.window.clearTimeout(x.current),x.current=null)},[]);(0,V.useEffect)(()=>{C(),i(n),o([n]),c(0),u(`direct`),f(`web`),m(`idle`),g(null),v(0),b([])},[C,n]);let w=a[s]??n;(0,V.useEffect)(()=>{i(w)},[w]);let T=W(w),E=(0,V.useMemo)(()=>{if(W(w))return{document:null,error:null};let e=Ke(w,t);if(e.document||e.error)return e;let n=G(w),r=Le(n);return{document:{kind:`remote`,title:K(n),displayUrl:n,note:l===`direct`?r.note??Ee[l]:Ee[l],frameSource:{kind:`src`,value:De(n,l)}},error:null}},[w,t,l]),D=E.document,O=(0,V.useCallback)((e,t)=>{if(!t)return;let n={url:t.displayUrl,proxyMode:l,reason:e,timestamp:Date.now()};b(e=>[...e.slice(-11),n])},[l]),k=(0,V.useCallback)((e,t,n,r)=>{C();let i=D?.title??(w.startsWith(`/`)?w.split(`/`).filter(Boolean).at(-1)??w:K(G(w))),a=D?.displayUrl??w;f(`fallback`),m(`blocked`),g({title:i,url:a,message:e,details:t,retryProxyMode:D?.kind===`remote`?r??Oe(l):null}),O(n,D)},[D,C,w,l,O]);(0,V.useEffect)(()=>{if(C(),W(w))f(`web`),m(`ready`),g(null);else if(!E.document)f(`fallback`),m(`blocked`),g({title:w.startsWith(`/`)?w.split(`/`).filter(Boolean).at(-1)??`Local file`:`Unable to open page`,url:w,message:E.error??`This page could not be resolved.`,details:w.startsWith(`/`)?`The requested local file could not be rendered in the Browser app.`:void 0,retryProxyMode:null});else if(E.document.frameSource.kind===`srcDoc`){if(E.error){k(E.error,`The requested local file could not be rendered in the Browser app.`,`local`);return}f(`web`),m(`ready`),g(null)}else if(E.document.kind===`remote`&&S!==`connected`)f(`fallback`),m(`blocked`),g(Je(E.document.displayUrl,S));else{if(E.document.kind===`remote`&&l===`direct`){let e=Le(E.document.displayUrl);if(!Re(E.document.displayUrl)&&e.disposition===`blocked`){k(e.message??`This site is restricted and cannot be embedded`,e.details,`blocked`,e.retryProxyMode??Oe(l));return}}return f(`web`),m(`loading`),g(null),x.current=globalThis.window.setTimeout(()=>{k(`This site cannot be embedded due to browser restrictions`,`The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.`,`timeout`)},l===`direct`?Ye:Xe),()=>C()}},[k,C,w,S,l,_,E]);let A=(0,V.useCallback)(()=>{C(),f(`web`),m(`idle`),g(null)},[C]),j=(0,V.useCallback)(e=>{let t=ge(e);t&&(t===w?(A(),v(e=>e+1)):(A(),v(0),i(t),o(e=>[...e.slice(0,s+1),t]),c(s+1)))},[w,s,A]),M=(0,V.useCallback)(()=>{A(),v(0),c(e=>Math.max(0,e-1))},[A]),N=(0,V.useCallback)(()=>{A(),v(0),c(e=>Math.min(a.length-1,e+1))},[a.length,A]),P=(0,V.useCallback)(()=>{A(),v(e=>e+1)},[A]),F=(0,V.useCallback)(e=>{A(),u(e),v(e=>e+1)},[A]),te=(0,V.useCallback)(()=>{let e=h?.retryProxyMode??Oe(l);F(e)},[F,h?.retryProxyMode,l]),L=(0,V.useCallback)(()=>{C(),f(`web`),m(`ready`),g(null)},[C]),R=(0,V.useCallback)(()=>{C(),k(`This site cannot be embedded due to browser restrictions`,`The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.`,`error`)},[k,C]);return{address:r,setAddress:i,currentUrl:w,proxyMode:l,setProxyMode:F,viewMode:d,loadState:p,fallback:h,resolvedDocument:D,isInternal:T,refreshToken:_,failureHistory:y,canGoBack:s>0,canGoForward:s<a.length-1,visit:j,goBack:M,goForward:N,reload:P,retryWithProxy:te,handleFrameLoad:L,handleFrameError:R}}var Qe=[{mode:`direct`,label:`Load directly`},{mode:`allorigins`,label:`Load through the AllOrigins proxy`},{mode:`wayback`,label:`Load from the Web Archive`}];function $e({tabId:e,active:t,initialAddress:n,nodes:i,onMeta:a,onNewTab:o}){let{address:s,setAddress:l,currentUrl:u,proxyMode:d,setProxyMode:f,viewMode:g,loadState:_,fallback:v,resolvedDocument:y,isInternal:b,refreshToken:x,canGoBack:S,canGoForward:C,visit:T,goBack:E,goForward:D,reload:O,retryWithProxy:k,handleFrameLoad:A,handleFrameError:j}=Ze({initialAddress:n,nodes:i}),M=w(e=>e.favorites),N=w(e=>e.toggleFavorite),P=w(e=>e.recordVisit),F=te(e=>e.setContextMenu),[I,ee]=(0,V.useState)(0),L=y?.kind===`remote`?y.displayUrl:null,R=b?K(u):y?.title??K(u),ne=!!(L&&M.some(e=>e.url===L)),ie=b?`internal`:y?.kind===`local`?`local`:L?.startsWith(`https:`)?`secure`:`insecure`;(0,V.useEffect)(()=>{a(e,{title:R,url:u,loading:_===`loading`})},[u,_,a,e,R]),(0,V.useEffect)(()=>{L&&P(L,R)},[P,L,R]);let z=(0,V.useCallback)(()=>{L&&globalThis.open(L,`_blank`,`noopener,noreferrer`)},[L]),B=()=>{L&&N({url:L,label:R})};return(0,q.jsxs)(`div`,{className:r(`w11-browser__panel`,t&&`is-active`),role:`tabpanel`,"aria-hidden":!t,onKeyDown:e=>{let t=e.key.toLowerCase(),n=e.ctrlKey||e.metaKey;n&&t===`l`?(e.preventDefault(),ee(e=>e+1)):n&&t===`d`?(e.preventDefault(),B()):n&&t===`h`?(e.preventDefault(),T(U)):e.key===`F5`||n&&t===`r`?(e.preventDefault(),O()):e.altKey&&e.key===`ArrowLeft`?(e.preventDefault(),E()):e.altKey&&e.key===`ArrowRight`?(e.preventDefault(),D()):e.altKey&&e.key===`Home`&&(e.preventDefault(),T(H))},children:[(0,q.jsx)(Se,{address:s,security:ie,loadState:_,canGoBack:S,canGoForward:C,isFavorite:ne,canFavorite:!!L,focusAddressNonce:I,onAddressChange:l,onSubmit:()=>T(s),onRevert:()=>l(u),onBack:E,onForward:D,onReload:O,onHome:()=>T(H),onToggleFavorite:B,onMenu:e=>{e.stopPropagation();let t=e.currentTarget.getBoundingClientRect(),n=[{id:`new-tab`,label:`New tab`,icon:c,onSelect:()=>o()},{id:`history`,label:`History`,icon:re,shortcut:`Ctrl+H`,onSelect:()=>T(U)},{id:`sep-1`,label:``,separator:!0,onSelect:()=>{}},{id:`external`,label:`Open in your browser`,icon:h,disabled:!L,onSelect:z},{id:`copy-link`,label:`Copy link`,icon:m,disabled:!L,onSelect:()=>{L&&navigator.clipboard?.writeText(L).catch(()=>void 0)}},{id:`sep-2`,label:``,separator:!0,onSelect:()=>{}},...Qe.map(e=>({id:`proxy-${e.mode}`,label:e.label,icon:d===e.mode?p:void 0,disabled:!L,onSelect:()=>f(e.mode)}))];F({x:t.right-260,y:t.bottom+4,title:`Settings and more`,actions:n})}}),M.length>0?(0,q.jsx)(`div`,{className:`w11-browser__favorites`,role:`toolbar`,"aria-label":`Favorites`,children:M.map(e=>(0,q.jsxs)(`button`,{type:`button`,className:`w11-browser__favorite`,title:e.url,onClick:()=>T(e.url),children:[(0,q.jsx)(J,{url:e.url,size:16}),(0,q.jsx)(`span`,{children:e.label})]},e.url))}):null,(0,q.jsx)(`section`,{className:`browser-app__viewport w11-browser__viewport`,children:b?u===`browser://history`?(0,q.jsx)(xe,{onVisit:T}):(0,q.jsx)(ye,{onVisit:T}):(0,q.jsx)(Pe,{document:y,viewMode:g,loadState:_,fallback:v,refreshToken:x,canOpenExternally:!!L,onLocalNavigate:T,onFrameLoad:A,onFrameError:j,onOpenInNewTab:z,onRetryWithProxy:k})})]})}var et=0,tt=()=>`tab-${et+=1}`;function nt({window:e}){let t=x(e=>e.nodes),n=L(e=>e.closeWindow),i=f(),a=(0,V.useMemo)(()=>e.payload?.externalUrl?.trim()||e.payload?.filePath?.trim()||`browser://newtab`,[e.payload?.externalUrl,e.payload?.filePath]),[{tabs:o,activeId:s},p]=(0,V.useState)(()=>{let e=tt();return{tabs:[{id:e,initialAddress:a}],activeId:e}}),[m,h]=(0,V.useState)({}),g=(0,V.useCallback)((e,t)=>{h(n=>{let r=n[e];return r&&r.title===t.title&&r.url===t.url&&r.loading===t.loading?n:{...n,[e]:t}})},[]),_=(0,V.useCallback)((e=H)=>{let t=tt();p(n=>({tabs:[...n.tabs,{id:t,initialAddress:e}],activeId:t}))},[]),v=(0,V.useCallback)(t=>{if(o.length===1){n(e.id);return}let r=o.findIndex(e=>e.id===t),i=o.filter(e=>e.id!==t),a=t===s?(i[r]??i[r-1]).id:s;p({tabs:i,activeId:a}),h(({[t]:e,...n})=>n)},[s,n,o,e.id]),y=(0,V.useRef)(a);(0,V.useEffect)(()=>{a!==y.current&&(y.current=a,_(a))},[_,a]);let b=e=>p(t=>({...t,activeId:e})),S=e=>{let t=e.ctrlKey||e.metaKey,n=e.key.toLowerCase();if(t){if(n===`t`)e.preventDefault(),_();else if(n===`w`)e.preventDefault(),v(s);else if(e.key===`Tab`){e.preventDefault();let t=o.findIndex(e=>e.id===s),n=e.shiftKey?-1:1;b(o[(t+n+o.length)%o.length].id)}else if(/^[1-9]$/.test(e.key)){e.preventDefault();let t=e.key===`9`?o.at(-1):o[Number(e.key)-1];t&&b(t.id)}}},C=(0,q.jsxs)(`div`,{className:`w11-browser__tabs`,role:`tablist`,"aria-label":`Tabs`,children:[o.map(e=>{let t=m[e.id],n=e.id===s,i=t?.title??`New tab`;return(0,q.jsxs)(`div`,{role:`tab`,tabIndex:n?0:-1,"aria-selected":n,className:r(`w11-browser__tab`,n&&`is-active`),title:i,onClick:()=>b(e.id),onDoubleClick:e=>e.stopPropagation(),onAuxClick:t=>{t.button===1&&v(e.id)},onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&b(e.id)},children:[(0,q.jsx)(`span`,{className:`w11-browser__tab-icon`,"aria-hidden":`true`,children:t?.loading?(0,q.jsx)(z,{size:14,className:`is-spinning`}):(0,q.jsx)(J,{url:t?.url??`browser://newtab`,size:16})}),(0,q.jsx)(`span`,{className:`w11-browser__tab-title`,children:i}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__tab-close`,"aria-label":`Close ${i}`,onClick:t=>{t.stopPropagation(),v(e.id)},children:(0,q.jsx)(l,{size:12})})]},e.id)}),(0,q.jsx)(`button`,{type:`button`,className:`w11-browser__new-tab`,"aria-label":`New tab`,title:`New tab`,onClick:()=>_(),onDoubleClick:e=>e.stopPropagation(),children:(0,q.jsx)(c,{size:16})})]});return(0,q.jsxs)(u,{className:`browser-app w11-browser`,onKeyDown:S,children:[i?(0,ae.createPortal)(C,i):C,(0,q.jsx)(d,{className:`browser-app__content w11-browser__body`,padded:!1,scrollable:!1,stacked:!1,children:o.map(e=>(0,q.jsx)($e,{tabId:e.id,active:e.id===s,initialAddress:e.initialAddress,nodes:t,onMeta:g,onNewTab:_},e.id))})]})}export{nt as BrowserApp};