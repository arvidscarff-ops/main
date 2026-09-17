import { reducedMotion, sound } from './site.js';

const orbit = document.querySelector('[data-orbit]');
const stars = [...orbit.querySelectorAll('[data-star]')];
const eagle = orbit.querySelector('[data-eagle]');
const status = orbit.querySelector('[data-orbit-status]');
const video = document.querySelector('[data-landscape]');
const motionButton = document.querySelector('[data-motion-toggle]');
const angles = [-150, -90, -30, 150, 90, 30].map(deg => deg * Math.PI / 180);
let phase = 0, last = 0, frame = 0, transition = null, paused = false;
let expanded = location.hash === '#navigation' || history.state?.orbitOpen === true;
let positions = [];

function targets(open) {
  const { width, height } = orbit.getBoundingClientRect();
  const radius = Math.min(154, height * .143, width * .25);
  const x = Math.min(226, width * .235, height * .21);
  const y = Math.min(194, height * .18);
  return stars.map((_, i) => open
    ? { x: (i % 3 - 1) * x, y: (i < 3 ? -1 : 1) * y }
    : { x: Math.cos(angles[i] + phase) * radius, y: Math.sin(angles[i] + phase) * radius });
}
function paint(points) {
  positions = points;
  stars.forEach((star, i) => { star.style.transform = `translate3d(${points[i].x}px,${points[i].y}px,0)`; });
}
function semantics() {
  eagle.setAttribute('aria-expanded', String(expanded));
  eagle.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
  stars.forEach(star => {
    const label = star.querySelector('.star-label').textContent;
    if (expanded) { star.removeAttribute('role'); star.setAttribute('aria-label', label); }
    else { star.setAttribute('role', 'button'); star.setAttribute('aria-label', `Open navigation — ${label}`); }
  });
}
function finish() {
  transition = null;
  orbit.dataset.state = expanded ? 'open' : 'closed';
  semantics();
}
function wake() {
  if (!frame && !document.hidden && (transition || (!expanded && !paused && !reducedMotion.matches))) frame = requestAnimationFrame(tick);
}
function tick(time) {
  frame = 0;
  const delta = last ? Math.min(time - last, 48) : 0;
  last = time;
  if (transition) {
    const t = Math.min((time - transition.start) / 850, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    const to = targets(expanded);
    paint(to.map((p, i) => ({ x: transition.from[i].x + (p.x - transition.from[i].x) * ease, y: transition.from[i].y + (p.y - transition.from[i].y) * ease })));
    if (t === 1) finish();
  } else if (!expanded && !paused && !reducedMotion.matches) {
    phase += delta * Math.PI * 2 / 72000;
    paint(targets(false));
  }
  wake();
}
function setExpanded(open, instant = false) {
  expanded = open;
  history.replaceState({ ...history.state, orbitOpen: open }, '');
  semantics();
  if (reducedMotion.matches || instant) { paint(targets(open)); finish(); }
  else {
    transition = { from: positions.map(p => ({ ...p })), start: performance.now() };
    orbit.dataset.state = open ? 'opening' : 'closing';
  }
  status.textContent = open ? 'Navigation open. Choose a section.' : 'Navigation closed.';
  wake();
}
eagle.addEventListener('click', () => { setExpanded(!expanded); sound.tick('soft'); });
stars.forEach(star => {
  star.addEventListener('click', event => {
    if (!expanded || transition) {
      event.preventDefault();
      if (!expanded && !transition) { setExpanded(true); sound.tick('soft'); }
    }
  });
  star.addEventListener('keydown', event => {
    if (event.key === ' ' && !expanded) { event.preventDefault(); setExpanded(true); }
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded) { setExpanded(false); eagle.focus(); }
});
window.addEventListener('resize', () => { if (!transition) paint(targets(expanded)); });
window.addEventListener('pageshow', () => {
  if (history.state?.orbitOpen || location.hash === '#navigation') setExpanded(true, true);
  last = 0; syncMotion();
});
function syncMotion() {
  const still = paused || reducedMotion.matches || document.hidden;
  if (still) {
    video.pause();
    if (reducedMotion.matches && transition) { paint(targets(expanded)); finish(); }
    if (!transition) { cancelAnimationFrame(frame); frame = 0; }
  } else {
    if (!video.getAttribute('src')) video.src = `assets/media/home/camera-01-${matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop'}.mp4`;
    video.play().catch(() => {});
  }
  motionButton.textContent = reducedMotion.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
  motionButton.setAttribute('aria-pressed', String(still));
  motionButton.disabled = reducedMotion.matches;
  last = 0; wake();
}
motionButton.addEventListener('click', () => { paused = !paused; syncMotion(); });
reducedMotion.addEventListener('change', syncMotion);
document.addEventListener('visibilitychange', syncMotion);
paint(targets(expanded)); finish(); syncMotion();
