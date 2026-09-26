const body=document.body;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const motionAllowed=!reducedMotion.matches&&!navigator.connection?.saveData;
const camera=body.dataset.landscapeCamera;
const root=document.querySelector('meta[name="site-root"]')?.content||'.';
const base=new URL(`${root.replace(/\/$/,'')}/`,location.href);
const source=kind=>new URL(`assets/media/home/camera-${camera}-${kind}.mp4`,base).href;
const poster=new URL(`assets/media/home/camera-${camera}-poster.jpg`,base).href;
const backdrop=document.createElement('div');
backdrop.className='landscape-backdrop';
backdrop.dataset.landscapeBackdrop='';
backdrop.style.setProperty('--landscape-poster',`url("${poster}")`);
backdrop.setAttribute('aria-hidden','true');
const video=document.createElement('video');
video.className='landscape-backdrop__video';
video.dataset.landscapeVideo='';
video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.poster=poster;
backdrop.append(video,document.createElement('div'));
backdrop.lastElementChild.className='landscape-backdrop__wash';
body.prepend(backdrop);
if(motionAllowed){
 const button=document.createElement('button');
 button.type='button';button.className='landscape-motion';button.dataset.landscapeMotion='';
 const actions=document.querySelector('[data-window-actions]');
 const close=actions?.querySelector('[data-window-close]');
 actions?.insertBefore(button,close||null);
 let paused=false;
 try{paused=sessionStorage.getItem('portfolio-landscape-paused')==='true';}catch{}
 function render(){button.setAttribute('aria-pressed',String(paused));button.replaceChildren();const icon=document.createElement('span');icon.className='landscape-motion__icon';icon.setAttribute('aria-hidden','true');icon.textContent=paused?'▶':'❚❚';const label=document.createElement('span');label.className='landscape-motion__label';label.textContent=paused?'Play background':'Pause background';button.append(icon,label);}
 function sync(){
  if(paused||document.hidden){video.pause();return;}
  if(!video.getAttribute('src')){video.src=source(innerWidth<=700?'mobile':'desktop');video.load();}
  video.play().catch(()=>{});
 }
 button.addEventListener('click',()=>{
  paused=!paused;
  try{sessionStorage.setItem('portfolio-landscape-paused',String(paused));}catch{}
  render();sync();
 });
 document.addEventListener('visibilitychange',sync);
 render();sync();
}
