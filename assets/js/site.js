const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

class SoundSystem {
  constructor() {
    try{this.enabled=localStorage.getItem('ass-sound')==='on';}catch{this.enabled=false;} this.context = null;
    this.button = document.querySelector('[data-sound-toggle]'); this.render();
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
const themeButton=document.querySelector('[data-theme-toggle]'),themeLabel=document.querySelector('[data-theme-label]');
const renderTheme=()=>{if(themeLabel)themeLabel.textContent=document.documentElement.dataset.theme==='dark'?'Light':'Dark';}; renderTheme();
themeButton?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('ass-theme',next);}catch{}document.body.classList.remove('theme-glitch');void document.body.offsetWidth;if(!reducedMotion.matches)document.body.classList.add('theme-glitch');sound.tick('theme');renderTheme();});
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||url.origin!==location.origin||link.target==='_blank')return;event.preventDefault();sound.tick();if(reducedMotion.matches){location.href=url.href;return;}document.body.classList.add('is-leaving');setTimeout(()=>{location.href=url.href;},175);});
document.querySelector('[data-copy-email]')?.addEventListener('click',async event=>{const button=event.currentTarget,email=button.dataset.copyEmail;try{await navigator.clipboard.writeText(email);button.textContent='Copied';sound.tick('soft');setTimeout(()=>{button.textContent='Copy';},1500);}catch{location.href=`mailto:${email}`;}});
export { reducedMotion };
