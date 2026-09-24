import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

async function run(fn,{javaScriptEnabled=true,viewport={width:1440,height:900}}={}){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport,reducedMotion:'reduce',javaScriptEnabled});
  await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await fn(page);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}

test('Design presents branding as the foundation of the current practice',()=>run(async page=>{
 for(const route of ['design/','work/graphic-design/']){
  await page.goto(base+route);
  const intro=await page.locator('.archive-intro').innerText();
  assert.match(intro,/journey.*started.*branding/is);
  assert.match(intro,/marketing/i);
  assert.match(intro,/AI/i);
  assert.match(intro,/design.*brand/is);
  assert.equal(await page.locator('.archive-card').count(),5);
 }
}));

test('Work is a seven-entry practice map with optional exclusive depth',()=>run(async page=>{
 await page.goto(base+'work/');
 const entries=page.locator('[data-practice-map] [data-work-item]');
 assert.equal(await entries.count(),7);
 const expected=['Agoos Apparel','Weekender','Noisey Neighbours','Personal brand consulting','Ghostwriting','Karnevalen campaign','Growth Toolbox'];
 assert.deepEqual(await entries.locator('summary h2').allTextContents(),expected);
 assert.equal(await entries.locator('details').count(),0,'Each work item is itself the progressive disclosure control');
 for(const entry of await entries.all()) assert.equal(await entry.evaluate(n=>n.open),false);
 await entries.nth(2).locator('summary').click();
 assert.equal(await entries.nth(2).evaluate(n=>n.open),true);
 await entries.nth(4).locator('summary').click();
 assert.equal(await entries.nth(2).evaluate(n=>n.open),false,'Opening a story should close the previous one');
 assert.equal(await entries.nth(4).evaluate(n=>n.open),true);
 assert.match(await entries.nth(4).innerText(),/\$200k\+/i);
 assert.match(await entries.nth(4).innerText(),/NDA/i);
}));

test('Work remains readable without JavaScript',()=>run(async page=>{
 await page.goto(base+'work/');
 const entries=page.locator('[data-practice-map] [data-work-item]');
 assert.equal(await entries.count(),7);
 await entries.nth(3).locator('summary').click();
 assert.match(await entries.nth(3).innerText(),/seven months/i);
},{javaScriptEnabled:false}));

test('Noisey Neighbours tells the origin and full operating story without invented metrics',()=>run(async page=>{
 await page.goto(base+'work/noisey-neighbours/');
 assert.equal(await page.getByRole('heading',{name:'Noisey Neighbours',exact:true}).count(),1);
 const copy=await page.locator('main').innerText();
 assert.match(copy,/800 kilos/i);
 assert.match(copy,/Stockholm.*rave/is);
 assert.match(copy,/branding/i);
 assert.match(copy,/finance/i);
 assert.match(copy,/logistics/i);
 assert.match(copy,/door.*bar.*wardrobe/is);
 assert.match(copy,/own music/i);
 assert.equal(await page.locator('[data-event-stage]').count(),5);
 assert.doesNotMatch(copy,/\b\d{3,}\s+(guests|attendees|tickets)\b/i);
 assert.ok(await page.getByRole('link',{name:'Back to Work',exact:true}).count()>=1);
}));

test('Karnevalen campaign connects the creative system to sourced results',()=>run(async page=>{
 await page.goto(base+'work/karnevalen-campaign/');
 assert.equal(await page.getByRole('heading',{name:'Karnevalen',exact:true}).count(),1);
 const copy=await page.locator('main').innerText();
 for(const fact of ['82 videos','six weeks','330,000+','108,000','77%','4,494','427']) assert.match(copy,new RegExp(fact.replace('+','\\+'),'i'));
 assert.match(copy,/3,000 streams.*(?:7|seven) days/is);
 assert.match(copy,/17 days/i);
 assert.match(copy,/200\+ days/i);
 assert.match(copy,/campaign results deck/i);
 assert.equal(await page.locator('[data-funnel-step]').count(),3);
 assert.equal(await page.locator('[data-release-comparison]').count(),3);
 assert.ok(await page.locator('a[href="../graphic-design/karnevalen/"]').count()>=1);
}));

test('AI Labs explains the real workflow with expandable what and why',()=>run(async page=>{
 await page.goto(base+'ai-labs/');
 assert.equal(await page.locator('[data-mindmap]').count(),1);
 assert.doesNotMatch(await page.locator('main').innerText(),/genius/i);
 await page.getByRole('link',{name:/Hermes system permalink/i}).click();
 await page.waitForURL('**/ai-labs/hermes-system/');
 assert.equal(await page.getByRole('heading',{name:'AI, organised around the work.',exact:true}).count(),1);
 for(const node of await page.locator('.mind-node').all()) await node.locator('summary').click();
 const copy=await page.locator('main').innerText();
 for(const name of ['Jarvis','Hermes','Hindsight','QMD','Skills & tools','Researcher','Builder','Critic','Learning coach','Coding loop','Gauntlet loop','Model choice']) assert.ok(copy.includes(name),name);
 assert.equal(await page.locator('.mind-node[open]').count(),12);
 assert.equal(await page.locator('.mind-detail b').filter({hasText:'Why'}).count(),12);
 assert.match(copy,/not always-on bots/i);
 assert.match(copy,/Publishing is a separate decision/i);
 assert.match(copy,/PHASE visual workflow/i);
 assert.doesNotMatch(copy,/api[_ -]?key|token\s*=|password|\/Users\/|\.env/i);
 assert.equal(await page.locator('a[href^="https://hermes-agent.nousresearch.com/docs"]').count(),1);
}));

test('Narrative case studies keep their atmosphere and fit a mobile viewport',()=>run(async page=>{
 const cases=[
  ['work/noisey-neighbours/','rgb(17, 17, 15)'],
  ['work/karnevalen-campaign/','rgb(247, 237, 84)'],
  ['ai-labs/hermes-system/','rgba(0, 0, 0, 0)']
 ];
 for(const [route,background] of cases){
  await page.goto(base+route);
  const state=await page.evaluate(()=>({background:getComputedStyle(document.querySelector('main')).backgroundColor,width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.equal(state.background,background,`${route} must keep its project atmosphere`);
  assert.ok(state.width<=state.viewport+1,`${route} must not overflow horizontally`);
 }
},{viewport:{width:390,height:844}}));

test('Work uses project-specific invitations and color-coded skills instead of interface labels',()=>run(async page=>{
 await page.goto(base+'work/');
 assert.equal(await page.getByText(/^Explore\b/i).count(),0);
 const invitations=['See the clothes, prints and process','Try the working app','Go inside the nights','See the six-week campaign','Browse the coursework'];
 for(const label of invitations) assert.equal(await page.getByText(label,{exact:false}).count(),1,label);
 const entries=page.locator('[data-work-item]');
 assert.equal(new Set(await entries.evaluateAll(nodes=>nodes.map(n=>n.dataset.projectTone))).size,7);
 const skills=page.locator('.practice-skills li');
 assert.ok(await skills.count()>20);
 assert.ok(new Set(await skills.evaluateAll(nodes=>nodes.map(n=>n.dataset.skillTone))).size>=5);
 for(const skill of await skills.all()){
  const style=await skill.evaluate(n=>({border:getComputedStyle(n).borderTopWidth,background:getComputedStyle(n).backgroundColor}));
  assert.equal(style.border,'0px');
  assert.notEqual(style.background,'rgba(0, 0, 0, 0)');
 }
}));
