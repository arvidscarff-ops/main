// Decorative previews complement ordinary links; touch goes straight to the page.
export function initProjectPreviews() {
  const links=[...document.querySelectorAll('[data-current-project]')];
  if(!links.length)return;
  const sources=['growth','ghostwriting','hermes'];
  const preview=document.createElement('figure');
  preview.className='project-preview';
  preview.dataset.projectPreview='';
  preview.hidden=true;
  preview.setAttribute('aria-hidden','true');
  const image=document.createElement('img');
  image.alt='';
  image.width=640;image.height=448;
  const caption=document.createElement('figcaption');
  preview.append(image,caption);
  document.querySelector('.home-stage').append(preview);
  const eligible=matchMedia('(hover:hover) and (min-width:701px)');
  let active=null,hideTimer=0,request=0;
  const hide=()=>{clearTimeout(hideTimer);request++;preview.hidden=true;active=null;};
  const deferHide=()=>{hideTimer=setTimeout(hide,140);};
  async function show(link,index){
    if(!eligible.matches)return;
    clearTimeout(hideTimer);
    active=link;
    const current=++request;
    image.src=`assets/media/previews/${sources[index]}.webp`;
    caption.textContent=link.querySelector('strong').textContent;
    try{await image.decode();}catch{if(current===request)hide();return;}
    if(current!==request)return;
    const box=link.closest('[data-current-work]').getBoundingClientRect();
    const folderTop=document.querySelector('[data-star]').getBoundingClientRect().top;
    const availableHeight=folderTop-box.top-16;
    const width=Math.min(300,innerWidth-40,(availableHeight-42)/.7);
    if(width<180){hide();return;}
    preview.style.width=`${width}px`;
    preview.style.left=`${Math.min(box.right+16,innerWidth-width-20)}px`;
    preview.style.top=`${box.top}px`;
    preview.hidden=false;
  }
  links.forEach((link,index)=>{
    link.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show(link,index);});
    link.addEventListener('pointerleave',deferHide);
    link.addEventListener('focus',()=>show(link,index));
    link.addEventListener('blur',deferHide);
    link.addEventListener('click',hide);
  });
  preview.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
  preview.addEventListener('pointerleave',deferHide);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!preview.hidden){hide();event.stopImmediatePropagation();event.preventDefault();}
  },true);
  document.querySelector('[data-current-work-toggle]')?.addEventListener('click',hide);
  window.addEventListener('resize',hide);
  window.addEventListener('pagehide',hide);
  eligible.addEventListener('change',hide);
}
