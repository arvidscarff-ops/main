import './editorial.js?v=3';
const shellCandidate=document.querySelector('.home-stage')||(document.body?.dataset?.page==='ai-labs'&&/\/ai-labs\/(?:index\.html)?$/.test(location.pathname));
if(shellCandidate)import('./desktop-shell.js?v=3').then(module=>module.initDesktopShell()).catch(()=>{if(document.body.dataset.landscapeCamera)import('./landscape-backdrop.js');});
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if(!shellCandidate&&document.body?.dataset?.landscapeCamera) import('./landscape-backdrop.js');

// Window-bar upgrade: OS-style titlebar with traffic dots and breadcrumb.
(function windowBar(){
  const bar=document.querySelector('.window-bar');
  if(!bar)return;
  const orientation=bar.querySelector('.window-orientation');
  const close=bar.querySelector('[data-window-close]');
  // Section pages have no parent link; add "Index" so the path reads like a breadcrumb.
  if(orientation&&bar.dataset.windowLevel==='section'&&!bar.querySelector('[data-window-parent]')){
    const context=orientation.querySelector('.window-context');
    if(context&&close){
      const parent=document.createElement('a');
      parent.className='window-parent';
      parent.dataset.windowParent='';
      parent.href=close.getAttribute('href');
      const arrow=document.createElement('span');
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='←';
      parent.append(arrow,' Index');
      const divider=document.createElement('span');
      divider.className='window-divider';
      divider.setAttribute('aria-hidden','true');
      divider.textContent='/';
      orientation.insertBefore(divider,context);
      orientation.insertBefore(parent,divider);
    }
  }
  const dots=bar.querySelector('.window-dots');
  if(dots&&document.body.classList.contains('page--inner')){
    const main=document.querySelector('main');
    const addControl=(name,glyph,label,handler)=>{
      const button=document.createElement('button');button.type='button';button.className=`window-dot window-dot--${name}`;
      button.dataset[name==='min'?'windowMinimize':'windowZoom']='';button.setAttribute('aria-label',label);button.title=label;
      const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=glyph;button.append(icon);
      button.addEventListener('click',handler);dots.append(button);return button;
    };
    const min=addControl('min','−','Minimize window',()=>{
      const minimized=document.body.classList.toggle('window-is-minimized');
      min.setAttribute('aria-label',minimized?'Restore window':'Minimize window');min.title=min.getAttribute('aria-label');
      min.setAttribute('aria-expanded',String(!minimized));if(main)main.inert=minimized;
    });
    min.setAttribute('aria-expanded','true');
    const zoom=addControl('zoom','+','Expand window',()=>{
      const expanded=document.body.classList.toggle('window-is-zoomed');
      zoom.setAttribute('aria-label',expanded?'Restore window size':'Expand window');zoom.title=zoom.getAttribute('aria-label');
      zoom.setAttribute('aria-pressed',String(expanded));
    });
    zoom.setAttribute('aria-pressed','false');
  }
})();

class SoundSystem {
  constructor() {
    try{this.enabled=localStorage.getItem('ass-sound')==='on';}catch{this.enabled=false;} this.context = null;
    this.bind();
  }
  bind(){
    const button=document.querySelector('[data-sound-toggle]');if(button===this.button)return;
    this.button=button;this.render();
    this.button?.addEventListener('click', () => { this.enabled=!this.enabled; try{localStorage.setItem('ass-sound',this.enabled?'on':'off');}catch{} if(this.enabled)this.tick('soft'); this.render(); });
  }
  render(){ if(!this.button)return; this.button.setAttribute('aria-pressed',String(this.enabled)); this.button.querySelector('[data-sound-label]').textContent=this.enabled?'on':'off'; this.button.querySelector('[data-sound-icon]').textContent=this.enabled?'●':'○'; }
  tick(kind='tick'){
    if(!this.enabled)return; this.context ||= new (window.AudioContext||window.webkitAudioContext)(); const now=this.context.currentTime;
    const osc=this.context.createOscillator(),gain=this.context.createGain(),filter=this.context.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=kind==='soft'?900:1350;
    osc.type='sine'; osc.frequency.setValueAtTime(kind==='theme'?170:115,now); osc.frequency.exponentialRampToValueAtTime(kind==='theme'?105:78,now+.055);
    gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(kind==='soft'?.028:.018,now+.004); gain.gain.exponentialRampToValueAtTime(.0001,now+.075);
    osc.connect(filter).connect(gain).connect(this.context.destination); osc.start(now); osc.stop(now+.08);
  }
}
export const sound=new SoundSystem();
const nav=document.querySelector('[data-nav]'),trigger=nav?.querySelector('.nav-island__trigger');
const setNav=open=>{nav?.classList.toggle('is-open',open);trigger?.setAttribute('aria-expanded',String(open));};
let keyboardNavigation=false;
trigger?.addEventListener('click',event=>{setNav(event.detail===0?true:!nav.classList.contains('is-open'));sound.tick('soft');});
document.addEventListener('pointerdown',event=>{keyboardNavigation=false;if(nav&&!nav.contains(event.target))setNav(false);});
document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardNavigation=true;if(event.key==='Escape'){setNav(false);trigger?.focus();}});
nav?.addEventListener('focusin',()=>{if(keyboardNavigation)setNav(true);});
nav?.addEventListener('focusout',event=>{if(!nav.contains(event.relatedTarget))setTimeout(()=>setNav(false),140);});
export function bindThemeControls(){
 const themeButton=document.querySelector('[data-theme-toggle]'),themeLabel=document.querySelector('[data-theme-label]');
 if(!themeButton||themeButton.dataset.themeBound)return;
 themeButton.dataset.themeBound='true';
 const readingPage=document.body.classList.contains('page--inner');
 if(!readingPage&&!document.documentElement.dataset.theme){
  let saved;try{saved=localStorage.getItem('ass-theme');}catch{}
  document.documentElement.dataset.theme=saved||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
 }
 const currentTheme=()=>readingPage?(document.body.dataset.readingTheme||'light'):document.documentElement.dataset.theme;
 const renderTheme=()=>{if(themeLabel)themeLabel.textContent=currentTheme()==='dark'?'Light':'Dark';};renderTheme();
 themeButton.addEventListener('click',()=>{const next=currentTheme()==='dark'?'light':'dark';if(readingPage)document.body.dataset.readingTheme=next;else{document.documentElement.dataset.theme=next;try{localStorage.setItem('ass-theme',next);}catch{}}sound.tick('theme');renderTheme();});
}
bindThemeControls();
const scrollKey=`portfolio-scroll:${location.pathname}${location.search}`;
function saveScrollPosition(){try{sessionStorage.setItem(scrollKey,String(scrollY));}catch{}}
function restoreScrollPosition(event){try{const navigation=performance.getEntriesByType('navigation')[0];if(!event.persisted&&navigation?.type!=='back_forward')return;const saved=Number(sessionStorage.getItem(scrollKey));if(Number.isFinite(saved))requestAnimationFrame(()=>scrollTo(0,saved));}catch{}}
window.addEventListener('pagehide',saveScrollPosition);window.addEventListener('pageshow',restoreScrollPosition);
const prefetched=new Set();
function prefetchOnIntent(target){const link=target.closest?.('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname||link.target==='_blank'||link.hasAttribute('download')||prefetched.has(url.href))return;const hint=document.createElement('link');hint.rel='prefetch';hint.setAttribute('href',link.getAttribute('href'));document.head.append(hint);prefetched.add(url.href);}
document.addEventListener('pointerover',event=>prefetchOnIntent(event.target));document.addEventListener('focusin',event=>prefetchOnIntent(event.target));
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||url.origin!==location.origin||link.target==='_blank'||link.hasAttribute('download')||(url.pathname===location.pathname&&url.search===location.search&&url.hash))return;event.preventDefault();sound.tick();if(reducedMotion.matches||CSS.supports('view-transition-name: root')){location.href=url.href;return;}document.body.classList.add('is-leaving');setTimeout(()=>{location.href=url.href;},175);});
document.querySelector('[data-copy-email]')?.addEventListener('click',async event=>{const button=event.currentTarget,email=button.dataset.copyEmail;try{await navigator.clipboard.writeText(email);button.textContent='Copied';sound.tick('soft');setTimeout(()=>{button.textContent='Copy';},1500);}catch{location.href=`mailto:${email}`;}});
// Inner pages scroll inside the fixed main panel, not the document.
document.querySelectorAll('a[href="#main"]').forEach(link=>link.addEventListener('click',()=>document.getElementById('main')?.scrollTo(0,0)));
// Browser Back can restore a page mid-transition from the back-forward cache.
window.addEventListener('pageshow',()=>document.body.classList.remove('is-leaving'));
export { reducedMotion };
