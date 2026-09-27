import { webkit } from 'playwright';
import assert from 'node:assert/strict';

const url = 'https://www.dgmc-ai-consultancy.com/play/harvey';
const browser = await webkit.launch({ headless: true });
try {
  for (const { name, viewport } of [
    { name: 'phone', viewport: { width: 390, height: 844 } },
    { name: 'iPad', viewport: { width: 820, height: 1180 } },
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    assert.match(page.url(), /dgmc-ai\.github\.io\/harvey-space-invaders/);
    assert.match(await page.title(), /Harvey's Space Invaders/);
    assert.equal(await page.locator('#game').count(), 1);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      canvas: document.querySelector('#game').getBoundingClientRect().width,
    }));
    assert.ok(layout.scroll <= layout.viewport + 1, name + ' horizontal overflow');
    assert.ok(layout.canvas <= layout.viewport, name + ' canvas overflow');
    await page.locator('#start').click();
    assert.equal(await page.locator('#start').textContent(), 'RESTART GAME');
    const audio = await page.evaluate(() => ({ created: !!window.audio || typeof audio !== 'undefined' && !!audio, state: typeof audio !== 'undefined' ? audio?.state : null }));
    assert.ok(audio.created, name + ' audio context missing');
    assert.equal(audio.state, 'running', name + ' audio not unlocked after tap');
    const before = await page.evaluate(() => player.x);
    const left = await page.locator('#left').boundingBox();
    await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.up();
    const after = await page.evaluate(() => player.x);
    assert.ok(after < before - 15, name + ' left control did not move');
    const shotBefore = await page.evaluate(() => shots.length);
    await page.locator('#fire').click();
    const shotAfter = await page.evaluate(() => shots.length);
    assert.ok(shotAfter > shotBefore, name + ' fire did not respond');
    await page.locator('#sound').click();
    assert.match(await page.locator('#sound').textContent(), /MUTED/);
    await page.locator('#sound').click();
    assert.match(await page.locator('#sound').textContent(), /SOUND/);
    assert.deepEqual(errors, [], name + ' console errors');
    console.log(name + ': layout, audio unlock, movement, fire and sound toggle passed');
    await context.close();
  }
} finally {
  await browser.close();
}
