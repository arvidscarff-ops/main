import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
const stories=['visual-ai-environment','runbook','phase-workforce','under-the-hood'];
const routes=['about/','contact/','work/','design/','ai-labs/','ai-labs/hermes-system/',...stories.map(s=>`ai-labs/${s}/`),'work/agoos/','work/noisey-neighbours/','work/karnevalen-campaign/','work/personal-brand-consulting/','work/ghostwriting/','work/growth-toolbox/article/','work/growth-toolbox/content-plan/','work/growth-toolbox/content-examples/','work/graphic-design/','work/graphic-design/textur/','work/graphic-design/event-festival/','work/graphic-design/motion-graphics/','work/graphic-design/logofolio/','work/graphic-design/karnevalen/','work/growth-toolbox/','work/growth-toolbox/weekender/'];

test('AI Labs stories have working, distinct parent and index exits',async()=>{
 const browser=await chromium.launch();
 try {const page=await browser.newPage();for(const story of stories){
  await page.goto(base+`ai-labs/${story}/`);
  const bar=page.locator('.window-bar');
  assert.equal(await bar.getAttribute('data-window-level'),'project',story);
  assert.match(await bar.locator('[data-window-parent]').innerText(),/AI Labs/,story);
  assert.equal(new URL(await bar.locator('[data-window-parent]').getAttribute('href'),page.url()).pathname,new URL('ai-labs/',base).pathname,story);
  assert.equal(new URL(await bar.locator('[data-window-close]').getAttribute('href'),page.url()).hash,'#navigation',story);
  assert.equal(await bar.locator('.window-dot').count(),3,story);
  await bar.locator('[data-window-parent]').click();
  assert.equal(new URL(page.url()).pathname,new URL('ai-labs/',base).pathname,story);
 }}finally{await browser.close();}
});

test('Standalone window controls minimize, restore and resize the reading surface',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(base+'ai-labs/visual-ai-environment/');
  const min=page.locator('.window-bar [data-window-minimize]'),zoom=page.locator('.window-bar [data-window-zoom]');
  await min.click();assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('window-is-minimized')),true);
  assert.equal(await page.locator('main').evaluate(n=>n.inert),true);
  await min.click();assert.equal(await page.locator('main').evaluate(n=>n.inert),false);
  const before=await page.locator('.window-bar').boundingBox();
  await zoom.click();assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('window-is-zoomed')),true);
  const after=await page.locator('.window-bar').boundingBox();assert.ok(after.width>before.width);
  await zoom.click();assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('window-is-zoomed')),false);
 }finally{await browser.close();}
});

test('All inner pages share an unclipped window and accessible controls',async()=>{
 const browser=await chromium.launch();
 try {const page=await browser.newPage();for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   if(route==='ai-labs/')await page.locator('[data-desktop-window] [data-window-minimize]').waitFor();
   else await page.locator('.window-dot--zoom').first().waitFor();
   const info=await page.evaluate(()=>{
    const host=document.querySelector('[data-desktop-window]');const scope=host?.shadowRoot||document;
    const frame=scope.querySelector('.site-frame'),bar=scope.querySelector('.window-bar'),main=scope.querySelector('main');
    const rect=n=>n?.getBoundingClientRect().toJSON();
    return {frame:rect(frame),bar:rect(bar),main:rect(main),overflow:document.documentElement.scrollWidth-innerWidth,
      controls:[...bar.querySelectorAll('.window-dot')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,label:n.getAttribute('aria-label'),visible:getComputedStyle(n).display!=='none'}))};
   });
   assert.ok(info.frame&&info.bar&&info.main,`${route} missing window structure`);
   assert.ok(info.overflow<=1,`${route} horizontal overflow at ${width}: ${info.overflow}px`);
   assert.ok(Math.abs(info.frame.x-info.bar.x)<=2&&Math.abs(info.frame.width-info.bar.width)<=2,`${route} bar/frame misaligned at ${width}: ${JSON.stringify(info)}`);
   assert.ok(Math.abs(info.bar.bottom-info.main.y)<=2,`${route} content detached from bar at ${width}`);
   assert.equal(info.controls.length,3,`${route} missing a traffic light at ${width}`);
   for(const c of info.controls)assert.ok(c.visible&&c.width>=32&&c.height>=44&&c.label,`${route} inaccessible control at ${width}: ${JSON.stringify(c)}`);
  }
 }}finally{await browser.close();}
});
