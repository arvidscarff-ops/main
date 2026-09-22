import { reducedMotion, sound } from './site.js';
import { startStarRotation } from './star-rotation.js';

const orbit=document.querySelector('[data-orbit]');
const stars=[...orbit.querySelectorAll('[data-star]')];
const logo=orbit.querySelector('[data-home-logo]');
const status=orbit.querySelector('[data-orbit-status]');
const video=document.querySelector('[data-landscape]');
const motionToggle=document.querySelector('[data-motion-toggle]');
let expanded=false;
let closeTimer=0;
let motionPaused=false;
const rotation=startStarRotation([logo,...stars]);

function setExpanded(open,instant=false) {
  expanded=open;
  clearTimeout(closeTimer);
  logo.setAttribute('aria-expanded',String(open));
  logo.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  stars.forEach(star=>star.tabIndex=open?0:-1);
  if(open&&(instant||reducedMotion.matches)) {
    orbit.dataset.state='open';
  } else if(open) {
    orbit.dataset.state='opening';
    closeTimer=window.setTimeout(()=>{if(expanded)orbit.dataset.state='open';},420);
  } else if(instant||reducedMotion.matches) {
    orbit.dataset.state='closed';
  } else {
    orbit.dataset.state='closing';
    closeTimer=window.setTimeout(()=>{if(!expanded)orbit.dataset.state='closed';},240);
  }
  status.textContent=open?'Navigation open. Choose a section.':'Navigation closed.';
  history.replaceState({...history.state,orbitOpen:open},'');
  if(!instant)sound.tick('soft');
}

function loadVideo() {
  if(reducedMotion.matches||motionPaused||document.hidden)return;
  if(!video.getAttribute('src')) {
    video.src=innerWidth<=700?'assets/media/home/camera-01-mobile.mp4':'assets/media/home/camera-01-desktop.mp4';
    video.load();
  }
  video.play().catch(()=>{});
}
function syncMotion() {
  const reduce=reducedMotion.matches;
  const suspended=motionPaused||reduce||document.hidden;
  rotation.setPaused(suspended);
  motionToggle.disabled=reduce;
  motionToggle.setAttribute('aria-pressed',String(motionPaused||reduce));
  motionToggle.textContent=reduce?'Motion reduced':motionPaused?'Play motion':'Pause motion';
  if(suspended)video.pause();else loadVideo();
}

logo.addEventListener('click',()=>setExpanded(!expanded));
logo.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'&&expanded){event.preventDefault();stars[0].focus();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&expanded){event.preventDefault();setExpanded(false);logo.focus();}
});
window.addEventListener('hashchange',()=>setExpanded(location.hash==='#navigation',true));
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  setExpanded(Boolean(history.state?.orbitOpen||location.hash==='#navigation'),true);
  syncMotion();
});
window.addEventListener('pagehide',()=>clearTimeout(closeTimer));
motionToggle.addEventListener('click',()=>{motionPaused=!motionPaused;syncMotion();});
reducedMotion.addEventListener?.('change',syncMotion);
document.addEventListener('visibilitychange',syncMotion);

document.documentElement.classList.add('has-js');
stars.forEach(star=>star.setAttribute('aria-label',star.querySelector('.star-label').textContent.trim()));
setExpanded(Boolean(history.state?.orbitOpen||location.hash==='#navigation'),true);
syncMotion();
