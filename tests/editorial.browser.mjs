import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';
async function run(fn,opts={}){const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',...opts});await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));await fn(page);assert.deepEqual(errors,[]);}finally{await browser.close();}}

test('Work gives seven compact choices with optional context',()=>run(async page=>{
 await page.goto(base+'work/');
 assert.equal(await page.locator('[data-work-item]').count(),7);
 for(const item of await page.locator('[data-work-item]').all()){
  assert.equal(await item.evaluate(n=>n.open),false);
  const box=await item.boundingBox();assert.ok(box.y+box.height<900,'All seven choices should be visible together');
 }
 const context=page.locator('[data-work-item]').first();
 await context.locator('summary').click();assert.match(await context.innerText(),/head art director and designer/i);
 assert.equal(await context.evaluate(n=>n.open),true);
}));

test('Design is a contact sheet whose collections open inside their project worlds',()=>run(async page=>{
 await page.goto(base+'design/');
 for(const card of await page.locator('.archive-card').all()){const r=await card.boundingBox();assert.ok(r.y+r.height<850,'Five collections should fit on the overview');}
 await page.locator('.archive-card').nth(1).click();await page.waitForURL('**/event-festival/');
 const first=page.locator('[data-world-scene]:visible .archive-image-link');
 await first.click();
 assert.equal(await page.locator('dialog.image-viewer').count(),0);
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),true);
 const focus=page.locator('[data-world-focus]');
 assert.equal(await focus.isVisible(),true);
 assert.equal(await focus.getByRole('link',{name:'Original ↗'}).evaluate(n=>n.href),await first.evaluate(n=>n.href));
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),false);
 assert.equal(await first.evaluate(n=>n===document.activeElement),true);
}));

test('TEXTUR opens with complete artwork and controls inside the first viewport',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/textur/');
 await page.waitForFunction(()=>document.querySelector('[data-project-world]')?.hasAttribute('data-world-ready'));
 await page.locator('[data-world-scene]:visible img').evaluate(img=>img.complete?true:new Promise(resolve=>img.addEventListener('load',()=>resolve(true),{once:true})));
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 assert.equal(await page.locator('[data-project-world="identity"]').count(),1);
 assert.equal(await page.locator('[data-world-scene]').count(),6);
 assert.equal(await page.locator('[data-world-scene]:visible').count(),1);
 assert.equal(await page.locator('[data-world-nav] a').count(),6);
 const geometry=await page.evaluate(()=>{
  const box=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const image=document.querySelector('[data-world-scene]:not([hidden]) img');
  return {viewport:innerHeight,scroll:document.documentElement.scrollHeight,stage:box(document.querySelector('[data-world-stage]')),image:box(image),natural:image.naturalWidth/image.naturalHeight,title:box(document.querySelector('h1')),fit:getComputedStyle(image).objectFit};
 });
 assert.ok(geometry.stage.top<230,'The work must begin near the top instead of below a large introduction');
 assert.ok(geometry.stage.bottom<=geometry.viewport-24,'Stage and navigator must fit inside the first viewport');
 assert.ok(geometry.image.top>=geometry.stage.top&&geometry.image.bottom<=geometry.stage.bottom,'The complete artwork must stay inside the stage');
 assert.ok(Math.abs(geometry.image.width/geometry.image.height-geometry.natural)<.02,'The image element must preserve the artwork aspect ratio rather than crop it');
 assert.equal(geometry.fit,'contain');
 assert.ok(geometry.title.height<46,'Project title remains a compact orientation label');
 assert.ok(geometry.scroll<=geometry.viewport+2,'The initial project scene must not require document scrolling');
 const atmosphere=await page.evaluate(()=>({canvas:getComputedStyle(document.querySelector('main')).backgroundColor,backdrop:getComputedStyle(document.querySelector('[data-world-stage]'),'::before').backgroundImage}));
 assert.equal(atmosphere.canvas,'rgb(1, 1, 31)');assert.notEqual(atmosphere.backdrop,'none');
}));

test('TEXTUR inspects artwork inside its project world instead of a generic popup',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/textur/#scene-4');
 const opener=page.locator('[data-world-scene]:visible .archive-image-link');
 await opener.click();
 assert.equal(await page.locator('dialog.image-viewer').count(),0,'Project worlds must not create the generic white viewer');
 assert.equal(await page.locator('[data-world-focus]').isVisible(),true);
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),true);
 assert.equal(await page.locator('.window-bar').evaluate(n=>n.inert),true,'Focus mode removes the persistent window bar from keyboard navigation');
 await page.waitForFunction(()=>{const r=document.querySelector('main').getBoundingClientRect(),c=getComputedStyle(document.querySelector('main'));return r.x===0&&r.y===0&&Math.abs(r.width-innerWidth)<1&&Math.abs(r.height-innerHeight)<1&&c.padding==='0px';});
 const canvas=await page.locator('main').evaluate(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return{x:r.x,y:r.y,width:r.width,height:r.height,padding:c.padding};});
 assert.deepEqual(canvas,{x:0,y:0,width:1440,height:900,padding:'0px'},'Focus canvas must replace the full viewport without exposing the page shell');
 const focused=await page.evaluate(()=>{const image=document.querySelector('[data-world-scene]:not([hidden]) img').getBoundingClientRect();return{top:image.top,bottom:image.bottom,height:innerHeight,bg:getComputedStyle(document.querySelector('main')).backgroundColor};});
 assert.ok(focused.top>=0&&focused.bottom<=focused.height,'Focus mode initially shows the complete artwork');
 assert.equal(focused.bg,'rgb(1, 1, 31)','Focus mode remains inside the project atmosphere');
 await page.getByRole('button',{name:'Zoom artwork'}).click();assert.equal(await page.locator('body').getAttribute('data-world-zoomed'),'true');
 await page.getByRole('button',{name:'Fit artwork'}).click();assert.equal(await page.locator('body').getAttribute('data-world-zoomed'),null);
 await page.getByRole('button',{name:'Close focus mode'}).click();
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),false);
 assert.equal(await opener.evaluate(n=>n===document.activeElement),true,'Closing restores focus to the artwork');
 await opener.click();await page.goBack();
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),false,'Browser Back closes focus mode without leaving the project');
 assert.match(page.url(),/#scene-4$/);
}));

test('TEXTUR has one compact navigator, overlay notes and clear neighbouring routes',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/textur/');
 await page.waitForFunction(()=>document.body.hasAttribute('data-world-ready'));
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 assert.equal(await page.locator('[data-world-nav]').isHidden(),true,'Scene overview stays out of the artwork until requested');
 const stageBefore=await page.locator('[data-world-stage]').boundingBox();
 await page.getByRole('button',{name:/Scene overview/}).click();
 assert.equal(await page.locator('[data-world-nav]').isVisible(),true);
 assert.equal(await page.locator('[data-world-nav] a').count(),6);
 await page.getByLabel('Project notes').click();
 const stageAfter=await page.locator('[data-world-stage]').boundingBox();
 for(const key of ['x','y','width','height']) assert.ok(Math.abs(stageAfter[key]-stageBefore[key])<=3,`Notes must overlay the stage without materially moving ${key}`);
 assert.equal(await page.getByRole('link',{name:'Back to Design'}).isVisible(),true);
 assert.equal(await page.getByRole('link',{name:/Next project: Event/}).isVisible(),true);
}));

test('Returning from TEXTUR restores the Design overview position',()=>run(async page=>{
 await page.goto(base+'design/');await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 const card=page.locator('.archive-card').first();await card.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
 await card.click();await page.waitForURL('**/textur/');
 await page.getByRole('link',{name:'Back to Design'}).click();await page.waitForURL('**/design/');
 await page.waitForFunction(expected=>Math.abs(scrollY-expected)<3,before);
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<3,'Returning should preserve the visitor’s place in the overview');
},{viewport:{width:390,height:844}}));

test('Mobile project stage supports deliberate horizontal scene swipes',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/textur/');
 const stage=page.locator('[data-world-stage]');
 const placement=await page.evaluate(()=>{const stage=document.querySelector('[data-world-stage]').getBoundingClientRect(),image=document.querySelector('[data-world-scene]:not([hidden]) img').getBoundingClientRect();return{offset:image.top-stage.top};});
 assert.ok(placement.offset<60,'Mobile artwork must begin near the top of the stage rather than float far down');
 await stage.dispatchEvent('pointerdown',{pointerType:'touch',clientX:320,clientY:360,pointerId:1});
 await stage.dispatchEvent('pointerup',{pointerType:'touch',clientX:90,clientY:365,pointerId:1});
 assert.match(page.url(),/#scene-2$/);
 assert.equal(await page.locator('[data-world-scene]:visible').getAttribute('data-world-id'),'scene-2');
},{viewport:{width:390,height:844},hasTouch:true}));

test('Portfolio routes preload on intent and share native visual continuity',()=>run(async page=>{
 await page.goto(base+'design/');
 const card=page.locator('.archive-card').first(),target=await card.getAttribute('href');
 assert.equal(await card.locator('img').evaluate(n=>getComputedStyle(n).viewTransitionName),'textur-artwork');
 await card.hover();
 assert.equal(await page.locator(`link[rel="prefetch"][href="${target}"]`).count(),1);
 await card.click();await page.waitForURL('**/textur/');
 assert.equal(await page.locator('[data-world-scene]:visible img').evaluate(n=>getComputedStyle(n).viewTransitionName),'textur-artwork');
}));

test('Event & Festival is a three-channel campaign world, not a thumbnail page',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/event-festival/');
 assert.equal(await page.locator('body').getAttribute('data-world-layout'),'campaign');
 assert.equal(await page.locator('[data-world-scene]:visible').count(),1);
 const stage=await page.locator('[data-world-stage]').boundingBox();
 assert.ok(stage.y<230&&stage.y+stage.height<=876,'Campaign artwork and controls must fit the opening viewport');
 const switcher=page.locator('.world-nav--campaign');
 assert.equal(await switcher.isVisible(),true);
 assert.equal(await switcher.locator('a').count(),3);
 assert.equal(await switcher.locator('img').count(),3,'Campaign navigation previews each distinct visual world');
 await switcher.getByRole('link',{name:/Popenair/}).click();
 assert.match(page.url(),/#scene-3$/);
 assert.equal(await page.locator('[data-world-scene]:visible').getAttribute('data-world-label'),'Popenair');
 assert.equal(await page.locator('[data-world-focus]').count(),1);
}));

test('Motion Graphics is a single-screen cinema with a persistent filmstrip',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/motion-graphics/');
 assert.equal(await page.locator('body').getAttribute('data-world-layout'),'screening');
 assert.equal(await page.locator('[data-world-scene]').count(),9);
 assert.equal(await page.locator('[data-world-scene]:visible video').count(),1);
 assert.equal(await page.locator('[data-world-scene]:not(:visible) video').evaluateAll(videos=>videos.every(video=>video.paused)),true);
 const filmstrip=page.locator('.world-nav--screening');
 assert.equal(await filmstrip.isVisible(),true);
 assert.equal(await filmstrip.locator('a').count(),9);
 assert.equal(await filmstrip.locator('img').count(),9);
 const stage=await page.locator('[data-world-stage]').boundingBox();
 assert.ok(stage.y<230&&stage.y+stage.height<=876,'The screening room must fit the opening viewport');
 await filmstrip.getByRole('link',{name:/08 — Film 08/}).click();
 assert.match(page.url(),/#scene-8$/);
 const portrait=await page.locator('[data-world-scene]:visible video').boundingBox();
 assert.ok(portrait.y>=stage.y&&portrait.y+portrait.height<=stage.y+stage.height-80,'Portrait film must fit above the filmstrip');
}));

test('Logofolio is a central mark plane with constellation navigation',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/logofolio/');
 assert.equal(await page.locator('body').getAttribute('data-world-layout'),'constellation');
 assert.equal(await page.locator('[data-world-scene]').count(),8);
 assert.equal(await page.locator('[data-world-scene]:visible').count(),1);
 const map=page.locator('.world-nav--constellation');
 assert.equal(await map.isVisible(),true);
 assert.equal(await map.locator('a').count(),8);
 assert.equal(await map.locator('img').count(),8);
 assert.equal(await page.locator('.archive-endnote').count(),0,'Immersive mark navigation must not retain the stale archive endnote');
 assert.equal(await map.evaluate(n=>getComputedStyle(n).display),'contents');
 const active=await page.locator('[data-world-scene]:visible img').boundingBox();
 assert.ok(active.y<710&&active.y+active.height<=820,'The selected mark must stay in the central viewing plane');
 await map.getByRole('link',{name:/06 — Koicha/}).click();
 assert.match(page.url(),/#scene-6$/);
 assert.equal(await page.locator('[data-world-scene]:visible').getAttribute('data-world-label'),'Koicha');
 await page.locator('[data-world-scene]:visible .archive-image-link').click();
 assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('world-focus')),true,'A mark can still be inspected without leaving its world');
}));

test('Karnevalen reads as a chaptered brand bible with a page edge',()=>run(async page=>{
 await page.goto(base+'work/graphic-design/karnevalen/');
 assert.equal(await page.locator('body').getAttribute('data-world-layout'),'reader');
 assert.equal(await page.locator('[data-world-scene]').count(),24);
 assert.equal(await page.locator('[data-world-scene]:visible').count(),1);
 const chapters=page.locator('.world-chapters');
 assert.equal(await chapters.isVisible(),true);
 assert.deepEqual(await chapters.locator('a').allTextContents(),['Story','Visual language','Content','Manual']);
 const edge=page.locator('.world-nav--reader');
 assert.equal(await edge.isVisible(),true);
 assert.equal(await edge.locator('a').count(),24);
 assert.equal(await edge.locator('img:visible').count(),0,'The page edge must not become another thumbnail grid');
 await chapters.getByRole('link',{name:'Content'}).click();
 assert.match(page.url(),/#scene-16$/);
 assert.equal(await page.locator('[data-world-scene]:visible').getAttribute('data-world-label'),'Page 16');
 assert.equal(await chapters.getByRole('link',{name:'Content'}).getAttribute('aria-current'),'true');
 await edge.getByRole('link',{name:/24 — Page 24/}).click();
 assert.match(page.url(),/#scene-24$/);
 const image=await page.locator('[data-world-scene]:visible img').boundingBox();
 const stage=await page.locator('[data-world-stage]').boundingBox();
 assert.ok(image.y>=stage.y&&image.y+image.height<=stage.y+stage.height-40,'The full publication page must stay above its edge index');
}));

test('Landscape worlds keep their mobile navigator attached to the artwork',()=>run(async page=>{
 await page.setViewportSize({width:390,height:844});
 for(const [route,navSelector] of [
  ['event-festival/#scene-2','.world-nav--campaign'],
  ['logofolio/#scene-6','.world-nav--constellation'],
  ['karnevalen/#scene-16','.world-nav--reader']
 ]){
  await page.goto(base+'work/graphic-design/'+route);
  await page.waitForFunction(()=>document.querySelector('[data-project-world]')?.hasAttribute('data-world-ready'));
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const image=page.locator('[data-world-scene]:visible img');
  await image.evaluate(img=>img.complete?true:new Promise(resolve=>img.addEventListener('load',()=>resolve(true),{once:true})));
  await page.waitForFunction(({navSelector})=>{
   const media=[...document.querySelectorAll('[data-world-scene] img')].find(img=>{const r=img.getBoundingClientRect(),s=getComputedStyle(img);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';});
   const nav=document.querySelector(navSelector);if(!media||!nav)return false;
   const m=media.getBoundingClientRect(),n=nav.getBoundingClientRect();
   return n.y>=m.y+m.height-4&&n.y<=m.y+m.height+40;
  },{navSelector},{timeout:3000});
  const media=await image.boundingBox();
  const nav=await page.locator(navSelector).boundingBox();
  assert.ok(nav.y>=media.y+media.height-4&&nav.y<=media.y+media.height+40,`${route} navigator must follow its landscape artwork without a dead band`);
 }
}));

test('Project scenes support keyboard, URL history and no-JS access',async t=>{
 await t.test('enhanced navigation',()=>run(async page=>{
  await page.goto(base+'work/graphic-design/textur/#scene-4');
  assert.equal(await page.evaluate(()=>scrollY),0,'Direct scene links must open at the project perimeter, not crop the canvas');
  await page.goto(base+'work/graphic-design/textur/');
  const first=await page.locator('[data-world-scene]:visible img').getAttribute('src');
  await page.keyboard.press('ArrowRight');
  assert.match(page.url(),/#scene-2$/);
  assert.notEqual(await page.locator('[data-world-scene]:visible img').getAttribute('src'),first);
  await page.goBack();await page.waitForFunction(()=>!location.hash);
  assert.equal(await page.locator('[data-world-scene]:visible img').getAttribute('src'),first);
 }));
 await t.test('fallback',()=>run(async page=>{
  await page.goto(base+'work/graphic-design/textur/');
  assert.equal(await page.locator('[data-world-scene]:visible').count(),6);
 },{javaScriptEnabled:false}));
});

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

test('Inner pages load one versioned landscape canvas stylesheet last and remove ambient controls',()=>run(async page=>{
 await page.addInitScript(()=>localStorage.setItem('ass-theme','dark'));
 for(const route of ['work/','design/','about/','contact/','ai-labs/','work/agoos/','work/growth-toolbox/']){
  await page.goto(base+route);
  const styles=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  assert.match(styles.at(-1),/editorial\.css\?v=6$/,'The canvas stylesheet must load after page-specific CSS');
  assert.equal(await page.locator('[data-theme-toggle],[data-sound-toggle]').count(),0,'Inner pages have no homepage ambience controls');
  const colors=await page.evaluate(()=>({body:getComputedStyle(document.body).backgroundColor,main:getComputedStyle(document.querySelector('main')).backgroundColor,bar:document.querySelector('.window-bar')?.textContent||''}));
  assert.doesNotMatch(colors.bar,/\bASS\b/i,'Never use the owner’s initials as a brand label');
  assert.doesNotMatch(colors.body,/rgb\((?:0|8), (?:0|9), (?:0|8)\)/);
  assert.doesNotMatch(colors.main,/rgb\((?:0|8), (?:0|9), (?:0|8)\)/);
 }
}));

test('Large desktop uses a capped exhibition canvas and restrained scale',()=>run(async page=>{
 await page.goto(base+'work/');
 const shell=await page.evaluate(()=>{const main=document.querySelector('main').getBoundingClientRect(),title=document.querySelector('h1').getBoundingClientRect(),header=document.querySelector('.window-bar').getBoundingClientRect(),close=getComputedStyle(document.querySelector('.window-close'));return {main,title,header,globalLinks:document.querySelectorAll('.section-menu nav a').length,closeFont:parseFloat(close.fontSize)};});
 assert.ok(shell.main.width<=1600,'Canvas content is capped on large monitors');
 assert.ok(shell.main.left>=100&&shell.main.right<=2460,'Canvas remains centred');
 assert.ok(shell.title.height<100,'Section title is restrained');
 assert.equal(shell.globalLinks,0);
 assert.ok(shell.closeFont>=14,'Window actions remain readable on a large monitor');
 for(const card of await page.locator('[data-work-item]').all()){const r=await card.boundingBox();assert.ok(r.y<1200,'All projects remain immediately discoverable');}
},{viewport:{width:2560,height:1440}}));

test('Desktop section navigation remains usable without JavaScript',()=>run(async page=>{
 await page.goto(base+'design/');
 await page.locator('.window-bar [data-window-close]').click();await page.waitForURL('**/#navigation');
 await page.locator('a[data-star][href="about/"]').click();await page.waitForURL('**/about/');
 assert.match(await page.locator('main').innerText(),/Understand the problem/);
},{javaScriptEnabled:false}));

test('Section shell is one landscape glass window with normal document scrolling',()=>run(async page=>{
 await page.goto(base+'work/');
 const style=await page.evaluate(()=>{const main=getComputedStyle(document.querySelector('main')),frame=getComputedStyle(document.querySelector('.site-frame'));return{mainBg:main.backgroundColor,position:main.position,mainRadius:main.borderRadius,frameRadius:frame.borderRadius,blur:frame.backdropFilter||frame.webkitBackdropFilter};});
 assert.equal(style.mainBg,'rgba(0, 0, 0, 0)');
 assert.notEqual(style.position,'fixed');assert.equal(style.mainRadius,'0px');
 assert.equal(style.frameRadius,'0px');assert.notEqual(style.blur,'none');
 assert.equal(await page.locator('.section-menu').count(),0);
 assert.equal(await page.locator('.window-bar [data-window-close]').count(),1);
 assert.equal(await page.locator('[data-landscape-motion]').count(),0,'Reduced-motion test context keeps the static poster and needs no pause control');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflowY),'auto');
}));
