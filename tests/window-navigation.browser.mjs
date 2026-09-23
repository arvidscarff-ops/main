import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
async function run(fn,options={}){const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());const errors=[];page.on('pageerror',error=>errors.push(error.message));await fn(page);assert.deepEqual(errors,[]);}finally{await browser.close();}}
const sections=[['work/','Work'],['design/','Design'],['about/','About'],['contact/','Contact'],['ai-labs/','AI Labs']];
const projects=[['work/agoos/','Work','Agoos Apparel'],['work/graphic-design/textur/','Design','TEXTUR'],['ai-labs/hermes-system/','AI Labs','Hermes system']];

test('Top-level sections are closable windows rather than duplicate global navigation',()=>run(async page=>{
 for(const [route,label] of sections){
  await page.goto(base+route);
  const bar=page.locator('[data-window-level="section"]');
  assert.equal(await bar.count(),1,`${label} needs one section window bar`);
  assert.equal((await bar.locator('.window-context').innerText()).trim(),label);
  assert.equal(await bar.locator('nav[aria-label="Primary navigation"]').count(),0,`${label} must not duplicate the global destination list`);
  const close=bar.locator('[data-window-close]');
  assert.equal(await close.count(),1);
  assert.match(await close.getAttribute('aria-label'),new RegExp(`Close ${label} and return to portfolio index`,'i'));
  assert.equal(new URL(await close.getAttribute('href'),page.url()).hash,'#navigation');
 }
}));

test('Nested projects expose distinct parent and index exits',()=>run(async page=>{
 for(const [route,parent,title] of projects){
  await page.goto(base+route);
  const bar=page.locator('[data-window-level="project"]');
  assert.equal(await bar.count(),1,`${title} needs one project window bar`);
  assert.match((await bar.locator('[data-window-parent]').innerText()).trim(),new RegExp(parent,'i'));
  assert.equal((await bar.locator('.window-context').innerText()).trim(),title);
  const close=bar.locator('[data-window-close]');
  assert.equal(await close.count(),1);
  assert.match(await close.getAttribute('aria-label'),/return to portfolio index/i);
  assert.notEqual(await bar.locator('[data-window-parent]').getAttribute('href'),await close.getAttribute('href'));
 }
}));

test('Window actions are readable and touch-sized on large desktop and mobile',async()=>{
 for(const viewport of [{width:2560,height:1440},{width:390,height:844}])await run(async page=>{
  for(const route of ['work/','work/agoos/','work/graphic-design/textur/']){
   await page.goto(base+route);
   const actions=page.locator('.window-bar a,.window-bar button');
   assert.ok(await actions.count()>=1,`${route} needs visible window actions`);
   for(const action of await actions.all()){
    const metrics=await action.evaluate(node=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return{height:box.height,font:parseFloat(style.fontSize)};});
    assert.ok(metrics.height>=44,`${route} action height ${metrics.height}px at ${viewport.width}px`);
    assert.ok(metrics.font>=14,`${route} action font ${metrics.font}px at ${viewport.width}px`);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${route} overflows at ${viewport.width}px`);
  }
 },{viewport});
});

test('Very narrow project bars prioritize parent and index without a truncated context label',()=>run(async page=>{
 await page.goto(base+'work/agoos/');
 assert.equal(await page.locator('.window-context').evaluate(el=>getComputedStyle(el).display),'none');
 assert.equal(await page.locator('[data-window-parent]').isVisible(),true);
 assert.equal(await page.locator('.window-bar [data-window-close]').isVisible(),true);
},{viewport:{width:320,height:568}}));

test('Closing a section returns to the open constellation',()=>run(async page=>{
 await page.goto(base+'work/');
 await page.locator('.window-bar [data-window-close]').click();
 await page.waitForURL(/#navigation$/);
 assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
 assert.equal(await page.locator('[data-star]').count(),5);
}));

test('Window hierarchy remains usable without JavaScript',()=>run(async page=>{
 await page.goto(base+'work/agoos/');
 assert.equal(await page.locator('[data-window-parent]').isVisible(),true);
 assert.equal(await page.locator('.window-bar [data-window-close]').isVisible(),true);
 assert.equal(await page.locator('.section-menu').count(),0);
},{javaScriptEnabled:false}));

test('Footer navigation reinforces parent and index hierarchy',()=>run(async page=>{
 const routes=['design/','about/','work/agoos/','work/noisey-neighbours/','work/karnevalen-campaign/','work/graphic-design/','ai-labs/hermes-system/','work/growth-toolbox/','work/growth-toolbox/article/','work/growth-toolbox/content-plan/','work/growth-toolbox/content-examples/'];
 for(const route of routes){
  await page.goto(base+route);
  const footer=page.locator('.section-footer,.archive-footer');
  assert.equal(await footer.count(),1,`${route} needs one orientation footer`);
  assert.doesNotMatch(await footer.innerText(),/Earlier graphic design|AI systems|Selected work|Get in touch|See the work/i,`${route} retains global footer shortcuts`);
  assert.equal(await footer.locator('[data-window-close]').count(),1,`${route} needs one close-to-index footer action`);
 }
}));

test('Every migrated inner route uses exactly one window bar and no obsolete section menu',()=>run(async page=>{
 const routes=[...sections.map(([route])=>route),'work/agoos/','work/noisey-neighbours/','work/karnevalen-campaign/','work/growth-toolbox/','work/growth-toolbox/article/','work/growth-toolbox/content-plan/','work/growth-toolbox/content-examples/','work/graphic-design/','work/graphic-design/textur/','work/graphic-design/event-festival/','work/graphic-design/motion-graphics/','work/graphic-design/logofolio/','work/graphic-design/karnevalen/','ai-labs/hermes-system/'];
 for(const route of routes){
  await page.goto(base+route);
  assert.equal(await page.locator('.window-bar').count(),1,`${route} needs exactly one window bar`);
  assert.equal(await page.locator('.section-header,.section-menu,.index-link').count(),0,`${route} retains obsolete navigation`);
 }
}));
