// Run: PLAYWRIGHT_PATH=/path/to/playwright-core/index.js node --test tests/star-rotation.browser.mjs
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
const controls=['[data-home-logo]',...Array.from({length:5},(_,i)=>`[data-star]:nth-child(${i+1})`)];
const images=['.logo-star img',...controls.slice(1).map(selector=>`${selector} .star-hit>img`)];
const delta=(a,b)=>(b-a+540)%360-180;

async function withPage(run,options={}) {
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference',...options});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://www.googletagmanager.com/**',route=>route.abort());
  await page.goto(base+'#navigation');
  await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
  await page.mouse.move(5,5);
  await run(page);
  assert.deepEqual(errors,[],'No uncaught browser errors');
 } finally {await browser.close();}
}
async function sample(page,duration=600) {
 return page.evaluate(async({images,duration})=>{
  const nodes=images.map(selector=>document.querySelector(selector));
  const frames=[];
  const start=performance.now();
  do {
   const timestamp=await new Promise(requestAnimationFrame);
   frames.push({t:timestamp-start,angles:nodes.map(node=>{
    const m=new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return Math.atan2(m.b,m.a)*180/Math.PI;
   })});
  } while(frames.at(-1).t<duration);
  return frames;
 },{images,duration});
}
function rate(frames,index,from=0,to=Infinity) {
 const part=frames.filter(frame=>frame.t>=from&&frame.t<=to);
 assert.ok(part.length>=2,'Enough rendered frames to measure motion');
 let travel=0;
 for(let i=1;i<part.length;i++)travel+=delta(part[i-1].angles[index],part[i].angles[index]);
 return travel/(part.at(-1).t-part[0].t)*1000;
}
function assertSlow(frames,index) {
 const speed=rate(frames,index);
 assert.ok(speed>17&&speed<23,`Star ${index} rotates at ~20°/s, got ${speed}`);
}
function assertHeld(frames,index,from=350) {
 const part=frames.filter(frame=>frame.t>=from);
 assert.ok(part.length>=2);
 assert.ok(part.every(frame=>Math.abs(delta(part[0].angles[index],frame.angles[index]))<.01),`Star ${index} holds exactly the same rendered angle`);
}
function assertContinuous(frames,index) {
 for(let i=1;i<frames.length;i++) {
  const step=delta(frames[i-1].angles[index],frames[i].angles[index]);
  // A pointer event can fall between frame callbacks; allow one 60Hz frame.
  const maximum=(frames[i].t-frames[i-1].t)*.026+.35;
  assert.ok(step>=-.01&&step<=maximum,`Star ${index} must not snap/reset/speed up: ${step}° in ${frames[i].t-frames[i-1].t}ms`);
 }
}

test('All six stars brake independently on hover and resume from their held angles',async()=>{
 await withPage(async page=>{
  const baseline=await sample(page);
  images.forEach((_,index)=>assertSlow(baseline,index));
  for(let index=0;index<controls.length;index++) {
   // Record the rendered frames across real pointer entry, not an animation declaration.
   const brakingPromise=sample(page,720);
   await page.locator(controls[index]).hover();
   const braking=await brakingPromise;
   assertHeld(braking,index,500);
   assertContinuous(braking,index);
   assert.ok(rate(braking,index,80,200)>0,'Braking is gradual, not an immediate freeze');
   assert.ok(rate(braking,index,80,200)<20,'Hover never accelerates rotation');
   images.forEach((_,other)=>{if(other!==index)assertSlow(braking,other);});
   const held=braking.at(-1).angles[index];
   const releasePromise=sample(page,700);
   await page.mouse.move(5,5);
   const release=await releasePromise;
   assert.ok(Math.abs(delta(held,release[0].angles[index]))<.7,'Resume starts at the held angle');
   assertContinuous(release,index);
   assert.ok(rate(release,index,30,140)<rate(release,index,420,680),'Mouseleave accelerates gently');
   assertSlow(release.filter(frame=>frame.t>=400),index);
  }
 });
});

test('Global pause holds every angle and Play resumes both stars and loaded video',async()=>{
 await withPage(async page=>{
  await page.waitForFunction(()=>!document.querySelector('[data-landscape]').paused);
  await page.locator(controls[2]).hover();
  await sample(page,400);
  const beforePause=await sample(page,80);
  await page.locator('[data-motion-toggle]').click();
  assert.equal(await page.locator('[data-landscape]').evaluate(video=>video.paused),true);
  const paused=await sample(page,600);
  images.forEach((_,index)=>assertHeld(paused,index,0));
  assert.ok(Math.abs(delta(beforePause.at(-1).angles[2],paused[0].angles[2]))<.7,'A previously held star keeps its own angle on global pause');
  const pausedTime=await page.locator('[data-landscape]').evaluate(video=>video.currentTime);
  await page.locator('[data-motion-toggle]').click();
  await page.waitForFunction(time=>{
   const video=document.querySelector('[data-landscape]');
   return !video.paused&&video.currentTime>time+.05;
  },pausedTime,{timeout:2000});
  const resumed=await sample(page,650);
  images.forEach((_,index)=>{
   assert.ok(Math.abs(delta(paused.at(-1).angles[index],resumed[0].angles[index]))<.7,'No angle reset on Play');
   assertContinuous(resumed,index);
   assertSlow(resumed.filter(frame=>frame.t>400),index);
  });
 });
});

test('Interrupted braking stays continuous and reaches rest within 300ms',async()=>{
 await withPage(async page=>{
  const index=3;
  const interruptedPromise=sample(page,1300);
  await page.locator(controls[index]).hover();
  await page.waitForTimeout(90);
  await page.mouse.move(5,5);
  await page.waitForTimeout(90);
  await page.locator(controls[index]).hover();
  await page.waitForTimeout(90);
  await page.mouse.move(5,5);
  const interrupted=await interruptedPromise;
  assertContinuous(interrupted,index);
  images.forEach((_,other)=>{if(other!==index)assertSlow(interrupted,other);});
  await page.locator(controls[index]).hover();
  const braking=await sample(page,500);
  assert.ok(rate(braking,index,20,100)>rate(braking,index,190,270),'Angular speed decreases across the braking window');
  assertHeld(braking,index,310);
  await page.mouse.move(5,5);
  const release=await sample(page,600);
  assert.ok(rate(release,index,20,100)<rate(release,index,190,270),'Angular speed increases across the resumption window');
  assertSlow(release.filter(frame=>frame.t>360),index);
 });
});

test('Visibility suspension freezes angles and never catches up hidden time',async()=>{
 await withPage(async page=>{
  await sample(page,400);
  // Drive the browser visibility lifecycle explicitly: headless tabs stay visible.
  await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden=await sample(page,900);
  images.forEach((_,index)=>assertHeld(hidden,index,0));
  assert.equal(await page.locator('[data-landscape]').evaluate(video=>video.paused),true);
  await page.evaluate(()=>{
   delete document.hidden;
   document.dispatchEvent(new Event('visibilitychange'));
  });
  const visible=await sample(page,650);
  images.forEach((_,index)=>{
   assert.ok(Math.abs(delta(hidden.at(-1).angles[index],visible[0].angles[index]))<.7,'Visibility return does not catch up elapsed time');
   assertContinuous(visible,index);
   assertSlow(visible.filter(frame=>frame.t>400),index);
  });
  await page.waitForFunction(()=>!document.querySelector('[data-landscape]').paused);
 });
});

test('Reduced motion holds stars on load and on preference changes',async()=>{
 await withPage(async page=>{
  const initial=await sample(page,450);
  images.forEach((_,index)=>assertHeld(initial,index,0));
  assert.equal(await page.locator('[data-landscape]').getAttribute('src'),null);
  assert.equal(await page.locator('[data-motion-toggle]').isDisabled(),true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const running=await sample(page,650);
  images.forEach((_,index)=>assertSlow(running.filter(frame=>frame.t>400),index));
  await page.emulateMedia({reducedMotion:'reduce'});
  const stopped=await sample(page,450);
  images.forEach((_,index)=>assertHeld(stopped,index,80));
  assert.equal(await page.locator('[data-landscape]').evaluate(video=>video.paused),true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-motion-toggle]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const stillPaused=await sample(page,450);
  images.forEach((_,index)=>assertHeld(stillPaused,index,0));
  assert.equal(await page.locator('[data-motion-toggle]').getAttribute('aria-pressed'),'true','Manual pause survives preference changes');
 },{reducedMotion:'reduce'});
});

test('Keyboard focus brakes each star; pointer and focus holds compose',async()=>{
 await withPage(async page=>{
  await page.locator('[data-home-logo]').focus();
  for(let index=0;index<controls.length;index++) {
   assert.equal(await page.locator(controls[index]).evaluate(node=>node===document.activeElement),true);
   const focused=await sample(page,500);
   assertHeld(focused,index,330);
   await page.locator(controls[index]).hover();
   await page.keyboard.press('Tab');
   assertHeld(await sample(page,420),index,0);
   await page.mouse.move(5,5);
   const released=await sample(page,550);
   assertContinuous(released,index);
   assertSlow(released.filter(frame=>frame.t>380),index);
  }
 });
});
