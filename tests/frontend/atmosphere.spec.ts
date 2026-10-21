import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const route='/prototypes/disc-tray/artwork/orbital-disc';
test('local atmosphere and display type retain readable states and comparison boundaries', async ({page})=>{
  test.setTimeout(120_000);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,390,550,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for(const fixture of ['entry','error','long']) {
      await page.goto(`${route}?mode=demo&fixture=${fixture}`);
      await expect(page.locator('main h1')).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.locator('main h1').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Michroma');
      expect(await page.evaluate(()=>document.fonts.check('400 24px Michroma'))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      if([390,1440].includes(width)) expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
  await page.goto(`${route}/about?mode=demo&fixture=entry`);
  expect(await page.locator('.about-intro').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('chrome-detail.webp');
  await expect(page.locator('.orbital-hero')).toHaveCount(0);
  await page.emulateMedia({forcedColors:'active'});
  expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
  await page.emulateMedia({forcedColors:'none'});
  for(const slug of ['glass-current','aero-player','liquid-star']) {
    await page.goto(`/prototypes/disc-tray/artwork/${slug}?mode=demo&fixture=entry`);
    expect(await page.locator('main h1').evaluate(e=>getComputedStyle(e).fontFamily)).not.toContain('Michroma');
    expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).not.toContain('environment');
  }
});

test('missing decorative assets preserve search and recommendations',async({page})=>{
  await page.route('**/artwork/disc-tray/environment/**',route=>route.abort());
  await page.goto(`${route}?mode=demo&fixture=entry`);
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button',{name:/CLOUDS.*Use this song/}).click();
  await expect(page.locator('.track-row')).toHaveCount(10);
  expect(await page.locator('.track-title').first().evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Manrope');
});
