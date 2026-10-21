import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { artworks } from '../../v2/artwork';

test('four hero artworks load, crop and reflow without moving the Disc Tray task', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 550, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const art of artworks) {
      await page.goto(`/prototypes/disc-tray/artwork/${art.slug}?mode=demo&fixture=entry`);
      const img = page.locator('.hero-fill img');
      await expect(page.locator('.starter-button')).toHaveCount(4);
      await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
      await expect(img).toHaveAttribute('alt', '');
      await expect(img).toHaveAttribute('src', /\/_next\/image\?/);
      expect(await page.locator('.hero-fill').evaluate(e => getComputedStyle(e).overflow)).toBe('hidden');
      const hero = (await page.locator('.hero-slot').boundingBox())!;
      expect(hero.width / hero.height).toBeCloseTo(1, 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      if (width < 768) {
        const choices = (await page.locator('.starting-points').boundingBox())!;
        expect(choices.y + choices.height).toBeLessThanOrEqual(hero.y + 1);
      }
      if ([390,1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test('artwork comparison preserves typing, selection, navigation and working-state behavior', async ({ page }) => {
  await page.goto('/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry');
  await page.getByRole('searchbox').fill('1234'); await page.getByRole('searchbox').press('ArrowRight');
  await expect(page.locator('[data-artwork]')).toHaveAttribute('data-artwork','orbital-disc');
  for (const art of artworks) {
    await page.getByRole('button', { name: `Preview ${art.name}` }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('1234');
    await expect(page.locator('.hero-fill img')).toHaveAttribute('src', new RegExp(art.slug));
  }
  await page.reload(); await expect(page.locator('[data-artwork]')).toHaveAttribute('data-artwork','liquid-star');
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
  await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
  const seed = new URL(page.url()).searchParams.get('seed');
  for (const art of artworks) {
    await page.getByRole('button', { name: `Preview ${art.name}` }).click();
    await expect(page.locator('.selected-track')).toContainText('CLOUDS');
    await expect(page.locator('.track-row')).toHaveCount(10);
    await expect(page.locator('.hero-slot')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('seed')).toBe(seed);
  }
  await page.locator('summary').first().click(); await expect(page.getByText('Listening link unavailable.').first()).toBeVisible();
  await page.getByRole('button', { name: /Use as seed/ }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('seed')).not.toBe(seed);
  await page.goBack(); await expect(page.locator('.selected-track')).toContainText('CLOUDS');
  await page.getByRole('button', { name: 'Change song' }).click(); await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.locator('.hero-fill img')).toBeVisible();
  await page.getByRole('link', { name: 'About the recommendations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connections, with context.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview Aero Player' }).click();
  await expect(page).toHaveURL(/aero-player\/about/);
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page.locator('[data-artwork]')).toHaveAttribute('data-artwork','aero-player');
  await expect(page.locator('.hero-fill img')).toBeVisible();
});
