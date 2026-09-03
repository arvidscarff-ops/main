import './site.js';
import { reducedMotion } from './site.js';
import { HOME_CONFIG } from './home-config.js';
import { ProceduralTrackingSource,TrackingRenderer } from './tracking.js';
const mobile=matchMedia('(max-width: 760px)'),videos=[...document.querySelectorAll('[data-camera]')],tear=document.querySelector('.cut-tear'),startedAt=performance.now();let active=0,timer,tracking;
videos.forEach((video,index)=>{const feed=HOME_CONFIG.feeds[index];video.src=mobile.matches?feed.mobile:feed.desktop;video.poster=feed.poster;video.load();});
const syncAndPlay=video=>{const sync=()=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=((performance.now()-startedAt)/1000)%video.duration;video.play().catch(()=>{});};if(video.readyState>=1)sync();else video.addEventListener('loadedmetadata',sync,{once:true});};
const scheduleCut=()=>{clearTimeout(timer);const{min,max}=HOME_CONFIG.cutInterval;timer=setTimeout(cut,min+Math.random()*(max-min));};
const cut=()=>{const previous=active;active=(active+1)%videos.length;videos[previous].classList.remove('is-active');videos[previous].pause();syncAndPlay(videos[active]);videos[active].classList.add('is-active');const cfg=HOME_CONFIG.tear,tearY=12+Math.random()*74;tear.style.setProperty('--tear-y',`${tearY}%`);tear.style.setProperty('--tear-bg-y',`${tearY}%`);tear.style.setProperty('--tear-h',`${cfg.minHeight+Math.random()*(cfg.maxHeight-cfg.minHeight)}px`);tear.style.setProperty('--tear-x',`${(Math.random()-.5)*2*cfg.maxOffset}px`);tear.style.setProperty('--tear-image',`url("${HOME_CONFIG.feeds[active].poster}")`);tear.classList.remove('is-active');void tear.offsetWidth;tear.classList.add('is-active');tracking?.reset();scheduleCut();};
if(!reducedMotion.matches){syncAndPlay(videos[0]);tracking=new TrackingRenderer(document.querySelector('[data-tracking]'),new ProceduralTrackingSource(HOME_CONFIG.tracking),HOME_CONFIG.tracking);scheduleCut();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){videos[active].pause();tracking?.pause();clearTimeout(timer);}else if(!reducedMotion.matches){syncAndPlay(videos[active]);tracking?.resume();scheduleCut();}});
