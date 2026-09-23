// Run against a local preview. Nested hosting uses a real /main/ HTTP server.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, readdir, mkdir, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=process.env.EVIDENCE_DIR||'/tmp/growth-toolbox-evidence';
const section='work/growth-toolbox/';
const routes=['','content-plan/','article/','content-examples/','above-the-law/','above-the-law/archive/'];
const sha=buf=>createHash('sha256').update(buf).digest('hex');
async function setup(options={},nested=false){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({reducedMotion:'reduce',...options});
 // Prevent local checks from sending analytics; no runtime data is fabricated.
 await context.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
 let url=base;
 if(nested){
  // A real prefix server also exercises Chromium downloads, which bypass page.route.
  const server=createServer(async(req,res)=>{
   try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/main/')){res.writeHead(404).end();return;}
    let file=path.resolve(root,pathname.slice('/main/'.length));
    if(file!==root.replace(/\/$/,'')&&!file.startsWith(root)){res.writeHead(403).end();return;}
    if((await stat(file)).isDirectory()){
     if(!pathname.endsWith('/')){res.writeHead(301,{Location:pathname+'/'}).end();return;}
     file=path.join(file,'index.html');
    }
    const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf','.json':'application/json','.csv':'text/csv','.txt':'text/plain'};
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(await readFile(file));
   }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  url=`http://127.0.0.1:${server.address().port}/main/`;
  browser.on('disconnected',()=>server.close());
 }
 const page=await context.newPage();
 return {browser,context,page,url};
}
for(const nested of [false,true])test(`Weekender links navigate without requiring a popup: ${nested?'nested /main/':'root'}`,async()=>{
 const {browser,page,url}=await setup({},nested);
 try{
  for(const route of ['work/',section]){
   for(const destination of ['https://weekender.arvidscarff.workers.dev','https://weekender.arvidscarff.workers.dev/about']){
    await page.goto(url+route);
    if(route===section)await page.locator('.assignment-index a[href="#mashup"]').click();
    else await page.locator('#weekender summary').click();
    const link=page.locator(`a[href="${destination}"]`);
    await link.click();
    await page.waitForURL(destination.replace(/\/$/,'')+(destination.endsWith('/about')?'':'/'),{timeout:10000,waitUntil:'domcontentloaded'});
    assert.match(await page.title(),/Weekender/i);
    assert.equal(page.context().pages().length,1,'No extra tab required');
    await page.goBack({waitUntil:'domcontentloaded'});
    // A cached history restore can resolve goBack before the URL event arrives.
    await page.waitForURL(u=>u.href.split('#')[0]===url+route,{timeout:10000,waitUntil:'domcontentloaded'});
    assert.equal(page.url().split('#')[0],url+route,'Back returns to portfolio');
   }
  }
 }finally{await browser.close();}
});
async function files(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,entry.name);
  if(entry.isDirectory()) out.push(...await files(p)); else out.push(p);
 }
 return out;
}
for(const nested of [false,true]) test(`Coursework visitor path, navigation, downloads and chart controls: ${nested?'nested /main/':'root'}`,async()=>{
 const {browser,page,url}=await setup({},nested);
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(url);await page.locator('[data-eagle]').click();
  await page.getByRole('link',{name:'work',exact:true}).click();await page.waitForURL('**/work/');
  await page.locator('#growth-toolbox summary').click();
  await page.getByRole('link',{name:/Open coursework/}).click();await page.waitForURL('**/growth-toolbox/');
  const downloads=[];
  for(const route of routes){
   await page.goto(url+section+route);
   assert.equal(await page.locator('h1').count(),1,route);
   const refs=await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(ns=>ns.map(n=>({raw:n.getAttribute('href')||n.getAttribute('src'),href:n.href||n.src,download:n.hasAttribute('download')})));
   for(const ref of refs){
    if(new URL(ref.href).origin!==new URL(url).origin)continue;
    const u=new URL(ref.href);
    if(nested)assert.ok(u.pathname.startsWith('/main/'),'No root-relative escape: '+u.href);
    // Fragment-only navigation must reach a real id, not a dead target.
    if(ref.raw.startsWith('#'))assert.equal(await page.locator(ref.raw).count(),1,ref.href);
    const localPath=u.pathname.slice(new URL(url).pathname.length);
    const response=await page.request.get(url+localPath);
    assert.equal(response.status(),200,ref.href);
    if(ref.download)downloads.push({page:route,raw:ref.raw});
   }
  }
  for(const d of downloads){
   await page.goto(url+section+d.page);
   const assignment=await page.locator(`a[download][href="${d.raw}"]`).first().evaluate(n=>n.closest('.assignment')?.id);
   if(assignment)await page.locator(`.assignment-index a[href="#${assignment}"]`).click();
   // Some source-data downloads live in closed methodology disclosures.
   for(const detail of await page.locator('details').all()) {
    if(!await detail.evaluate(el=>el.open)) await detail.locator('summary').first().click();
   }
   const [download]=await Promise.all([page.waitForEvent('download',{timeout:8000}),page.locator(`a[download][href="${d.raw}"]`).first().click()]);
   assert.equal(await download.failure(),null,d.raw);
   const actual=await readFile(await download.path());
   const target=new URL(d.raw,url+section+d.page).pathname.slice(new URL(url).pathname.length);
   assert.equal(sha(actual),sha(await readFile(path.join(root,target))),d.raw);
  }
  await page.goto(url+section+'above-the-law/');
  const initial=await page.locator('#party-chart').innerText();
  await page.locator('#statement').selectOption('Qtk_4');
  assert.notEqual(await page.locator('#party-chart').innerText(),initial);
  assert.match(await page.locator('#chart-announcement').innerText(),/move on/);
  await page.locator('#opinion-cause').selectOption('epstein');
  assert.equal(await page.locator('[data-opinion-row]:visible').count(),1);
  await page.locator('#opinion-cause').selectOption('all');
  await page.locator('#opinion-order').selectOption('events');
  const vals=await page.locator('[data-opinion-row]:visible').evaluateAll(ns=>ns.map(n=>Number(n.dataset.events)));
  assert.deepEqual(vals,[...vals].sort((a,b)=>b-a));
  await page.getByRole('link',{name:'← Coursework',exact:true}).click();await page.waitForURL('**/growth-toolbox/');
  await page.getByRole('link',{name:'Back to Work',exact:true}).click();await page.waitForURL('**/work/');
  assert.deepEqual(errors,[]);
  console.log(`${nested?'nested':'root'}: ${routes.length} pages and ${downloads.length} actual file downloads verified`);
 }finally{await browser.close();}
});
for(const width of [320,390,1440])test(`Coursework layout and section links at ${width}px`,async()=>{
 const {browser,page,url}=await setup({viewport:{width,height:900}});
 try{
  await mkdir(evidence,{recursive:true});
  for(const route of routes){
   await page.goto(url+section+route);
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth+1,main:(()=>{const m=document.querySelector('main');return m.scrollWidth>m.clientWidth+1})()}));
   assert.deepEqual(overflow,{body:false,main:false},route);
   if(!route||route==='article/'||route==='above-the-law/')await page.screenshot({path:path.join(evidence,`${width}-${route.replaceAll('/','')||'coursework'}.png`)});
  }
  await page.goto(url+section);
  for(const link of await page.locator('.assignment-index a').all()){
   await link.click();
   const selector=await link.getAttribute('href');
   const box=await page.locator(selector).boundingBox();
   assert.ok(box.y>=0&&box.y<900,selector+' scrolled into view');
  }
  await page.getByRole('link',{name:'Back to top ↑',exact:true}).click();
  assert.ok(await page.locator('main').evaluate(m=>m.scrollTop)<2);
 }finally{await browser.close();}
});
test('Coursework remains readable without JavaScript; keyboard follows links',async()=>{
 const {browser,page,url}=await setup({javaScriptEnabled:false,viewport:{width:390,height:844}});
 try{
  await page.goto(url+section);await page.keyboard.press('Tab');
  assert.match(await page.locator(':focus').innerText(),/Skip to content/i);
  await page.keyboard.press('Enter');
  await page.getByRole('link',{name:'Read article ↗',exact:true}).click();
  assert.match(await page.locator('h1').innerText(),/Above the law/);
  await page.goto(url+section+'above-the-law/');
  assert.equal(await page.locator('#party-control').isVisible(),false);
  assert.ok((await page.locator('.party-value').allTextContents()).length>0);
 }finally{await browser.close();}
});
test('All bundled artifacts serve exact bytes, with no private scrape output',async()=>{
 const {browser,page}=await setup();
 try{
  const list=await files(path.join(root,section));
  assert.ok(list.length>30);
  for(const file of list){
   assert.doesNotMatch(file,/foretag\.(?:txt|csv)|\.zip$|\.DS_Store|__pycache__|\/\.planning\//);
   const rel=path.relative(root,file).split(path.sep).map(encodeURIComponent).join('/');
   const res=await page.request.get(base+rel);assert.equal(res.status(),200,rel);
   assert.equal(sha(await res.body()),sha(await readFile(file)),rel);
  }
  console.log(`HTTP exact-byte audit: ${list.length} bundled files`);
 }finally{await browser.close();}
});
