import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:5190/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('Approved TXT links return and download the exact source bytes', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({reducedMotion:'reduce'});
    await page.route(/googletagmanager\.com|google-analytics\.com/, route => route.abort());
    assert.equal((await page.goto(base + 'work/growth-toolbox/')).status(), 200);
    await page.locator('.assignment-index a[href="#scraping"]').click();
    for (const name of ['foretag.txt', 'scraper.txt']) {
      const link = page.locator(`#scraping a[download][href="../../scraping/${name}"]`);
      const url = await link.evaluate(a => a.href);
      assert.equal(url, base + 'scraping/' + name);
      const expected = sha(await readFile(new URL('../scraping/' + name, import.meta.url)));
      const response = await page.request.get(url);
      assert.equal(response.status(), 200);
      assert.equal(sha(await response.body()), expected);
      const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
      assert.equal(await download.failure(), null);
      assert.equal(download.suggestedFilename(), name);
      assert.equal(sha(await readFile(await download.path())), expected);
      console.log(JSON.stringify({url, status:response.status(), sha256:expected, clickedDownload:true}));
    }
  } finally { await browser.close(); }
});

test('Portfolio route displays the live Weekender iframe and responsive fallback', async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({reducedMotion:'reduce'});
    await page.route(/googletagmanager\.com|google-analytics\.com/, route => route.abort());
    await page.goto(base + 'work/growth-toolbox/');
    await page.locator('.assignment-index a[href="#mashup"]').click();
    await page.locator('a[href="weekender/"]').click();
    await page.waitForURL(base + 'work/growth-toolbox/weekender/');
    const frame = page.frameLocator('iframe[title="Weekender live API app"]');
    await frame.getByRole('button').first().waitFor({state:'visible', timeout:30000});
    assert.match(await frame.locator('body').innerText(), /weekender/i);
    assert.ok(await frame.getByRole('button').count() > 0, 'Real app controls load, not an error document');
    const status = await page.request.get('https://weekender.arvidscarff.workers.dev/api/status');
    assert.equal(status.status(), 200);
    const data = await status.json();
    assert.equal(typeof data.live, 'boolean');
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      await page.waitForFunction(() => {
        const box = document.querySelector('iframe[title="Weekender live API app"]').getBoundingClientRect();
        return box.width > 200 && box.width <= innerWidth;
      });
      const box = await page.locator('iframe[title="Weekender live API app"]').boundingBox();
      assert.ok(box.width > 200 && box.width <= width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.equal(await page.getByRole('link', {name:'Open Weekender directly if the embedded app is unavailable ↗'}).getAttribute('href'), 'https://weekender.arvidscarff.workers.dev');
    await page.getByRole('link', {name:'← Back to Growth Toolbox',exact:true}).click();
    await page.waitForURL(base + 'work/growth-toolbox/#mashup');
    console.log(JSON.stringify({portfolio:base + 'work/growth-toolbox/weekender/', apiStatus:status.status(), live:data.live, iframeLoaded:true, responsiveWidths:[390,1440]}));
  } finally { await browser.close(); }
});
