// Original, dependency-free enhancement of the existing screening navigation.
// Importing site.js reuses its initialized viewer; modules execute only once.
import './site.js';

const reel = document.querySelector('body.motion-reel .world-nav--screening');
if (reel) {
  const links = [...reel.querySelectorAll('a')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function revealCurrent() {
    const active = reel.querySelector('[aria-current]');
    if (!active) return;
    const frame = reel.getBoundingClientRect(), item = active.getBoundingClientRect();
    const delta = item.left < frame.left + 4 ? item.left - frame.left - 4 : item.right > frame.right - 4 ? item.right - frame.right + 4 : 0;
    if (delta) reel.scrollBy({left:delta, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
  }
  new MutationObserver(revealCurrent).observe(reel, {subtree:true, attributes:true, attributeFilter:['aria-current']});
  revealCurrent();
  reel.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = links.indexOf(event.target.closest('a'));
    if (current < 0) return;
    const destinations = {ArrowRight:Math.min(current + 1, links.length - 1), ArrowLeft:Math.max(current - 1, 0), Home:0, End:links.length - 1};
    if (!(event.key in destinations)) return;
    event.preventDefault();
    event.stopPropagation();
    links[destinations[event.key]].focus();
  });
  // The shared viewer has document-level scene shortcuts. Do not let them
  // intercept the native video control's seeking or volume keys on this page.
  document.querySelectorAll('body.motion-reel .archive-piece video').forEach(video => {
    video.addEventListener('keydown', event => event.stopPropagation());
    video.addEventListener('pointerdown', event => event.stopPropagation());
  });
  let drag = null;
  let suppressClick = false;
  reel.addEventListener('dragstart', event => event.preventDefault());
  reel.addEventListener('pointerdown', event => {
    // Touch keeps native momentum scrolling; modified clicks keep link semantics.
    suppressClick = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    drag = {id:event.pointerId, x:event.clientX, left:reel.scrollLeft, moved:false};
  });
  reel.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved && Math.abs(distance) < 7) return;
    drag.moved = true;
    reel.classList.add('is-dragging');
    reel.setPointerCapture(event.pointerId);
    reel.scrollLeft = drag.left - distance;
    event.preventDefault();
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved && event.type === 'pointerup';
    drag = null;
    reel.classList.remove('is-dragging');
    if (reel.hasPointerCapture(event.pointerId)) reel.releasePointerCapture(event.pointerId);
  }
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);
  reel.addEventListener('lostpointercapture', endDrag);
  reel.addEventListener('pointerleave', event => { if (drag && !drag.moved) endDrag(event); });
  reel.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
