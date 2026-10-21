import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoTracks, demoMeta } from '../../lib/fixtures';
import { validRecommendations, validCatalog } from '../../lib/contracts';

const demo = (variant = 1, fixture = 'entry') => `/variants/v${variant}?mode=demo&fixture=${fixture}`;
test('runtime contracts reject mixed modes, self-links, invalid counts, and unsafe links', () => {
  const good = { seed: demoTracks[0], results: [{ ...demoTracks[1], rank: 1, reason_code: 'shared_listeners',
    explanation: 'Shared listening', shared_training_listeners: 3, seed_training_listeners: 5, candidate_training_listeners: 6 }],
    alternatives: [], status: 'limited', requested_limit: 10, model_result_count: 1, omitted_metadata_count: 0, meta: demoMeta };
  expect(validRecommendations(good, 'demo')).toBe(true);
  expect(validRecommendations(good, 'real')).toBe(false);
  expect(validRecommendations({ ...good, results: [{ ...good.results[0], recording_id: good.seed.recording_id }] }, 'demo')).toBe(false);
  expect(validRecommendations({ ...good, results: [{ ...good.results[0], shared_training_listeners: 7 }] }, 'demo')).toBe(false);
  expect(validRecommendations({ ...good, omitted_metadata_count: 1 }, 'demo')).toBe(false);
  expect(validRecommendations({ ...good, results: [null] }, 'demo')).toBe(false);
  expect(validCatalog({ results: [], meta: { ...demoMeta, catalog_version: '' } }, 'demo')).toBe(false);
  expect(validCatalog({ results: [{ ...demoTracks[0], external_link: 'javascript:alert(1)' }], meta: demoMeta }, 'demo')).toBe(false);
});

for (let variant = 1; variant <= 5; variant++) {
  test(`v${variant}: keyboard search, details, reseeding and browser Back`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(demo(variant));
    await expect(page.getByRole('button', { name: /typical.*nate sib/i })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Song or artist' }).fill('Tiffany');
    await page.getByRole('searchbox').press('Enter');
    await expect(page.getByRole('heading', { name: 'Choose your starting song' })).toBeVisible();
    await page.getByRole('button', { name: /CLOUDS.*Use this song/i }).click();
    await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
    const firstSeed = new URL(page.url()).searchParams.get('seed');
    await expect(page.locator('.hero-slot')).toHaveCount(0);
    if (variant === 5) await page.getByRole('button', { name: /^Details for/ }).first().click();
    else await page.locator('summary').first().click();
    await expect(page.getByText('Listening link unavailable.').first()).toBeVisible();
    await expect(page.getByText('Shared training listeners').first()).toBeVisible();
    await page.getByRole('button', { name: /Use as seed/ }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('seed')).not.toBe(firstSeed);
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('seed')).toBe(firstSeed);
    await expect(page.locator('.selected-track .track-title')).toHaveText('CLOUDS');
    await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeVisible();
    await page.getByRole('button', { name: 'Change song' }).click();
    await expect(page.getByRole('searchbox')).toBeFocused();
    expect(errors).toEqual([]);
  });

  test(`v${variant}: named states, responsive geometry and accessible working screen`, async ({ page }) => {
    test.setTimeout(180_000);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fixture of ['entry', 'search', 'no-match', 'loading', 'zero', 'one', 'ten', 'long', 'missing', 'error', 'timeout', 'outage', 'rate-limit', 'unknown', 'invalid']) {
        await page.goto(demo(variant, fixture));
        await expect(page.getByRole('note')).toContainText('Demonstration data');
        if (['ten', 'long'].includes(fixture)) await expect(page.locator('.track-list > li')).toHaveCount(10);
        else if (fixture === 'one') await expect(page.locator('.track-list > li')).toHaveCount(1);
        else if (fixture === 'missing') { await expect(page.locator('.track-list > li')).toHaveCount(3); await expect(page.locator('.notice')).toContainText('7 model results'); }
        else if (fixture === 'zero') await expect(page.getByText('No supported connections for this song yet.')).toBeVisible();
        else if (fixture === 'loading') await expect(page.getByRole('heading', { name: 'Finding connections' })).toBeVisible();
        else if (fixture === 'search') await expect(page.getByRole('heading', { name: 'Choose your starting song' })).toBeVisible();
        else if (fixture === 'no-match') await expect(page.getByRole('heading', { name: 'No matching tracks' })).toBeVisible();
        else if (['error', 'timeout', 'outage', 'rate-limit', 'unknown', 'invalid'].includes(fixture)) await expect(page.locator('main').getByRole('alert')).toBeVisible();
        else await expect(page.locator('.starter-button')).toHaveCount(4);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        expect(overflow, `${fixture} at ${width}`).toBe(false);
        if (fixture === 'entry') {
          const box = await page.locator('.hero-slot').boundingBox();
          expect(box).not.toBeNull();
          const ratio = [4 / 3, 1, 5 / 4, 16 / 9, 3][variant - 1];
          expect(box!.width / box!.height).toBeCloseTo(ratio, 1);
          const fill = await page.locator('.hero-fill').evaluate(e => getComputedStyle(e).backgroundColor);
          expect(fill).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fixture of ['entry', 'ten']) {
        await page.goto(demo(variant, fixture));
        await expect(page.locator(fixture === 'entry' ? '.starter-button' : '.track-list > li')).toHaveCount(fixture === 'entry' ? 4 : 10);
        expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      }
    }
  });
}

test('picker shortcuts do not capture form input and preserve full-size preview paths', async ({ page }) => {
  await page.goto(demo());
  await page.getByRole('searchbox').fill('12345');
  await page.getByRole('searchbox').press('ArrowRight');
  await expect(page.locator('[data-variant]')).toHaveAttribute('data-variant', 'v1');
  await page.getByRole('button', { name: 'Preview Pearl Orbit' }).click();
  await expect(page.locator('[data-variant]')).toHaveAttribute('data-variant', 'v3');
  await expect(page.getByRole('searchbox')).toHaveValue('12345');
  await page.reload();
  await expect(page.locator('[data-variant]')).toHaveAttribute('data-variant', 'v3');
});

test('real mode never falls back to demonstration data on outage', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/**', route => route.fulfill({ status: 503, json: { code: 'unavailable', message: 'Private server details', request_id: demoTracks[0].recording_id } }));
  await page.goto('/variants/v1');
  await expect(page.locator('main').getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.getByRole('note')).toHaveCount(0);
  await expect(page.locator('.starter-button')).toHaveCount(0);
  await expect(page.getByText('Private server details')).toHaveCount(0);
});

test('late searches and recommendations cannot replace newer selections', async ({ page }) => {
  const realMeta = { ...demoMeta, data_mode: 'real' };
  await page.route('http://127.0.0.1:8000/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/starters')) return route.fulfill({ json: { results: demoTracks.slice(0, 4), meta: realMeta } });
    if (url.pathname.endsWith('/search')) {
      const q = url.searchParams.get('q'); await new Promise(resolve => setTimeout(resolve, q === 'slow' ? 550 : 30));
      return route.fulfill({ json: { results: [demoTracks[q === 'slow' ? 0 : 1]], meta: realMeta } });
    }
    const seed = demoTracks.find(t => url.pathname.endsWith(t.recording_id))!;
    await new Promise(resolve => setTimeout(resolve, seed === demoTracks[0] ? 550 : 30));
    return route.fulfill({ json: { seed, results: [], alternatives: [], status: 'no_connections', requested_limit: 10, model_result_count: 0, omitted_metadata_count: 0, meta: realMeta } });
  });
  await page.goto('/variants/v1');
  await page.getByRole('searchbox').fill('slow'); await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('searchbox').fill('fast'); await page.getByRole('searchbox').press('Enter');
  await expect(page.locator('.match-button')).toContainText('CLOUDS');
  await page.waitForTimeout(650);
  await expect(page.locator('.match-button')).toHaveCount(1);
  await expect(page.locator('.match-button')).toContainText('CLOUDS');
  await page.locator('.match-button').click();
  await expect(page.locator('.selected-track')).toContainText('CLOUDS');
  await expect(page.getByRole('heading', { name: '0 connections to explore' })).toBeVisible();
  await page.getByRole('searchbox').fill('slow'); await page.getByRole('searchbox').press('Enter');
  await expect(page.locator('.match-button')).toContainText('typical');
  await page.locator('.match-button').click();
  await expect(page.locator('.selected-track')).toContainText('typical');
  await page.getByRole('searchbox').fill('fast'); await page.getByRole('searchbox').press('Enter');
  await expect(page.locator('.match-button')).toContainText('CLOUDS');
  await page.locator('.match-button').click();
  await expect(page.getByRole('heading', { name: '0 connections to explore' })).toBeVisible();
  await page.waitForTimeout(650);
  await expect(page.locator('.selected-track')).toContainText('CLOUDS');
});

test('five structures retain their different working behavior', async ({ page }) => {
  for (let variant = 1; variant <= 5; variant++) {
    await page.goto(demo(variant, 'ten'));
    await expect(page.locator('.track-list > li')).toHaveCount(10);
    await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', ['split-console', 'guided-sequence', 'catalog-workbench', 'track-ledger', 'list-inspector'][variant - 1]);
    await expect(page.locator('.starter-button')).toHaveCount(variant === 3 ? 4 : 0);
    if (variant === 2) await expect(page.locator('.journey [aria-current=step]')).toContainText('Explore connections');
    if (variant === 5) {
      await page.getByRole('button', { name: 'Back to track list' }).click();
      await expect(page.getByRole('button', { name: /^Details for/ }).first()).toBeFocused();
      const trigger = page.getByRole('button', { name: 'Details for Always', exact: true });
      await trigger.click();
      await expect(page.getByRole('heading', { name: 'Connection details' })).toBeFocused();
      await expect(page.locator('#track-inspector .track-title')).toHaveText('Always');
      await page.getByRole('button', { name: 'Back to track list' }).click();
      await expect(trigger).toBeFocused();
      await page.getByRole('button', { name: /Use as seed/ }).first().click();
      await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
      await page.getByRole('button', { name: 'Back to track list' }).click();
      await expect(page.getByRole('button', { name: /^Details for/ }).first()).toBeFocused();
    }
  }
});

test('About inherits each structure, supports disclosure and anchor navigation', async ({ page }) => {
  for (let variant = 1; variant <= 5; variant++) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/variants/v${variant}/about?mode=demo`);
      await expect(page.getByRole('heading', { name: 'Connections, with context.' })).toBeVisible();
      if (variant === 2) {
        await page.getByRole('heading', { name: 'Evidence, not a promise' }).click();
        await expect(page.getByText(/On the frozen retrospective test/)).toBeVisible();
      }
      if (variant === 3 || variant === 5) {
        await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Data and privacy' }).click();
        await expect(page).toHaveURL(/#privacy$/);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      if ([390, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
});

test('reduced motion, enlarged text, forced colors and keyboard focus remain usable', async ({ page }) => {
  for (let variant = 1; variant <= 5; variant++) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(demo(variant));
    await expect(page.locator('.starter-button')).toHaveCount(4);
    const search = page.getByRole('searchbox');
    await search.focus();
    expect(await search.evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe('none');
    expect(await page.locator('.primary-button').evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('main h1, main h2, main p, main label, main span, main button, main input').forEach(e => {
        e.dataset.originalSize = getComputedStyle(e).fontSize;
      });
      document.querySelectorAll<HTMLElement>('[data-original-size]').forEach(e => e.style.fontSize = 2 * parseFloat(e.dataset.originalSize!) + 'px');
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(search).toBeVisible();
    await search.fill('Tiffany'); await search.press('Enter');
    await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
    await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
    await page.emulateMedia({ forcedColors: 'none' });
  }
});

test('real-mode 429 honors a conservative wait when CORS hides Retry-After', async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.route('http://127.0.0.1:8000/**', route => { calls++; return route.fulfill({ status: 429, json: {} }); });
  await page.goto('/variants/v1');
  await expect(page.getByRole('button', { name: 'Try again in 60s' })).toBeDisabled();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeEnabled();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect.poll(() => calls).toBe(2);
});

test('an actual request timeout preserves input and supports recovery without fixture fallback', async ({ page }) => {
  await page.clock.install();
  const realMeta = { ...demoMeta, data_mode: 'real' };
  await page.route('http://127.0.0.1:8000/v1/catalog/starters', route => route.fulfill({ json: { results: demoTracks.slice(0, 4), meta: realMeta } }));
  const pattern = 'http://127.0.0.1:8000/v1/catalog/search?**';
  await page.route(pattern, () => {});
  await page.goto('/variants/v1');
  await expect(page.locator('.starter-button')).toHaveCount(4);
  await page.getByRole('searchbox').fill('Tiffany');
  const requested = page.waitForRequest(request => request.url().includes('/catalog/search?'));
  await page.getByRole('searchbox').press('Enter'); await requested;
  await page.clock.fastForward(8100);
  await expect(page.locator('main').getByRole('alert')).toContainText('took too long');
  await expect(page.getByRole('searchbox')).toHaveValue('Tiffany');
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.unroute(pattern);
  await page.route(pattern, route => route.fulfill({ json: { results: [demoTracks[1]], meta: realMeta } }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.match-button')).toContainText('CLOUDS');
});
