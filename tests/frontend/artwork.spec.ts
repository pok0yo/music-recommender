import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const route = '/prototypes/disc-tray/artwork/orbital-disc';

test('Orbital console keeps controls visible and fits a desktop opening screen', async ({ page }) => {
  test.setTimeout(process.env.CI||process.env.PLAYWRIGHT_SOFTWARE?270_000:90_000);
  for (const [width, height] of [[1280,800],[1440,900],[1881,905],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${route}?mode=demo&fixture=entry&interface=classic`);
    await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.starter-button')).toHaveCount(4);
    await expect(page.locator('.proto-picker,.preview-bar,.app-footer,.release-context')).toHaveCount(0);
    await expect(page.locator('.orbital-toolbar .demo-notice')).toContainText('not model results');
    await expect(page.getByRole('link',{name:'How it works',exact:true})).toHaveText('How it works');
    for (const label of ['Data source','Demonstration scenario','Background finish','Water movement']) await expect(page.getByRole('combobox',{name:label,exact:true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    if (width>=1280) expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height+1);
    if ([390,1440].includes(width)) expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
});

test('retired artwork URLs preserve discovery and About context when redirected', async ({page}) => {
  test.setTimeout(60_000);
  const seed='00000000-0000-4000-8000-000000000003';
  for (const slug of ['glass-current','aero-player','liquid-star']) for (const section of ['', '/about']) {
    await page.goto(`/prototypes/disc-tray/artwork/${slug}${section}?mode=demo&fixture=ten&q=Tiffany&seed=${seed}&background=crisp&water=still&v=4&tag=one&tag=two&interface=classic`);
    const url=new URL(page.url());
    expect(url.pathname).toBe(route+section);
    expect(url.searchParams.get('q')).toBe('Tiffany');
    expect(url.searchParams.get('seed')).toBe(seed);
    expect(url.searchParams.get('v')).toBe('1');
    expect(url.searchParams.getAll('tag')).toEqual(['one','two']);
    await expect(page.getByRole('combobox',{name:'Background finish'})).toHaveValue('crisp');
    await expect(page.getByRole('combobox',{name:'Water movement'})).toHaveValue('still');
    if (section) await expect(page.getByRole('heading',{name:'Connections, with context.'})).toBeVisible();
    else await expect(page.locator('.track-row')).toHaveCount(10);
    await expect(page.locator('.proto-picker')).toHaveCount(0);
  }
  expect((await page.goto('/prototypes/disc-tray/artwork/glass-current/unknown'))!.status()).toBe(404);
});
