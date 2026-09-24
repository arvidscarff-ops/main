import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

test('Agoos is reachable from Work with an honest role and readable case study', async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  const page=await context.newPage();
  await page.goto(base+'work/');
  const link=page.locator('#agoos a');
  assert.equal(await link.count(),1,'Work must link to the new Agoos case study');
  await link.click();await page.waitForURL('**/work/agoos/');
  assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' '),'Agoos Apparel');
  const copy=await page.locator('main').innerText();
  assert.match(copy,/Art direction, design & operations/);
  assert.match(copy,/head art director and designer/i);
  assert.match(copy,/later took over running/i);
  assert.match(copy,/customer support/i);
  assert.match(copy,/Skogrejv/);
  assert.doesNotMatch(copy,/founder|CEO|second.biggest/i);
  assert.equal(await page.locator('a[href="https://www.instagram.com/skogrejv/"]').count(),1);
  await page.getByRole('link',{name:'Back to Work',exact:true}).click();
  await page.waitForURL('**/work/');
 }finally{await browser.close();}
});

test('Agoos uses a compact editorial composition rather than full-width image stacks', async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  await page.goto(base+'work/agoos/');
  const layout=await page.locator('main').evaluate(main=>({
   screens:main.scrollHeight/main.clientHeight,
   width:main.clientWidth,
   widest:Math.max(...[...main.querySelectorAll('img,video')].map(el=>el.getBoundingClientRect().width)),
   spreads:main.querySelectorAll('.agoos-spread').length
  }));
  assert.equal(layout.spreads,3,'The story should read as three compact editorial spreads');
  assert.ok(layout.screens<3.6,`Desktop case study should stay under 3.6 screens; got ${layout.screens.toFixed(2)}`);
  assert.ok(layout.widest/layout.width<.72,'No image should dominate the full editorial canvas');
 }finally{await browser.close();}
});
