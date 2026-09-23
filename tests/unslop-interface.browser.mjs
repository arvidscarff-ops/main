import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
const base=process.env.BASE_URL||'http://127.0.0.1:5190/';
const root=process.cwd();
const routes={
 'work/':'01','work/agoos/':'01','work/noisey-neighbours/':'01','work/karnevalen-campaign/':'01','work/growth-toolbox/':'01','work/growth-toolbox/article/':'01','work/growth-toolbox/content-examples/':'01','work/growth-toolbox/content-plan/':'01',
 'design/':'02','work/graphic-design/':'02','work/graphic-design/textur/':'02','work/graphic-design/event-festival/':'02','work/graphic-design/motion-graphics/':'02','work/graphic-design/logofolio/':'02','work/graphic-design/karnevalen/':'02',
 'about/':'03','contact/':'03','ai-labs/':'03','ai-labs/hermes-system/':'03'
};

test('Every inner route uses one square landscape window without nested blur',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  for(const [route,camera] of Object.entries(routes)){
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.landscape-backdrop');
   const result=await page.evaluate(()=>{
    const frame=getComputedStyle(document.querySelector('.site-frame'));
    const bar=getComputedStyle(document.querySelector('.window-bar'));
    return {camera:document.body.dataset.landscapeCamera,radius:frame.borderRadius,barBlur:bar.backdropFilter||bar.webkitBackdropFilter};
   });
   assert.equal(result.camera,camera,route);
   assert.equal(result.radius,'0px',route);
   assert.ok(result.barBlur==='none'||result.barBlur==='',`${route}: ${result.barBlur}`);
  }
 }finally{await browser.close();}
});

test('Public portfolio styles do not use interface or metadata type below 12px',()=>{
 const files=fs.readdirSync(path.join(root,'assets/css')).filter(name=>name.endsWith('.css'));
 const offenders=[];
 for(const file of files){
  const css=fs.readFileSync(path.join(root,'assets/css',file),'utf8');
  for(const [index,line] of css.split('\n').entries()){
   for(const match of line.matchAll(/(?:font-size\s*:\s*|font\s*:\s*(?:[^;{}]*?\s)?)([0-9.]+)px/gi)){
    if(Number(match[1])<12)offenders.push(`${file}:${index+1} ${match[1]}px`);
   }
  }
 }
 assert.deepEqual(offenders,[]);
});

test('Current work is a flat desktop window without fake status or decorative numbering',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const widget=page.locator('[data-current-work]');
  assert.equal(await widget.locator('.current-work__eyebrow').count(),0);
  assert.equal(await widget.locator('ol').count(),0);
  assert.equal(await widget.locator('ul').count(),1);
  assert.equal(await widget.locator('li small').count(),0);
  const style=await widget.evaluate(el=>{
   const widgetStyle=getComputedStyle(el);
   const toggleStyle=getComputedStyle(el.querySelector('[data-current-work-toggle]'));
   return {radius:widgetStyle.borderRadius,shadow:widgetStyle.boxShadow,blur:widgetStyle.backdropFilter||widgetStyle.webkitBackdropFilter,toggleRadius:toggleStyle.borderRadius};
  });
  assert.equal(style.radius,'0px');
  assert.equal(style.shadow,'none');
  assert.ok(style.blur==='none'||style.blur==='');
  assert.equal(style.toggleRadius,'3px');
 }finally{await browser.close();}
});

test('About, Contact and AI Labs use content-specific first surfaces',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(base+'about/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.getByRole('heading',{level:1,name:'Arvid Shane Scarff'}).count(),1);
  assert.equal(await page.locator('.page-kicker').count(),0);
  assert.equal(await page.locator('.principles section>span').count(),0);

  await page.goto(base+'design/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.page-kicker').count(),0);

  await page.goto(base+'contact/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.page-kicker').count(),0);
  assert.equal(await page.locator('[data-contact-address]').count(),1);
  assert.equal(await page.locator('[data-contact-compose]').count(),1);
  assert.equal(await page.locator('a[href^="mailto:"]').count(),1);
  await page.locator('[name="subject"]').fill('Project question');
  await page.locator('[name="body"]').fill('Hello Arvid');
  const composeHref=await page.locator('[data-compose-email]').getAttribute('href');
  assert.ok(composeHref.includes('subject=Project%20question'),composeHref);
  assert.ok(composeHref.includes('body=Hello%20Arvid'),composeHref);
  assert.equal(await page.locator('[data-copy-email]').count(),1);

  await page.goto(base+'ai-labs/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.page-kicker').count(),0);
  assert.equal(await page.locator('.ai-feature__signal').count(),0);
  assert.equal(await page.locator('.ai-system-preview').count(),1);
  assert.ok(await page.locator('.ai-system-preview [data-preview-node]').count()>=4);
  const headingSize=await page.locator('h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(headingSize<96,headingSize);
 }finally{await browser.close();}
});

test('Contact composer does not overlap at short landscape',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},reducedMotion:'reduce'});
  await page.goto(base+'contact/',{waitUntil:'domcontentloaded'});
  const address=await page.locator('[data-contact-address]').boundingBox();
  const email=await page.locator('.contact-email').boundingBox();
  const copy=await page.locator('[data-copy-email]').boundingBox();
  const composer=await page.locator('[data-contact-compose]').boundingBox();
  const action=await page.locator('[data-compose-email]').boundingBox();
  assert.ok(address&&email&&copy&&composer&&action);
  assert.ok(email.x+email.width<=composer.x,`email ${email.x+email.width} > ${composer.x}`);
  assert.ok(copy.x+copy.width<=composer.x,`copy ${copy.x+copy.width} > ${composer.x}`);
  assert.ok(address.x+address.width<=844,`${address.x+address.width}`);
  assert.ok(composer.x+composer.width<=844,`${composer.x+composer.width}`);
  assert.ok(action.y+action.height<=390,`action bottom ${action.y+action.height}`);
 }finally{await browser.close();}
});

test('Hermes opens on a request trace and uses a connected architecture instead of feature cards',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(base+'ai-labs/hermes-system/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.hermes-pulse').count(),0);
  assert.equal(await page.locator('.hermes-trace').count(),1);
  assert.equal(await page.locator('.hermes-trace li').count(),4);
  assert.equal(await page.locator('.system-map__nodes').count(),0);
  assert.equal(await page.locator('.system-architecture').count(),1);
  assert.equal(await page.locator('.system-architecture details').count(),6);
  assert.equal(await page.locator('.system-architecture summary>span').count(),0);
  const firstWidth=await page.locator('.system-architecture details').nth(0).evaluate(el=>el.getBoundingClientRect().width);
  const secondWidth=await page.locator('.system-architecture details').nth(1).evaluate(el=>el.getBoundingClientRect().width);
  assert.notEqual(Math.round(firstWidth),Math.round(secondWidth));
  const headingSize=await page.locator('.hermes-hero h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(headingSize<100,headingSize);
 }finally{await browser.close();}
});
