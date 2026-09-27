import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';

for(const javaScriptEnabled of [false,true]) for(const width of [390,1440]) {
 test(`Public copy separates evidence, ambition and private work (${width}, JS ${javaScriptEnabled})`,async()=>{
  const browser=await chromium.launch({headless:true});
  try {
   const page=await browser.newPage({viewport:{width,height:900},javaScriptEnabled,reducedMotion:'reduce'});
   await page.route(/googletagmanager\.com|google-analytics\.com/,route=>route.abort());
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   for(const route of ['work/ghostwriting/','ai-labs/visual-ai-environment/','ai-labs/under-the-hood/']) {
    const response=await page.goto(base+route);
    assert.equal(response.status(),200);
    const copy=await page.locator('main').innerText();
    if(route.includes('ghostwriting')) {
     assert.match(copy,/four months/i);
     assert.match(copy,/NDA/);
     assert.match(copy,/research.*voice.*offers/is);
     assert.doesNotMatch(await page.content(),/Money X|\$1B|LLM SEO|\$200k|salesperson/i);
    } else if(route.includes('visual-ai-environment')) {
     assert.match(copy,/local live prototype/i);
     assert.match(copy,/recorded replies/i);
     assert.match(copy,/not a finished app/i);
     assert.match(copy,/Karnevalen/);
     const campaign=page.locator('a[href="../../work/karnevalen-campaign/"]');
     assert.equal(await campaign.count(),1);
     assert.equal((await page.request.get(new URL(await campaign.getAttribute('href'),page.url()).href)).status(),200);
    } else {
     assert.match(copy,/local prototype/i);
     assert.match(copy,/recorded.*studies/is);
     assert.match(copy,/does not.*prove.*memory/is);
     assert.match(copy,/not.*complete.*cost/is);
     assert.doesNotMatch(copy,/usually just one|36,000|Whatever it's using lights up|almost nobody/i);
    }
    for(const image of await page.locator('main img').all()) await image.evaluate(img=>img.decode());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);
   }
   assert.deepEqual(errors,[]);
  } finally {await browser.close();}
 });
}
