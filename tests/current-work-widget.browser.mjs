import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
async function run(fn,options={}){const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});await fn(page);}finally{await browser.close();}}

test('Homepage presents three provisional current projects as a desktop widget',()=>run(async page=>{
 await page.goto(base);
 const widget=page.locator('[data-current-work]');
 assert.equal(await widget.isVisible(),true);
 assert.equal(await widget.getByRole('heading',{name:'Currently working on…'}).count(),1);
 assert.match(await page.locator('link[href*="orbit.css"]').getAttribute('href'),/orbit\.css\?v=2$/);
 assert.match(await page.locator('script[src*="home.js"]').getAttribute('src'),/home\.js\?v=2$/);
 assert.deepEqual(await widget.locator('[data-current-project]').evaluateAll(rows=>rows.map(row=>({title:row.querySelector('strong')?.textContent.trim(),detail:row.querySelector('strong+span')?.textContent.trim(),href:row.getAttribute('href')}))),[
  {title:'Growth Marketing',detail:'Berghs',href:'work/growth-toolbox/'},
  {title:'Ghostwriting',detail:'Consulting & mentorship',href:'work/#ghostwriting'},
  {title:'Hermes',detail:'Personal AI system',href:'ai-labs/hermes-system/'},
 ]);
}));

test('Widget can minimize, restore and remember that choice for the session',()=>run(async page=>{
 await page.goto(base);
 const widget=page.locator('[data-current-work]');
 const toggle=page.locator('[data-current-work-toggle]');
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await toggle.click();
 assert.equal(await widget.getAttribute('data-state'),'minimized');
 assert.equal(await toggle.getAttribute('aria-label'),'Show current work');
 assert.equal(await widget.locator('[data-current-work-list]').isHidden(),true);
 await page.reload();
 assert.equal(await widget.getAttribute('data-state'),'minimized');
 await toggle.click();
 assert.equal(await widget.getAttribute('data-state'),'open');
 assert.equal(await widget.locator('[data-current-work-list]').isVisible(),true);
}));

test('Widget fits below the crest on portrait mobile and starts compact on short screens',()=>run(async page=>{
 await page.goto(base);
 const geometry=await page.evaluate(()=>{const widget=document.querySelector('[data-current-work]').getBoundingClientRect(),logo=document.querySelector('[data-home-logo]').getBoundingClientRect();return{widget,logo,width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth};});
 assert.ok(geometry.widget.left>=8&&geometry.widget.right<=geometry.width-8);
 assert.ok(geometry.widget.bottom<=geometry.height-8);
 assert.ok(geometry.logo.bottom<=geometry.widget.top,'Current-work window must not cover the crest');
 assert.ok(geometry.scroll<=geometry.width+1);
},{viewport:{width:390,height:844}}));

test('Short landscape defaults to a minimized window without losing controls',()=>run(async page=>{
 await page.goto(base);
 const widget=page.locator('[data-current-work]');
 assert.equal(await widget.getAttribute('data-state'),'minimized');
 assert.equal(await page.locator('[data-current-work-toggle]').isVisible(),true);
 const box=await widget.boundingBox();
 assert.ok(box.height<=68);
},{viewport:{width:844,height:390}}));

test('Widget remains usable when session storage is blocked',()=>run(async page=>{
 await page.addInitScript(()=>{const blocked={get(){throw new Error('blocked')}};Object.defineProperty(window,'sessionStorage',blocked);});
 await page.goto(base);
 const toggle=page.locator('[data-current-work-toggle]');
 await toggle.click();
 assert.equal(await page.locator('[data-current-work]').getAttribute('data-state'),'minimized');
}));
