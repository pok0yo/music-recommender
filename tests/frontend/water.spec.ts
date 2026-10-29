import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const route = '/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry&interface=classic';
const count = (page: import('@playwright/test').Page) => page.evaluate(() => Reflect.get(window, 'waterDrawCount') as number);

test('water ripples are bounded, pausable, and suspend offscreen, hidden and for preferences', async ({ page }) => {
  await page.addInitScript(() => {
    let draws = 0;
    Object.defineProperty(window, 'waterDrawCount', { get: () => draws });
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if ((this.canvas as HTMLCanvasElement).classList.contains('water-canvas')) ++draws;
      return original.apply(this, args);
    };
  });
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto(route + '&background=crisp');
  const water = page.locator('.water-layer');
  await expect(water).toHaveAttribute('data-water-state', 'running');
  const canvas = water.locator('canvas');
  const geometry = await canvas.evaluate(c => {
    const element = c as HTMLCanvasElement, box = c.getBoundingClientRect();
    const fitHeight = 941 * Math.max(innerWidth / 1672, innerHeight / 941);
    return { pixels: element.width * element.height, aboveShore: box.top < (innerHeight-fitHeight)/2 + fitHeight * .66 - 1, top: box.top, bottom: box.bottom, viewport: innerHeight };
  });
  expect(geometry.pixels).toBeLessThanOrEqual(650000);
  expect(geometry.aboveShore).toBe(false);
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport + 1);
  const before = await canvas.screenshot();
  const start = await count(page);
  await page.waitForTimeout(600);
  expect(await count(page) - start).toBeLessThanOrEqual(19);
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(water).toHaveAttribute('data-water-state', 'hidden');
  const hidden = await count(page); await page.waitForTimeout(150); expect(await count(page)).toBe(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(water).toHaveAttribute('data-water-state', 'running');
  await water.evaluate(e => { e.style.transform = 'translateY(200vh)'; dispatchEvent(new Event('scroll')); });
  await expect(water).toHaveAttribute('data-water-state', 'offscreen');
  const outside = await count(page); await page.waitForTimeout(150); expect(await count(page)).toBe(outside);
  await water.evaluate(e => { e.style.transform = ''; dispatchEvent(new Event('scroll')); });
  await page.getByRole('combobox', { name: 'Water movement' }).selectOption('still');
  await expect(water).toHaveAttribute('data-water-state', 'still');
  await expect(canvas).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Water movement' }).selectOption('moving');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(water).toHaveAttribute('data-water-state', 'still');
  await expect(canvas).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await expect(water).toHaveAttribute('data-water-state', 'still');
  await expect(canvas).toHaveCount(0);
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(water).toHaveAttribute('data-water-state', 'still');
});

test('extended scenery fills every edge and stays stable through scrolling and longer content', async ({ page }) => {
  for (const [width, height] of [[390, 844], [1440, 900], [1881, 905]]) {
    await page.setViewportSize({ width, height });
    let first: Buffer | undefined;
    for (const fixture of ['entry', 'ten']) {
      await page.goto(route.replace('fixture=entry', `fixture=${fixture}`) + '&background=crisp&water=still');
      if (fixture === 'entry') await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready', 'true');
      else await expect(page.locator('.track-row')).toHaveCount(10);
      const background = await page.locator('.app-surface').evaluate(e => {
        const style = getComputedStyle(e, '::before');
        return { position: style.position, size: style.backgroundSize, image: style.backgroundImage };
      });
      expect(background).toMatchObject({ position: 'fixed', size: 'cover' });
      expect(background.image).toContain(`extended-crisp-${width<768?'mobile':'wide'}.webp`);
      await page.addStyleTag({ content: '.page-frame,.preview-bar,.skip-link{opacity:0!important}' });
      const top = await page.screenshot();
      if (!first) {
        const edgeDifferences = await page.evaluate(async base64 => {
          const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + base64)).blob());
          const canvas = document.createElement('canvas'); canvas.width=bitmap.width; canvas.height=bitmap.height;
          const context = canvas.getContext('2d')!; context.drawImage(bitmap,0,0); bitmap.close();
          const ground=getComputedStyle(document.querySelector('.app-surface')!).backgroundColor.match(/\d+/g)!.map(Number);
          return [[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]].map(([x,y])=>{
            const pixel=context.getImageData(x,y,1,1).data;
            return Math.abs(pixel[0]-ground[0])+Math.abs(pixel[1]-ground[1])+Math.abs(pixel[2]-ground[2]);
          });
        },top.toString('base64'));
        expect(edgeDifferences.every(difference=>difference>12)).toBe(true);
      }
      if (first) expect(top.equals(first)).toBe(true);
      first = top;
      await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
      expect((await page.screenshot()).equals(top)).toBe(true);
    }
  }
});

test('water choice preserves discovery and navigation, including mobile and both finishes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(route);
  await page.getByRole('searchbox').fill('Tiffany');
  await page.getByRole('combobox', { name: 'Water movement' }).selectOption('still');
  await expect(page.getByRole('searchbox')).toHaveValue('Tiffany');
  await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
  await expect(page.locator('.track-row')).toHaveCount(10);
  await page.locator('summary').first().click();
  await page.getByRole('combobox', { name: 'Water movement' }).selectOption('moving');
  await expect(page.locator('.selected-track')).toContainText('CLOUDS');
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
  await page.getByRole('combobox', { name: 'Water movement' }).selectOption('still');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Water movement' })).toHaveValue('still');
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Water movement' })).toHaveValue('still');
  for (const width of [320, 390, 768, 1024, 1440, 1881]) {
    await page.setViewportSize({ width, height: 844 });
    for (const finish of ['hazy', 'crisp']) {
      await page.getByRole('combobox', { name: 'Background finish' }).selectOption(finish);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Water movement' })).toHaveValue('still');
  await page.goto('/variants/v2?mode=demo&fixture=entry');
  await expect(page.locator('.water-layer')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Water movement' })).toHaveCount(0);
});

test('water failures retain static artwork and working search', async ({ page }) => {
  await page.goto(route + '&background=crisp');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  const water = page.locator('.water-layer');
  await expect(water).toHaveAttribute('data-water-state', 'running');
  await water.locator('canvas').evaluate(c => (c as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(water).toHaveAttribute('data-water-state', 'fallback');
  expect(await page.locator('.app-surface').evaluate(e => getComputedStyle(e).backgroundImage)).toContain('extended-crisp-wide.webp');
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button', { name: /CLOUDS.*Use this song/ }).click();
  await expect(page.locator('.track-row')).toHaveCount(10);
  await page.route(/\/environment\/extended-.*\.webp/, route => route.abort());
  await page.goto(route);
  await expect(water).toHaveAttribute('data-water-state', 'fallback');
  await expect(page.getByRole('searchbox')).toBeVisible();
});
