// Run: PLAYWRIGHT_PATH=/path/to/playwright/index.js node --test tests/orbit.browser.mjs
import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

test('Keypad rejects wrong codes, supports erase and keyboard, opens an empty room',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(base+'redacted/');
  assert.equal(await page.locator('[data-keypad]').count(),1,'Keypad is available');
  for(let i=0;i<6;i++) await page.getByRole('button',{name:'0',exact:true}).click();
  await page.getByRole('button',{name:'Enter',exact:true}).click();
  assert.match(await page.locator('[data-keypad-status]').innerText(),/Not recognised/);
  await page.getByRole('button',{name:'7',exact:true}).click();
  await page.getByRole('button',{name:'Delete digit',exact:true}).click();
  assert.equal(await page.locator('[data-code-display]').getAttribute('aria-label'),'0 of 6 digits entered');
  await page.keyboard.type('777111');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-keypad]').isVisible(),false);
  assert.equal(await page.locator('[data-empty-room]').isVisible(),true);
  assert.equal(await page.locator('[data-empty-room]').innerText(),'');
  await page.reload();
  assert.equal(await page.locator('[data-keypad]').isVisible(),true,'Refresh relocks the decorative gate');
 } finally {await browser.close();}
});

test('Sections expose Weekender, preserved Design collections and a draft Approach',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(base+'work/');
  assert.equal(await page.getByRole('heading',{name:'Weekender',exact:true}).count(),1,'Work must feature Weekender');
  assert.equal(await page.locator('[data-work-item]').count(),2,'Weekender and Growth Toolbox are the two current entries');
 assert.equal(await page.locator('a[href="growth-toolbox/"]').count(),1);
  assert.equal(await page.locator('a[href="https://weekender.arvidscarff.workers.dev"]').count(),1);
  await page.goto(base+'design/');
  assert.equal(await page.locator('.archive-card').count(),5,'Design must expose all five collections');
  for(const link of await page.locator('.archive-card').all()) {
   const response=await page.request.get(new URL(await link.getAttribute('href'),page.url()).href);
   assert.equal(response.status(),200);
  }
  await page.goto(base+'approach/');
  assert.match(await page.locator('main').innerText(),/Draft for review/);
  await page.goto(base+'about/');
  assert.match(await page.locator('main').innerText(),/graphic design/i);
  assert.doesNotMatch(await page.locator('main').innerText(),/to be added/i);
  await page.goto(base+'contact/');
  assert.equal(await page.locator('a[href="mailto:arvidscarff@gmail.com"]').count(),1);
  await page.getByRole('link',{name:'Index',exact:true}).click();
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
 } finally {await browser.close();}
});

test('First star activation reveals six destinations without navigating; eagle collapses',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(base);
  const stars=page.locator('[data-star]');
  assert.equal(await stars.count(),6,'Six orbiting stars must be present');
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'closed');
  await stars.first().click();
  assert.equal(page.url(),base,'First click must not navigate');
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'open');
  assert.deepEqual(await stars.locator('.star-label').allTextContents(),['work','approach','design','about','contact','[redacted]']);
  for(const label of await stars.locator('.star-label').all()) assert.equal(await label.evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.locator('[data-eagle]').click();
  assert.equal(await page.locator('[data-orbit]').getAttribute('data-state'),'closed');
 } finally {await browser.close();}
});
