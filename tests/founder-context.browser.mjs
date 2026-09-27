import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:5190/';

test('Visual AI project connects relevant past work to an honest early-stage invitation',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const javaScriptEnabled of [false,true]) for(const width of [390,1440,2560]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',javaScriptEnabled});
   await page.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'ai-labs/visual-ai-environment/');
   const context=page.getByRole('region',{name:'What I bring to this'});
   assert.equal(await context.count(),1);
   const text=await context.innerText();
   assert.match(text,/joined.*art director.*later.*ran/is);
   assert.match(text,/finance.*logistics/is);
   assert.match(text,/content strategy.*offers/is);
   assert.doesNotMatch(text,/Jesper|\$200|exit|founded Agoos/i);
   for(const route of ['agoos','noisey-neighbours','personal-brand-consulting']){
    const link=context.locator(`a[href="../../work/${route}/"]`);
    assert.equal(await link.count(),1);
    const response=await page.request.get(await link.getAttribute('href').then(h=>new URL(h,page.url()).href));
    assert.equal(response.status(),200);
   }
   const invite=page.getByRole('link',{name:'Talk about the project'});
   await invite.click();
   assert.equal(new URL(page.url()).pathname,new URL(base+'contact/').pathname);
   await page.goBack();
   assert.match(await page.locator('main').innerText(),/not a finished app/i);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }finally{await browser.close();}
});
