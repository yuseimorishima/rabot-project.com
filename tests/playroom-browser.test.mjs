import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium} = createRequire(import.meta.url)('playwright');
const base = process.env.PLAYROOM_TEST_URL || 'http://127.0.0.1:8788';

test('sprite, clothing recolor, persistence and care', {timeout: 120000}, async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1000}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { Math.random = () => .82; });
    await page.goto(base + '/videos'); await page.waitForLoadState('networkidle');
    await page.locator('#photo-search').fill('ひみつのへや'); await page.locator('#photo-search-form button').click();
    await page.waitForURL(/\/playroom(?:\.html)?$/);
    await page.waitForSelector('[data-sprite-ready="true"]');
    assert(await page.locator('.room-character img').evaluate(img => img.naturalWidth > 0));
    await page.locator('#draw-outfit').click(); assert.match(await page.locator('#gacha-result').innerText(), /ほしぞら/);
    await page.locator('#wear-new').click();
    assert.equal(await page.locator('.room-character .room-color').isVisible(), true);
    const samples = await page.locator('.room-character').evaluate(el => {
      const output = el.querySelector('.room-color'), img = el.querySelector('img');
      const original = document.createElement('canvas'); original.width = output.width; original.height = output.height;
      const ctx = original.getContext('2d'); ctx.drawImage(img,0,0,output.width,output.height);
      const pixel = (context,x,y) => [...context.getImageData(Math.floor(output.width*x),Math.floor(output.height*y),1,1).data];
      const out = output.getContext('2d');
      return {face:pixel(out,.5,.42), originalFace:pixel(ctx,.5,.42), cloth:pixel(out,.5,.65), originalCloth:pixel(ctx,.5,.65)};
    });
    assert.deepEqual(samples.face, samples.originalFace); assert.notDeepEqual(samples.cloth, samples.originalCloth);
    await page.reload(); await page.waitForSelector('[data-sprite-ready="true"]');
    assert.match(await page.locator('#wearing-label').innerText(), /ほしぞら/);
    await page.locator('#home-pet').click();
    await page.locator('#pet').click(); assert.match(await page.locator('#room-message').innerText(), /ぽかぽか/);
    await page.waitForTimeout(900);
    await page.locator('[data-outfit="milk"]').click();
    assert.equal(await page.locator('.room-character .room-color').isHidden(), true);
    await page.evaluate(() => document.activeElement.blur());
    await page.screenshot({path:'/tmp/playroom-sprite-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:'/tmp/playroom-sprite-mobile.png',fullPage:true});
    await page.locator('#reset').click(); await page.locator('#reset-form button[type="submit"]').click();
    assert.equal(await page.locator('#coin-count').innerText(), '6');
    assert.equal(await page.locator('#collection-count').innerText(), '1 / 11');
    assert.deepEqual(errors, []);
    const fallback = await browser.newPage();
    await fallback.route('**/playroom-sprite.js', route => route.abort());
    await fallback.goto(base + '/playroom');
    await fallback.waitForFunction(() => document.querySelector('#sprite-status').textContent.length);
    assert(await fallback.locator('.room-character img').isVisible());
    await fallback.locator('[data-action="play"]').click();
    assert.match(await fallback.locator('#room-message').innerText(), /たのしい/);
  } finally { await browser.close(); }
});

test('relief motion responds to calling, pointer, floor and pause; respects reduced motion', {timeout:120000}, async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/playroom');await page.waitForSelector('.has-depth');
    const initial=await page.locator('#pet').boundingBox();
    await page.locator('#call-pet').click();await page.waitForTimeout(1300);
    const closer=await page.locator('#pet').boundingBox();assert(closer.width>initial.width*1.04);
    const before=await page.locator('.room-motion').evaluate(c=>c.toDataURL());
    const room=await page.locator('.room-scene').boundingBox();
    await page.mouse.move(room.x+room.width*.95,room.y+room.height*.4);await page.waitForTimeout(500);
    assert.notEqual(await page.locator('.room-motion').evaluate(c=>c.toDataURL()),before);
    await page.locator('#pause-motion').click();
    const paused=await page.locator('.room-motion').evaluate(c=>c.toDataURL());
    await page.mouse.move(room.x+20,room.y+200);await page.waitForTimeout(250);
    assert.equal(await page.locator('.room-motion').evaluate(c=>c.toDataURL()),paused);
    assert.equal(await page.locator('.room-scene').getAttribute('data-motion'),'paused');
    await page.locator('#pause-motion').click();
    await page.mouse.click(room.x+room.width*.9,room.y+room.height*.88);await page.waitForTimeout(1100);
    assert(Number.parseFloat(await page.locator('#pet').evaluate(el=>el.style.getPropertyValue('--walk-x')))>20);
    await page.locator('#home-pet').click();await page.waitForTimeout(900);
    assert(Math.abs(Number.parseFloat(await page.locator('#pet').evaluate(el=>el.style.getPropertyValue('--walk-x'))))<3);
    assert.deepEqual(errors,[]);
    const still=await browser.newPage({reducedMotion:'reduce'});
    await still.goto(base+'/playroom');await still.waitForSelector('.has-depth');await still.waitForTimeout(100);
    const quiet=await still.locator('.room-motion').evaluate(c=>c.toDataURL());await still.waitForTimeout(300);
    assert.equal(await still.locator('.room-motion').evaluate(c=>c.toDataURL()),quiet);
    await still.locator('#call-pet').click();await still.waitForTimeout(100);
    assert.equal(Number.parseFloat(await still.locator('#pet').evaluate(el=>el.style.getPropertyValue('--depth-scale'))),1.07);
    await still.setViewportSize({width:390,height:844});assert(await still.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const fallback=await browser.newPage();await fallback.route('**/playroom-motion.js',route=>route.abort());
    await fallback.goto(base+'/playroom');await fallback.waitForSelector('[data-sprite-ready="true"]');
    await fallback.locator('#pet').click();assert.match(await fallback.locator('#room-message').innerText(),/ぽかぽか/);
    assert(await fallback.locator('#pause-motion').isHidden());
  }finally{await browser.close();}
});
