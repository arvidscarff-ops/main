import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

async function withPage(options,fn){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference',...options});
  await page.route(/googletagmanager\.com|google-analytics\.com/,route=>route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await fn(page);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}

test('Work opens as one glass window over camera 01',()=>withPage({},async page=>{
 await page.goto(base+'work/');
 const backdrop=page.locator('[data-landscape-backdrop]');
 assert.equal(await backdrop.count(),1);
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]')?.currentSrc.includes('camera-01-desktop.mp4'));
 const state=await page.evaluate(()=>{
  const frame=document.querySelector('.site-frame').getBoundingClientRect();
  const frameStyle=getComputedStyle(document.querySelector('.site-frame'));
  const mainStyle=getComputedStyle(document.querySelector('main'));
  return {
   camera:document.body.dataset.landscapeCamera,
   frame:{x:frame.x,width:frame.width,right:innerWidth-frame.right},
   blur:frameStyle.backdropFilter||frameStyle.webkitBackdropFilter,
   mainBackground:mainStyle.backgroundColor
  };
 });
 assert.equal(state.camera,'01');
 assert.ok(state.frame.x>=20&&state.frame.right>=20,'Landscape remains visible around the glass window');
 assert.notEqual(state.blur,'none');
 assert.equal(state.mainBackground,'rgba(0, 0, 0, 0)');
}));

test('Prototype route families use the three landscape cameras',()=>withPage({},async page=>{
 const routes=[['work/','01'],['work/agoos/','01'],['design/','02'],['work/graphic-design/textur/','02'],['ai-labs/hermes-system/','03']];
 for(const [route,camera] of routes){
  await page.goto(base+route);
  assert.equal(await page.locator('body').getAttribute('data-landscape-camera'),camera,route);
  await page.waitForFunction(expected=>document.querySelector('[data-landscape-video]')?.currentSrc.includes(`camera-${expected}-desktop.mp4`),camera);
 }
}));

test('Reduced motion keeps the poster and requests no MP4',()=>withPage({reducedMotion:'reduce'},async page=>{
 const mp4=[];page.on('request',request=>{if(request.url().endsWith('.mp4'))mp4.push(request.url());});
 await page.goto(base+'work/');
 await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-landscape-backdrop]').count(),1);
 assert.equal(await page.locator('[data-landscape-video]').getAttribute('src'),null);
 assert.deepEqual(mp4,[]);
}));

test('Inner pages provide a working background pause control',()=>withPage({},async page=>{
 await page.goto(base+'work/');
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]')?.paused===false);
 const button=page.locator('[data-landscape-motion]');
 assert.equal(await button.count(),1);
 assert.equal(await button.textContent(),'Pause background');
 await button.click();
 assert.equal(await page.locator('[data-landscape-video]').evaluate(video=>video.paused),true);
 assert.equal(await button.getAttribute('aria-pressed'),'true');
 assert.equal(await button.textContent(),'Play background');
 await button.click();
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]')?.paused===false);
}));

test('Save-Data keeps the static landscape without starting video',()=>withPage({},async page=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}));
 const mp4=[];page.on('request',request=>{if(request.url().endsWith('.mp4'))mp4.push(request.url());});
 await page.goto(base+'design/');
 await page.waitForTimeout(100);
 assert.equal(await page.locator('[data-landscape-video]').getAttribute('src'),null);
 assert.deepEqual(mp4,[]);
}));

test('Background video pauses while the document is hidden',()=>withPage({},async page=>{
 await page.goto(base+'work/');
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]')?.paused===false);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]').paused);
}));

test('A visitor pause choice survives navigation between glass pages',()=>withPage({},async page=>{
 await page.goto(base+'work/');
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]')?.paused===false);
 await page.locator('[data-landscape-motion]').click();
 await page.goto(base+'design/');
 const button=page.locator('[data-landscape-motion]');
 assert.equal(await button.textContent(),'Play background');
 assert.equal(await button.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-landscape-video]').getAttribute('src'),null);
 await button.click();
 await page.waitForFunction(()=>document.querySelector('[data-landscape-video]').currentSrc.includes('camera-02-desktop.mp4')&&!document.querySelector('[data-landscape-video]').paused);
}));
