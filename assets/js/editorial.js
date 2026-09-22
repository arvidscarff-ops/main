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
document.querySelectorAll('.archive-copy').forEach(copy=>{if(!copy.textContent.trim())return;const details=document.createElement('details');details.className='project-context archive-notes';const summary=document.createElement('summary');summary.textContent='Project notes';copy.before(details);details.append(summary,copy);});
// Original image links remain usable without JS.
const links=[...document.querySelectorAll('.archive-image-link, [data-image-viewer]')];
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
