import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || '/Users/arvidscaff/.hermes/hermes-agent/node_modules/playwright');
const base=process.env.TEST_URL || 'http://127.0.0.1:5191/';
const visibleShell=page=>page.locator('[data-window-minimize]').waitFor({timeout:5000});
async function openAI(page){await page.goto(base);await page.locator('[data-home-logo]').click();await page.locator('[data-star][href="ai-labs/"]').click();await visibleShell(page);}
async function setup(options={}){const browser=await chromium.launch({headless:true});const context=await browser.newContext({reducedMotion:'reduce',...options});await context.route(/google-analytics|googletagmanager|doubleclick/,r=>r.abort());const page=await context.newPage();return {browser,page};}
test('static red cross has a visible mark and a real nonoverlapping target on About and AI Labs',async()=>{
 const {browser,page}=await setup({javaScriptEnabled:false});try{
 for(const route of ['about/','ai-labs/']){await page.goto(new URL(route,base).href);const close=page.locator('.window-bar [data-window-close]');assert.equal(await close.count(),1);const box=await close.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.equal(await close.locator('span').textContent(),'×');assert.equal(await close.evaluate(el=>getComputedStyle(el,'::after').content),'none');}
 }finally{await browser.close();}
});
test('AI Labs retains the real desktop, content DOM and scroll through minimize and restore',async()=>{
 const {browser,page}=await setup();try{
 await page.goto(base);await page.locator('[data-home-logo]').click();
 await page.evaluate(()=>{window.originalDesktop=document.querySelector('.home-stage');window.originalVideo=document.querySelector('[data-landscape]');});
 await page.locator('[data-star][href="ai-labs/"]').click();
 await page.locator('[data-window-minimize]').waitFor();
 assert.equal(await page.evaluate(()=>window.originalDesktop===document.querySelector('.home-stage')),true);
 const content=page.locator('[data-desktop-window]');
 await content.evaluate(el=>{window.originalContent=el;const main=el.shadowRoot.querySelector('main');main.scrollTop=310;window.retainedScroll=main.scrollTop;el.dataset.retained='yes';});
 assert.ok(await page.evaluate(()=>window.retainedScroll>0),'Test must retain a nonzero real content scroll position');
 let requests=0;page.on('request',r=>{if(['document','fetch','xhr'].includes(r.resourceType()))requests++;});
 const url=page.url();await page.locator('[data-window-minimize]').click();
 assert.equal(page.url(),url);assert.equal(await page.locator('[data-window-restore]').isVisible(),true);
 assert.equal(await page.locator('.home-stage').evaluate(el=>el.inert),false);
 await page.locator('[data-window-restore]').click();
 assert.equal(await content.evaluate(el=>el===window.originalContent&&el.shadowRoot.querySelector('main').scrollTop===window.retainedScroll&&el.dataset.retained==='yes'),true);
 assert.equal(await page.evaluate(()=>window.originalVideo===document.querySelector('[data-landscape]')),true);
 assert.equal(requests,0);assert.equal(await page.locator('iframe').count(),0);
 await page.locator('.window-bar [data-window-close]').click();
 assert.equal(await page.locator('[data-desktop-window]').count(),0);assert.equal(await page.locator('[data-window-restore]').isVisible(),false);
 assert.equal(new URL(page.url()).pathname,new URL(base).pathname);
 }finally{await browser.close();}
});

test('covered desktop ignores Escape and minimizes without history writes, retaining native details and focus',async()=>{
 const {browser,page}=await setup();try{
 await openAI(page);await page.locator('#routing summary').click();
 await page.keyboard.press('Escape');assert.equal(await page.locator('[data-home-logo]').getAttribute('aria-expanded'),'true');
 await page.evaluate(()=>{window.historyCalls=[];for(const name of ['pushState','replaceState']){const original=history[name].bind(history);history[name]=(...args)=>{window.historyCalls.push(name);return original(...args);};}});
 await page.locator('[data-window-minimize]').click();assert.equal(await page.locator('[data-window-restore]').evaluate(el=>el===document.activeElement),true);
 await page.locator('[data-window-restore]').click();assert.equal(await page.locator('#routing').getAttribute('open'),'');assert.equal(await page.locator('[data-window-minimize]').evaluate(el=>el===el.getRootNode().activeElement),true);
 assert.deepEqual(await page.evaluate(()=>window.historyCalls),[]);
 }finally{await browser.close();}
});
test('direct AI Labs entry assembles one real desktop without executing a second tag, retains details and supports close/back',async()=>{
 const {browser,page}=await setup();try{
 await page.goto(new URL('ai-labs/#routing',base).href);await visibleShell(page);
 assert.equal(await page.locator('.home-stage').count(),1);assert.equal(await page.locator('[data-desktop-window]').count(),1);
 assert.equal(await page.evaluate(()=>document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]').length),1);
 assert.equal(await page.locator('[data-landscape]').getAttribute('poster'),new URL('assets/media/home/camera-01-poster.jpg',base).href);
 await page.locator('[data-window-minimize]').click();await page.locator('[data-window-restore]').click();
 await page.locator('.window-bar [data-window-close]').click();assert.equal(new URL(page.url()).pathname,new URL(base).pathname);
 await page.goBack();await visibleShell(page);assert.equal(new URL(page.url()).hash,'#routing');
 }finally{await browser.close();}
});

test('minimized desktop links still resolve from the index and failed page fetch falls back to static navigation',async()=>{
 const {browser,page}=await setup();try{
 await openAI(page);await page.locator('[data-window-minimize]').click();
 assert.equal(await page.locator('[data-star][href="about/"]').evaluate(el=>el.href),new URL('about/',base).href);
 await page.locator('[data-window-restore]').click();await page.locator('.window-bar [data-window-close]').click();
 await page.route('**/ai-labs/',route=>route.request().resourceType()==='fetch'?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 await page.locator('[data-star][href="ai-labs/"]').click();await page.waitForURL(new URL('ai-labs/',base).href);
 assert.equal(await page.locator('h1').textContent(),'Experiments, systems, and unfinished questions.');
 }finally{await browser.close();}
});

test('covered desktop pauses its existing video and resumes it when minimized',async()=>{
 const {browser,page}=await setup({reducedMotion:'no-preference'});try{
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('[data-landscape]')?.paused===false);
 await page.locator('[data-home-logo]').click();await page.locator('[data-star][href="ai-labs/"]').click();await visibleShell(page);
 assert.equal(await page.locator('[data-landscape]').evaluate(n=>n.paused),true);
 await page.locator('[data-window-minimize]').click();await page.waitForFunction(()=>document.querySelector('[data-landscape]')?.paused===false);
 }finally{await browser.close();}
});

test('originating desktop destination restores a deep-linked window without refetching or losing details',async()=>{
 const {browser,page}=await setup();try{
 await page.goto(new URL('ai-labs/#routing',base).href);await visibleShell(page);
 await page.locator('#routing summary').click();
 await page.locator('[data-desktop-window]').evaluate(el=>{window.retainedWindow=el;});
 await page.locator('[data-window-minimize]').click();
 await page.locator('[data-home-logo]').click();
 let requests=0;page.on('request',r=>{if(r.resourceType()==='fetch')requests++;});
 const url=page.url();await page.locator('[data-star][href$="ai-labs/"]').click();await visibleShell(page);
 assert.equal(await page.locator('[data-desktop-window]').evaluate(el=>el===window.retainedWindow),true);
 assert.equal(await page.locator('#routing').getAttribute('open'),'');assert.equal(page.url(),url);assert.equal(requests,0);
 }finally{await browser.close();}
});


test('shadow-scoped styles preserve existing body-suffixed class names and card padding',async()=>{
 const {browser,page}=await setup();const staticContext=await browser.newContext({javaScriptEnabled:false});
 await staticContext.route(/google-analytics|googletagmanager|doubleclick/,r=>r.abort());
 try{
  const staticPage=await staticContext.newPage();await staticPage.goto(new URL('ai-labs/',base).href);
  const expected=await staticPage.locator('.explore .x-body').first().evaluate(el=>getComputedStyle(el).padding);
  assert.notEqual(expected,'0px');await openAI(page);
  assert.equal(await page.locator('.explore .x-body').first().evaluate(el=>getComputedStyle(el).padding),expected);
 }finally{await browser.close();}
});


test('direct-entry desktop theme control works after minimizing the content',async()=>{
 const {browser,page}=await setup();try{
  await page.goto(new URL('ai-labs/',base).href);await visibleShell(page);
  await page.locator('[data-window-minimize]').click();
  const before=await page.locator('html').getAttribute('data-theme');
  await page.locator('[data-theme-toggle]').click();
  assert.notEqual(await page.locator('html').getAttribute('data-theme'),before);
 }finally{await browser.close();}
});
