import { reducedMotion, sound } from './site.js';
import { initProjectPreviews } from './project-previews.js';
initProjectPreviews();

const orbit=document.querySelector('[data-orbit]');
const stars=[...orbit.querySelectorAll('[data-star]')];
const logo=orbit.querySelector('[data-home-logo]');
const status=orbit.querySelector('[data-orbit-status]');
const video=document.querySelector('[data-landscape]');
const motionToggle=document.querySelector('[data-motion-toggle]');
const currentWork=document.querySelector('[data-current-work]');
const currentWorkToggle=document.querySelector('[data-current-work-toggle]');
const currentWorkList=document.querySelector('[data-current-work-list]');
let expanded=false;
let closeTimer=0;
let motionPaused=false;


if(currentWork&&currentWorkToggle&&currentWorkList){
  const key='portfolio-current-work-minimized';
  let saved=null;
  try{saved=sessionStorage.getItem(key);}catch{}
  let minimized=saved===null?matchMedia('(max-width:700px), (max-height:760px)').matches:saved==='true';
  const render=()=>{
    currentWork.dataset.state=minimized?'minimized':'open';
    currentWorkList.hidden=minimized;
    currentWorkToggle.hidden=false;
    currentWorkToggle.setAttribute('aria-expanded',String(!minimized));
    currentWorkToggle.setAttribute('aria-label',minimized?'Show current work':'Hide current work');
    currentWorkToggle.firstElementChild.textContent=minimized?'+':'−';
  };
  currentWorkToggle.addEventListener('click',()=>{minimized=!minimized;try{sessionStorage.setItem(key,String(minimized));}catch{}render();sound.tick('soft');});
  render();
}

function setExpanded(open,instant=false) {
  expanded=open;
  clearTimeout(closeTimer);
  logo.setAttribute('aria-expanded',String(open));
  logo.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  stars.forEach(star=>star.tabIndex=open?0:-1);
  orbit.querySelector('.constellation').inert=!open;
  if(open&&(instant||reducedMotion.matches)) {
    orbit.dataset.state='open';
  } else if(open) {
    orbit.dataset.state='opening';
    closeTimer=window.setTimeout(()=>{if(expanded)orbit.dataset.state='open';},1800);
  } else if(instant||reducedMotion.matches) {
    orbit.dataset.state='closed';
  } else {
    orbit.dataset.state='closing';
    closeTimer=window.setTimeout(()=>{if(!expanded)orbit.dataset.state='closed';},700);
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

  motionToggle.disabled=reduce;
  motionToggle.setAttribute('aria-pressed',String(motionPaused||reduce));
  motionToggle.textContent=reduce?'Motion reduced':motionPaused?'Play motion':'Pause motion';
  if(suspended)video.pause();else loadVideo();
}

logo.addEventListener('click',()=>setExpanded(!expanded));
// Empty desktop space opens navigation; existing controls retain their action.
document.querySelector('.home-stage').addEventListener('click',event=>{
  if(!expanded&&!event.target.closest('a,button,input,summary'))setExpanded(true);
});
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
requestAnimationFrame(()=>requestAnimationFrame(()=>{orbit.dataset.ready='true';}));
syncMotion();
