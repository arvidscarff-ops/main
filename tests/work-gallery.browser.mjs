import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';
async function run(fn, options={}) {
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'work/');
  await fn(page);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
}

test('Touch previews a project before Enter project navigates',()=>run(async page=>{
 const target=page.locator('#ghostwriting');
 await target.tap();
 assert.equal(new URL(page.url()).pathname,'/work/');
 assert.ok(await target.evaluate(n=>n.classList.contains('is-active')));
 assert.ok(await target.locator('.work-panel__description').isVisible());
 await target.locator('.work-panel__enter').tap();
 await page.waitForURL('**/work/ghostwriting/');
 assert.match(await page.locator('main').innerText(),/NDA/);
},{viewport:{width:390,height:844},hasTouch:true,isMobile:true}));

test('Project selection returns after entering a project and browser Back',()=>run(async page=>{
 await page.locator('#karnevalen').hover();
 await page.locator('#karnevalen a').click();
 await page.waitForURL('**/work/karnevalen-campaign/');
 await page.goBack();
 await page.waitForURL('**/work/');
 assert.ok(await page.locator('#karnevalen').evaluate(n=>n.classList.contains('is-active')));
}));

test('Consulting and Ghostwriting have readable detail pages using the existing copy',()=>run(async page=>{
 for(const [slug,copy] of [['personal-brand-consulting','seven months'],['ghostwriting','three client offers generated $200k+ in sales']]) {
  const response=await page.goto(base+'work/'+slug+'/');
  assert.equal(response.status(),200);
  assert.ok((await page.locator('main').innerText()).includes(copy));
  await page.getByRole('link',{name:'Back to Work',exact:true}).click();
  await page.waitForURL(/\/work\/(#.*)?$/);
 }
}));

test('Hover after keyboard focus expands only the pointed-at project',()=>run(async page=>{
 await page.locator('#agoos a').focus();
 await page.locator('#noisey').hover();
 const focused=await page.locator('#agoos').boundingBox();
 const active=await page.locator('#noisey').boundingBox();
 assert.ok(active.width>focused.width*2,'Old keyboard focus must not hold another panel open');
}));

test('Keyboard can preview and enter projects with visible focus',()=>run(async page=>{
 await page.locator('#personal-brand a').focus();
 assert.equal(await page.locator('#personal-brand').evaluate(n=>n.classList.contains('is-active')),true);
 assert.equal(await page.locator('#personal-brand a').evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
 await page.keyboard.press('Enter');await page.waitForURL('**/personal-brand-consulting/');
 await page.getByRole('link',{name:'Back to Work',exact:true}).click();await page.waitForURL('**/work/#personal-brand');
 assert.equal(await page.locator('#personal-brand').evaluate(n=>n.classList.contains('is-active')),true);
}));

for(const [width,height] of [[320,568],[390,844],[844,390],[1200,800],[1280,720],[1440,900],[2560,1440]]) {
 test(`Gallery labels and expanded copy fit ${width}x${height}`,()=>run(async page=>{
  const items=page.locator('[data-work-item]');
  for(const panel of await items.all()){
   await panel.locator('a').focus();
   const geometry=await panel.evaluate(n=>{
    const p=n.getBoundingClientRect(),c=n.querySelector('.work-panel__copy').getBoundingClientRect();
    const h=n.querySelector('h2'),range=document.createRange();range.selectNodeContents(h);
    const t=range.getBoundingClientRect();
    return {fits:c.top>=p.top&&c.bottom<=p.bottom&&t.left>=p.left&&t.right<=p.right,transition:getComputedStyle(n).transitionDuration};
   });
   assert.equal(geometry.fits,true,await panel.getAttribute('id'));
   assert.ok(parseFloat(geometry.transition)<=.001,'Reduced motion removes perceptible expansion animation');
   const clipped=await items.evaluateAll(nodes=>nodes.filter(n=>{
    const p=n.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(n.querySelector('h2'));
    const t=r.getBoundingClientRect();return t.left<p.left||t.right>p.right;
   }).map(n=>n.id));
   assert.deepEqual(clipped,[],'Collapsed neighbours keep their complete titles');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{viewport:{width,height}}));
}

test('Every gallery destination and new detail resource resolves under /main/',()=>run(async page=>{
 const {createServer,request}=await import('node:http');
 const server=createServer((incoming,outgoing)=>{
  if(!incoming.url.startsWith('/main/')){outgoing.writeHead(404).end();return;}
  const upstream=request(new URL(incoming.url.slice('/main/'.length),base),response=>{
   outgoing.writeHead(response.statusCode,response.headers);response.pipe(outgoing);
  });
  upstream.on('error',()=>outgoing.writeHead(502).end());upstream.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const prefix=`http://127.0.0.1:${server.address().port}/main/`;
 try{
  for(const route of ['work/','work/personal-brand-consulting/','work/ghostwriting/']){
   await page.goto(prefix+route);
   const refs=await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(ns=>ns.map(n=>n.href||n.src));
   for(const ref of refs){
    if(new URL(ref).origin!==new URL(prefix).origin)continue;
    assert.ok(ref.startsWith(prefix),ref);
    assert.equal((await page.request.get(ref)).status(),200,ref);
   }
  }
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}));

test('Consulting and ghostwriting use distinct crops of the supplied X screenshot',()=>run(async page=>{
 for(const [id,file] of [['personal-brand','x-profile.jpg'],['ghostwriting','x-post.jpg']]){
  const image=page.locator(`#${id} .work-panel__image`);
  assert.ok((await image.getAttribute('src')).endsWith(`/assets/media/work/${file}`));
  await image.evaluate(img=>img.decode());
  assert.ok(await image.evaluate(img=>img.naturalWidth>=900));
 }
}));

test('Work exposes seven image links with titles and subtitles, expanding on hover',()=>run(async page=>{
 const panels=page.locator('[data-work-gallery] [data-work-item]');
 assert.equal(await panels.count(),7);
 assert.deepEqual(await panels.locator('h2').allTextContents(),['Agoos Apparel','Weekender','Noisey Neighbours','Personal brand consulting','Ghostwriting','Karnevalen campaign','Growth Toolbox']);
 for(const panel of await panels.all()) {
  assert.ok((await panel.locator('.work-panel__subtitle').innerText()).trim());
  assert.ok(await panel.locator('a[href]').count());
  await panel.locator('img').evaluate(img=>img.decode());
 }
 const target=panels.nth(2);
 const before=await target.boundingBox();
 await target.hover();
 await page.waitForFunction(()=>document.querySelector('#noisey').getBoundingClientRect().width>300);
 assert.ok((await target.boundingBox()).width>before.width*1.5);
 assert.equal(await target.locator('.work-panel__description').evaluate(n=>getComputedStyle(n).opacity),'1');
 assert.ok(await target.locator('.work-panel__description').isVisible());
 await target.locator('a').click();
 await page.waitForURL('**/work/noisey-neighbours/');
}));
