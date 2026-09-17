import { sound } from './site.js';

// This is a decorative gate on a public static site, not authentication.
// Never place private content or secrets behind this interaction.
const gate = document.querySelector('[data-keypad]');
const room = document.querySelector('[data-empty-room]');
const display = document.querySelector('[data-code-display]');
const status = document.querySelector('[data-keypad-status]');
let digits = '';
function render() {
  display.firstElementChild.textContent = Array.from({ length: 6 }, (_, i) => i < digits.length ? '●' : '○').join(' ');
  display.setAttribute('aria-label', `${digits.length} of 6 digits entered`);
}
function digit(value) {
  if (digits.length >= 6) return;
  digits += value; status.textContent = ''; render(); sound.tick('soft');
}
function erase() { digits = digits.slice(0, -1); status.textContent = ''; render(); }
function submit() {
  if (digits.length !== 6) { status.textContent = 'Enter all six digits.'; return; }
  if (digits === '777111') {
    digits = ''; render(); gate.hidden = true; room.hidden = false; room.focus(); sound.tick('soft');
  } else {
    digits = ''; render(); status.textContent = 'Not recognised. Try again.';
  }
}
gate.querySelectorAll('[data-digit]').forEach(button => button.addEventListener('click', () => digit(button.dataset.digit)));
gate.querySelector('[data-erase]').addEventListener('click', erase);
gate.querySelector('[data-enter]').addEventListener('click', submit);
document.addEventListener('keydown', event => {
  if (gate.hidden || event.metaKey || event.ctrlKey || event.altKey || event.target.closest('a, summary, [data-theme-toggle], [data-sound-toggle]')) return;
  if (/^[0-9]$/.test(event.key)) { event.preventDefault(); digit(event.key); }
  else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); erase(); }
  else if (event.key === 'Enter') {
    // Enter on a focused digit remains a native button activation. Typed codes submit.
    if (event.target.matches('[data-digit]') && digits.length < 6) return;
    event.preventDefault(); submit();
  } else if (event.key === 'Escape') { digits = ''; status.textContent = ''; render(); }
});
