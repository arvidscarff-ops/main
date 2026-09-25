import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

for(const width of [1440,900,768,390,320]){
 test(`About: approved story, portrait and working navigation at ${width}px`,async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+'about/',{waitUntil:'networkidle'});
   assert.equal(response.status(),200);
   assert.equal(await page.locator('.about-story > p').count(),4);
   const portrait=page.locator('.about-portrait img');
   assert.equal(await portrait.count(),1,'The supplied portrait should be on the About page');
   assert.equal(await portrait.getAttribute('alt'),'Arvid Shane Scarff');
   const image=await portrait.evaluate(img=>({loaded:img.complete&&img.naturalWidth===512,url:img.currentSrc,w:img.clientWidth,h:img.clientHeight}));
   assert.ok(image.loaded,'Portrait should fully load');
   assert.equal(new URL(image.url).origin,new URL(base).origin,'Portrait is self-hosted, not a Slack hotlink');
   assert.ok(Math.abs(image.w-image.h)<2,'Keep the original square framing');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
   assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth>el.clientWidth),false,'No horizontal reading-panel overflow');
   const panel=await page.evaluate(()=>{
    const main=document.querySelector('main'),frame=document.querySelector('.site-frame'),bar=document.querySelector('.window-bar');
    return {bottom:main.getBoundingClientRect().bottom,frameBottom:frame.getBoundingClientRect().bottom,top:main.getBoundingClientRect().top,barBottom:bar.getBoundingClientRect().bottom,overflow:getComputedStyle(main).overflowY};
   });
   assert.ok(panel.bottom<=panel.frameBottom+1,'The complete story scrolls inside the glass panel');
   assert.ok(panel.top>=panel.barBottom-1,'Story does not run behind the Close bar');
   assert.equal(panel.overflow,'auto');
   if(process.env.QA_DIR){
    await mkdir(process.env.QA_DIR,{recursive:true});
    await page.screenshot({path:`${process.env.QA_DIR}/about-${width}.png`});
   }
   const last=page.locator('.about-story > p').last();
   await last.scrollIntoViewIfNeeded();
   assert.ok(await last.isVisible());
   assert.match(await last.innerText(),/just as curious about the work\.$/);
   await page.locator('.facts a[href="../work/"]').click();
   await page.waitForURL(new URL('work/',base).href);
   assert.ok(await page.locator('[data-work-item]').count()>0);
   await page.goBack();
   await page.locator('.facts a[href="../design/"]').click();
   await page.waitForURL(new URL('design/',base).href);
   assert.ok(await page.locator('.archive-card').count()>0);
   await page.goBack();
   await page.locator('.window-bar [data-window-close]').click();
   await page.waitForURL(new URL('#navigation',base).href);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}

test('About story and portrait remain readable without JavaScript',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false,reducedMotion:'reduce'});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  await page.goto(base+'about/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.about-story > p:visible').count(),4);
  assert.equal(await page.locator('.about-portrait img:visible').count(),1);
  await page.locator('.section-footer a').click();
  await page.waitForURL(new URL('#navigation',base).href);
 }finally{await browser.close();}
});
