// The navigation redesign intentionally retires rotating stars. These checks
// cover its replacement: dock, ordered folder reveal, readable OS controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';
async function run(fn,options={}){
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage({viewport:{width:1440,height:900},...options});await page.goto(base);await page.waitForSelector('[data-ready]');await fn(page);}finally{await browser.close();}
}
test('Logo docks before ordered folders, then ordered terminal labels',()=>run(async page=>{
 const result=await page.evaluate(async()=>{
  const logo=document.querySelector('[data-home-logo]'),folders=[...document.querySelectorAll('[data-star]')];
  const first=folders.map(()=>null),labels=folders.map(()=>null);let firstLogo=null;
  const start=performance.now();logo.click();
  while(performance.now()-start<2200){
   const t=performance.now()-start;
   folders.forEach((n,i)=>{
    if(first[i]===null&&Number(getComputedStyle(n).opacity)>.08){first[i]=t;if(firstLogo===null)firstLogo=logo.getBoundingClientRect().bottom;}
    if(labels[i]===null&&Number(getComputedStyle(n.querySelector('.star-label')).opacity)>.08)labels[i]=t;
   });
   await new Promise(requestAnimationFrame);
  }
  return {first,labels,firstLogo,finalLogo:logo.getBoundingClientRect().bottom};
 });
 assert.ok(Math.abs(result.firstLogo-result.finalLogo)<2,'Docking finishes before folders arrive');
 for(const times of [result.first,result.labels]){
  assert.ok(times.every(n=>n!==null));
  for(let i=1;i<times.length;i++)assert.ok(times[i]>times[i-1],JSON.stringify(result));
 }
 assert.ok(result.labels[0]>result.first[4]+200,'Labels follow the complete folder reveal');
}));
test('Display controls stay legible and touch-sized on the landscape',()=>run(async page=>{
 const controls=await page.locator('.frame-control').evaluateAll(ns=>ns.map(n=>({color:getComputedStyle(n).color,height:n.getBoundingClientRect().height})));
 for(const item of controls){assert.ok(item.height>=44,'Touch target at least 44px');const rgb=item.color.match(/[\d.]+/g).slice(0,3).map(Number);assert.ok(rgb.every(n=>n>=200),'Controls are light on the dark landscape');}
}));
test('Pause and visibility suspend the landscape; folders do not rotate',()=>run(async page=>{
 await page.locator('[data-home-logo]').click();await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
 await page.waitForFunction(()=>!document.querySelector('[data-landscape]').paused);
 await page.locator('[data-motion-toggle]').click();assert.equal(await page.locator('[data-landscape]').evaluate(v=>v.paused),true);
 const transform=await page.locator('.folder-icon').first().evaluate(n=>getComputedStyle(n).transform);assert.equal(transform,'none');
 await page.locator('[data-motion-toggle]').click();await page.waitForFunction(()=>!document.querySelector('[data-landscape]').paused);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('[data-landscape]').evaluate(v=>v.paused),true);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>!document.querySelector('[data-landscape]').paused);
}));
