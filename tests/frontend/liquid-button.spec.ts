import { test, expect } from '@playwright/test';

const route = '/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry&interface=classic';

test('idle shimmer is still and the shader eases in, survives quick re-entry and fades out', async ({ page }) => {
  await page.goto(route);
  const search = page.getByRole('button', { name: 'Search', exact: true });
  const material = search.locator('.liquid-material');
  await expect(search.locator('.liquid-shimmer')).toHaveAttribute('aria-hidden', 'true');
  expect(await search.evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  expect(await material.evaluate(e => getComputedStyle(e).opacity)).toBe('0');
  await search.hover(); await expect(material.locator('canvas')).toHaveCount(1);
  await expect.poll(() => material.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
  expect(await material.evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0.24s');
  const reused = await search.evaluate(async e => {
    const canvas = e.querySelector('canvas');
    e.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body }));
    await new Promise(requestAnimationFrame);
    e.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: document.body }));
    await new Promise(requestAnimationFrame);
    return e.querySelectorAll('canvas').length === 1 && e.querySelector('canvas') === canvas;
  });
  expect(reused).toBe(true);
  await page.mouse.move(0, 0);
  expect(await material.evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0.18s');
  await expect.poll(() => material.evaluate(e => getComputedStyle(e).opacity)).toBe('0');
  await expect(material.locator('canvas')).toHaveCount(0);
});

test('liquid buttons animate on pointer interaction, clean up and preserve native submission', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(route);
  const search = page.getByRole('button', { name: 'Search', exact: true });
  await expect(search).toHaveClass(/liquid-metal-button/);
  await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  await search.hover();
  await expect(search.locator('canvas')).toHaveCount(1);
  const frame = () => search.locator('.liquid-material').evaluate(e =>
    (e as HTMLElement & { paperShaderMount: { getCurrentFrame(): number } }).paperShaderMount.getCurrentFrame());
  const first = await frame(); await expect.poll(frame).toBeGreaterThan(first);
  await page.mouse.move(0, 0); await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  await search.click();
  await expect(search.locator('.liquid-ripple')).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(search.locator('.liquid-ripple')).toHaveCount(0);
  await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  await page.getByRole('searchbox').fill('Tiffany');
  await search.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.match-button').first()).toContainText('CLOUDS');
  await expect(page.locator('.liquid-ripple')).toHaveCount(0);
  await page.locator('.match-button').first().click();
  await expect(page.getByRole('heading', { name: '10 connections to explore' })).toBeFocused();
  const change = page.getByRole('button', { name: 'Change song' });
  await change.click();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.locator('.liquid-ripple')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reduced motion and forced colors use static buttons, including preference changes', async ({ page }) => {
  await page.goto(route);
  const search = page.getByRole('button', { name: 'Search', exact: true });
  await search.hover(); await expect(search.locator('canvas')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  await search.click();
  await expect(page.locator('.liquid-ripple')).toHaveCount(0);
  expect(await search.evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
  await page.mouse.move(0, 0); await search.hover();
  await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  expect(await search.evaluate(e => getComputedStyle(e, '::before').display)).toBe('none');
  await page.getByRole('searchbox').fill('Tiffany'); await search.click();
  await expect(page.locator('.match-button').first()).toContainText('CLOUDS');
  await page.emulateMedia({ forcedColors: 'none' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  await page.mouse.move(0, 0); await search.hover();
  await expect(page.locator('.liquid-material canvas')).toHaveCount(0);
  expect(await search.locator('.liquid-material').evaluate(e => getComputedStyle(e).display)).toBe('none');
});

test('optional WebGL failure keeps buttons usable and retry remains disabled until its deadline', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto(route);
  const search = page.getByRole('button', { name: 'Search', exact: true });
  await page.getByRole('searchbox').fill('Tiffany'); await search.hover(); await search.click();
  await expect(page.locator('.match-button').first()).toContainText('CLOUDS');
  await page.goto(route.replace('fixture=entry', 'fixture=rate-limit'));
  const retry = page.getByRole('button', { name: /Try again in/ });
  await expect(retry).toBeDisabled();
  await retry.hover({ force: true });
  await expect(retry.locator('canvas')).toHaveCount(0);
  await expect(retry.locator('.liquid-ripple')).toHaveCount(0);
});
