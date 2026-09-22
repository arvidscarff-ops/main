// Progressive enhancement: all original content remains readable without JS.
document.body.classList.add('has-section-js');
function chapterIndex(nav,panels){
 if(!nav||!panels.length)return;
 const choices=[...nav.querySelectorAll('a[href^="#"]')];
 function render(){
  const id=decodeURIComponent(location.hash.slice(1));
  panels.forEach(panel=>{panel.hidden=panel.id!==id&&!panel.querySelector(`[id="${CSS.escape(id)}"]`);if(panel.hidden)panel.querySelectorAll('video').forEach(v=>v.pause());});
  choices.forEach(a=>a.setAttribute('aria-expanded',String(!panels.find(p=>p.id===a.hash.slice(1))?.hidden)));
 }
 choices.forEach(a=>{a.setAttribute('aria-controls',a.hash.slice(1));a.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();const next=location.hash===a.hash?'':a.hash;
  history.pushState(null,'',location.pathname+location.search+next);render();
 });});
 panels.forEach(panel=>{const close=document.createElement('button');close.type='button';close.dataset.closeChapter='';close.className='chapter-close';close.textContent='Close section ↑';close.addEventListener('click',()=>{history.pushState(null,'',location.pathname+location.search);render();choices.find(a=>a.hash==='#'+panel.id)?.focus();});panel.append(close);});
 window.addEventListener('popstate',render);window.addEventListener('hashchange',render);render();
}
chapterIndex(document.querySelector('.chapter-index'),[...document.querySelectorAll('.agoos-spread')]);
chapterIndex(document.querySelector('.assignment-index'),[...document.querySelectorAll('.assignment')]);
document.querySelectorAll('.principles section').forEach(section=>{
 const title=section.querySelector('h3');if(!title)return;
 const container=title.parentElement,details=document.createElement('details'),summary=document.createElement('summary');
 summary.append(title);details.append(summary);while(container.firstChild)details.append(container.firstChild);container.append(details);
});
document.querySelectorAll('.archive-copy').forEach(copy=>{if(!copy.textContent.trim())return;const details=document.createElement('details');details.className='project-context archive-notes';const summary=document.createElement('summary');summary.textContent='Project notes';summary.setAttribute('aria-label','Project notes');copy.before(details);details.append(summary,copy);});
// Shared project-world scene engine. Original scenes remain readable without JS.
const world=document.querySelector('[data-project-world]');
if(world){
 const stage=world.querySelector('[data-world-stage]'),scenes=[...world.querySelectorAll('[data-world-scene]')];
 if(stage&&scenes.length){
  const nav=document.createElement('nav');nav.className='world-nav';nav.dataset.worldNav='';nav.hidden=true;nav.setAttribute('aria-label','Project scenes');
  const links=scenes.map((scene,index)=>{const a=document.createElement('a'),number=document.createElement('span'),label=document.createElement('strong');a.href=`#${scene.dataset.worldId}`;number.textContent=String(index+1).padStart(2,'0');label.textContent=scene.dataset.worldLabel||`Scene ${index+1}`;a.append(number,label);nav.append(a);return a;});
  const controls=document.createElement('div'),prev=document.createElement('button'),status=document.createElement('button'),next=document.createElement('button');controls.className='world-controls';controls.dataset.worldControls='';prev.type=status.type=next.type='button';prev.dataset.worldPrev=next.dataset.worldNext='';prev.ariaLabel='Previous scene';next.ariaLabel='Next scene';prev.textContent='←';next.textContent='→';status.dataset.worldStatus='';status.setAttribute('aria-expanded','false');controls.append(prev,status,next);
  const focusBar=document.createElement('div');focusBar.className='world-focus-bar';focusBar.dataset.worldFocus='';focusBar.hidden=true;focusBar.setAttribute('role','dialog');focusBar.setAttribute('aria-modal','true');focusBar.setAttribute('aria-label','Artwork focus mode');
  const closeFocus=document.createElement('button'),focusStatus=document.createElement('p'),zoom=document.createElement('button'),original=document.createElement('a');closeFocus.type=zoom.type='button';closeFocus.ariaLabel='Close focus mode';closeFocus.textContent='Close ×';focusStatus.dataset.worldFocusStatus='';zoom.ariaLabel='Zoom artwork';zoom.textContent='Zoom';original.target='_blank';original.rel='noopener';original.textContent='Original ↗';focusBar.append(closeFocus,focusStatus,zoom,original);
  const utility=document.createElement('nav'),back=document.createElement('a'),nextProject=document.createElement('a'),context=world.querySelector('.project-context'),sourceNext=world.querySelector('.archive-next a');utility.className='world-utility';utility.setAttribute('aria-label','Project navigation');back.href='../../../design/';back.dataset.worldReturn='';back.textContent='← Back to Design';nextProject.href=sourceNext?.href||'../event-festival/';nextProject.textContent=`Next project: ${(sourceNext?.textContent||'Event & Festival').replace(/\s*→\s*$/,'')} →`;if(context)utility.append(back,context,nextProject);else utility.append(back,nextProject);stage.closest('main')?.prepend(utility);
  stage.append(nav,controls,focusBar);
  let index=0,focusOpener=null;
  function requestedIndex(){const found=scenes.findIndex(scene=>`#${scene.dataset.worldId}`===location.hash);return found<0?0:found;}
  function render(){index=requestedIndex();scenes.forEach((scene,i)=>scene.hidden=i!==index);links.forEach((link,i)=>i===index?link.setAttribute('aria-current','true'):link.removeAttribute('aria-current'));const active=scenes[index],source=active.querySelector('img'),artwork=active.querySelector('.archive-image-link');if(source)stage.style.setProperty('--world-image',`url("${source.currentSrc||source.src}")`);const label=`${String(index+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')} — ${active.dataset.worldLabel}`;status.textContent=focusStatus.textContent=label;status.ariaLabel=`Scene overview: ${label}`;original.href=artwork.href;world.dataset.worldReady='';}
  function setFocus(active,restore=true){document.body.classList.toggle('world-focus',active);focusBar.hidden=!active;delete document.body.dataset.worldZoomed;zoom.ariaLabel='Zoom artwork';zoom.textContent='Zoom';[document.querySelector('.section-header'),world.querySelector('.archive-breadcrumb'),world.querySelector('.world-intro'),world.querySelector('.project-context'),nav].forEach(node=>{if(node)node.inert=active;});if(active)closeFocus.focus({preventScroll:true});else if(restore)focusOpener?.focus({preventScroll:true});}
  function enterFocus(link){focusOpener=link;history.pushState({...(history.state||{}),worldFocus:true},'',location.href);setFocus(true,false);}
  function leaveFocus(){if(history.state?.worldFocus)history.back();else setFocus(false);}
  function go(next){const target=(next+scenes.length)%scenes.length;history.pushState({worldFocus:document.body.classList.contains('world-focus')},'',`${location.pathname}${location.search}#${scenes[target].dataset.worldId}`);render();scenes[target].focus({preventScroll:true});}
  links.forEach((link,i)=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();nav.hidden=true;status.setAttribute('aria-expanded','false');go(i);}));
  let swipeStart=null,suppressFocus=false;
  stage.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'||document.body.classList.contains('world-focus')||event.target.closest('button,nav,details'))return;swipeStart={x:event.clientX,y:event.clientY};});
  stage.addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.35)return;suppressFocus=true;go(index+(dx<0?1:-1));setTimeout(()=>{suppressFocus=false;},250);});
  scenes.forEach(scene=>scene.querySelector('.archive-image-link')?.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(suppressFocus)return;enterFocus(event.currentTarget);}));
  controls.querySelector('[data-world-prev]').addEventListener('click',()=>go(index-1));controls.querySelector('[data-world-next]').addEventListener('click',()=>go(index+1));
  status.addEventListener('click',()=>{nav.hidden=!nav.hidden;status.setAttribute('aria-expanded',String(!nav.hidden));});
  back.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;try{if(document.referrer&&new URL(document.referrer).pathname===new URL(back.href).pathname){event.preventDefault();history.back();}}catch{}});
  closeFocus.addEventListener('click',leaveFocus);zoom.addEventListener('click',()=>{const active=!document.body.hasAttribute('data-world-zoomed');if(active)document.body.dataset.worldZoomed='true';else delete document.body.dataset.worldZoomed;zoom.ariaLabel=active?'Fit artwork':'Zoom artwork';zoom.textContent=active?'Fit':'Zoom';});
  window.addEventListener('popstate',()=>{render();setFocus(Boolean(history.state?.worldFocus));});window.addEventListener('hashchange',render);
  document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(event.key==='Escape'&&document.body.classList.contains('world-focus')){event.preventDefault();leaveFocus();return;}if(event.key==='ArrowRight'){event.preventDefault();go(index+1);}if(event.key==='ArrowLeft'){event.preventDefault();go(index-1);}});
  scenes.forEach(scene=>scene.tabIndex=-1);render();if(location.hash)requestAnimationFrame(()=>scrollTo(0,0));
 }
}

// Original image links remain usable without JS.
const links=[...document.querySelectorAll('.archive-image-link, [data-image-viewer]')].filter(link=>!link.closest('[data-project-world]'));
if(links.length){
 const dialog=document.createElement('dialog');
 dialog.className='image-viewer';dialog.setAttribute('aria-label','Image viewer');
 dialog.innerHTML='<div class="viewer-bar"><span data-viewer-count aria-live="polite"></span><button type="button" data-viewer-close>Close ×</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="viewer-bar"><button type="button" data-viewer-prev aria-label="Previous image">← Previous</button><a data-viewer-original target="_blank" rel="noopener">Open original ↗</a><button type="button" data-viewer-next aria-label="Next image">Next →</button></div>';
 document.body.append(dialog);
 let index=0,opener=null;
 const image=dialog.querySelector('img');
 function show(next){
  index=(next+links.length)%links.length;
  const source=links[index].querySelector('img');
  image.src=links[index].href;image.alt=source?.alt||'';
  dialog.querySelector('figcaption').textContent=image.alt;
  dialog.querySelector('[data-viewer-count]').textContent=`${String(index+1).padStart(2,'0')} / ${String(links.length).padStart(2,'0')}`;
  dialog.querySelector('[data-viewer-original]').setAttribute('href',links[index].getAttribute('href'));
 }
 links.forEach((link,i)=>link.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();opener=link;show(i);dialog.showModal();document.body.classList.add('viewer-open');
 }));
 dialog.querySelector('[data-viewer-prev]').addEventListener('click',()=>show(index-1));
 dialog.querySelector('[data-viewer-next]').addEventListener('click',()=>show(index+1));
 dialog.querySelector('[data-viewer-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');opener?.focus({preventScroll:true});});
}
