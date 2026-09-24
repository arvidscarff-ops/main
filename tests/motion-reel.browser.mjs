import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const base = process.env.BASE_URL || 'http://127.0.0.1:5197/';
const route = 'work/graphic-design/motion-graphics/';
const browserOptions = {headless:true, channel:'chrome'};
async function visit(run, options = {}) {
  const browser = await chromium.launch(browserOptions);
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}, reducedMotion:'reduce', ...options});
    // Do not send local review traffic to analytics.
    await page.route('https://www.googletagmanager.com/**', request => request.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + route, {waitUntil:'domcontentloaded'});
    if (options.javaScriptEnabled !== false) await page.waitForSelector('[data-world-ready]');
    else await page.waitForLoadState('load'); // No modules to hold DOMContentLoaded until styles/posters settle.
    await run(page);
    assert.deepEqual(errors, [], 'No browser runtime errors');
  } finally { await browser.close(); }
}

test('Normal-motion reel supports horizontal wheel scrolling without downloading films', async () => {
  await visit(async page => {
    const reel = page.locator('.world-nav--screening');
    await reel.hover();
    await page.mouse.wheel(420, 0);
    await page.waitForFunction(() => document.querySelector('.world-nav--screening').scrollLeft > 150);
    assert.deepEqual(await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(url => /motion-\d+\.mp4/.test(url))), []);
    assert.equal(new URL(page.url()).hash, '');
  }, {reducedMotion:'no-preference'});
});

test('Reel modules, real media and native links resolve under /main/ hosting', async () => {
  const {createServer, request} = await import('node:http');
  // Real loopback prefix proxy, not a browser request interception.
  const server = createServer((incoming, outgoing) => {
    if (!incoming.url.startsWith('/main/')) { outgoing.writeHead(404).end(); return; }
    const upstream = request(new URL(incoming.url.slice('/main/'.length), base), {method:incoming.method}, response => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', () => outgoing.writeHead(502).end());
    incoming.pipe(upstream);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const prefix = `http://127.0.0.1:${server.address().port}/main/`;
  try {
    await visit(async page => {
      await page.goto(prefix + route, {waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-world-ready]');
      const reel = page.locator('.world-nav--screening');
      await reel.locator('a').last().click();
      assert.equal(page.url(), prefix + route + '#scene-9');
      const media = await page.locator('[data-world-id="scene-9"] video').evaluate(v => ({src:v.src,poster:v.poster}));
      for (const url of Object.values(media)) {
        assert.ok(url.startsWith(prefix + 'assets/'));
        assert.equal((await page.request.get(url)).status(), 200);
      }
      await page.locator('[data-world-id="scene-9"] figcaption a').click();
      await page.waitForURL(prefix + 'assets/media/graphic-design/motion/motion-09.mp4');
    });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('No-JavaScript archive keeps every film and its visible original-file link', async () => {
  await visit(async page => {
    assert.equal(await page.locator('.archive-piece video:visible').count(), 9);
    for (const figure of await page.locator('.archive-piece').all()) {
      const link = figure.locator('figcaption a');
      await link.scrollIntoViewIfNeeded();
      const f = await figure.boundingBox(), a = await link.boundingBox();
      assert.ok(a.y >= f.y && a.y + a.height <= f.y + f.height + 2, 'Each fallback link must stay beside its own film');
      const response = await page.request.get(await link.evaluate(el => el.href));
      assert.equal(response.status(), 200);
    }
  }, {javaScriptEnabled:false});
});

test('Playback is on demand, scene changes pause the old film, and native fullscreen still opens', async () => {
  await visit(async page => {
    const first = page.locator('[data-world-id="scene-1"] video');
    assert.equal(await first.evaluate(v => v.networkState), 1);
    await first.evaluate(v => v.play());
    await page.waitForFunction(() => document.querySelector('[data-world-id="scene-1"] video').currentTime > 0);
    assert.equal(await first.evaluate(v => v.paused), false);
    await first.evaluate(v => v.requestFullscreen());
    assert.equal(await page.evaluate(() => document.fullscreenElement?.tagName), 'VIDEO');
    await page.evaluate(() => document.exitFullscreen());
    await page.locator('.world-nav--screening a').nth(1).click();
    assert.equal(await first.evaluate(v => v.paused), true);
    assert.equal(await page.locator('[data-world-id="scene-2"] video').evaluate(v => v.paused), true);
    await page.locator('[data-world-id="scene-2"] figcaption a').click();
    await page.waitForURL('**/motion-02.mp4');
  });
});

test('Touch interaction with native video controls never triggers scene swipes', async () => {
  await visit(async page => {
    const video = page.locator('[data-world-id="scene-1"] video');
    await video.dispatchEvent('pointerdown', {pointerType:'touch',pointerId:8,clientX:300,clientY:400});
    await video.dispatchEvent('pointerup', {pointerType:'touch',pointerId:8,clientX:90,clientY:400});
    assert.equal(new URL(page.url()).hash, '', 'Scrubbing a video must not switch scenes');
  }, {viewport:{width:390,height:844},hasTouch:true,isMobile:true});
});

test('Touch pans the native reel without changing film, then a tap selects', async () => {
  await visit(async page => {
    const reel = page.locator('.world-nav--screening');
    const rect = await reel.boundingBox();
    const client = await page.context().newCDPSession(page);
    const y = rect.y + 50;
    await client.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:rect.x+270,y}]});
    for (let x=rect.x+250;x>=rect.x+50;x-=20) {
      await client.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x,y}]});
    }
    await client.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    await page.waitForFunction(() => document.querySelector('.world-nav--screening').scrollLeft > 80);
    assert.equal(new URL(page.url()).hash, '');
    await reel.locator('a').nth(3).tap();
    assert.equal(new URL(page.url()).hash, '#scene-4');
  }, {viewport:{width:390,height:844},hasTouch:true,isMobile:true});
});

test('Responsive reel keeps complete media above captions and strip', async () => {
  const {mkdir} = await import('node:fs/promises');
  const evidence = process.env.EVIDENCE_DIR || '/tmp/motion-reel-evidence';
  await mkdir(evidence, {recursive:true});
  await visit(async page => {
    for (const [width,height] of [[1440,900],[390,844],[320,568],[844,390],[2560,1440]]) {
      await page.setViewportSize({width,height});
      await page.goto(base + route + '#scene-8', {waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-world-ready]');
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const video = await page.locator('[data-world-id="scene-8"] video').boundingBox();
      const caption = await page.locator('[data-world-id="scene-8"] figcaption').boundingBox();
      const reel = await page.locator('.world-nav--screening').boundingBox();
      assert.ok(video.height > 100 && video.y + video.height <= caption.y + 2, `${width}x${height}: media must not obscure caption`);
      assert.ok(caption.y + caption.height <= reel.y, `${width}x${height}: caption must stay above reel`);
      assert.ok(reel.x >= 0 && reel.x + reel.width <= width, `${width}x${height}: no horizontal overflow`);
      if (height > 600) assert.ok(reel.y + reel.height <= height, 'Reel fits opening viewport');
      await page.screenshot({path:`${evidence}/motion-reel-${width}x${height}.png`});
      if (height <= 600) {
        await page.locator('.world-nav--screening').scrollIntoViewIfNeeded();
        const scrolled = await page.locator('.world-nav--screening').boundingBox();
        assert.ok(scrolled.y >= 0 && scrolled.y + scrolled.height <= height, 'Short screens can scroll to the entire reel');
        await page.screenshot({path:`${evidence}/motion-reel-${width}x${height}-scrolled.png`});
      }
    }
  });
});

test('Deep links and history keep the active poster visible with reduced motion', async () => {
  await visit(async page => {
    await page.goto(base + route + '#scene-9', {waitUntil:'domcontentloaded'});
    const reel = page.locator('.world-nav--screening');
    await page.waitForSelector('[data-world-ready]');
    await page.waitForFunction(() => {
      const nav = document.querySelector('.world-nav--screening');
      const a = nav.querySelector('[aria-current]');
      const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      return r.left >= n.left && r.right <= n.right;
    }, null, {timeout:2000});
    assert.equal(await reel.evaluate(el => getComputedStyle(el).scrollBehavior), 'auto');
    await reel.locator('a').first().click();
    await page.goBack();
    await page.waitForURL('**/#scene-9');
    assert.equal(await page.locator('[data-world-id="scene-9"] video').isVisible(), true);
    assert.equal(await reel.locator('[aria-current]').getAttribute('href'), '#scene-9');
  });
});

test('Reel keyboard navigation moves focus, Enter selects, and video arrow keys stay native', async () => {
  await visit(async page => {
    const links = page.locator('.world-nav--screening a');
    await links.first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await links.nth(1).evaluate(el => el === document.activeElement), true, 'ArrowRight should focus the next poster without hijacking playback');
    assert.equal(new URL(page.url()).hash, '');
    await page.keyboard.press('End');
    assert.equal(await links.last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#scene-9');
    await page.locator('[data-world-id="scene-9"] video').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(new URL(page.url()).hash, '#scene-9', 'Native seek keys must not switch films');
    await links.last().focus();
    await page.keyboard.press('Home');
    assert.equal(await links.first().evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('.world-nav--screening').evaluate(el => el.scrollLeft), 0);
  });
});

test('Mouse dragging scrolls the reel without selecting a film; ordinary clicks still select', async () => {
  await visit(async page => {
    const reel = page.locator('.world-nav--screening');
    const box = await reel.boundingBox();
    await page.mouse.move(box.x + 600, box.y + 65);
    await page.mouse.down();
    await page.mouse.move(box.x + 280, box.y + 65, {steps:12});
    await page.mouse.up();
    assert.ok(await reel.evaluate(el => el.scrollLeft) > 200, 'Dragging must move the poster reel');
    assert.equal(new URL(page.url()).hash, '', 'Drag release must not activate a link');
    await reel.locator('a').nth(3).click();
    assert.equal(new URL(page.url()).hash, '#scene-4');
    await reel.locator('a').nth(3).click({modifiers:['Control']});
    assert.equal(new URL(page.url()).hash, '#scene-4');
  });
});

test('Nine original films retain native playback inside a horizontally scrollable poster reel', async () => {
  await visit(async page => {
    const reel = page.locator('.world-nav--screening');
    const geometry = await reel.evaluate(el => ({width:el.clientWidth, extent:el.scrollWidth, overflow:getComputedStyle(el).overflowX}));
    assert.ok(geometry.extent > geometry.width + 100, 'Desktop reel must scroll rather than squeeze all posters into thumbnails');
    assert.equal(geometry.overflow, 'auto');
    assert.equal(await reel.locator('a[href^="#scene-"]').count(), 9);
    assert.equal(await page.locator('.archive-piece video').count(), 9);
    assert.equal(await page.locator('.archive-piece video:visible').count(), 1);
    assert.ok(await page.locator('.archive-piece video').evaluateAll(videos => videos.every(v => v.controls && v.paused && !v.autoplay && v.preload === 'none')));
    await reel.locator('a').nth(4).click();
    assert.equal(new URL(page.url()).hash, '#scene-5');
    assert.equal(await page.locator('[data-world-id="scene-5"] video').isVisible(), true);
    assert.equal(await page.locator('[data-world-id="scene-5"] figcaption a').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
  });
});
