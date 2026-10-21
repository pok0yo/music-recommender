import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const artwork = process.argv.includes('--artwork');
const studies = process.argv.includes('--disc-study') || artwork;
const output = artwork ? 'docs/evidence/stage-9-artwork' : studies ? 'docs/evidence/stage-9-disc-study' : 'docs/evidence/stage-9-previews';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
const evidence = { observed_at: new Date().toISOString(), revision: artwork ? 'disc-tray-artwork-v1' : studies ? 'disc-study-v1' : 'glass-structures-v1', browser: browser.version(), data: 'demonstration fixtures only', provenance: 'Local browser screenshots; documentation evidence, never app artwork.', captures: [] };
try {
  const page = await browser.newPage();
  for (const variant of artwork ? ['orbital-disc','glass-current','aero-player','liquid-star'] : studies ? ['gatefold', 'disc-tray', 'liner-notes'] : [1,2,3,4,5]) {
    const route = artwork ? `/prototypes/disc-tray/artwork/${variant}` : studies ? `/prototypes/disc-study/${variant}` : `/variants/v${variant}`;
    for (const [device, width, height] of artwork ? [['desktop',1440,900],['mobile',390,844],['user',550,766]] : [['desktop',1440,900],['mobile',390,844]]) {
      await page.setViewportSize({ width, height });
      for (const fixture of ['entry', 'ten', 'about']) {
        if (artwork && variant !== 'orbital-disc' && fixture !== 'entry') continue; // Working screens share the same body and omit the hero.
        await page.goto(`http://127.0.0.1:3000${route}${fixture === 'about' ? '/about' : ''}?mode=demo&fixture=${fixture === 'about' ? 'entry' : fixture}`);
        await page.locator(fixture === 'entry' ? '.starter-button' : fixture === 'about' ? '.about-preview h1' : '.track-list > li').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.hero-fill img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
        const path = `${output}/${studies ? variant : 'v' + variant}-${device}-${fixture}.png`;
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
        if (measure.hero && Math.abs(measure.hero.width / measure.hero.height - (studies ? 1 : [4/3,1,5/4,16/9,3][variant-1])) > .02) throw new Error(`Hero aspect mismatch in ${path}`);
        evidence.captures.push({ variant, fixture, path, ...measure });
        console.log(path);
      }
    }
  }
  await writeFile(artwork ? 'docs/evidence/stage-9-artwork-captures.json' : studies ? 'docs/evidence/stage-9-disc-study-captures.json' : 'docs/evidence/stage-9-render-captures.json', JSON.stringify(evidence, null, 2) + '\n');
} finally { await browser.close(); }
