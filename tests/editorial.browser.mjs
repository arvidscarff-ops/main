import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
async function run(fn,opts={}){const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...opts});await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await fn(page);assert.deepEqual(errors,[]);}finally{await browser.close();}}

test('Work gives three compact choices with optional context',()=>run(async page=>{
 await page.goto(base+'work/');
 assert.equal(await page.locator('[data-work-item] details').count(),3);
 for(const item of await page.locator('[data-work-item]').all()){
  assert.equal(await item.locator('details').evaluate(n=>n.open),false);
  const box=await item.boundingBox();assert.ok(box.y+box.height<860,'All three choices should be visible together');
 }
 const context=page.locator('[data-work-item]').first().locator('details');
 await context.locator('summary').click();assert.match(await context.innerText(),/joined this small clothing project/);
 assert.equal(await context.evaluate(n=>n.open),true);
}));

test('Design is a contact sheet, with an accessible image viewer in each collection',()=>run(async page=>{
 await page.goto(base+'design/');
 for(const card of await page.locator('.archive-card').all()){const r=await card.boundingBox();assert.ok(r.y+r.height<850,'Five collections should fit on the overview');}
 await page.locator('.archive-card').first().click();await page.waitForURL('**/textur/');
 const first=page.locator('.archive-image-link').first();
 await first.click();const viewer=page.locator('dialog.image-viewer');
 assert.equal(await viewer.isVisible(),true);
 const src=await viewer.locator('img').getAttribute('src');
 await viewer.getByRole('button',{name:'Next image',exact:true}).click();
 assert.notEqual(await viewer.locator('img').getAttribute('src'),src);
 await page.keyboard.press('ArrowLeft');assert.equal(await viewer.locator('img').getAttribute('src'),src);
 assert.equal(await viewer.getByRole('link',{name:'Open original'}).getAttribute('href'),await first.getAttribute('href'));
 await page.keyboard.press('Escape');assert.equal(await viewer.isVisible(),false);
 assert.equal(await first.evaluate(n=>n===document.activeElement),true);
}));

test('Agoos chapters and About topics open only when selected',()=>run(async page=>{
 await page.goto(base+'work/agoos/');
 assert.equal(await page.locator('.agoos-spread:visible').count(),0);
 const choices=page.locator('.chapter-index a');assert.equal(await choices.count(),3);
 for(const choice of await choices.all()) { const r=await choice.boundingBox();assert.ok(r.y+r.height<850); }
 await choices.nth(1).click();assert.equal(await page.locator('.agoos-spread:visible').count(),1);
 assert.match(await page.locator('.agoos-spread:visible').innerText(),/Skogrejv/);
 const overlap=await page.evaluate(()=>{const role=document.querySelector('.agoos-role').getBoundingClientRect();return [...document.querySelectorAll('#collaboration .agoos-shirt')].some(n=>n.getBoundingClientRect().bottom>role.top);});
 assert.equal(overlap,false,'Open chapter imagery must not cover the role line');
 await choices.first().click();assert.equal(await page.locator('.agoos-spread:visible').count(),1);
 await page.locator('.agoos-spread:visible [data-close-chapter]').click();assert.equal(await page.locator('.agoos-spread:visible').count(),0);
 await page.goto(base+'about/');assert.equal(await page.locator('.principles details').count(),3);
 assert.equal(await page.locator('.principles p:visible').count(),0);
 await page.locator('.principles summary').first().click();assert.equal(await page.locator('.principles p:visible').count(),1);
}));

test('Coursework contents reveal one assignment and honour direct hashes',()=>run(async page=>{
 await page.goto(base+'work/growth-toolbox/');assert.equal(await page.locator('.assignment:visible').count(),0);
 await page.locator('.assignment-index a[href="#content"]').click();assert.equal(await page.locator('.assignment:visible').count(),1);
 assert.equal(await page.getByRole('link',{name:'Read article ↗',exact:true}).isVisible(),true);
 await page.reload();assert.equal(await page.locator('#content').isVisible(),true);
 await page.locator('.assignment-index a[href="#scraping"]').click();assert.equal(await page.locator('#content').isVisible(),false);
 await page.goBack();assert.equal(await page.locator('#content').isVisible(),true);
}));

test('Inner pages load one versioned light canvas stylesheet last and remove ambient controls',()=>run(async page=>{
 await page.addInitScript(()=>localStorage.setItem('ass-theme','dark'));
 for(const route of ['work/','design/','about/','contact/','ai-labs/','work/agoos/','work/growth-toolbox/']){
  await page.goto(base+route);
  const styles=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  assert.match(styles.at(-1),/editorial\.css\?v=4$/,'The canvas stylesheet must load after page-specific CSS');
  assert.equal(await page.locator('[data-theme-toggle],[data-sound-toggle]').count(),0,'Inner pages have no homepage ambience controls');
  const colors=await page.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,main:getComputedStyle(document.querySelector('main')).backgroundColor,label:getComputedStyle(document.querySelector('.index-link'),'::before').content}));
  assert.doesNotMatch(colors.label,/ASS/i,'Never use the owner’s initials as a brand label');
  assert.doesNotMatch(colors.body,/rgb\((?:0|8), (?:0|9), (?:0|8)\)/);
  assert.doesNotMatch(colors.main,/rgb\((?:0|8), (?:0|9), (?:0|8)\)/);
 }
}));

test('Large desktop uses a capped exhibition canvas and restrained scale',()=>run(async page=>{
 await page.goto(base+'work/');
 const shell=await page.evaluate(()=>{const main=document.querySelector('main').getBoundingClientRect(),title=document.querySelector('h1').getBoundingClientRect(),header=document.querySelector('.section-header').getBoundingClientRect();return {main,title,header,links:[...document.querySelectorAll('.section-menu nav a')].filter(a=>getComputedStyle(a).display!=='none').length,indexBorder:getComputedStyle(document.querySelector('.index-link')).borderTopWidth};});
 assert.ok(shell.main.width<=1600,'Canvas content is capped on large monitors');
 assert.ok(shell.main.left>=100&&shell.main.right<=2460,'Canvas remains centred');
 assert.ok(shell.title.height<100,'Section title is restrained');
 assert.equal(shell.links,5);
 assert.equal(shell.indexBorder,'0px','Top-left navigation is not a boxed button');
 for(const card of await page.locator('[data-work-item]').all()){const r=await card.boundingBox();assert.ok(r.y<1200,'All projects remain immediately discoverable');}
},{viewport:{width:2560,height:1440}}));

test('Desktop section navigation remains usable without JavaScript',()=>run(async page=>{
 await page.goto(base+'design/');
 await page.locator('.section-menu summary').click();
 await page.getByRole('link',{name:'About',exact:true}).click();await page.waitForURL('**/about/');
 assert.match(await page.locator('main').innerText(),/Understand the problem/);
},{javaScriptEnabled:false}));

test('Section shell is paper-light with open desktop navigation and normal document scrolling',()=>run(async page=>{
 await page.goto(base+'work/');
 const style=await page.locator('main').evaluate(n=>({bg:getComputedStyle(n).backgroundColor,position:getComputedStyle(n).position,radius:getComputedStyle(n).borderRadius}));
 assert.equal(style.bg,'rgb(245, 243, 236)');
 assert.notEqual(style.position,'fixed');assert.equal(style.radius,'0px');
 assert.equal(await page.locator('.section-menu nav a:visible').count(),5);
 assert.equal(await page.locator('[data-theme-toggle],[data-sound-toggle]').count(),0);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflowY),'auto');
}));
