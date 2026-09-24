import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';

async function run(viewport,fn,options={}){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport,reducedMotion:'reduce',...options});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'work/noisey-neighbours/');
  await fn(page);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}

test('Noisey leads with real photos and the existing speaker-system origin',()=>run({width:1440,height:900},async page=>{
 assert.equal(await page.getByRole('heading',{name:'Noisey Neighbours',exact:true}).count(),1);
 const hero=page.locator('.noisey-hero');
 assert.equal(await hero.locator('img').count(),1);
 const origin=page.locator('.noisey-origin');
 assert.match(await origin.innerText(),/birthday party.*800 kilos.*Stockholm.*rave scene/is);
 const photos=page.locator('.noisey-case img');
 assert.equal(await photos.count(),9);
 for(const img of await photos.all()){
  await img.scrollIntoViewIfNeeded();
  const state=await img.evaluate(n=>({loaded:n.complete&&n.naturalWidth>0,alt:n.alt,source:n.currentSrc}));
  assert.ok(state.loaded,state.source);
  assert.ok(state.alt.length>8,'Photographs need useful alternative text');
 }
 assert.ok(await page.locator('.noisey-gallery').count()===1);
}));

test('One user-controlled film has a still poster and does not autoplay',()=>run({width:1440,height:900},async page=>{
 const film=page.locator('.noisey-film video');
 assert.equal(await film.count(),1);
 assert.equal(await film.getAttribute('controls'),'');
 assert.equal(await film.getAttribute('preload'),'none');
 assert.equal(await film.getAttribute('autoplay'),null);
 assert.match(await film.getAttribute('poster'),/noisey.*\.jpg$/);
 const source=await film.locator('source').getAttribute('src');
 assert.match(source,/noisey.*\.mp4$/);
 const response=await page.request.get(new URL(source,page.url()).href);
 assert.equal(response.status(),200);
 assert.match(response.headers()['content-type'],/video\/mp4/);
}));

test('The concrete contribution comes after the imagery, with no invented audience metrics',()=>run({width:390,height:844},async page=>{
 const gallery=page.locator('.noisey-gallery');
 const role=page.locator('.noisey-contribution');
 assert.ok((await role.boundingBox()).y>(await gallery.boundingBox()).y);
 const copy=await role.innerText();
 for(const word of ['branding','marketing','finance','locations','logistics','door','bar','wardrobe','teardown','own music']) assert.match(copy,new RegExp(word,'i'));
 assert.doesNotMatch(await page.locator('main').innerText(),/\b\d{3,}\s+(guests|attendees|tickets)\b/i);
 const size=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(size.page<=size.viewport+1,JSON.stringify(size));
 assert.ok(await page.getByRole('link',{name:'Back to Work',exact:true}).count()>0);
}));

test('Photos, origin and role remain readable without JavaScript',()=>run({width:390,height:844},async page=>{
 assert.equal(await page.locator('.noisey-case img').count(),9);
 assert.match(await page.locator('.noisey-origin').innerText(),/800 kilos/i);
 assert.match(await page.locator('.noisey-contribution').innerText(),/logistics/i);
 assert.equal(await page.locator('.noisey-film video').count(),1);
},{javaScriptEnabled:false}));
