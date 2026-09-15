import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness() {
  const listeners = {}, windowListeners = {}, state = {scroll: null, removed: [], prevented: false};
  const anchor = {addEventListener: (name, fn) => {listeners[`anchor:${name}`] = fn;}};
  const main = {scrollTo: (...args) => {state.scroll = args;}};
  const document = {
    querySelector: () => null,
    querySelectorAll: selector => selector === 'a[href="#main"]' ? [anchor] : [],
    getElementById: id => id === 'main' ? main : null,
    addEventListener: (name, fn) => {listeners[name] = fn;},
    body: {classList: {remove: name => state.removed.push(name)}}
  };
  const location = new URL('https://example.test/main/work/graphic-design/textur/');
  const source = fs.readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8')
    .replace('export const sound=', 'const sound=').replace('export { reducedMotion };', '');
  vm.runInNewContext(source, {document, location, URL, matchMedia: () => ({matches: false}),
    localStorage: {getItem: () => null}, window: {addEventListener: (name, fn) => {windowListeners[name] = fn;}}, setTimeout});
  return {listeners, windowListeners, state, location};
}

test('Back to top scrolls the fixed main panel', () => {
  const h = harness(); h.listeners['anchor:click']();
  assert.deepEqual(h.state.scroll, [0, 0]);
});
test('Same-document hash links avoid leaving-page transitions', () => {
  const h = harness();
  const link = {href: h.location.href + '#main', target: '', hasAttribute: () => false};
  h.listeners.click({target: {closest: () => link}, preventDefault: () => {h.state.prevented = true;}});
  assert.equal(h.state.prevented, false);
});
test('Browser Back clears restored leaving-page state', () => {
  const h = harness(); h.windowListeners.pageshow();
  assert.deepEqual(h.state.removed, ['is-leaving']);
});
