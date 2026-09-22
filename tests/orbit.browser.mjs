// Run: PLAYWRIGHT_PATH=/path/to/playwright/index.js node --test tests/orbit.browser.mjs
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

test('AI Labs is public and has no passcode gate',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(base+'ai-labs/');
  assert.equal(await page.getByRole('heading',{name:'AI Labs',exact:true}).count(),1);
  assert.equal(await page.locator('[data-keypad]').count(),0,'No passcode UI remains');
  assert.doesNotMatch(await page.locator('main').innerText(),/restricted|passcode|six-digit|enter the code/i);
 } finally {await browser.close();}
});

test('Sections expose the work, preserve Design and fold Approach into About',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(base+'work/');
  assert.equal(await page.getByRole('heading',{name:'Agoos Apparel',exact:true}).count(),1,'Work must feature Agoos Apparel');
  assert.equal(await page.getByRole('heading',{name:'Weekender',exact:true}).count(),1,'Work must feature Weekender');
  assert.equal(await page.locator('[data-work-item]').count(),3,'Agoos, Weekender and Growth Toolbox are the current entries');
 assert.equal(await page.getByRole('link',{name:'Open coursework',exact:true}).count(),1);
  assert.equal(await page.locator('a[href="https://weekender.arvidscarff.workers.dev"]').count(),1);
  await page.goto(base+'design/');
  assert.equal(await page.locator('.archive-card').count(),5,'Design must expose all five collections');
  for(const link of await page.locator('.archive-card').all()) {
   const response=await page.request.get(new URL(await link.getAttribute('href'),page.url()).href);
   assert.equal(response.status(),200);
  }
  await page.goto(base+'about/');
  assert.match(await page.locator('main').innerText(),/graphic design/i);
  assert.equal(await page.locator('.principles section').count(),3,'Approach principles now live on About');
  assert.equal(await page.locator('a[href="../approach/"]').count(),0,'Approach is no longer a section');
  assert.doesNotMatch(await page.locator('main').innerText(),/to be added/i);
  await page.goto(base+'contact/');
  assert.equal(await page.locator('a[href="mailto:arvidscarff@gmail.com"]').count(),1);
  await page.getByRole('link',{name:'Index',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-orbit]')?.dataset.state==='open');
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
 } finally {await browser.close();}
});

test('Temporary griffin logo assembles five equally spaced destinations',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(base);
  const stars=page.locator('[data-star]');
  assert.equal(await page.locator('[data-home-logo]').count(),1,'The supplied griffin logo must be the homepage control');
  assert.match(await page.locator('[data-home-logo] .home-logo__art').getAttribute('src'),/temporary-logo\.webp$/);
  assert.equal(await stars.count(),5,'Five destination stars must be present');
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'closed');
  await page.locator('[data-home-logo]').click();
  assert.equal(page.url(),base,'Opening the logo must not navigate');
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
  assert.deepEqual(await stars.locator('.star-label').allTextContents(),['work','design','about','contact','AI labs']);
  const centres=await stars.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}));
  const gaps=centres.slice(1).map((point,index)=>point.x-centres[index].x);
  assert.ok(Math.max(...centres.map(point=>point.y))-Math.min(...centres.map(point=>point.y))<1,'Stars form one straight row');
  assert.ok(Math.max(...gaps)-Math.min(...gaps)<1,'Stars are equally spaced');
  for(const label of await stars.locator('.star-label').all()) assert.equal(await label.evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.locator('[data-home-logo]').click();
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'closed');
 } finally {await browser.close();}
});

test('Five stars assemble without morphing or overlapping',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.goto(base);
  const samples=await page.evaluate(async()=>{
   const logo=document.querySelector('[data-home-logo]');
   const stars=[...document.querySelectorAll('[data-star]')];
   const logoStar=document.querySelector('.logo-star img');
   if(document.querySelector('.morph-seed'))throw new Error('Old morphing element still exists');
   logo.click();
   const frames=[];
   for(let i=0;i<40;i++){
    const visible=stars.map(node=>{const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,opacity:Number(getComputedStyle(node).opacity)}}).filter(item=>item.opacity>.08);
    frames.push(visible);
    await new Promise(requestAnimationFrame);
   }
   return frames;
  });
  assert.ok(samples.some(frame=>frame.length===5),'All five stars should become visible');
  for(const frame of samples) for(let i=0;i<frame.length;i++) for(let j=i+1;j<frame.length;j++) {
   const distance=Math.hypot(frame[i].x-frame[j].x,frame[i].y-frame[j].y);
   assert.ok(distance>=38,`Visible star shapes must not overlap while expanding; got ${distance.toFixed(1)}px`);
  }
 } finally {await browser.close();}
});
