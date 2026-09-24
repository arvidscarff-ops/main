// Real links remain the no-JS experience. Only the gallery is enhanced.
const gallery = document.querySelector('[data-work-gallery]');
if (gallery) {
 const panels = [...gallery.querySelectorAll('[data-work-item]')];
 const storageKey = `work-gallery:${location.pathname}`;
 let pointerType = '';
 function select(panel) {
  panels.forEach(item => item.classList.toggle('is-active', item === panel));
  try { sessionStorage.setItem(storageKey, panel.id); } catch {}
 }
 function restore() {
  let saved = '';
  try { saved = sessionStorage.getItem(storageKey); } catch {}
  const requested = panels.find(panel => `#${panel.id}` === location.hash)
   || panels.find(panel => panel.id === saved);
  if (requested) select(requested);
 }
 panels.forEach(panel => {
  panel.addEventListener('pointerenter', event => {
   if (event.pointerType === 'mouse') select(panel);
  });
  panel.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
  panel.addEventListener('focusin', () => {
   if (pointerType !== 'touch') select(panel);
  });
  panel.querySelector('a').addEventListener('click', event => {
   if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
   const touch = event.pointerType === 'touch' || (event.detail > 0 && pointerType === 'touch');
   if (touch && (!panel.classList.contains('is-active') || !event.target.closest('.work-panel__enter'))) {
    event.preventDefault();
    select(panel);
    panel.scrollIntoView({block:'nearest', behavior:'instant'});
   } else select(panel);
  });
 });
 gallery.addEventListener('keydown', () => { pointerType = ''; });
 window.addEventListener('pageshow', restore);
 window.addEventListener('hashchange', restore);
 gallery.dataset.ready = '';
 restore();
}
