import{o as e}from"./chunk-CMxvf4Kt.js";import{o as t,t as n}from"./index-Bahmndm6.js";import{_ as r,h as i}from"./logo-mark-BZgz8fF6.js";import{a,i as o,n as s,r as c,t as l}from"./rotate-cw-DVjvuygp.js";import{t as u}from"./copy-L76fhNvK.js";import{t as d}from"./file-text-ClpRi-Zo.js";import{p as f,r as p,t as m}from"./app-layout-zydN-KKe.js";import{n as h,t as g}from"./x-aqRIb4Ke.js";import{n as _}from"./utils-CG4LCuSb.js";import{S as v,f as y,k as b,p as x,y as S}from"./system-workspace-CttjOipE.js";import{t as C}from"./react-BRIcuCai.js";import{M as w,N as T,j as E,k as D}from"./window-store-Dx4xbi6n.js";import{t as O}from"./safe-storage-j5F8-4n-.js";import{t as k}from"./filesystem-store-DbtgFFXe.js";import{n as ee,t as A}from"./system-store-Dw1cg6J-.js";import{t as j}from"./sanitize-CZyhLeBM.js";var M=r(`ellipsis`,[[`circle`,{cx:`12`,cy:`12`,r:`1`,key:`41hilf`}],[`circle`,{cx:`19`,cy:`12`,r:`1`,key:`1wjl8i`}],[`circle`,{cx:`5`,cy:`12`,r:`1`,key:`1pcz8c`}]]),N=r(`history`,[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}],[`path`,{d:`M12 7v5l4 2`,key:`1fdv2h`}]]),P=r(`house`,[[`path`,{d:`M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8`,key:`5wwlr5`}],[`path`,{d:`M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z`,key:`r6nss1`}]]),F=r(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),te=r(`lock`,[[`rect`,{width:`18`,height:`11`,x:`3`,y:`11`,rx:`2`,ry:`2`,key:`1w4ew1`}],[`path`,{d:`M7 11V7a5 5 0 0 1 10 0v4`,key:`fwvmzm`}]]),ne=r(`network`,[[`rect`,{x:`16`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`4q2zg0`}],[`rect`,{x:`2`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`8cvhb9`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`6`,rx:`1`,key:`1egb70`}],[`path`,{d:`M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3`,key:`1jsf9p`}],[`path`,{d:`M12 12V8`,key:`2874zd`}]]),I=r(`star`,[[`path`,{d:`M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z`,key:`r04s7s`}]]),L=r(`triangle-alert`,[[`path`,{d:`m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3`,key:`wmoenq`}],[`path`,{d:`M12 9v4`,key:`juzpu7`}],[`path`,{d:`M12 17h.01`,key:`p32p05`}]]),R=e(t(),1),re=`https://www.google.com/webhp?igu=1`,z=`browser://newtab`,B=`browser://history`,ie=new Set([z,B]);function V(e){return ie.has(e)}var H=`https://www.google.com/search?igu=1&q=`,ae=new Set([`http:`,`https:`]),oe=/^[a-z][a-z0-9+.-]*:/i,se=/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i,ce=/(^|\.)google\./i;function le(e){let t=e.trim();return t?`${H}${encodeURIComponent(t)}`:re}function ue(e){let t=e.trim();if(!t)return``;let n=t.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();if(n){if(!ae.has(`${n}:`))return``;try{return new URL(t).toString()}catch{return``}}if(t.startsWith(`//`))try{return new URL(`https:${t}`).toString()}catch{return``}if(se.test(t))try{return new URL(`https://${t}`).toString()}catch{return``}return oe.test(t),``}function de(e){try{let t=new URL(e);return ce.test(t.hostname)&&((t.pathname===`/`||t.pathname===``)&&(t.pathname=`/webhp`),t.searchParams.set(`igu`,`1`)),t.toString()}catch{return e}}function U(e){let t=ue(e);return t?de(t):le(e)}function fe(e){let t=e.trim();return t?V(t.toLowerCase())?t.toLowerCase():t.startsWith(`/`)?v(t):U(t):``}function W(e){if(e===`browser://newtab`)return`New tab`;if(e===`browser://history`)return`History`;try{return new URL(e).hostname.replace(/^www\./i,``)||`Browser`}catch{return`Browser`}}var G=n();function pe(e){try{return new URL(e).hostname.replace(/^www\./i,``)}catch{return``}}function me(e){let t=0;for(let n of e)t=t*31+n.charCodeAt(0)>>>0;return t%360}function K({url:e,size:t=16}){if(V(e))return(0,G.jsx)(E,{size:t});if(e.startsWith(`/`))return(0,G.jsx)(D,{size:t});let n=pe(e),r=(n[0]??`?`).toUpperCase();return(0,G.jsx)(`span`,{className:`w11-site-badge`,"aria-hidden":`true`,style:{width:t,height:t,fontSize:Math.round(t*.56),background:`hsl(${me(n)} 52% 42%)`},children:r})}function q(e){return pe(e)||e}var he=[{label:`Google`,url:`https://www.google.com/webhp?igu=1`},{label:`Wikipedia`,url:`https://www.wikipedia.org/`},{label:`Internet Archive`,url:`https://archive.org/`},{label:`Live portfolio`,url:`https://taan1el.github.io/taaniel-portfolio-os/`},{label:`GitHub profile`,url:`https://github.com/Taan1el`},{label:`Portfolio repo`,url:`https://github.com/Taan1el/taaniel-portfolio-os`}],ge=`taaniel-os-browser-v1`,_e=300,ve=80;function J(e){if(typeof e!=`string`)return!1;try{let t=new URL(e);return t.protocol===`https:`||t.protocol===`http:`}catch{return!1}}var Y=(e,t)=>typeof e==`string`&&e.trim()?e.trim().slice(0,ve):t;function ye(e){let t=e&&typeof e==`object`?e:{};return{favorites:Array.isArray(t.favorites)?t.favorites.filter(e=>J(e?.url)).map(e=>({url:e.url,label:Y(e.label,new URL(e.url).hostname)})):he,history:Array.isArray(t.history)?t.history.filter(e=>J(e?.url)&&Number.isFinite(e?.visitedAt)).map(e=>({url:e.url,title:Y(e.title,new URL(e.url).hostname),visitedAt:e.visitedAt})).slice(0,_e):[]}}var X=C()(T(e=>({favorites:he,history:[],toggleFavorite:t=>{J(t.url)&&e(e=>e.favorites.some(e=>e.url===t.url)?{favorites:e.favorites.filter(e=>e.url!==t.url)}:{favorites:[...e.favorites,{url:t.url,label:Y(t.label,t.url)}]})},removeFavorite:t=>e(e=>({favorites:e.favorites.filter(e=>e.url!==t)})),recordVisit:(t,n)=>{J(t)&&e(e=>{let r=Date.now(),i=e.history[0]?.url===t?e.history.slice(1):e.history;return{history:[{url:t,title:Y(n,t),visitedAt:r},...i].slice(0,_e)}})},removeHistoryEntry:t=>e(e=>({history:e.history.filter(e=>e.visitedAt!==t)})),clearHistory:()=>e({history:[]})}),{name:ge,storage:w(()=>O()),partialize:e=>({favorites:e.favorites,history:e.history}),merge:(e,t)=>({...t,...ye(e)})}));function be({onVisit:e}){let t=X(e=>e.favorites),n=X(e=>e.history),[r,i]=(0,R.useState)(``),a=(0,R.useMemo)(()=>{let e=new Set;return n.filter(t=>e.has(t.url)?!1:(e.add(t.url),!0)).slice(0,5)},[n]);return(0,G.jsxs)(`div`,{className:`w11-newtab`,children:[(0,G.jsxs)(`form`,{className:`w11-newtab__search`,role:`search`,onSubmit:t=>{t.preventDefault(),r.trim()&&e(r)},children:[(0,G.jsx)(f,{size:18,"aria-hidden":`true`}),(0,G.jsx)(`input`,{autoFocus:!0,value:r,onChange:e=>i(e.target.value),placeholder:`Search the web or type a URL`,"aria-label":`Search the web or type a URL`})]}),t.length>0?(0,G.jsx)(`section`,{className:`w11-newtab__links`,"aria-label":`Quick links`,children:t.slice(0,8).map(t=>(0,G.jsxs)(`button`,{type:`button`,className:`w11-newtab__link`,title:t.url,onClick:()=>e(t.url),children:[(0,G.jsx)(K,{url:t.url,size:40}),(0,G.jsx)(`span`,{children:t.label})]},t.url))}):null,a.length>0?(0,G.jsxs)(`section`,{className:`w11-newtab__recent`,"aria-labelledby":`w11-newtab-recent`,children:[(0,G.jsx)(`h2`,{id:`w11-newtab-recent`,children:`Recently visited`}),a.map(t=>(0,G.jsxs)(`button`,{type:`button`,className:`w11-newtab__recent-row`,onClick:()=>e(t.url),children:[(0,G.jsx)(K,{url:t.url,size:20}),(0,G.jsx)(`span`,{children:t.title}),(0,G.jsx)(`small`,{children:q(t.url)})]},t.visitedAt))]}):null,(0,G.jsx)(`p`,{className:`w11-newtab__note`,children:`Sites open inside this window when they allow it. If one refuses, use the … menu to open it in your own browser.`})]})}function xe(e){let t=new Date(e),n=new Date,r=e=>new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime(),i=Math.round((r(n)-r(t))/864e5);return i===0?`Today`:i===1?`Yesterday`:t.toLocaleDateString([],{weekday:`long`,day:`numeric`,month:`long`})}function Se({onVisit:e}){let t=X(e=>e.history),n=X(e=>e.removeHistoryEntry),r=X(e=>e.clearHistory),[i,a]=(0,R.useState)(``),o=(0,R.useMemo)(()=>{let e=i.trim().toLowerCase(),n=e?t.filter(t=>`${t.title} ${t.url}`.toLowerCase().includes(e)):t,r=new Map;return n.forEach(e=>{let t=xe(e.visitedAt);r.set(t,[...r.get(t)??[],e])}),Array.from(r.entries())},[i,t]);return(0,G.jsxs)(`div`,{className:`w11-history`,children:[(0,G.jsxs)(`header`,{className:`w11-history__header`,children:[(0,G.jsx)(`h1`,{children:`History`}),(0,G.jsxs)(`label`,{className:`w11-history__search`,children:[(0,G.jsx)(f,{size:14,"aria-hidden":`true`}),(0,G.jsx)(`input`,{value:i,onChange:e=>a(e.target.value),placeholder:`Search history`,"aria-label":`Search history`})]}),(0,G.jsxs)(`button`,{type:`button`,className:`w11-button`,disabled:t.length===0,onClick:()=>{globalThis.confirm(`Clear your browsing history in this browser?`)&&r()},children:[(0,G.jsx)(h,{size:14,"aria-hidden":`true`}),`Clear browsing data`]})]}),o.length===0?(0,G.jsx)(`p`,{className:`w11-history__empty`,children:t.length===0?`Pages you visit will show up here.`:`No history matches your search.`}):o.map(([t,r])=>(0,G.jsxs)(`section`,{className:`w11-history__group`,"aria-label":t,children:[(0,G.jsx)(`h2`,{children:t}),r.map(t=>(0,G.jsxs)(`div`,{className:`w11-history__row`,children:[(0,G.jsxs)(`button`,{type:`button`,className:`w11-history__open`,onClick:()=>e(t.url),title:t.url,children:[(0,G.jsx)(K,{url:t.url,size:16}),(0,G.jsx)(`span`,{className:`w11-history__title`,children:t.title}),(0,G.jsx)(`span`,{className:`w11-history__host`,children:q(t.url)})]}),(0,G.jsx)(`time`,{dateTime:new Date(t.visitedAt).toISOString(),children:new Date(t.visitedAt).toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}),(0,G.jsx)(`button`,{type:`button`,className:`w11-history__remove`,"aria-label":`Remove ${t.title} from history`,onClick:()=>n(t.visitedAt),children:(0,G.jsx)(g,{size:14})})]},t.visitedAt))]},t))]})}var Ce={secure:{icon:te,label:`Connection is secure`},insecure:{icon:L,label:`Not secure`},local:{icon:d,label:`File on this PC`},internal:{icon:f,label:`Browser page`}};function we({address:e,security:t,loadState:n,canGoBack:r,canGoForward:i,isFavorite:s,canFavorite:c,focusAddressNonce:u,onAddressChange:d,onSubmit:f,onRevert:p,onBack:m,onForward:h,onReload:g,onHome:v,onToggleFavorite:y,onMenu:b}){let x=(0,R.useRef)(null),[S,C]=(0,R.useState)(!1),w=Ce[t].icon,T=e===`browser://newtab`?``:e;return(0,R.useEffect)(()=>{u!==0&&(x.current?.focus(),x.current?.select())},[u]),(0,G.jsxs)(`div`,{className:`w11-browser__toolbar`,children:[(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:m,disabled:!r,"aria-label":`Back (Alt+Left)`,title:`Back (Alt+Left)`,children:(0,G.jsx)(a,{size:16})}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:h,disabled:!i,"aria-label":`Forward (Alt+Right)`,title:`Forward (Alt+Right)`,children:(0,G.jsx)(o,{size:16})}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:g,"aria-label":`Refresh (F5)`,title:`Refresh (F5)`,children:(0,G.jsx)(l,{size:15,className:_(n===`loading`&&`is-spinning`)})}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:v,"aria-label":`Home (Alt+Home)`,title:`Home (Alt+Home)`,children:(0,G.jsx)(P,{size:16})}),(0,G.jsxs)(`form`,{className:_(`w11-browser__address`,S&&`is-editing`),onSubmit:e=>{e.preventDefault(),f(),x.current?.blur()},children:[(0,G.jsxs)(`span`,{className:_(`w11-browser__security`,`is-${t}`),title:Ce[t].label,"aria-label":Ce[t].label,role:`img`,children:[(0,G.jsx)(w,{size:14}),t===`insecure`?(0,G.jsx)(`span`,{children:`Not secure`}):null]}),(0,G.jsx)(`input`,{ref:x,value:T,placeholder:`Search or enter web address`,"aria-label":`Address and search bar`,spellCheck:!1,autoComplete:`off`,onChange:e=>d(e.target.value),onFocus:e=>{C(!0),e.currentTarget.select()},onBlur:()=>C(!1),onKeyDown:e=>{e.key===`Escape`&&(e.preventDefault(),p(),e.currentTarget.blur())}}),(0,G.jsx)(`button`,{type:`button`,className:_(`w11-browser__star`,s&&`is-favorite`),onClick:y,disabled:!c,"aria-pressed":s,"aria-label":s?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,title:s?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,children:(0,G.jsx)(I,{size:15})})]}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:b,"aria-label":`Settings and more`,title:`Settings and more`,"aria-haspopup":`menu`,children:(0,G.jsx)(M,{size:16})})]})}var Z={direct:{kind:`direct`,label:`Direct`,note:`Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.`,transform:e=>e},allorigins:{kind:`proxy`,label:`AllOrigins`,note:`Public proxy preview through AllOrigins. When the service is degraded it can show its own timeout page — reload or switch to Wayback if that happens.`,transform:e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`},wayback:{kind:`proxy`,label:`Wayback`,note:`Loads the latest web.archive.org snapshot in a frame-friendly view. Archived pages may differ from the current live site.`,transform:e=>`https://web.archive.org/web/2if_/${Te(e)}`}};function Te(e){try{return new URL(e).href}catch{return encodeURI(e)}}var Ee=Object.keys(Z),De=Object.fromEntries(Ee.map(e=>[e,Z[e].label])),Oe=Object.fromEntries(Ee.map(e=>[e,Z[e].note]));function ke(e,t){return Z[t].transform(e)}function Ae(e){switch(e){case`direct`:return`allorigins`;case`allorigins`:return`wayback`;case`wayback`:return`allorigins`;default:return`allorigins`}}function je({fallback:e,canOpenExternally:t,onOpenInNewTab:n,onRetryWithProxy:r}){let a=q(e.url);return(0,G.jsxs)(`div`,{className:`w11-browser__error`,role:`alert`,children:[(0,G.jsxs)(`svg`,{className:`w11-browser__error-art`,width:`72`,height:`72`,viewBox:`0 0 48 48`,"aria-hidden":`true`,children:[(0,G.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`28`,rx:`4`,fill:`#3a3a3a`}),(0,G.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`7`,rx:`3`,fill:`#4a4a4a`}),(0,G.jsx)(`circle`,{cx:`11`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,G.jsx)(`circle`,{cx:`15.5`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,G.jsx)(`path`,{d:`M18 24l12 10M30 24L18 34`,stroke:`#8a8a8a`,strokeWidth:`2.6`,strokeLinecap:`round`})]}),(0,G.jsx)(`h2`,{children:t?`${a} refused to connect inside this window`:e.title}),(0,G.jsx)(`p`,{children:e.message}),e.details?(0,G.jsx)(`p`,{className:`w11-browser__error-details`,children:e.details}):null,(0,G.jsx)(`code`,{children:e.url}),(0,G.jsxs)(`div`,{className:`w11-browser__error-actions`,children:[(0,G.jsxs)(`button`,{type:`button`,className:`w11-button w11-button--accent`,onClick:n,disabled:!t,children:[(0,G.jsx)(i,{size:14,"aria-hidden":`true`}),`Open in your browser`]}),(0,G.jsxs)(`button`,{type:`button`,className:`w11-button`,onClick:r,disabled:!e.retryProxyMode,children:[(0,G.jsx)(ne,{size:14,"aria-hidden":`true`}),e.retryProxyMode?`Try ${De[e.retryProxyMode]}`:`Try a proxy`]})]})]})}var Me=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts`,Ne=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin`;function Pe({document:e,viewMode:t,loadState:n,fallback:r,refreshToken:i,canOpenExternally:a,onLocalNavigate:o,onFrameLoad:s,onFrameError:c,onOpenInNewTab:l,onRetryWithProxy:u}){let d=(0,R.useRef)(null),f=typeof HTMLIFrameElement<`u`&&`credentialless`in HTMLIFrameElement.prototype,p=(0,R.useCallback)(()=>{if(e?.kind===`local`&&e.localKind===`directory`)try{let e=d.current?.contentDocument;e&&e.body.dataset.browserLocalBound!==`true`&&(e.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-browser-path]`);if(!(n instanceof HTMLElement))return;let r=n.getAttribute(`data-browser-path`);r&&(e.preventDefault(),o(r))}),e.body.dataset.browserLocalBound=`true`)}catch{}s()},[e,s,o]);return t===`fallback`?(0,G.jsx)(je,{fallback:r??{title:e?.title??`Unable to open page`,url:e?.displayUrl??`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u}):e?(0,G.jsxs)(`div`,{className:`browser-app__frame-shell`,"data-state":n,children:[n===`loading`?(0,G.jsx)(`div`,{className:`browser-app__loading-bar`,"aria-hidden":`true`,children:(0,G.jsx)(`span`,{})}):null,(0,G.jsx)(`iframe`,{ref:d,src:e.frameSource.kind===`src`?e.frameSource.value:void 0,srcDoc:e.frameSource.kind===`srcDoc`?e.frameSource.value:void 0,title:e.title,sandbox:e.kind===`local`?Ne:Me,referrerPolicy:`no-referrer`,credentialless:f?`credentialless`:void 0,onLoad:p,onError:c},`${e.displayUrl}:${e.frameSource.kind}:${e.frameSource.value}:${i}`)]}):(0,G.jsx)(je,{fallback:{title:`Unable to open page`,url:`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}var Fe=[{disposition:`direct`,note:`Local and GitHub Pages sites usually render directly inside the Browser window.`,test:e=>e.hostname===`localhost`||e.hostname===`127.0.0.1`||e.hostname.endsWith(`.github.io`)},{disposition:`direct`,note:`Google pages using igu=1 are routed through the iframe-friendly variant.`,test:e=>/(^|\.)google\./i.test(e.hostname)&&e.searchParams.get(`igu`)===`1`},{disposition:`direct`,note:`Wikipedia is a reliable direct target for the Browser viewer.`,test:e=>/(^|\.)wikipedia\.org$/i.test(e.hostname)},{disposition:`direct`,note:`Internet Archive pages are generally safe to try in direct mode.`,test:e=>/(^|\.)archive\.org$/i.test(e.hostname)}],Ie=[{disposition:`blocked`,message:`GitHub cannot be embedded directly in this Browser window`,details:`GitHub sends frame protections, so the Browser switches straight to fallback instead of waiting on a blank iframe.`,retryProxyMode:`allorigins`,test:e=>/(^|\.)github\.com$/i.test(e.hostname)},{disposition:`blocked`,message:`This social or auth-heavy site is known to block iframe embedding`,details:`Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.`,retryProxyMode:`allorigins`,test:e=>[`linkedin.com`,`instagram.com`,`facebook.com`,`x.com`,`twitter.com`,`tiktok.com`,`discord.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This streaming platform does not embed cleanly inside the Browser window`,details:`Video platforms typically require full browser privileges or special embeds. The Browser shows fallback immediately to avoid a dead panel.`,retryProxyMode:`allorigins`,test:e=>[`youtube.com`,`youtu.be`,`twitch.tv`,`open.spotify.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This Google workspace page is not a reliable iframe target`,details:`Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.`,retryProxyMode:`allorigins`,test:e=>[`docs.google.com`,`drive.google.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))}];function Le(e){try{let t=new URL(e),n=Fe.find(e=>e.test(t));if(n)return n;let r=Ie.find(e=>e.test(t));if(r)return r}catch{}return{disposition:`unknown`}}function Re(e){return Le(e).disposition!==`blocked`}var ze=new Set([`htm`,`html`]),Be=/^(?:https?:\/\/|blob:|\/|data:(?:image|video|audio)\/)/i;function Q(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function $(e,t){return`<!doctype html>
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
</html>`}function Ve(e){return e.type===`folder`?`Folder`:typeof e.size==`number`?`${e.extension?.toUpperCase()??`FILE`} · ${e.size} bytes`:typeof e.content==`string`?`${e.extension?.toUpperCase()??`TEXT`} · ${e.content.length} chars`:e.extension?.toUpperCase()??`FILE`}function He(e){let t=v(e),n=t===`/`?[]:t.split(`/`).filter(Boolean),r=[{label:`Root`,path:`/`}],i=``;for(let e of n)i=`${i}/${e}`,r.push({label:e,path:i});return r.map((e,t)=>{let n=t===r.length-1,i=n?`<strong>${Q(e.label)}</strong>`:`<a href="${Q(e.path)}" data-browser-path="${Q(e.path)}">${Q(e.label)}</a>`;return n?i:`${i}<span class="is-separator">/</span>`}).join(``)}function Ue(e,t){let n=[];if(e!==`/`){let t=x(e);n.push(`
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
    `)}return n.length===0?`<div class="browser-local-directory__empty">This directory is empty.</div>`:`<div class="browser-local-directory__list">${n.join(``)}</div>`}function We(e,t){let n=v(e),r=n===`/`?`Root`:n.split(`/`).filter(Boolean).at(-1)??n,i=He(n),a=Ue(n,t),o=`${t.length} ${t.length===1?`item`:`items`}`;return{kind:`local`,localKind:`directory`,title:r,displayUrl:n,note:`Local filesystem directory index rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(r,`
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
        `)}}}function Ge(e){if(typeof e.content==`string`){if(ze.has(e.extension??``)||e.mimeType?.includes(`html`)){let t=j(e.content);return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Local filesystem preview rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(e.name,t)}}}return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Text file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<pre>${Q(e.content)}</pre>`)}}}if(typeof e.source==`string`&&Be.test(e.source.trim())){let t=Q(e.source);if(e.mimeType?.startsWith(`image/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Image file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><img src="${t}" alt="${Q(e.name)}" /></div>`)}};if(e.mimeType?.startsWith(`video/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Video file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><video src="${t}" controls playsinline></video></div>`)}};if(e.mimeType?.startsWith(`audio/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Audio file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><audio src="${t}" controls></audio></div>`)}}}return null}function Ke(e,t){let n=e.trim();if(!n.startsWith(`/`))return{document:null,error:null};let r=v(n),i=y(t,r);if(!i)return{document:null,error:`Local file not found: ${r}`};if(i.kind===`directory`)return{document:We(r,S(t,r)),error:null};let a=Ge(b(i));return a?{document:a,error:null}:{document:null,error:`${i.name} cannot be rendered inside the Browser app.`}}var qe=9e3,Je=16e3;function Ye({initialAddress:e,nodes:t}){let n=fe(e??``)||`https://www.google.com/webhp?igu=1`,[r,i]=(0,R.useState)(n),[a,o]=(0,R.useState)([n]),[s,c]=(0,R.useState)(0),[l,u]=(0,R.useState)(`direct`),[d,f]=(0,R.useState)(`web`),[p,m]=(0,R.useState)(`idle`),[h,g]=(0,R.useState)(null),[_,v]=(0,R.useState)(0),[y,b]=(0,R.useState)([]),x=(0,R.useRef)(null),S=(0,R.useCallback)(()=>{x.current!=null&&(globalThis.window.clearTimeout(x.current),x.current=null)},[]);(0,R.useEffect)(()=>{S(),i(n),o([n]),c(0),u(`direct`),f(`web`),m(`idle`),g(null),v(0),b([])},[S,n]);let C=a[s]??n;(0,R.useEffect)(()=>{i(C)},[C]);let w=V(C),T=(0,R.useMemo)(()=>{if(V(C))return{document:null,error:null};let e=Ke(C,t);if(e.document||e.error)return e;let n=U(C),r=Le(n);return{document:{kind:`remote`,title:W(n),displayUrl:n,note:l===`direct`?r.note??Oe[l]:Oe[l],frameSource:{kind:`src`,value:ke(n,l)}},error:null}},[C,t,l]),E=T.document,D=(0,R.useCallback)((e,t)=>{if(!t)return;let n={url:t.displayUrl,proxyMode:l,reason:e,timestamp:Date.now()};b(e=>[...e.slice(-11),n])},[l]),O=(0,R.useCallback)((e,t,n,r)=>{S();let i=E?.title??(C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??C:W(U(C))),a=E?.displayUrl??C;f(`fallback`),m(`blocked`),g({title:i,url:a,message:e,details:t,retryProxyMode:E?.kind===`remote`?r??Ae(l):null}),D(n,E)},[E,S,C,l,D]);(0,R.useEffect)(()=>{if(S(),V(C)){f(`web`),m(`ready`),g(null);return}if(!T.document){f(`fallback`),m(`blocked`),g({title:C.startsWith(`/`)?C.split(`/`).filter(Boolean).at(-1)??`Local file`:`Unable to open page`,url:C,message:T.error??`This page could not be resolved.`,details:C.startsWith(`/`)?`The requested local file could not be rendered in the Browser app.`:void 0,retryProxyMode:null});return}if(T.document.frameSource.kind===`srcDoc`){if(T.error){O(T.error,`The requested local file could not be rendered in the Browser app.`,`local`);return}f(`web`),m(`ready`),g(null);return}if(T.document.kind===`remote`&&l===`direct`){let e=Le(T.document.displayUrl);if(!Re(T.document.displayUrl)&&e.disposition===`blocked`){O(e.message??`This site is restricted and cannot be embedded`,e.details,`blocked`,e.retryProxyMode??Ae(l));return}}return f(`web`),m(`loading`),g(null),x.current=globalThis.window.setTimeout(()=>{O(`This site cannot be embedded due to browser restrictions`,`The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.`,`timeout`)},l===`direct`?qe:Je),()=>S()},[O,S,C,l,_,T]);let k=(0,R.useCallback)(()=>{S(),f(`web`),m(`idle`),g(null)},[S]),ee=(0,R.useCallback)(e=>{let t=fe(e);if(t){if(t===C){k(),v(e=>e+1);return}k(),v(0),i(t),o(e=>[...e.slice(0,s+1),t]),c(s+1)}},[C,s,k]),A=(0,R.useCallback)(()=>{k(),v(0),c(e=>Math.max(0,e-1))},[k]),j=(0,R.useCallback)(()=>{k(),v(0),c(e=>Math.min(a.length-1,e+1))},[a.length,k]),M=(0,R.useCallback)(()=>{k(),v(e=>e+1)},[k]),N=(0,R.useCallback)(e=>{k(),u(e),v(e=>e+1)},[k]),P=(0,R.useCallback)(()=>{N(h?.retryProxyMode??Ae(l))},[N,h?.retryProxyMode,l]),F=(0,R.useCallback)(()=>{S(),f(`web`),m(`ready`),g(null)},[S]),te=(0,R.useCallback)(()=>{S(),O(`This site cannot be embedded due to browser restrictions`,`The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.`,`error`)},[O,S]);return{address:r,setAddress:i,currentUrl:C,proxyMode:l,setProxyMode:N,viewMode:d,loadState:p,fallback:h,resolvedDocument:E,isInternal:w,refreshToken:_,failureHistory:y,canGoBack:s>0,canGoForward:s<a.length-1,visit:ee,goBack:A,goForward:j,reload:M,retryWithProxy:P,handleFrameLoad:F,handleFrameError:te}}var Xe=[{mode:`direct`,label:`Load directly`},{mode:`allorigins`,label:`Load through the AllOrigins proxy`},{mode:`wayback`,label:`Load from the Web Archive`}];function Ze({tabId:e,active:t,initialAddress:n,nodes:r,onMeta:a,onNewTab:o}){let{address:l,setAddress:d,currentUrl:f,proxyMode:p,setProxyMode:m,viewMode:h,loadState:g,fallback:v,resolvedDocument:y,isInternal:b,refreshToken:x,canGoBack:S,canGoForward:C,visit:w,goBack:T,goForward:E,reload:D,retryWithProxy:O,handleFrameLoad:k,handleFrameError:A}=Ye({initialAddress:n,nodes:r}),j=X(e=>e.favorites),M=X(e=>e.toggleFavorite),P=X(e=>e.recordVisit),F=ee(e=>e.setContextMenu),[te,ne]=(0,R.useState)(0),I=y?.kind===`remote`?y.displayUrl:null,L=b?W(f):y?.title??W(f),re=!!(I&&j.some(e=>e.url===I)),ie=b?`internal`:y?.kind===`local`?`local`:I?.startsWith(`https:`)?`secure`:`insecure`;(0,R.useEffect)(()=>{a(e,{title:L,url:f,loading:g===`loading`})},[f,g,a,e,L]),(0,R.useEffect)(()=>{I&&P(I,L)},[P,I,L]);let V=(0,R.useCallback)(()=>{I&&globalThis.open(I,`_blank`,`noopener,noreferrer`)},[I]),H=()=>{I&&M({url:I,label:L})};return(0,G.jsxs)(`div`,{className:_(`w11-browser__panel`,t&&`is-active`),role:`tabpanel`,"aria-hidden":!t,onKeyDown:e=>{let t=e.key.toLowerCase(),n=e.ctrlKey||e.metaKey;n&&t===`l`?(e.preventDefault(),ne(e=>e+1)):n&&t===`d`?(e.preventDefault(),H()):n&&t===`h`?(e.preventDefault(),w(B)):e.key===`F5`||n&&t===`r`?(e.preventDefault(),D()):e.altKey&&e.key===`ArrowLeft`?(e.preventDefault(),T()):e.altKey&&e.key===`ArrowRight`?(e.preventDefault(),E()):e.altKey&&e.key===`Home`&&(e.preventDefault(),w(z))},children:[(0,G.jsx)(we,{address:l,security:ie,loadState:g,canGoBack:S,canGoForward:C,isFavorite:re,canFavorite:!!I,focusAddressNonce:te,onAddressChange:d,onSubmit:()=>w(l),onRevert:()=>d(f),onBack:T,onForward:E,onReload:D,onHome:()=>w(z),onToggleFavorite:H,onMenu:e=>{e.stopPropagation();let t=e.currentTarget.getBoundingClientRect(),n=[{id:`new-tab`,label:`New tab`,icon:s,onSelect:()=>o()},{id:`history`,label:`History`,icon:N,shortcut:`Ctrl+H`,onSelect:()=>w(B)},{id:`sep-1`,label:``,separator:!0,onSelect:()=>{}},{id:`external`,label:`Open in your browser`,icon:i,disabled:!I,onSelect:V},{id:`copy-link`,label:`Copy link`,icon:u,disabled:!I,onSelect:()=>{I&&navigator.clipboard?.writeText(I).catch(()=>void 0)}},{id:`sep-2`,label:``,separator:!0,onSelect:()=>{}},...Xe.map(e=>({id:`proxy-${e.mode}`,label:e.label,icon:p===e.mode?c:void 0,disabled:!I,onSelect:()=>m(e.mode)}))];F({x:t.right-260,y:t.bottom+4,title:`Settings and more`,actions:n})}}),j.length>0?(0,G.jsx)(`div`,{className:`w11-browser__favorites`,role:`toolbar`,"aria-label":`Favorites`,children:j.map(e=>(0,G.jsxs)(`button`,{type:`button`,className:`w11-browser__favorite`,title:e.url,onClick:()=>w(e.url),children:[(0,G.jsx)(K,{url:e.url,size:16}),(0,G.jsx)(`span`,{children:e.label})]},e.url))}):null,(0,G.jsx)(`section`,{className:`browser-app__viewport w11-browser__viewport`,children:b?f===`browser://history`?(0,G.jsx)(Se,{onVisit:w}):(0,G.jsx)(be,{onVisit:w}):(0,G.jsx)(Pe,{document:y,viewMode:h,loadState:g,fallback:v,refreshToken:x,canOpenExternally:!!I,onLocalNavigate:w,onFrameLoad:k,onFrameError:A,onOpenInNewTab:V,onRetryWithProxy:O})})]})}var Qe=0,$e=()=>`tab-${Qe+=1}`;function et({window:e}){let t=k(e=>e.nodes),n=A(e=>e.closeWindow),r=(0,R.useMemo)(()=>e.payload?.externalUrl?.trim()||e.payload?.filePath?.trim()||`browser://newtab`,[e.payload?.externalUrl,e.payload?.filePath]),[{tabs:i,activeId:a},o]=(0,R.useState)(()=>{let e=$e();return{tabs:[{id:e,initialAddress:r}],activeId:e}}),[c,l]=(0,R.useState)({}),u=(0,R.useCallback)((e,t)=>{l(n=>{let r=n[e];return r&&r.title===t.title&&r.url===t.url&&r.loading===t.loading?n:{...n,[e]:t}})},[]),d=(0,R.useCallback)((e=z)=>{let t=$e();o(n=>({tabs:[...n.tabs,{id:t,initialAddress:e}],activeId:t}))},[]),f=(0,R.useCallback)(t=>{if(i.length===1){n(e.id);return}let r=i.findIndex(e=>e.id===t),s=i.filter(e=>e.id!==t);o({tabs:s,activeId:t===a?(s[r]??s[r-1]).id:a}),l(({[t]:e,...n})=>n)},[a,n,i,e.id]),h=(0,R.useRef)(r);(0,R.useEffect)(()=>{r!==h.current&&(h.current=r,d(r))},[d,r]);let v=e=>o(t=>({...t,activeId:e}));return(0,G.jsxs)(p,{className:`browser-app w11-browser`,onKeyDown:e=>{let t=e.ctrlKey||e.metaKey,n=e.key.toLowerCase();if(t){if(n===`t`)e.preventDefault(),d();else if(n===`w`)e.preventDefault(),f(a);else if(e.key===`Tab`)e.preventDefault(),v(i[(i.findIndex(e=>e.id===a)+(e.shiftKey?-1:1)+i.length)%i.length].id);else if(/^[1-9]$/.test(e.key)){e.preventDefault();let t=e.key===`9`?i.at(-1):i[Number(e.key)-1];t&&v(t.id)}}},children:[(0,G.jsxs)(`div`,{className:`w11-browser__tabs`,role:`tablist`,"aria-label":`Tabs`,children:[i.map(e=>{let t=c[e.id],n=e.id===a,r=t?.title??`New tab`;return(0,G.jsxs)(`div`,{role:`tab`,tabIndex:n?0:-1,"aria-selected":n,className:_(`w11-browser__tab`,n&&`is-active`),title:r,onClick:()=>v(e.id),onAuxClick:t=>{t.button===1&&f(e.id)},onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&v(e.id)},children:[(0,G.jsx)(`span`,{className:`w11-browser__tab-icon`,"aria-hidden":`true`,children:t?.loading?(0,G.jsx)(F,{size:14,className:`is-spinning`}):(0,G.jsx)(K,{url:t?.url??`browser://newtab`,size:16})}),(0,G.jsx)(`span`,{className:`w11-browser__tab-title`,children:r}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__tab-close`,"aria-label":`Close ${r}`,onClick:t=>{t.stopPropagation(),f(e.id)},children:(0,G.jsx)(g,{size:12})})]},e.id)}),(0,G.jsx)(`button`,{type:`button`,className:`w11-browser__new-tab`,"aria-label":`New tab`,title:`New tab`,onClick:()=>d(),children:(0,G.jsx)(s,{size:16})})]}),(0,G.jsx)(m,{className:`browser-app__content w11-browser__body`,padded:!1,scrollable:!1,stacked:!1,children:i.map(e=>(0,G.jsx)(Ze,{tabId:e.id,active:e.id===a,initialAddress:e.initialAddress,nodes:t,onMeta:u,onNewTab:d},e.id))})]})}export{et as BrowserApp};