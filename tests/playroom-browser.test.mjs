import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url)('playwright');
const base = process.env.PLAYROOM_TEST_URL || 'http://127.0.0.1:8788';

test('3D room, care reactions, collection and fallback', {timeout: 120000}, async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { Math.random = () => .85; });
    await page.goto(base + '/videos'); await page.waitForLoadState('networkidle');
    await page.locator('#photo-search').fill('ひみつのへや'); await page.locator('#photo-search-form button').click();
    await page.waitForURL(/\/playroom(?:\.html)?$/);
    await page.waitForSelector('.has-pet-stage');
    await page.waitForFunction(() => document.querySelector('#pet-stage').dataset.motion);
    await page.locator('#call-pet').click();
    await page.waitForFunction(() => document.querySelector('#pet-stage').dataset.motion === 'call');
    await page.locator('[data-action="pet"]').click();
    await page.waitForFunction(() => document.querySelector('#pet-stage').dataset.motion === 'pet');
    await page.locator('#draw-outfit').click(); assert.match(await page.locator('#gacha-result').innerText(), /うさぎのしろ/);
    await page.locator('#wear-new').click();
    assert.equal(await page.locator('.room-character').getAttribute('data-shape'), 'bunny');
    await page.reload(); await page.waitForSelector('.has-pet-stage');
    assert.match(await page.locator('#wearing-label').innerText(), /うさぎのしろ/);
    await page.locator('#turn-pet').click(); assert.equal(await page.locator('#turn-pet').getAttribute('aria-pressed'), 'true');
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: '/tmp/playroom-3d-mobile.png', fullPage: true});
    await page.setViewportSize({width: 1280, height: 1000});
    await page.locator('#call-pet').click();
    await page.waitForTimeout(1000);
    await page.screenshot({path: '/tmp/playroom-3d-desktop.png', fullPage: true});
    // Loss of graphics support must keep the accessible care button usable.
    await page.evaluate(() => document.querySelector('#pet-stage canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForSelector('.room-scene:not(.has-pet-stage)');
    await page.locator('#pet').click(); assert.match(await page.locator('#room-message').innerText(), /ぽかぽか/);
    assert.deepEqual(errors, []);
    const fallback = await browser.newPage();
    await fallback.route('**/playroom-pet.js', route => route.abort());
    await fallback.goto(base + '/playroom');
    await fallback.waitForFunction(() => document.querySelector('#turn-pet').disabled);
    await fallback.locator('[data-action="play"]').click();
    assert.match(await fallback.locator('#room-message').innerText(), /たのしい/);
    const still = await browser.newPage({reducedMotion: 'reduce'});
    await still.goto(base + '/playroom'); await still.waitForSelector('.has-pet-stage');
    await still.locator('#turn-pet').click(); assert.equal(await still.locator('#turn-pet').getAttribute('aria-pressed'), 'true');
  } finally { await browser.close(); }
});
