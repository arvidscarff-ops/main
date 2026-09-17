import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
const evidence=process.env.EVIDENCE_DIR||path.join(os.tmpdir(),'portfolio-orbit-evidence');
fs.mkdirSync(evidence,{recursive:true});
async function run(options,fn) {
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext(options);const page=await context.newPage();page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && r.url().startsWith(base))errors.push(`${r.status()} ${r.url()}`);});
  await fn(page,context);assert.deepEqual(errors,[],'No page errors or broken requests');
 } finally{await browser.close();}
}
async function bounds(page,selector) {
 const items=await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight};}));
 for(const r of items)assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=r.vw+1&&r.y+r.h<=r.vh+1,JSON.stringify(r));
}

test('Page changes use a plain fade rather than the old scan-line effect',()=>run({},async page=>{
 await page.goto(base+'work/');
 const effect=await page.evaluate(()=>{
  document.querySelector('.section-footer a').click();
  const style=getComputedStyle(document.querySelector('.page-transition'));
  return {blend:style.mixBlendMode,transform:style.transform};
 });
 assert.equal(effect.blend,'normal');assert.equal(effect.transform,'none');
}));

test('Theme changes are quiet, not glitch effects',()=>run({},async page=>{
 await page.goto(base);await page.locator('[data-theme-toggle]').click();
 assert.equal(await page.locator('body').evaluate(b=>b.classList.contains('theme-glitch')),false);
}));

test('Motion starts from current positions, settles, reverses cleanly and pauses',()=>run({viewport:{width:1440,height:900}},async page=>{
 await page.goto(base);
 const first=page.locator('[data-star]').first();
 await page.waitForTimeout(120);
 const a=await first.boundingBox();await page.waitForTimeout(300);const b=await first.boundingBox();
 assert.ok(Math.hypot(b.x-a.x,b.y-a.y)>1,'Stars orbit before opening');
 await page.locator('[data-motion-toggle]').click();
 const c=await first.boundingBox();await page.waitForTimeout(250);const d=await first.boundingBox();
 assert.ok(Math.hypot(d.x-c.x,d.y-c.y)<.1,'Pause freezes orbit');
 assert.ok(await page.locator('[data-landscape]').evaluate(v=>v.paused),'Pause also freezes landscape');
 await page.screenshot({path:path.join(evidence,'desktop-arrival.png')});
 // Sample the first painted frames after the user's click to detect a snap/reset.
 const movement=await page.evaluate(async()=>{
  const eagle=document.querySelector('[data-eagle]'),star=document.querySelector('[data-star]');
  const samples=[];eagle.click();
  for(let i=0;i<5;i++){const r=star.getBoundingClientRect();samples.push({x:r.x,y:r.y});await new Promise(requestAnimationFrame);}
  return samples;
 });
 for(let i=1;i<movement.length;i++)assert.ok(Math.hypot(movement[i].x-movement[i-1].x,movement[i].y-movement[i-1].y)<65,'No jump at transition start');
 await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
 await page.waitForTimeout(300);
 await page.screenshot({path:path.join(evidence,'desktop-menu.png')});
 await bounds(page,'[data-star], [data-eagle], .star-label');
 const boxes=await page.locator('[data-star]').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
 assert.equal(boxes[0].y,boxes[1].y);assert.equal(boxes[1].y,boxes[2].y);
 assert.equal(boxes[3].y,boxes[4].y);assert.equal(boxes[4].y,boxes[5].y);
 assert.ok(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x);
 await page.locator('[data-eagle]').click();await page.waitForTimeout(100);await page.locator('[data-eagle]').click();
 await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
 await page.getByRole('link',{name:'work',exact:true}).click();await page.waitForURL('**/work/');
 await page.goBack();await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
 assert.equal(await page.locator('body.is-leaving').count(),0);
}));

for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:1920,height:1080}]) {
 test(`Navigation and sections fit ${viewport.width}×${viewport.height}`,()=>run({viewport,hasTouch:true,reducedMotion:'reduce'},async page=>{
  await page.goto(base);await bounds(page,'[data-star], [data-eagle]');
  await page.locator('[data-eagle]').tap();await bounds(page,'[data-star], [data-eagle], .star-label');
  if(viewport.width===390) await page.screenshot({path:path.join(evidence,'mobile-menu.png')});
  const stars=await page.locator('[data-star]').evaluateAll(nodes=>nodes.map(n=>({name:n.textContent.trim(),href:n.getAttribute('href')})));
  assert.equal(stars.length,6);
  for(const {href} of stars) {
   await page.goto(new URL(href,base).href);assert.equal(await page.locator('main h1').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal document overflow');
   await bounds(page,'.index-link,.section-menu summary');
   await page.locator('.section-menu summary').click();assert.equal(await page.locator('.section-menu nav a:visible').count(),6);
   if(viewport.width===390&&href==='work/')await page.screenshot({path:path.join(evidence,'mobile-work.png')});
   await page.getByRole('link',{name:'Index',exact:true}).click();await page.waitForURL('**/#navigation');
   assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
  }
 }));
}

test('Keyboard opens, selects, returns and closes with Escape',()=>run({reducedMotion:'reduce'},async page=>{
 await page.goto(base);await page.keyboard.press('Tab');
 assert.equal(await page.locator(':focus').textContent(),'Skip to content');
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('data-eagle'),'');
 await page.keyboard.press('Enter');assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('aria-label'),'work');
 await page.keyboard.press('Enter');await page.waitForURL('**/work/');
 await page.goBack();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'closed');
 assert.equal(await page.locator(':focus').getAttribute('data-eagle'),'');
 await page.locator('[data-star]').first().focus();await page.keyboard.press('Space');assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
}));

test('Reduced motion prevents video loading and orbit movement; no-JS keeps links usable',async()=>{
 await run({reducedMotion:'reduce'},async page=>{
  await page.goto(base);const a=await page.locator('[data-star]').first().boundingBox();await page.waitForTimeout(200);const b=await page.locator('[data-star]').first().boundingBox();
  assert.deepEqual(a,b);assert.equal(await page.locator('[data-landscape]').getAttribute('src'),null);
  assert.equal(await page.locator('[data-motion-toggle]').isDisabled(),true);
 });
 await run({javaScriptEnabled:false,viewport:{width:390,height:844}},async page=>{
  await page.goto(base);assert.equal(await page.locator('[data-star]').count(),6);
  await bounds(page,'.star-label');
  await page.locator('[data-star]').first().click();await page.waitForURL('**/work/');
 });
});

test('Home and keypad survive blocked browser storage',()=>run({reducedMotion:'reduce'},async(page,context)=>{
 await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
 await page.goto(base);await page.locator('[data-eagle]').click();assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
 await page.getByRole('link',{name:'[redacted]',exact:true}).click();await page.waitForURL('**/redacted/');
 await page.keyboard.type('777111');await page.keyboard.press('Enter');assert.equal(await page.locator('[data-empty-room]').isVisible(),true);
}));

test('GitHub Pages subdirectory resolves homepage, all six destinations and logo assets',()=>run({reducedMotion:'reduce'},async(page,context)=>{
 await context.route('http://portfolio.test/main/**',async route=>{
  const url=new URL(route.request().url());const response=await context.request.get(new URL(url.pathname.slice('/main/'.length)+url.search,base).href);
  await route.fulfill({response});
 });
 await page.goto('http://portfolio.test/main/');await page.locator('[data-eagle]').click();
 const urls=await page.locator('[data-star]').evaluateAll(ns=>ns.map(n=>n.href));
 assert.equal(urls.length,6);
 for(const url of urls){assert.ok(url.startsWith('http://portfolio.test/main/'));await page.goto(url);assert.equal(await page.locator('main h1').count(),1);}
}));
