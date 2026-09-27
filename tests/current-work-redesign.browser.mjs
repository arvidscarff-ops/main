import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:5191/';
const evidence = process.env.EVIDENCE_DIR;
const sizes = [[320,568],[390,844],[844,390],[1440,900],[2560,1440]];
const markers = page => page.locator('[data-current-project]').evaluateAll(links=>links.map(link=>{
  const style=getComputedStyle(link,'::before');
  return {color:style.backgroundColor,content:style.content,width:parseFloat(style.width),height:parseFloat(style.height),animation:style.animationName,duration:parseFloat(style.animationDuration),state:style.animationPlayState,shadow:style.boxShadow};
}));
test('Projects have distinct restrained accent marks with slow idle animation',()=>run(async page=>{
  const styles=await markers(page);
  assert.equal(new Set(styles.map(style=>style.color)).size,3,'Each project has its own accent');
  for(const style of styles){
    assert.notEqual(style.content,'none');
    assert.ok(style.width<=4 && style.height<=20,'Accent is a small mark, not a glowing tile');
    assert.notEqual(style.animation,'none');
    assert.ok(style.duration>=8,'Idle motion has an unhurried cycle');
    assert.equal(style.shadow,'none');
  }
  const opacities=await page.locator('[data-current-work]').evaluate(el=>{
    const animations=el.getAnimations({subtree:true});
    return animations.map(animation=>{
      animation.pause();animation.currentTime=0;
      const target=animation.effect.target;
      const first=getComputedStyle(target,'::before').opacity;
      animation.currentTime=animation.effect.getTiming().duration/2;
      return [first,getComputedStyle(target,'::before').opacity];
    });
  });
  assert.ok(opacities.some(([a,b])=>a!==b),'Rendered marker opacity actually changes');
},{reducedMotion:'no-preference'}));
test('Reduced-motion and the existing Pause motion control stop widget idle animation',()=>run(async page=>{
  await page.locator('[data-motion-toggle]').click();
  assert.ok((await markers(page)).every(style=>style.state==='paused'),'Pause applies to widget motion too');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok((await markers(page)).every(style=>style.animation==='none'),'Reduced motion disables all marker animations');
},{reducedMotion:'no-preference'}));
test('Light theme supplies a readable light widget with distinct accents',()=>run(async page=>{
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  const colors=await page.locator('[data-current-work]').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  const channels=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
  assert.ok(channels(colors.background).every(channel=>channel>=220),'Light theme uses a light surface');
  assert.ok(channels(colors.color).every(channel=>channel<100),'Light theme uses dark reading text');
  assert.equal(new Set((await markers(page)).map(style=>style.color)).size,3);
  if(evidence){await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/current-work-light-1440x900.png`});}
}));
test('Dark theme preserves ordinary links and hover previews',()=>run(async page=>{
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  const widget=page.locator('[data-current-work]');
  const background=await widget.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.ok(background.match(/[\d.]+/g).slice(0,3).map(Number).every(channel=>channel<50));
  await page.locator('[data-home-logo]').click();
  await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
  const link=page.locator('[data-current-project]').first();
  assert.equal(await link.getAttribute('href'),'ai-labs/visual-ai-environment/');
  await link.hover();
  await page.locator('[data-project-preview]:not([hidden])').waitFor();
  assert.equal(await page.locator('[data-project-preview] figcaption').textContent(),'Visual AI environment');
  if(evidence){await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/current-work-dark-preview-1440x900.png`});}
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-project-preview]').isHidden(),true);
}));
async function run(fn, options = {}) {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:'reduce', ...options });
    await page.goto(base);
    await page.locator('[data-current-work-toggle]:not([hidden])').waitFor();
    await fn(page);
  } finally { await browser.close(); }
}
async function expand(page) {
  const toggle = page.locator('[data-current-work-toggle]');
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
}
for (const [width,height] of sizes) {
  test(`Compact widget preserves readable touch targets and navigation at ${width}×${height}`, () => run(async page => {
    await expand(page);
    const widget = page.locator('[data-current-work]');
    const box = await widget.boundingBox();
    assert.ok(box.width <= 264, `Widget width ${box.width} exceeds compact 264px bound`);
    assert.ok(box.height <= 194, `Widget height ${box.height} exceeds compact 194px bound`);
    const toggle = await page.locator('[data-current-work-toggle]').boundingBox();
    assert.ok(toggle.width >= 44 && toggle.height >= 44, 'Collapse retains a 44px target');
    const rows = await page.locator('[data-current-project]').evaluateAll(links => links.map(link => {
      const box=link.getBoundingClientRect();
      return {height:box.height, text:[...link.querySelectorAll('strong, a>span>span')].map(el=>({text:el.textContent,scroll:el.scrollWidth,width:el.clientWidth,font:parseFloat(getComputedStyle(el).fontSize)}))};
    }));
    assert.equal(rows.length,3);
    for (const row of rows) {
      assert.ok(row.height >= 44, 'Project target remains at least 44px');
      for (const text of row.text) {
        assert.ok(text.scroll <= text.width, `No clipped project copy: ${text.text}`);
        assert.ok(text.font >= 12, 'Readable project text');
      }
    }
    await page.locator('[data-home-logo]').click();
    await page.waitForFunction(()=>document.querySelector('[data-orbit]').dataset.state==='open');
    const geometry = await page.evaluate(()=>({widget:document.querySelector('[data-current-work]').getBoundingClientRect().toJSON(), stars:[...document.querySelectorAll('[data-star]')].map(el=>el.getBoundingClientRect().toJSON()),width:innerWidth,scroll:document.documentElement.scrollWidth}));
    for (const star of geometry.stars) assert.ok(geometry.widget.bottom+8<=star.top || geometry.widget.right+8<=star.left || geometry.widget.left>=star.right+8, 'Expanded widget leaves navigation clear');
    assert.ok(geometry.widget.left>=8 && geometry.widget.right<=width-8 && geometry.scroll<=width);
    if (evidence) {
      await mkdir(evidence,{recursive:true});
      await page.screenshot({path:`${evidence}/current-work-${width}x${height}.png`});
      await widget.screenshot({path:`${evidence}/current-work-detail-${width}x${height}.png`});
    }
    for(const row of await page.locator('[data-current-project]').all()) {
      await row.focus();
      const visible=await row.evaluate(el=>{
        const row=el.getBoundingClientRect(), list=el.closest('[data-current-work-list]').getBoundingClientRect();
        return row.top>=list.top-1 && row.bottom<=list.bottom+1;
      });
      assert.ok(visible,'Every project can be fully revealed by keyboard in constrained-height lists');
    }
    if(evidence && height<600) await page.screenshot({path:`${evidence}/current-work-scrolled-${width}x${height}.png`});
    await page.locator('[data-current-work-toggle]').click();
    assert.ok((await widget.boundingBox()).height<=48, 'Minimized widget is one compact line');
    await page.reload();
    assert.equal(await widget.getAttribute('data-state'),'minimized', 'Existing session persistence survives');
  }, {viewport:{width,height}}));
}
