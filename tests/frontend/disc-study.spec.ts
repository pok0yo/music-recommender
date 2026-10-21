import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studySlugs } from '../../v2/studies';

for (const slug of studySlugs) {
  test(`Disc Study ${slug}: working flow, states and responsive body`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const path = `/prototypes/disc-study/${slug}`;
    await page.goto(`${path}?mode=demo&fixture=entry`);
    await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
    await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
    await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
    const seed = new URL(page.url()).searchParams.get('seed');
    await page.locator('summary').first().click();
    await expect(page.getByText('Listening link unavailable.').first()).toBeVisible();
    await page.getByRole('button', { name: /Use as seed/ }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('seed')).not.toBe(seed);
    await page.goBack(); await expect(page.locator('.selected-track')).toContainText('CLOUDS');
    await page.getByRole('button', { name: 'Change song' }).click(); await expect(page.getByRole('searchbox')).toBeFocused();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fixture of ['entry', 'search', 'no-match', 'loading', 'zero', 'one', 'ten', 'long', 'missing', 'error', 'timeout', 'outage', 'rate-limit', 'unknown', 'invalid']) {
        await page.goto(`${path}?mode=demo&fixture=${fixture}`);
        await expect(page.getByRole('note')).toContainText('Demonstration data');
        await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', slug);
        if (fixture === 'entry') {
          await expect(page.locator('.starter-button')).toHaveCount(4);
          const hero = (await page.locator('.hero-slot').boundingBox())!;
          expect(hero.width / hero.height).toBeCloseTo(1, 1);
          expect(await page.locator('.hero-fill').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(201, 213, 223)');
          if (width < 768) {
            const choices = (await page.locator('.starting-points').boundingBox())!;
            expect(choices.y + choices.height).toBeLessThanOrEqual(hero.y + 1);
          }
        } else {
          await expect(page.locator('.hero-slot')).toHaveCount(0);
          if (['ten', 'long'].includes(fixture)) await expect(page.locator('.track-list > li')).toHaveCount(10);
          else if (fixture === 'missing') await expect(page.locator('.notice')).toContainText('7 model results');
          else if (fixture === 'one') await expect(page.locator('.track-list > li')).toHaveCount(1);
          else if (fixture === 'zero') await expect(page.getByText('No supported connections for this song yet.')).toBeVisible();
          else if (['error', 'timeout', 'outage', 'rate-limit', 'unknown', 'invalid'].includes(fixture)) await expect(page.locator('main').getByRole('alert')).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), `${slug}/${fixture}/${width}`).toBe(false);
        await expect(page.locator('main img')).toHaveCount(0);
      }
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const state of ['entry', 'ten', 'about']) {
        await page.goto(`${path}${state === 'about' ? '/about' : ''}?mode=demo&fixture=${state === 'about' ? 'entry' : state}`);
        await page.locator(state === 'entry' ? '.starter-button' : state === 'ten' ? '.track-row' : '.method-section').first().waitFor();
        expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      }
    }
    expect(errors).toEqual([]);
  });
}

test('Disc Study picker preserves input, seed and About route; shortcuts respect typing', async ({ page }) => {
  await page.goto('/prototypes/disc-study/gatefold?mode=demo&fixture=entry');
  await page.getByRole('searchbox').fill('123'); await page.getByRole('searchbox').press('ArrowRight');
  await expect(page.locator('[data-study]')).toHaveAttribute('data-study', 'gatefold');
  await page.getByRole('button', { name: 'Preview Disc Tray' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('123');
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
  await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
  const seed = new URL(page.url()).searchParams.get('seed');
  await page.getByRole('button', { name: 'Preview Liner Notes' }).click();
  await expect(page.locator('.selected-track')).toContainText('CLOUDS');
  await page.reload(); await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', 'liner-notes');
  await expect(page.locator('.selected-track')).toContainText('CLOUDS');
  expect(new URL(page.url()).searchParams.get('seed')).toBe(seed);
  await page.getByRole('link', { name: 'About the recommendations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connections, with context.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview Gatefold' }).click();
  await expect(page).toHaveURL(/gatefold\/about/);
  await expect(page.getByRole('heading', { name: 'Connections, with context.' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Prototype variants' }).getByRole('button')).toHaveCount(3);
});
