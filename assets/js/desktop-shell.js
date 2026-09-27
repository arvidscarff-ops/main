// One-window progressive enhancement. Only native-content routes are admitted.
// Fetched scripts are never evaluated; the outer document owns analytics.
const base = new URL('../../', import.meta.url);
const supported = new Set(['ai-labs/']);
const routeKey = url => url.origin === base.origin && url.pathname.startsWith(base.pathname)
  ? url.pathname.slice(base.pathname.length).replace(/index\.html$/, '') : null;
const isSupported = url => supported.has(routeKey(url));
const modified = event => event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
const stylesheetCache = new Map();
let active = null, pending = null, serial = 0, opener = null;
const homeMeta = {title:document.title, description:document.querySelector('meta[name="description"]')?.content, canonical:document.querySelector('link[rel="canonical"]')?.href};

function rebase(root, url) {
  for (const node of root.querySelectorAll('[href],[src],[poster],[action],[srcset]')) {
    for (const name of ['href','src','poster','action']) {
      if (node.hasAttribute(name)) node.setAttribute(name,new URL(node.getAttribute(name),url).href);
    }
    if (node.hasAttribute('srcset')) node.setAttribute('srcset',node.getAttribute('srcset').split(',').map(candidate=>{
      const [source,...size]=candidate.trim().split(/\s+/);return `${new URL(source,url).href} ${size.join(' ')}`.trim();
    }).join(', '));
  }
}
function scopedCSS(text, url) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(_,quote,path)=>`url("${new URL(path,url).href}")`));
  function scope(rules) {
    for (const rule of rules) {
      if (rule.selectorText) rule.selectorText=rule.selectorText.replace(/(^|[\s>+~,(])(:root|html|body)(?=$|[\s>+~.#:[\],)])/g,(_,prefix,tag)=>prefix+(tag==='body'?'.desktop-page':'.desktop-html'));
      if (rule.cssRules && rule.type !== CSSRule.KEYFRAMES_RULE) scope(rule.cssRules);
    }
  }
  scope(sheet.cssRules);
  return [...sheet.cssRules].map(rule=>rule.cssText).join('\n');
}
async function stylesFor(doc, url) {
  const styles=[];
  for (const node of doc.head.querySelectorAll('link[rel="stylesheet"],style')) {
    if(node.tagName==='STYLE'){styles.push(scopedCSS(node.textContent,url));continue;}
    const href=new URL(node.getAttribute('href'),url).href;
    if(new URL(href).origin!==base.origin)throw new Error('Unsupported external page stylesheet');
    if(!stylesheetCache.has(href)) stylesheetCache.set(href,fetch(href).then(r=>{if(!r.ok)throw new Error('Stylesheet unavailable');return r.text();}).catch(error=>{stylesheetCache.delete(href);throw error;}));
    styles.push(scopedCSS(await stylesheetCache.get(href),href));
  }
  return styles.join('\n');
}
function metadata(meta) {
  document.title=meta.title;
  if(meta.description)document.querySelector('meta[name="description"]')?.setAttribute('content',meta.description);
  if(meta.canonical)document.querySelector('link[rel="canonical"]')?.setAttribute('href',meta.canonical);
}
function setState(state) {
  document.body.dataset.desktopState=state;
  const covered=state==='open';
  document.querySelector('.home-stage').inert=covered;
  document.querySelector('.frame-controls').inert=covered;
  window.dispatchEvent(new Event('desktopstatechange'));
}
function discard() {
  if(!active)return;
  active.host.remove();active.restore.remove();active=null;
}
function minimize() {
  if(!active || active.host.hidden)return;
  active.focus=active.shadow.activeElement;
  active.playing=[...active.shadow.querySelectorAll('video,audio')].filter(media=>!media.paused);
  active.playing.forEach(media=>media.pause());
  active.host.inert=true;active.host.hidden=true;active.restore.hidden=false;
  setState('minimized');active.restore.focus();
}
function restore() {
  if(!active || !active.host.hidden)return;
  active.host.hidden=false;active.host.inert=false;active.restore.hidden=true;
  setState('open');(active.focus||active.shadow.querySelector('[data-window-minimize]')).focus({preventScroll:true});
  active.playing?.forEach(media=>media.play().catch(()=>{}));
}
function close(push=true) {
  pending?.abort();serial++;discard();metadata(homeMeta);setState('desktop');
  if(push)history.pushState({...history.state,desktopShell:{route:''}},'',base.href+'#navigation');
  window.dispatchEvent(new Event('desktopclose'));
  (opener?.isConnected?opener:document.querySelector('[data-home-logo]')).focus({preventScroll:true});
}
async function open(url, push=true, prepared=null) {
  pending?.abort();pending=new AbortController();const id=++serial;
  document.body.dataset.desktopLoading='true';
  try {
    let doc=prepared?.doc;
    if(!doc){const response=await fetch(url,{signal:pending.signal});if(!response.ok)throw new Error('Page unavailable');doc=new DOMParser().parseFromString(await response.text(),'text/html');}
    if(!doc.querySelector('.window-bar') || !doc.querySelector('main'))throw new Error('Unsupported page');
    const css=prepared?.css ?? await stylesFor(doc,url);
    if(id!==serial)return;
    const host=document.createElement('section');host.dataset.desktopWindow='';host.setAttribute('aria-label',doc.title);host.tabIndex=-1;
    const shadow=host.attachShadow({mode:'open'}),html=document.createElement('div'),page=document.createElement('div'),style=document.createElement('style');
    html.className='desktop-html';page.className=`desktop-page ${doc.body.className}`;
    for(const [key,value] of Object.entries(doc.body.dataset))page.dataset[key]=value;
    // Native content only: copy chrome and main, never script/noscript/site utilities.
    for(const selector of ['.site-frame','.window-bar','main'])page.append(doc.querySelector(selector));
    page.querySelectorAll('script,noscript').forEach(node=>node.remove());rebase(page,url);
    style.textContent=css+'\n.desktop-page{background:transparent!important;min-height:100dvh}.desktop-page .page-transition{display:none}';
    html.append(page);shadow.append(style,html);
    const minimizeButton=document.createElement('button');minimizeButton.type='button';minimizeButton.className='window-dot window-dot--min';minimizeButton.dataset.windowMinimize='';minimizeButton.setAttribute('aria-label','Minimize window');minimizeButton.title='Minimize window';minimizeButton.innerHTML='<span aria-hidden="true">−</span>';minimizeButton.addEventListener('click',minimize);
    page.querySelector('.window-dots').append(minimizeButton);
    const restoreButton=document.createElement('button');restoreButton.type='button';restoreButton.dataset.windowRestore='';restoreButton.className='desktop-restore';restoreButton.textContent=`Restore ${doc.querySelector('.window-context')?.textContent||'AI Labs'}`;restoreButton.hidden=true;restoreButton.addEventListener('click',restore);
    shadow.addEventListener('click',event=>{
      const link=event.target.closest('a[href]');if(!link||modified(event)||link.target||link.hasAttribute('download'))return;
      const destination=new URL(link.href);
      if(link.hasAttribute('data-window-close') || (routeKey(destination)===''&&destination.hash==='#navigation')){event.preventDefault();close();return;}
      if(destination.pathname===url.pathname&&destination.search===url.search&&destination.hash){event.preventDefault();history.pushState({...history.state},'',destination);shadow.getElementById(decodeURIComponent(destination.hash.slice(1)))?.scrollIntoView();return;}
      if(isSupported(destination)){event.preventDefault();open(destination);}
    });
    discard();document.body.append(host,restoreButton);active={host,shadow,restore:restoreButton,url};
    metadata({title:doc.title,description:doc.querySelector('meta[name="description"]')?.content,canonical:doc.querySelector('link[rel="canonical"]')?.href});
    setState('open');if(push)history.pushState({...history.state,desktopShell:{route:routeKey(url)}},'',url);
    host.focus({preventScroll:true});if(url.hash)shadow.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
  } catch(error) {
    if(error.name!=='AbortError'&&id===serial)location.assign(url.href);
  } finally {if(id===serial)delete document.body.dataset.desktopLoading;}
}
export async function initDesktopShell() {
  if(document.body.dataset.desktopState)return;
  const direct=isSupported(new URL(location.href))&&!document.querySelector('.home-stage');
  let prepared=null;
  if(direct){
    // Prepare everything before disturbing the readable static fallback.
    const url=new URL(location.href), response=await fetch(base);
    if(!response.ok)throw new Error('Desktop unavailable');
    const home=new DOMParser().parseFromString(await response.text(),'text/html');
    if(!home.querySelector('.home-stage'))throw new Error('Desktop unavailable');
    const css=await stylesFor(document,url);
    const links=[];
    try{
      for(const node of home.querySelectorAll('link[rel="stylesheet"]')){
        const href=new URL(node.getAttribute('href'),base).href;
        if([...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>link.href===href))continue;
        const link=document.createElement('link');link.rel='stylesheet';link.href=href;links.push(link);
        await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(new Error('Desktop stylesheet unavailable'));document.head.append(link);});
      }
    }catch(error){links.forEach(link=>link.remove());throw error;}
    prepared={doc:document.cloneNode(true),css};
    Object.assign(homeMeta,{title:home.title,description:home.querySelector('meta[name="description"]')?.content,canonical:home.querySelector('link[rel="canonical"]')?.href});
    const allowed=new Set([...home.querySelectorAll('link[rel="stylesheet"]')].map(link=>new URL(link.getAttribute('href'),base).href));
    document.querySelectorAll('link[rel="stylesheet"],head>style').forEach(node=>{if(!allowed.has(node.href))node.remove();});
    rebase(home.body,base);
    const preserved=[...document.body.children].filter(node=>['SCRIPT','NOSCRIPT'].includes(node.tagName));
    document.body.replaceChildren(...preserved,...[...home.body.children].filter(node=>!['SCRIPT','NOSCRIPT'].includes(node.tagName)));
    document.body.className=home.body.className;delete document.body.dataset.landscapeCamera;delete document.body.dataset.page;
    // Home initializes once per document. Its existing nodes/listeners survive route changes.
    const {sound,bindThemeControls}=await import('./site.js');sound.bind();bindThemeControls();await import('./home.js');
    scrollTo(0,0);
  }
  if(!document.querySelector('.home-stage'))return;
  // Native desktop links keep their index base while history shows a window route.
  if(!document.querySelector('base')){const baseTag=document.createElement('base');baseTag.href=base.href;document.head.prepend(baseTag);}
  setState('desktop');
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../css/desktop-shell.css',import.meta.url);document.head.append(style);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link||event.defaultPrevented||modified(event)||link.target||link.hasAttribute('download'))return;
    const url=new URL(link.href);if(!isSupported(url))return;
    event.preventDefault();event.stopImmediatePropagation();opener=link;
    if(active && routeKey(active.url)===routeKey(url) && active.url.search===url.search){restore();return;}open(url);
  },true);
  if(prepared)await open(new URL(location.href),false,prepared);
  window.addEventListener('popstate',()=>{const url=new URL(location.href);if(isSupported(url)){if(active?.url.pathname===url.pathname){restore();if(url.hash)active.shadow.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();}else open(url,false);}else if(routeKey(url)==='')close(false);else location.reload();});
}
