import{o as e}from"./chunk-CMxvf4Kt.js";import{n as t,t as n}from"./jsx-runtime-CWteFE1C.js";import{Gt as r,Ht as i,Kt as a,Vt as o,qt as s,tn as c,wt as l,zt as u}from"./index-LUnA3B8S.js";import{t as d}from"./createLucideIcon-D-WppHH5.js";import{n as f,r as p,t as m}from"./rotate-cw-D-6z0RK3.js";import{n as h,t as g}from"./trash-2-CzYyYjx1.js";import{t as _}from"./copy-C_3WnYoG.js";import{t as v}from"./external-link-CX2X3M7_.js";import{t as y}from"./file-text-Cgvx3orX.js";import{_ as b,g as x,h as S,i as C,n as w}from"./device-store-DRQBXU2z.js";import{n as T,t as E}from"./x-DmMkLJgP.js";import{p as D,r as O,t as k}from"./app-layout-Bhhc-YCi.js";import{t as A}from"./settings-D5vegUJ8.js";import{a as j,d as M,f as N,i as ee,n as P,u as F}from"./filesystem-store-BJIjwXML.js";import{n as I,t as L}from"./system-store-Dzg4QI7n.js";import{n as R}from"./titlebar-slot-DjJ95Z2E.js";import{t as z}from"./sanitize-CZyhLeBM.js";var te=d(`ellipsis`,[[`circle`,{cx:`12`,cy:`12`,r:`1`,key:`41hilf`}],[`circle`,{cx:`19`,cy:`12`,r:`1`,key:`1wjl8i`}],[`circle`,{cx:`5`,cy:`12`,r:`1`,key:`1pcz8c`}]]),ne=d(`history`,[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}],[`path`,{d:`M12 7v5l4 2`,key:`1fdv2h`}]]),re=d(`house`,[[`path`,{d:`M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8`,key:`5wwlr5`}],[`path`,{d:`M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z`,key:`r6nss1`}]]),ie=d(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),ae=d(`lock`,[[`rect`,{width:`18`,height:`11`,x:`3`,y:`11`,rx:`2`,ry:`2`,key:`1w4ew1`}],[`path`,{d:`M7 11V7a5 5 0 0 1 10 0v4`,key:`fwvmzm`}]]),oe=d(`network`,[[`rect`,{x:`16`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`4q2zg0`}],[`rect`,{x:`2`,y:`16`,width:`6`,height:`6`,rx:`1`,key:`8cvhb9`}],[`rect`,{x:`9`,y:`2`,width:`6`,height:`6`,rx:`1`,key:`1egb70`}],[`path`,{d:`M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3`,key:`1jsf9p`}],[`path`,{d:`M12 12V8`,key:`2874zd`}]]),se=d(`star`,[[`path`,{d:`M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z`,key:`r04s7s`}]]),ce=d(`triangle-alert`,[[`path`,{d:`m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3`,key:`wmoenq`}],[`path`,{d:`M12 9v4`,key:`juzpu7`}],[`path`,{d:`M12 17h.01`,key:`p32p05`}]]),B=e(t(),1),le=e(c(),1),ue=`https://www.google.com/webhp?igu=1`,V=`browser://newtab`,H=`browser://history`,de=new Set([V,H]);function U(e){return de.has(e)}var fe=`https://www.google.com/search?igu=1&q=`,pe=new Set([`http:`,`https:`]),me=/^[a-z][a-z0-9+.-]*:/i,he=/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i,ge=/(^|\.)google\./i;function _e(e){let t=e.trim();return t?`${fe}${encodeURIComponent(t)}`:ue}function ve(e){let t=e.trim();if(!t)return``;let n=t.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();if(n){if(!pe.has(`${n}:`))return``;try{return new URL(t).toString()}catch{return``}}if(t.startsWith(`//`))try{return new URL(`https:${t}`).toString()}catch{return``}if(he.test(t))try{return new URL(`https://${t}`).toString()}catch{return``}return me.test(t),``}function ye(e){try{let t=new URL(e);return ge.test(t.hostname)&&((t.pathname===`/`||t.pathname===``)&&(t.pathname=`/webhp`),t.searchParams.set(`igu`,`1`)),t.toString()}catch{return e}}function W(e){let t=ve(e);return t?ye(t):_e(e)}function be(e){let t=e.trim();return t?U(t.toLowerCase())?t.toLowerCase():t.startsWith(`/`)?M(t):W(t):``}function G(e){if(e===`browser://newtab`)return`New tab`;if(e===`browser://history`)return`History`;try{return new URL(e).hostname.replace(/^www\./i,``)||`Browser`}catch{return`Browser`}}var K=n();function xe(e){try{return new URL(e).hostname.replace(/^www\./i,``)}catch{return``}}function Se(e){let t=0;for(let n of e)t=t*31+n.charCodeAt(0)>>>0;return t%360}function q({url:e,size:t=16}){if(U(e))return(0,K.jsx)(o,{size:t});if(e.startsWith(`/`))return(0,K.jsx)(u,{size:t});let n=xe(e),r=(n[0]??`?`).toUpperCase();return(0,K.jsx)(`span`,{className:`w11-site-badge`,"aria-hidden":`true`,style:{width:t,height:t,fontSize:Math.round(t*.56),background:`hsl(${Se(n)} 52% 42%)`},children:r})}function Ce(e){return xe(e)||e}var we=[{label:`Google`,url:`https://www.google.com/webhp?igu=1`},{label:`Wikipedia`,url:`https://www.wikipedia.org/`},{label:`Internet Archive`,url:`https://archive.org/`},{label:`Live portfolio`,url:`https://taan1el.github.io/taaniel-portfolio-os/`},{label:`GitHub profile`,url:`https://github.com/Taan1el`},{label:`Portfolio repo`,url:`https://github.com/Taan1el/taaniel-portfolio-os`}],Te=`taaniel-os-browser-v1`,Ee=300,De=80;function J(e){if(typeof e!=`string`)return!1;try{let t=new URL(e);return t.protocol===`https:`||t.protocol===`http:`}catch{return!1}}var Y=(e,t)=>typeof e==`string`&&e.trim()?e.trim().slice(0,De):t;function Oe(e){let t=e&&typeof e==`object`?e:{};return{favorites:Array.isArray(t.favorites)?t.favorites.filter(e=>J(e?.url)).map(e=>({url:e.url,label:Y(e.label,new URL(e.url).hostname)})):we,history:Array.isArray(t.history)?t.history.filter(e=>J(e?.url)&&Number.isFinite(e?.visitedAt)).map(e=>({url:e.url,title:Y(e.title,new URL(e.url).hostname),visitedAt:e.visitedAt})).slice(0,Ee):[]}}var X=s()(a(e=>({favorites:we,history:[],toggleFavorite:t=>{J(t.url)&&e(e=>e.favorites.some(e=>e.url===t.url)?{favorites:e.favorites.filter(e=>e.url!==t.url)}:{favorites:[...e.favorites,{url:t.url,label:Y(t.label,t.url)}]})},removeFavorite:t=>e(e=>({favorites:e.favorites.filter(e=>e.url!==t)})),recordVisit:(t,n)=>{J(t)&&e(e=>{let r=Date.now(),i=e.history[0]?.url===t?e.history.slice(1):e.history;return{history:[{url:t,title:Y(n,t),visitedAt:r},...i].slice(0,Ee)}})},removeHistoryEntry:t=>e(e=>({history:e.history.filter(e=>e.visitedAt!==t)})),clearHistory:()=>e({history:[]})}),{name:Te,storage:r(()=>i()),partialize:e=>({favorites:e.favorites,history:e.history}),merge:(e,t)=>({...t,...Oe(e)})}));function ke({onVisit:e}){let t=X(e=>e.favorites),n=X(e=>e.history),[r,i]=(0,B.useState)(``),a=(0,B.useMemo)(()=>{let e=new Set;return n.filter(t=>e.has(t.url)?!1:(e.add(t.url),!0)).slice(0,5)},[n]);return(0,K.jsxs)(`div`,{className:`w11-newtab`,children:[(0,K.jsxs)(`form`,{className:`w11-newtab__search`,role:`search`,onSubmit:t=>{t.preventDefault(),r.trim()&&e(r)},children:[(0,K.jsx)(D,{size:18,"aria-hidden":`true`}),(0,K.jsx)(`input`,{autoFocus:!0,value:r,onChange:e=>i(e.target.value),placeholder:`Search the web or type a URL`,"aria-label":`Search the web or type a URL`})]}),t.length>0?(0,K.jsx)(`section`,{className:`w11-newtab__links`,"aria-label":`Quick links`,children:t.slice(0,8).map(t=>(0,K.jsxs)(`button`,{type:`button`,className:`w11-newtab__link`,title:t.url,onClick:()=>e(t.url),children:[(0,K.jsx)(q,{url:t.url,size:40}),(0,K.jsx)(`span`,{children:t.label})]},t.url))}):null,a.length>0?(0,K.jsxs)(`section`,{className:`w11-newtab__recent`,"aria-labelledby":`w11-newtab-recent`,children:[(0,K.jsx)(`h2`,{id:`w11-newtab-recent`,children:`Recently visited`}),a.map(t=>(0,K.jsxs)(`button`,{type:`button`,className:`w11-newtab__recent-row`,onClick:()=>e(t.url),children:[(0,K.jsx)(q,{url:t.url,size:20}),(0,K.jsx)(`span`,{children:t.title}),(0,K.jsx)(`small`,{children:Ce(t.url)})]},t.visitedAt))]}):null,(0,K.jsx)(`p`,{className:`w11-newtab__note`,children:`Sites open inside this window when they allow it. If one refuses, use the … menu to open it in your own browser.`})]})}function Ae(e){let t=new Date(e),n=new Date,r=e=>new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime(),i=Math.round((r(n)-r(t))/864e5);return i===0?`Today`:i===1?`Yesterday`:t.toLocaleDateString([],{weekday:`long`,day:`numeric`,month:`long`})}function je({onVisit:e}){let t=X(e=>e.history),n=X(e=>e.removeHistoryEntry),r=X(e=>e.clearHistory),[i,a]=(0,B.useState)(``),o=(0,B.useMemo)(()=>{let e=i.trim().toLowerCase(),n=e?t.filter(t=>`${t.title} ${t.url}`.toLowerCase().includes(e)):t,r=new Map;return n.forEach(e=>{let t=Ae(e.visitedAt);r.set(t,[...r.get(t)??[],e])}),Array.from(r.entries())},[i,t]);return(0,K.jsxs)(`div`,{className:`w11-history`,children:[(0,K.jsxs)(`header`,{className:`w11-history__header`,children:[(0,K.jsx)(`h1`,{children:`History`}),(0,K.jsxs)(`label`,{className:`w11-history__search`,children:[(0,K.jsx)(D,{size:14,"aria-hidden":`true`}),(0,K.jsx)(`input`,{value:i,onChange:e=>a(e.target.value),placeholder:`Search history`,"aria-label":`Search history`})]}),(0,K.jsxs)(`button`,{type:`button`,className:`w11-button`,disabled:t.length===0,onClick:()=>{globalThis.confirm(`Clear your browsing history in this browser?`)&&r()},children:[(0,K.jsx)(g,{size:14,"aria-hidden":`true`}),`Clear browsing data`]})]}),o.length===0?(0,K.jsx)(`p`,{className:`w11-history__empty`,children:t.length===0?`Pages you visit will show up here.`:`No history matches your search.`}):o.map(([t,r])=>(0,K.jsxs)(`section`,{className:`w11-history__group`,"aria-label":t,children:[(0,K.jsx)(`h2`,{children:t}),r.map(t=>(0,K.jsxs)(`div`,{className:`w11-history__row`,children:[(0,K.jsxs)(`button`,{type:`button`,className:`w11-history__open`,onClick:()=>e(t.url),title:t.url,children:[(0,K.jsx)(q,{url:t.url,size:16}),(0,K.jsx)(`span`,{className:`w11-history__title`,children:t.title}),(0,K.jsx)(`span`,{className:`w11-history__host`,children:Ce(t.url)})]}),(0,K.jsx)(`time`,{dateTime:new Date(t.visitedAt).toISOString(),children:new Date(t.visitedAt).toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}),(0,K.jsx)(`button`,{type:`button`,className:`w11-history__remove`,"aria-label":`Remove ${t.title} from history`,onClick:()=>n(t.visitedAt),children:(0,K.jsx)(E,{size:14})})]},t.visitedAt))]},t))]})}var Me={secure:{icon:ae,label:`Connection is secure`},insecure:{icon:ce,label:`Not secure`},local:{icon:y,label:`File on this PC`},internal:{icon:D,label:`Browser page`}};function Ne({address:e,security:t,loadState:n,canGoBack:r,canGoForward:i,isFavorite:a,canFavorite:o,focusAddressNonce:s,onAddressChange:c,onSubmit:u,onRevert:d,onBack:f,onForward:g,onReload:_,onHome:v,onToggleFavorite:y,onMenu:b}){let x=(0,B.useRef)(null),[S,C]=(0,B.useState)(!1),w=Me[t].icon,T=e===`browser://newtab`?``:e;return(0,B.useEffect)(()=>{s!==0&&(x.current?.focus(),x.current?.select())},[s]),(0,K.jsxs)(`div`,{className:`w11-browser__toolbar`,children:[(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:f,disabled:!r,"aria-label":`Back (Alt+Left)`,title:`Back (Alt+Left)`,children:(0,K.jsx)(p,{size:16})}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:g,disabled:!i,"aria-label":`Forward (Alt+Right)`,title:`Forward (Alt+Right)`,children:(0,K.jsx)(h,{size:16})}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:_,"aria-label":`Refresh (F5)`,title:`Refresh (F5)`,children:(0,K.jsx)(m,{size:15,className:l(n===`loading`&&`is-spinning`)})}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:v,"aria-label":`Home (Alt+Home)`,title:`Home (Alt+Home)`,children:(0,K.jsx)(re,{size:16})}),(0,K.jsxs)(`form`,{className:l(`w11-browser__address`,S&&`is-editing`),onSubmit:e=>{e.preventDefault(),u(),x.current?.blur()},children:[(0,K.jsxs)(`span`,{className:l(`w11-browser__security`,`is-${t}`),title:Me[t].label,"aria-label":Me[t].label,role:`img`,children:[(0,K.jsx)(w,{size:14}),t===`insecure`?(0,K.jsx)(`span`,{children:`Not secure`}):null]}),(0,K.jsx)(`input`,{ref:x,value:T,placeholder:`Search or enter web address`,"aria-label":`Address and search bar`,spellCheck:!1,autoComplete:`off`,onChange:e=>c(e.target.value),onFocus:e=>{C(!0),e.currentTarget.select()},onBlur:()=>C(!1),onKeyDown:e=>{e.key===`Escape`&&(e.preventDefault(),d(),e.currentTarget.blur())}}),(0,K.jsx)(`button`,{type:`button`,className:l(`w11-browser__star`,a&&`is-favorite`),onClick:y,disabled:!o,"aria-pressed":a,"aria-label":a?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,title:a?`Remove from favorites (Ctrl+D)`:`Add this page to favorites (Ctrl+D)`,children:(0,K.jsx)(se,{size:15})})]}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tool`,onClick:b,"aria-label":`Settings and more`,title:`Settings and more`,"aria-haspopup":`menu`,children:(0,K.jsx)(te,{size:16})})]})}var Z={direct:{kind:`direct`,label:`Direct`,note:`Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.`,transform:e=>e},allorigins:{kind:`proxy`,label:`AllOrigins`,note:`Public proxy preview through AllOrigins. When the service is degraded it can show its own timeout page — reload or switch to Wayback if that happens.`,transform:e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`},wayback:{kind:`proxy`,label:`Wayback`,note:`Loads the latest web.archive.org snapshot in a frame-friendly view. Archived pages may differ from the current live site.`,transform:e=>`https://web.archive.org/web/2if_/${Pe(e)}`}};function Pe(e){try{return new URL(e).href}catch{return encodeURI(e)}}var Fe=Object.keys(Z),Ie=Object.fromEntries(Fe.map(e=>[e,Z[e].label])),Le=Object.fromEntries(Fe.map(e=>[e,Z[e].note]));function Re(e,t){return Z[t].transform(e)}function ze(e){switch(e){case`direct`:return`allorigins`;case`allorigins`:return`wayback`;case`wayback`:return`allorigins`;default:return`allorigins`}}var Be={airplane:{label:`Turn off airplane mode`,icon:b,apply:()=>C.getState().setAirplaneMode(!1)},"wifi-off":{label:`Turn Wi-Fi on`,icon:S,apply:()=>C.getState().setWifiEnabled(!0)},"no-internet":null};function Ve({fallback:e,status:t}){let n=L(e=>e.launchApp),r=Be[t];return(0,K.jsxs)(`div`,{className:`w11-browser__error`,role:`alert`,children:[t===`airplane`?(0,K.jsx)(b,{className:`w11-browser__error-art`,size:72,strokeWidth:1.4,color:`#8a8a8a`,"aria-hidden":`true`}):(0,K.jsx)(x,{className:`w11-browser__error-art`,size:72,strokeWidth:1.4,color:`#8a8a8a`,"aria-hidden":`true`}),(0,K.jsx)(`h2`,{children:e.title}),(0,K.jsx)(`p`,{children:e.message}),e.details?(0,K.jsx)(`p`,{className:`w11-browser__error-details`,children:e.details}):null,(0,K.jsx)(`code`,{children:e.url}),(0,K.jsxs)(`div`,{className:`w11-browser__error-actions`,children:[r?(0,K.jsxs)(`button`,{type:`button`,className:`w11-button w11-button--accent`,onClick:r.apply,children:[(0,K.jsx)(r.icon,{size:14,"aria-hidden":`true`}),r.label]}):null,(0,K.jsxs)(`button`,{type:`button`,className:r?`w11-button`:`w11-button w11-button--accent`,onClick:()=>n({appId:`settings`,payload:{section:`network`}}),children:[(0,K.jsx)(A,{size:14,"aria-hidden":`true`}),`Network settings`]})]})]})}function He({fallback:e,canOpenExternally:t,onOpenInNewTab:n,onRetryWithProxy:r}){if(e.offlineStatus)return(0,K.jsx)(Ve,{fallback:e,status:e.offlineStatus});let i=Ce(e.url);return(0,K.jsxs)(`div`,{className:`w11-browser__error`,role:`alert`,children:[(0,K.jsxs)(`svg`,{className:`w11-browser__error-art`,width:`72`,height:`72`,viewBox:`0 0 48 48`,"aria-hidden":`true`,children:[(0,K.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`28`,rx:`4`,fill:`#3a3a3a`}),(0,K.jsx)(`rect`,{x:`6`,y:`10`,width:`36`,height:`7`,rx:`3`,fill:`#4a4a4a`}),(0,K.jsx)(`circle`,{cx:`11`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,K.jsx)(`circle`,{cx:`15.5`,cy:`13.5`,r:`1.4`,fill:`#8a8a8a`}),(0,K.jsx)(`path`,{d:`M18 24l12 10M30 24L18 34`,stroke:`#8a8a8a`,strokeWidth:`2.6`,strokeLinecap:`round`})]}),(0,K.jsx)(`h2`,{children:t?`${i} refused to connect inside this window`:e.title}),(0,K.jsx)(`p`,{children:e.message}),e.details?(0,K.jsx)(`p`,{className:`w11-browser__error-details`,children:e.details}):null,(0,K.jsx)(`code`,{children:e.url}),(0,K.jsxs)(`div`,{className:`w11-browser__error-actions`,children:[(0,K.jsxs)(`button`,{type:`button`,className:`w11-button w11-button--accent`,onClick:n,disabled:!t,children:[(0,K.jsx)(v,{size:14,"aria-hidden":`true`}),`Open in your browser`]}),(0,K.jsxs)(`button`,{type:`button`,className:`w11-button`,onClick:r,disabled:!e.retryProxyMode,children:[(0,K.jsx)(oe,{size:14,"aria-hidden":`true`}),e.retryProxyMode?`Try ${Ie[e.retryProxyMode]}`:`Try a proxy`]})]})]})}var Ue=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts`,We=`allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin`;function Ge({document:e,viewMode:t,loadState:n,fallback:r,refreshToken:i,canOpenExternally:a,onLocalNavigate:o,onFrameLoad:s,onFrameError:c,onOpenInNewTab:l,onRetryWithProxy:u}){let d=(0,B.useRef)(null),f=typeof HTMLIFrameElement<`u`&&`credentialless`in HTMLIFrameElement.prototype,p=(0,B.useCallback)(()=>{if(e?.kind===`local`&&e.localKind===`directory`)try{let e=d.current?.contentDocument;e&&e.body.dataset.browserLocalBound!==`true`&&(e.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof Element))return;let n=t.closest(`[data-browser-path]`);if(!(n instanceof HTMLElement))return;let r=n.getAttribute(`data-browser-path`);r&&(e.preventDefault(),o(r))}),e.body.dataset.browserLocalBound=`true`)}catch{}s()},[e,s,o]);return t===`fallback`?(0,K.jsx)(He,{fallback:r??{title:e?.title??`Unable to open page`,url:e?.displayUrl??`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u}):e?(0,K.jsxs)(`div`,{className:`browser-app__frame-shell`,"data-state":n,children:[n===`loading`?(0,K.jsx)(`div`,{className:`browser-app__loading-bar`,"aria-hidden":`true`,children:(0,K.jsx)(`span`,{})}):null,(0,K.jsx)(`iframe`,{ref:d,src:e.frameSource.kind===`src`?e.frameSource.value:void 0,srcDoc:e.frameSource.kind===`srcDoc`?e.frameSource.value:void 0,title:e.title,sandbox:e.kind===`local`?We:Ue,referrerPolicy:`no-referrer`,credentialless:f?`credentialless`:void 0,onLoad:p,onError:c},`${e.displayUrl}:${e.frameSource.kind}:${e.frameSource.value}:${i}`)]}):(0,K.jsx)(He,{fallback:{title:`Unable to open page`,url:`No URL available`,message:`This site cannot be embedded due to browser restrictions`},canOpenExternally:a,onOpenInNewTab:l,onRetryWithProxy:u})}var Ke=[{disposition:`direct`,note:`Local and GitHub Pages sites usually render directly inside the Browser window.`,test:e=>e.hostname===`localhost`||e.hostname===`127.0.0.1`||e.hostname.endsWith(`.github.io`)},{disposition:`direct`,note:`Google pages using igu=1 are routed through the iframe-friendly variant.`,test:e=>/(^|\.)google\./i.test(e.hostname)&&e.searchParams.get(`igu`)===`1`},{disposition:`direct`,note:`Wikipedia is a reliable direct target for the Browser viewer.`,test:e=>/(^|\.)wikipedia\.org$/i.test(e.hostname)},{disposition:`direct`,note:`Internet Archive pages are generally safe to try in direct mode.`,test:e=>/(^|\.)archive\.org$/i.test(e.hostname)}],qe=[{disposition:`blocked`,message:`GitHub cannot be embedded directly in this Browser window`,details:`GitHub sends frame protections, so the Browser switches straight to fallback instead of waiting on a blank iframe.`,retryProxyMode:`allorigins`,test:e=>/(^|\.)github\.com$/i.test(e.hostname)},{disposition:`blocked`,message:`This social or auth-heavy site is known to block iframe embedding`,details:`Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.`,retryProxyMode:`allorigins`,test:e=>[`linkedin.com`,`instagram.com`,`facebook.com`,`x.com`,`twitter.com`,`tiktok.com`,`discord.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This streaming platform does not embed cleanly inside the Browser window`,details:`Video platforms typically require full browser privileges or special embeds. The Browser shows fallback immediately to avoid a dead panel.`,retryProxyMode:`allorigins`,test:e=>[`youtube.com`,`youtu.be`,`twitch.tv`,`open.spotify.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))},{disposition:`blocked`,message:`This Google workspace page is not a reliable iframe target`,details:`Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.`,retryProxyMode:`allorigins`,test:e=>[`docs.google.com`,`drive.google.com`].some(t=>e.hostname===t||e.hostname.endsWith(`.${t}`))}];function Je(e){try{let t=new URL(e),n=Ke.find(e=>e.test(t));if(n)return n;let r=qe.find(e=>e.test(t));if(r)return r}catch{}return{disposition:`unknown`}}function Ye(e){return Je(e).disposition!==`blocked`}var Xe=new Set([`htm`,`html`]),Ze=/^(?:https?:\/\/|blob:|\/|data:(?:image|video|audio)\/)/i;function Q(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function $(e,t){return`<!doctype html>
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
</html>`}function Qe(e){return e.type===`folder`?`Folder`:typeof e.size==`number`?`${e.extension?.toUpperCase()??`FILE`} · ${e.size} bytes`:typeof e.content==`string`?`${e.extension?.toUpperCase()??`TEXT`} · ${e.content.length} chars`:e.extension?.toUpperCase()??`FILE`}function $e(e){let t=M(e),n=t===`/`?[]:t.split(`/`).filter(Boolean),r=[{label:`Root`,path:`/`}],i=``;for(let e of n)i=`${i}/${e}`,r.push({label:e,path:i});return r.map((e,t)=>{let n=t===r.length-1,i=n?`<strong>${Q(e.label)}</strong>`:`<a href="${Q(e.path)}" data-browser-path="${Q(e.path)}">${Q(e.label)}</a>`;return n?i:`${i}<span class="is-separator">/</span>`}).join(``)}function et(e,t){let n=[];if(e!==`/`){let t=j(e);n.push(`
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
          <small>${Q(Qe(e))}</small>
        </span>
      </a>
    `)}return n.length===0?`<div class="browser-local-directory__empty">This directory is empty.</div>`:`<div class="browser-local-directory__list">${n.join(``)}</div>`}function tt(e,t){let n=M(e),r=n===`/`?`Root`:n.split(`/`).filter(Boolean).at(-1)??n,i=$e(n),a=et(n,t),o=`${t.length} ${t.length===1?`item`:`items`}`;return{kind:`local`,localKind:`directory`,title:r,displayUrl:n,note:`Local filesystem directory index rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(r,`
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
        `)}}}function nt(e){if(typeof e.content==`string`){if(Xe.has(e.extension??``)||e.mimeType?.includes(`html`)){let t=z(e.content);return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Local filesystem preview rendered through srcDoc.`,frameSource:{kind:`srcDoc`,value:$(e.name,t)}}}return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Text file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<pre>${Q(e.content)}</pre>`)}}}if(typeof e.source==`string`&&Ze.test(e.source.trim())){let t=Q(e.source);if(e.mimeType?.startsWith(`image/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Image file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><img src="${t}" alt="${Q(e.name)}" /></div>`)}};if(e.mimeType?.startsWith(`video/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Video file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><video src="${t}" controls playsinline></video></div>`)}};if(e.mimeType?.startsWith(`audio/`))return{kind:`local`,localKind:`file`,title:e.name,displayUrl:e.path,note:`Audio file preview rendered from the virtual filesystem.`,frameSource:{kind:`srcDoc`,value:$(e.name,`<div class="browser-local-media"><audio src="${t}" controls></audio></div>`)}}}return null}function rt(e,t){let n=e.trim();if(!n.startsWith(`/`))return{document:null,error:null};let r=M(n),i=ee(t,r);if(!i)return{document:null,error:`Local file not found: ${r}`};if(i.kind===`directory`)return{document:tt(r,F(t,r)),error:null};let a=nt(N(i));return a?{document:a,error:null}:{document:null,error:`${i.name} cannot be rendered inside the Browser app.`}}var it={"no-internet":{message:`You're not connected to the internet`,details:`Check your network cables, modem and router, or reconnect to Wi-Fi. The page loads by itself once you're back online.`},"wifi-off":{message:`Wi-Fi is turned off`,details:`Turn Wi-Fi on to browse the web. The page loads by itself once you're connected.`},airplane:{message:`Airplane mode is on`,details:`Turn off airplane mode to browse the web. The page loads by itself once you're connected.`}};function at(e,t){let{message:n,details:r}=it[t];return{title:`No internet`,url:e,message:n,details:r,retryProxyMode:null,offlineStatus:t}}var ot=9e3,st=16e3;function ct({initialAddress:e,nodes:t}){let n=be(e??``)||`https://www.google.com/webhp?igu=1`,[r,i]=(0,B.useState)(n),[a,o]=(0,B.useState)([n]),[s,c]=(0,B.useState)(0),[l,u]=(0,B.useState)(`direct`),[d,f]=(0,B.useState)(`web`),[p,m]=(0,B.useState)(`idle`),[h,g]=(0,B.useState)(null),[_,v]=(0,B.useState)(0),[y,b]=(0,B.useState)([]),x=(0,B.useRef)(null),S=C(w),T=(0,B.useCallback)(()=>{x.current!=null&&(globalThis.window.clearTimeout(x.current),x.current=null)},[]);(0,B.useEffect)(()=>{T(),i(n),o([n]),c(0),u(`direct`),f(`web`),m(`idle`),g(null),v(0),b([])},[T,n]);let E=a[s]??n;(0,B.useEffect)(()=>{i(E)},[E]);let D=U(E),O=(0,B.useMemo)(()=>{if(U(E))return{document:null,error:null};let e=rt(E,t);if(e.document||e.error)return e;let n=W(E),r=Je(n);return{document:{kind:`remote`,title:G(n),displayUrl:n,note:l===`direct`?r.note??Le[l]:Le[l],frameSource:{kind:`src`,value:Re(n,l)}},error:null}},[E,t,l]),k=O.document,A=(0,B.useCallback)((e,t)=>{if(!t)return;let n={url:t.displayUrl,proxyMode:l,reason:e,timestamp:Date.now()};b(e=>[...e.slice(-11),n])},[l]),j=(0,B.useCallback)((e,t,n,r)=>{T();let i=k?.title??(E.startsWith(`/`)?E.split(`/`).filter(Boolean).at(-1)??E:G(W(E))),a=k?.displayUrl??E;f(`fallback`),m(`blocked`),g({title:i,url:a,message:e,details:t,retryProxyMode:k?.kind===`remote`?r??ze(l):null}),A(n,k)},[k,T,E,l,A]);(0,B.useEffect)(()=>{if(T(),U(E)){f(`web`),m(`ready`),g(null);return}if(!O.document){f(`fallback`),m(`blocked`),g({title:E.startsWith(`/`)?E.split(`/`).filter(Boolean).at(-1)??`Local file`:`Unable to open page`,url:E,message:O.error??`This page could not be resolved.`,details:E.startsWith(`/`)?`The requested local file could not be rendered in the Browser app.`:void 0,retryProxyMode:null});return}if(O.document.frameSource.kind===`srcDoc`){if(O.error){j(O.error,`The requested local file could not be rendered in the Browser app.`,`local`);return}f(`web`),m(`ready`),g(null);return}if(O.document.kind===`remote`&&S!==`connected`){f(`fallback`),m(`blocked`),g(at(O.document.displayUrl,S));return}if(O.document.kind===`remote`&&l===`direct`){let e=Je(O.document.displayUrl);if(!Ye(O.document.displayUrl)&&e.disposition===`blocked`){j(e.message??`This site is restricted and cannot be embedded`,e.details,`blocked`,e.retryProxyMode??ze(l));return}}return f(`web`),m(`loading`),g(null),x.current=globalThis.window.setTimeout(()=>{j(`This site cannot be embedded due to browser restrictions`,`The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.`,`timeout`)},l===`direct`?ot:st),()=>T()},[j,T,E,S,l,_,O]);let M=(0,B.useCallback)(()=>{T(),f(`web`),m(`idle`),g(null)},[T]),N=(0,B.useCallback)(e=>{let t=be(e);if(t){if(t===E){M(),v(e=>e+1);return}M(),v(0),i(t),o(e=>[...e.slice(0,s+1),t]),c(s+1)}},[E,s,M]),ee=(0,B.useCallback)(()=>{M(),v(0),c(e=>Math.max(0,e-1))},[M]),P=(0,B.useCallback)(()=>{M(),v(0),c(e=>Math.min(a.length-1,e+1))},[a.length,M]),F=(0,B.useCallback)(()=>{M(),v(e=>e+1)},[M]),I=(0,B.useCallback)(e=>{M(),u(e),v(e=>e+1)},[M]),L=(0,B.useCallback)(()=>{I(h?.retryProxyMode??ze(l))},[I,h?.retryProxyMode,l]),R=(0,B.useCallback)(()=>{T(),f(`web`),m(`ready`),g(null)},[T]),z=(0,B.useCallback)(()=>{T(),j(`This site cannot be embedded due to browser restrictions`,`The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.`,`error`)},[j,T]);return{address:r,setAddress:i,currentUrl:E,proxyMode:l,setProxyMode:I,viewMode:d,loadState:p,fallback:h,resolvedDocument:k,isInternal:D,refreshToken:_,failureHistory:y,canGoBack:s>0,canGoForward:s<a.length-1,visit:N,goBack:ee,goForward:P,reload:F,retryWithProxy:L,handleFrameLoad:R,handleFrameError:z}}var lt=[{mode:`direct`,label:`Load directly`},{mode:`allorigins`,label:`Load through the AllOrigins proxy`},{mode:`wayback`,label:`Load from the Web Archive`}];function ut({tabId:e,active:t,initialAddress:n,nodes:r,onMeta:i,onNewTab:a}){let{address:o,setAddress:s,currentUrl:c,proxyMode:u,setProxyMode:d,viewMode:p,loadState:m,fallback:h,resolvedDocument:g,isInternal:y,refreshToken:b,canGoBack:x,canGoForward:S,visit:C,goBack:w,goForward:E,reload:D,retryWithProxy:O,handleFrameLoad:k,handleFrameError:A}=ct({initialAddress:n,nodes:r}),j=X(e=>e.favorites),M=X(e=>e.toggleFavorite),N=X(e=>e.recordVisit),ee=I(e=>e.setContextMenu),[P,F]=(0,B.useState)(0),L=g?.kind===`remote`?g.displayUrl:null,R=y?G(c):g?.title??G(c),z=!!(L&&j.some(e=>e.url===L)),te=y?`internal`:g?.kind===`local`?`local`:L?.startsWith(`https:`)?`secure`:`insecure`;(0,B.useEffect)(()=>{i(e,{title:R,url:c,loading:m===`loading`})},[c,m,i,e,R]),(0,B.useEffect)(()=>{L&&N(L,R)},[N,L,R]);let re=(0,B.useCallback)(()=>{L&&globalThis.open(L,`_blank`,`noopener,noreferrer`)},[L]),ie=()=>{L&&M({url:L,label:R})};return(0,K.jsxs)(`div`,{className:l(`w11-browser__panel`,t&&`is-active`),role:`tabpanel`,"aria-hidden":!t,onKeyDown:e=>{let t=e.key.toLowerCase(),n=e.ctrlKey||e.metaKey;n&&t===`l`?(e.preventDefault(),F(e=>e+1)):n&&t===`d`?(e.preventDefault(),ie()):n&&t===`h`?(e.preventDefault(),C(H)):e.key===`F5`||n&&t===`r`?(e.preventDefault(),D()):e.altKey&&e.key===`ArrowLeft`?(e.preventDefault(),w()):e.altKey&&e.key===`ArrowRight`?(e.preventDefault(),E()):e.altKey&&e.key===`Home`&&(e.preventDefault(),C(V))},children:[(0,K.jsx)(Ne,{address:o,security:te,loadState:m,canGoBack:x,canGoForward:S,isFavorite:z,canFavorite:!!L,focusAddressNonce:P,onAddressChange:s,onSubmit:()=>C(o),onRevert:()=>s(c),onBack:w,onForward:E,onReload:D,onHome:()=>C(V),onToggleFavorite:ie,onMenu:e=>{e.stopPropagation();let t=e.currentTarget.getBoundingClientRect(),n=[{id:`new-tab`,label:`New tab`,icon:T,onSelect:()=>a()},{id:`history`,label:`History`,icon:ne,shortcut:`Ctrl+H`,onSelect:()=>C(H)},{id:`sep-1`,label:``,separator:!0,onSelect:()=>{}},{id:`external`,label:`Open in your browser`,icon:v,disabled:!L,onSelect:re},{id:`copy-link`,label:`Copy link`,icon:_,disabled:!L,onSelect:()=>{L&&navigator.clipboard?.writeText(L).catch(()=>void 0)}},{id:`sep-2`,label:``,separator:!0,onSelect:()=>{}},...lt.map(e=>({id:`proxy-${e.mode}`,label:e.label,icon:u===e.mode?f:void 0,disabled:!L,onSelect:()=>d(e.mode)}))];ee({x:t.right-260,y:t.bottom+4,title:`Settings and more`,actions:n})}}),j.length>0?(0,K.jsx)(`div`,{className:`w11-browser__favorites`,role:`toolbar`,"aria-label":`Favorites`,children:j.map(e=>(0,K.jsxs)(`button`,{type:`button`,className:`w11-browser__favorite`,title:e.url,onClick:()=>C(e.url),children:[(0,K.jsx)(q,{url:e.url,size:16}),(0,K.jsx)(`span`,{children:e.label})]},e.url))}):null,(0,K.jsx)(`section`,{className:`browser-app__viewport w11-browser__viewport`,children:y?c===`browser://history`?(0,K.jsx)(je,{onVisit:C}):(0,K.jsx)(ke,{onVisit:C}):(0,K.jsx)(Ge,{document:g,viewMode:p,loadState:m,fallback:h,refreshToken:b,canOpenExternally:!!L,onLocalNavigate:C,onFrameLoad:k,onFrameError:A,onOpenInNewTab:re,onRetryWithProxy:O})})]})}var dt=0,ft=()=>`tab-${dt+=1}`;function pt({window:e}){let t=P(e=>e.nodes),n=L(e=>e.closeWindow),r=R(),i=(0,B.useMemo)(()=>e.payload?.externalUrl?.trim()||e.payload?.filePath?.trim()||`browser://newtab`,[e.payload?.externalUrl,e.payload?.filePath]),[{tabs:a,activeId:o},s]=(0,B.useState)(()=>{let e=ft();return{tabs:[{id:e,initialAddress:i}],activeId:e}}),[c,u]=(0,B.useState)({}),d=(0,B.useCallback)((e,t)=>{u(n=>{let r=n[e];return r&&r.title===t.title&&r.url===t.url&&r.loading===t.loading?n:{...n,[e]:t}})},[]),f=(0,B.useCallback)((e=V)=>{let t=ft();s(n=>({tabs:[...n.tabs,{id:t,initialAddress:e}],activeId:t}))},[]),p=(0,B.useCallback)(t=>{if(a.length===1){n(e.id);return}let r=a.findIndex(e=>e.id===t),i=a.filter(e=>e.id!==t);s({tabs:i,activeId:t===o?(i[r]??i[r-1]).id:o}),u(({[t]:e,...n})=>n)},[o,n,a,e.id]),m=(0,B.useRef)(i);(0,B.useEffect)(()=>{i!==m.current&&(m.current=i,f(i))},[f,i]);let h=e=>s(t=>({...t,activeId:e})),g=e=>{let t=e.ctrlKey||e.metaKey,n=e.key.toLowerCase();if(t){if(n===`t`)e.preventDefault(),f();else if(n===`w`)e.preventDefault(),p(o);else if(e.key===`Tab`)e.preventDefault(),h(a[(a.findIndex(e=>e.id===o)+(e.shiftKey?-1:1)+a.length)%a.length].id);else if(/^[1-9]$/.test(e.key)){e.preventDefault();let t=e.key===`9`?a.at(-1):a[Number(e.key)-1];t&&h(t.id)}}},_=(0,K.jsxs)(`div`,{className:`w11-browser__tabs`,role:`tablist`,"aria-label":`Tabs`,children:[a.map(e=>{let t=c[e.id],n=e.id===o,r=t?.title??`New tab`;return(0,K.jsxs)(`div`,{role:`tab`,tabIndex:n?0:-1,"aria-selected":n,className:l(`w11-browser__tab`,n&&`is-active`),title:r,onClick:()=>h(e.id),onDoubleClick:e=>e.stopPropagation(),onAuxClick:t=>{t.button===1&&p(e.id)},onKeyDown:t=>{(t.key===`Enter`||t.key===` `)&&h(e.id)},children:[(0,K.jsx)(`span`,{className:`w11-browser__tab-icon`,"aria-hidden":`true`,children:t?.loading?(0,K.jsx)(ie,{size:14,className:`is-spinning`}):(0,K.jsx)(q,{url:t?.url??`browser://newtab`,size:16})}),(0,K.jsx)(`span`,{className:`w11-browser__tab-title`,children:r}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__tab-close`,"aria-label":`Close ${r}`,onClick:t=>{t.stopPropagation(),p(e.id)},children:(0,K.jsx)(E,{size:12})})]},e.id)}),(0,K.jsx)(`button`,{type:`button`,className:`w11-browser__new-tab`,"aria-label":`New tab`,title:`New tab`,onClick:()=>f(),onDoubleClick:e=>e.stopPropagation(),children:(0,K.jsx)(T,{size:16})})]});return(0,K.jsxs)(O,{className:`browser-app w11-browser`,onKeyDown:g,children:[r?(0,le.createPortal)(_,r):_,(0,K.jsx)(k,{className:`browser-app__content w11-browser__body`,padded:!1,scrollable:!1,stacked:!1,children:a.map(e=>(0,K.jsx)(ut,{tabId:e.id,active:e.id===o,initialAddress:e.initialAddress,nodes:t,onMeta:d,onNewTab:f},e.id))})]})}export{pt as BrowserApp};