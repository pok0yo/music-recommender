import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'docs/evidence/stage-9-previews';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
const evidence = { observed_at: new Date().toISOString(), revision: 'glass-structures-v1', browser: browser.version(), data: 'demonstration fixtures only', captures: [] };
try {
  const page = await browser.newPage();
  for (let variant = 1; variant <= 5; variant++) {
    for (const [device, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const fixture of ['entry', 'ten', 'about']) {
        await page.goto(`http://127.0.0.1:3000/variants/v${variant}${fixture === 'about' ? '/about' : ''}?mode=demo&fixture=${fixture === 'about' ? 'entry' : fixture}`);
        await page.locator(fixture === 'entry' ? '.starter-button' : fixture === 'about' ? '.about-preview h1' : '.track-list > li').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const path = `${output}/v${variant}-${device}-${fixture}.png`;
        await page.screenshot({ path, fullPage: true, animations: 'disabled' });
        const measure = await page.evaluate(() => ({
          viewport: { width: innerWidth, height: innerHeight },
          pageWidth: document.documentElement.scrollWidth,
          headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
          headingFontLoaded: document.fonts.check(`500 32px ${getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0]}`),
          hero: document.querySelector('.hero-slot') ? (() => {
            const slot = document.querySelector('.hero-slot'); const fill = document.querySelector('.hero-fill');
            const rect = slot.getBoundingClientRect();
            return { width: rect.width, height: rect.height, fill: getComputedStyle(fill).backgroundColor };
          })() : null,
        }));
        if (measure.pageWidth > width + 1) throw new Error(`Horizontal overflow in ${path}`);
        if (measure.hero && Math.abs(measure.hero.width / measure.hero.height - [4/3,1,5/4,16/9,3][variant-1]) > .02) throw new Error(`Hero aspect mismatch in ${path}`);
        evidence.captures.push({ variant, fixture, path, ...measure });
        console.log(path);
      }
    }
  }
  await writeFile('docs/evidence/stage-9-render-captures.json', JSON.stringify(evidence, null, 2) + '\n');
} finally { await browser.close(); }
