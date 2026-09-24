import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const base=process.env.PORTFOLIO_URL || 'http://127.0.0.1:5191/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.route('https://www.googletagmanager.com/**',r=>r.abort());
const page=await context.newPage();
test.after(async()=>{await browser.close();});
test('current work has hover and keyboard previews without blocking destination links',async()=>{
  await page.goto(base);
  await page.waitForSelector('[data-current-project]');
  const links=page.locator('[data-current-project]');
  for(let i=0;i<3;i++) {
    await links.nth(i).hover();
    await page.waitForSelector('[data-project-preview]:not([hidden])',{timeout:1500});
    assert.equal(await page.locator('[data-project-preview] img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-project-preview]').evaluate(e=>e.hidden),true);
    await links.nth(i).focus();
    await page.waitForSelector('[data-project-preview]:not([hidden])');
  }
  await page.keyboard.press('Enter');
  await page.waitForURL('**/ai-labs/hermes-system/');
  await page.goBack();
  await page.waitForURL(base);
});
test('reduced-motion previews are still and expanded preview does not cover folder controls',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'#navigation');
  await page.locator('[data-current-project]').first().hover();
  await page.waitForSelector('[data-project-preview]:not([hidden])');
  assert.equal(await page.locator('[data-project-preview]').evaluate(n=>getComputedStyle(n).animationName),'none');
  const overlaps=await page.evaluate(()=>{
    const r=document.querySelector('[data-project-preview]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-star]')].some(n=>{const b=n.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top});
  });
  assert.equal(overlaps,false,'Previews must not cover the primary destinations');
  await page.emulateMedia({reducedMotion:'no-preference'});
});
test('expanded current work leaves short-mobile folder targets unobstructed',async()=>{
  const mobile=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await mobile.route('https://www.googletagmanager.com/**',r=>r.abort());
  const p=await mobile.newPage();
  try {
    await p.goto(base);
    await p.locator('[data-home-logo]').tap();
    await p.waitForSelector('[data-orbit][data-state="open"]');
    await p.locator('[data-current-work-toggle]').tap();
    const assertTargets=async()=>{
      const targets=await p.locator('[data-star]').evaluateAll(links=>links.map(a=>{
        const r=a.getBoundingClientRect();
        return {href:a.getAttribute('href'),clear:a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};
      }));
      assert.ok(targets.every(t=>t.clear),JSON.stringify(targets));
    };
    await assertTargets();
    for(const link of await p.locator('[data-current-project]').all()) {
      await link.scrollIntoViewIfNeeded();
      assert.equal(await link.evaluate(a=>{const r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'each project remains reachable by scrolling');
    }
    await assertTargets();
    if(process.env.EVIDENCE_DIR) await p.screenshot({path:process.env.EVIDENCE_DIR+'/home-short-mobile-expanded.png'});
    await p.locator('[data-star]').first().tap();
    await p.waitForURL('**/work/');
  } finally {await mobile.close();}
});
test('background activation docks supplied logo and reveals five folder destinations',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base);
  await page.waitForSelector('[data-orbit][data-state="closed"]');
  const initial=await page.locator('[data-home-logo]').boundingBox();
  await page.mouse.click(1000,160);
  await page.waitForSelector('[data-orbit][data-state="open"]',{timeout:3000});
  const docked=await page.locator('[data-home-logo]').boundingBox();
  assert.ok(docked.y>initial.y+100,'logo travels down');
  assert.equal(await page.locator('[data-star] .folder-icon').count(),5);
  assert.deepEqual(await page.locator('[data-star]').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),['work/','design/','about/','contact/','ai-labs/']);
  assert.ok(await page.locator('.home-logo__art').getAttribute('src').then(s=>s.includes('scarff-lockup')));
  const boxes=await page.locator('[data-star]').evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,opacity:getComputedStyle(e).opacity};}));
  assert.ok(boxes.every(b=>b.opacity==='1'&&b.x>=0&&b.x+b.w<=1440));
  const gaps=boxes.slice(1).map((b,i)=>b.x-boxes[i].x);
  assert.ok(Math.max(...gaps)-Math.min(...gaps)<1,'equal spacing');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-orbit][data-state="closed"]');
  assert.equal(await page.locator('[data-home-logo]').evaluate(e=>document.activeElement===e),true);
});
