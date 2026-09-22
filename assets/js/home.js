import { reducedMotion, sound } from './site.js';

const orbit = document.querySelector('[data-orbit]');
const stars = [...orbit.querySelectorAll('[data-star]')];
const logo = orbit.querySelector('[data-home-logo]');
const status = orbit.querySelector('[data-orbit-status]');
const video = document.querySelector('[data-landscape]');
const motionButton = document.querySelector('[data-motion-toggle]');
let expanded = location.hash === '#navigation' || history.state?.orbitOpen === true;
let transition = null;
let positions = stars.map(() => ({ x:0, y:0 }));
let frame = 0;
let paused = false;

const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
const easeOut = value => 1 - Math.pow(1 - value,4);
const smoothstep = (start,end,value) => {
  const t = clamp((value-start)/(end-start));
  return t*t*(3-2*t);
};

function seedPoint() {
  const stage = orbit.getBoundingClientRect();
  const mark = logo.getBoundingClientRect();
  const point = {
    x:mark.left-stage.left+mark.width*.488,
    y:mark.top-stage.top+mark.height*.124
  };
  orbit.style.setProperty('--seed-x',`${point.x}px`);
  orbit.style.setProperty('--seed-y',`${point.y}px`);
  stars.forEach(star=>{star.style.left=`${point.x}px`;star.style.top=`${point.y}px`;});
  return point;
}

function targets(open) {
  const {width,height}=orbit.getBoundingClientRect();
  if(!open)return stars.map(()=>({x:0,y:0}));
  if(height<520){
    const x=Math.min(260,width*.28);
    const top=height*.14;
    const bottom=height*.28;
    return [
      {x:-x,y:-top},{x:0,y:-top},{x:x,y:-top},
      {x:-x,y:bottom},{x:0,y:bottom},{x:x,y:bottom}
    ];
  }
  if(width<700&&height>=520){
    const side=Math.min(145,width*.37);
    const row=Math.min(255,height*.29);
    const inner=Math.min(108,width*.28);
    return [
      {x:-inner,y:-row},{x:inner,y:-row},
      {x:-side,y:0},{x:side,y:0},
      {x:-inner,y:row*.92},{x:inner,y:row*.92}
    ];
  }
  const x=Math.min(360,width*.29);
  const top=Math.min(205,height*.23);
  const bottom=Math.min(340,height*.34);
  return [
    {x:-x,y:-top+18},{x:0,y:-top-18},{x:x,y:-top+24},
    {x:-x*.9,y:bottom},{x:0,y:bottom-12},{x:x*.9,y:bottom+4}
  ];
}

function paint(points) {
  positions=points;
  points.forEach((point,index)=>{
    const distance=Math.hypot(point.x,point.y);
    const opacity=expanded?smoothstep(96,160,distance):smoothstep(92,154,distance);
    const scale=.38+.62*opacity;
    const star=stars[index];
    star.style.opacity=opacity.toFixed(3);
    star.style.transform=`translate3d(${point.x}px,${point.y}px,0) scale(${scale})`;
  });
}

function paintSeed(progress,opening) {
  const wave=opening
    ? Math.sin(Math.PI*clamp(progress/.72))
    : Math.sin(Math.PI*clamp((1-progress)/.72));
  orbit.style.setProperty('--seed-opacity',String(Math.max(0,wave)));
  orbit.style.setProperty('--seed-scale',String(1+Math.max(0,wave)*1.55));
  orbit.style.setProperty('--seed-turn',`${(opening?1:-1)*progress*52}deg`);
}

function semantics() {
  logo.setAttribute('aria-expanded',String(expanded));
  logo.setAttribute('aria-label',expanded?'Close navigation':'Open navigation');
  stars.forEach(star=>{
    const label=star.querySelector('.star-label').textContent;
    star.tabIndex=expanded?0:-1;
    star.setAttribute('aria-label',expanded?label:`Navigation closed — ${label}`);
  });
}

function finish() {
  transition=null;
  const end=targets(expanded);
  positions=end;
  end.forEach((point,index)=>{
    const star=stars[index];
    star.style.opacity=expanded?'1':'0';
    star.style.transform=`translate3d(${point.x}px,${point.y}px,0) scale(${expanded?1:.38})`;
  });
  orbit.style.setProperty('--seed-opacity','0');
  orbit.dataset.state=expanded?'open':'closed';
  semantics();
}

function tick(time) {
  frame=0;
  if(!transition)return;
  const raw=clamp((time-transition.start)/transition.duration);
  const eased=easeOut(raw);
  const points=transition.from.map((from,index)=>{
    const to=transition.to[index];
    const dx=to.x-from.x,dy=to.y-from.y;
    const distance=Math.hypot(dx,dy)||1;
    const bend=transition.bends[index]*distance*Math.sin(Math.PI*eased);
    return {
      x:from.x+dx*eased+(-dy/distance)*bend,
      y:from.y+dy*eased+(dx/distance)*bend
    };
  });
  paint(points);
  paintSeed(raw,transition.opening);
  if(raw===1)finish();else frame=requestAnimationFrame(tick);
}

function setExpanded(open,instant=false) {
  expanded=open;
  try{history.replaceState({...history.state,orbitOpen:open},'');}catch(e){}
  semantics();
  seedPoint();
  if(reducedMotion.matches||instant){paint(targets(open));finish();}
  else{
    transition={
      from:positions.map(point=>({...point})),
      to:targets(open),
      start:performance.now(),
      duration:open?1050:820,
      opening:open,
      bends:[-.17,.13,-.16,.14,-.12,.16]
    };
    orbit.dataset.state=open?'opening':'closing';
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(tick);
  }
  status.textContent=open?'Navigation open. Choose a section.':'Navigation closed.';
  if(!instant)sound.tick('soft');
}

logo.addEventListener('click',()=>setExpanded(!expanded));
stars.forEach(star=>star.addEventListener('click',event=>{
  if(!expanded||transition)event.preventDefault();
}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&expanded){setExpanded(false);logo.focus();}
});
window.addEventListener('resize',()=>{
  seedPoint();
  if(!transition){paint(targets(expanded));finish();}
});
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  const shouldOpen=history.state?.orbitOpen||location.hash==='#navigation';
  setExpanded(Boolean(shouldOpen),true);
  syncMotion();
});

function syncMotion() {
  const still=paused||reducedMotion.matches||document.hidden;
  if(still)video.pause();
  else{
    if(!video.getAttribute('src'))video.src=`assets/media/home/camera-01-${matchMedia('(max-width: 760px)').matches?'mobile':'desktop'}.mp4`;
    video.play().catch(()=>{});
  }
  if(reducedMotion.matches&&transition){paint(targets(expanded));finish();}
  motionButton.textContent=reducedMotion.matches?'Reduced motion':paused?'Resume motion':'Pause motion';
  motionButton.setAttribute('aria-pressed',String(still));
  motionButton.disabled=reducedMotion.matches;
}
motionButton.addEventListener('click',()=>{paused=!paused;syncMotion();});
reducedMotion.addEventListener('change',syncMotion);
document.addEventListener('visibilitychange',syncMotion);

seedPoint();
paint(targets(expanded));
finish();
syncMotion();
