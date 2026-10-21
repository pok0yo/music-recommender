import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const shimmer = process.argv.includes('--shimmer');
const output = `docs/evidence/stage-9-${shimmer ? 'shimmer' : 'liquid'}-buttons`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
const evidence = { observed_at: new Date().toISOString(), browser: browser.version(), data: 'Demonstration fixtures only', captures: [] };
try {
  const page = await browser.newPage();
  for (const [device, width, height] of [['desktop',1440,900],['mobile',390,844],['user',550,766]]) {
    await page.setViewportSize({ width, height });
    for (const state of ['entry','hover','pressed','focus','results','disabled','long']) {
      const fixture = state === 'results' ? 'ten' : state === 'disabled' ? 'rate-limit' : state === 'long' ? 'long' : 'entry';
      await page.goto(`http://127.0.0.1:3000/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=${fixture}`);
      await page.locator(state === 'disabled' ? '.problem button:disabled' : ['results','long'].includes(state) ? '.track-row' : '.starter-button').first().waitFor();
      if (!['disabled','results','long'].includes(state)) { await page.locator('.orbital-hero[data-model-ready]').waitFor(); await page.getByRole('button',{name:'Pause motion',exact:true}).click(); }
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.hero-fill img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const button = page.locator('.primary-button');
      if (state === 'hover' || state === 'pressed') {
        await button.hover();
        await button.locator('canvas').waitFor();
        await page.waitForFunction(() => document.querySelector('.primary-button .liquid-material').paperShaderMount.getCurrentFrame() > 100);
        if (state === 'pressed') await page.mouse.down();
        await button.evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
      }
      if (state === 'focus') { await page.getByRole('searchbox').focus(); await page.keyboard.press('Tab'); }
      await page.evaluate(() => window.scrollTo(0, 0));
      const path = `${output}/${device}-${state}.png`;
      await page.screenshot({ path, fullPage: true });
      if (state === 'pressed') await page.mouse.up();
      const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth }));
      if (geometry.pageWidth > width + 1) throw new Error(`Overflow in ${path}`);
      evidence.captures.push({ path, state, device, ...geometry, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
      await page.mouse.move(0, 0);
      console.log(path);
    }
  }
  await writeFile(`docs/evidence/stage-9-${shimmer ? 'shimmer' : 'liquid'}-button-captures.json`, JSON.stringify(evidence, null, 2) + '\n');
} finally { await browser.close(); }
