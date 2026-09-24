import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:5191/';
const evidence=process.env.EVIDENCE_DIR||'/tmp/ai-mindmap-qa';
const ids=['human','jarvis','memory','knowledge','skills','researcher','builder','critic','coach','coding','gauntlet','routing'];
async function fits(page){
 const clipped=await page.locator('.mind-node summary strong,.mind-node summary small,.mind-node[open] .mind-detail p').evaluateAll(nodes=>nodes.flatMap(n=>{
  const range=document.createRange();range.selectNodeContents(n);
  const box=n.closest('.mind-node').getBoundingClientRect();
  return [...range.getClientRects()].some(r=>r.left<box.left-1||r.right>box.right+1)?[n.textContent]:[];
 }));
 assert.deepEqual(clipped,[],`All visible text stays within its node: ${JSON.stringify(await page.evaluate(()=>({width:innerWidth,height:innerHeight,columns:getComputedStyle(document.querySelector('.mind-branches')).gridTemplateColumns,node:document.querySelector('#knowledge').getBoundingClientRect().width,styles:[...document.styleSheets].map(s=>s.href)})))}`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
}
async function run(fn,options={}){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...options});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await fn(page);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
test('Every node expands by keyboard and fits narrow, wide and short screens',()=>run(async page=>{
 await mkdir(evidence,{recursive:true});
 await page.goto(base+'ai-labs/');
 assert.deepEqual(await page.locator('.mind-node').evaluateAll(nodes=>nodes.map(n=>n.id)),ids);
 for(const [width,height] of [[320,740],[390,844],[760,900],[761,900],[844,390],[1200,900],[1440,900],[2560,1440]]){
  await page.setViewportSize({width,height});
  await page.goto(base+'ai-labs/');
  await fits(page);
  for(const id of ids){
   const node=page.locator('#'+id),summary=node.locator('summary');
   await summary.focus();
   await page.keyboard.press('Enter');
   assert.equal(await node.evaluate(n=>n.open),true,id);
   assert.equal(await summary.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
   await fits(page);
   await page.keyboard.press('Space');
   assert.equal(await node.evaluate(n=>n.open),false,id);
  }
  await page.evaluate(()=>scrollTo(0,0));
  if([390,1440,2560].includes(width)) await page.screenshot({path:`${evidence}/map-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#gauntlet summary').click();
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${evidence}/map-expanded.png`,fullPage:true});
}));
test('Touch and no-JavaScript retain every explanation',()=>run(async page=>{
 await page.goto(base+'ai-labs/hermes-system/');
 for(const id of ids){
  const node=page.locator('#'+id);
  await node.locator('summary').tap();
  assert.equal(await node.evaluate(n=>n.open),true,id);
  assert.equal(await node.locator('.mind-detail').isVisible(),true);
  await fits(page);
 }
 assert.equal(await page.locator('.mind-node[open]').count(),ids.length);
 await page.locator('[data-window-parent]').tap();
 await page.waitForURL('**/ai-labs/');
 assert.equal(await page.locator('[data-mindmap]').count(),1);
},{viewport:{width:390,height:844},isMobile:true,hasTouch:true,javaScriptEnabled:false}));
test('Both map URLs, assets and return links work under /main/',async()=>{
 const {createServer,request}=await import('node:http');
 const server=createServer((incoming,outgoing)=>{
  if(!incoming.url.startsWith('/main/')){outgoing.writeHead(404).end();return;}
  const upstream=request(new URL(incoming.url.slice('/main/'.length),base),{method:incoming.method},response=>{outgoing.writeHead(response.statusCode,response.headers);response.pipe(outgoing);});
  upstream.on('error',()=>outgoing.writeHead(502).end());incoming.pipe(upstream);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const prefix=`http://127.0.0.1:${server.address().port}/main/`;
 try{await run(async page=>{
  const failures=[];page.on('response',r=>{if(r.url().startsWith(prefix)&&r.status()>=400)failures.push(r.url());});
  await page.goto(prefix+'ai-labs/');
  await page.locator('.mind-footer a').first().click();
  await page.waitForURL(prefix+'ai-labs/hermes-system/');
  await page.locator('#gauntlet summary').click();assert.ok(await page.locator('#gauntlet').evaluate(n=>n.open));
  const sheets=await page.locator('link[rel="stylesheet"]').evaluateAll(ns=>ns.map(n=>n.href));
  for(const url of sheets){assert.ok(url.startsWith(prefix+'assets/'));assert.equal((await page.request.get(url)).status(),200);}
  await page.locator('[data-window-parent]').click();await page.waitForURL(prefix+'ai-labs/');
  await page.locator('.window-close').click();await page.waitForURL(prefix+'#navigation');
  assert.deepEqual(failures,[],'No missing nested-path resources');
 });}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('Stale theme and normal motion preserve the glass map',()=>run(async page=>{
 await page.addInitScript(()=>localStorage.setItem('theme','light'));
 await page.goto(base+'ai-labs/');
 assert.equal(await page.locator('body').getAttribute('data-landscape-camera'),'03');
 assert.equal(await page.locator('.site-frame').evaluate(n=>getComputedStyle(n).borderRadius),'0px');
 assert.equal(await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
 await page.locator('#coding summary').click();
 assert.equal(await page.locator('#coding').evaluate(n=>n.open),true);
 await fits(page);
},{reducedMotion:'no-preference'}));
test('Map branches form a connected desktop tree and stack on mobile',()=>run(async page=>{
 await page.goto(base+'ai-labs/');
 const branches=page.locator('.mind-branches');
 assert.equal(await branches.evaluate(n=>getComputedStyle(n).display),'grid');
 const headers=await page.locator('.mind-branch > header').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
 assert.ok(headers.every(y=>Math.abs(y-headers[0])<1),'Desktop branches share a row');
 assert.notEqual(await branches.evaluate(n=>getComputedStyle(n,'::before').content),'none','Tree connector exists');
 await page.setViewportSize({width:390,height:844});
 const rows=await page.locator('.mind-branch').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,bottom:n.getBoundingClientRect().bottom})));
 assert.ok(rows[1].top>=rows[0].bottom&&rows[2].top>=rows[1].bottom,'Mobile branches stack');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No sideways overflow');
}));
test('Named tools link to their official projects on both matching maps',()=>run(async page=>{
 const maps=[];
 for(const route of ['ai-labs/','ai-labs/hermes-system/']){
  await page.goto(base+route);
  for(const [id,name,url] of [['memory','Hindsight','https://github.com/vectorize-io/hindsight'],['knowledge','QMD','https://github.com/tobi/qmd']]){
   await page.locator('#'+id+' summary').click();
   const link=page.locator('#'+id).getByRole('link',{name,exact:true});
   assert.equal(await link.count(),1,name+' must be linked');
   assert.equal(await link.getAttribute('href'),url);
   assert.equal(await link.getAttribute('target'),null,'Links work in the embedded preview too');
   assert.ok(await link.isVisible());
  }
  maps.push(await page.locator('[data-mindmap]').innerHTML());
 }
 assert.equal(maps[0],maps[1],'Preserved map routes must not drift');
}));
test('Both AI Labs URLs open the map and allow native node expansion',()=>run(async page=>{
 for(const route of ['ai-labs/','ai-labs/hermes-system/']){
  await page.goto(base+route);
  assert.equal(await page.locator('[data-mindmap]').count(),1,'The map must be the page, not a teaser');
  const jarvis=page.locator('#jarvis');
  await jarvis.locator('summary').click();
  assert.equal(await jarvis.evaluate(n=>n.open),true);
  assert.match(await jarvis.innerText(),/Why/);
  await jarvis.locator('summary').click();
  assert.equal(await jarvis.evaluate(n=>n.open),false);
 }
}));
