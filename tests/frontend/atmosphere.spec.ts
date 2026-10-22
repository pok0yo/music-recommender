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
  expect(await page.locator('.about-intro').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('icy-water-detail.webp');
  await expect(page.locator('.orbital-hero')).toHaveCount(0);
  await page.emulateMedia({forcedColors:'active'});
  expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
  await page.emulateMedia({forcedColors:'none'});
  for(const slug of ['glass-current','aero-player','liquid-star']) {
    await page.goto(`/prototypes/disc-tray/artwork/${slug}?mode=demo&fixture=entry`);
    expect(await page.locator('main h1').evaluate(e=>getComputedStyle(e).fontFamily)).not.toContain('Michroma');
    expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).not.toContain('environment');
    expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).not.toContain('/accents/');
  }
});

test('missing decorative assets preserve search and recommendations',async({page})=>{
  await page.route(/\/artwork\/disc-tray\/(environment|accents)\//,route=>route.abort());
  await page.goto(`${route}?mode=demo&fixture=entry`);
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button',{name:/CLOUDS.*Use this song/}).click();
  await expect(page.locator('.track-row')).toHaveCount(10);
  expect(await page.locator('.track-title').first().evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Manrope');
});

test('icy water replaces scattered accents behind translucent trays with opaque fallbacks',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${route}?mode=demo&fixture=entry`);
  const background=await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage);
  expect(background).toContain('icy-water-wide.webp');
  expect(background).not.toContain('/accents/');
  for(const [name,width,height] of [['icy-water-wide',1672,941],['icy-water-mobile',528,940],['icy-water-detail',640,640]] as const){
    expect(await page.evaluate(async(name)=>{const image=new Image();image.src=`/artwork/disc-tray/environment/${name}.webp`;await image.decode();return [image.naturalWidth,image.naturalHeight];},name)).toEqual([width,height]);
  }
  const body=page.locator('.tray-upper');
  expect(await body.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(241, 248, 255, 0.74)');
  const contrast=await page.locator('.starting-points h2').evaluate(e=>{
    const rgb=(value:string)=>value.match(/[\d.]+/g)!.map(Number);
    const foreground=rgb(getComputedStyle(e).color),fill=rgb(getComputedStyle(e.closest('.shell-body')!).backgroundColor);
    const luminance=(values:number[])=>values.slice(0,3).reduce((sum,c,i)=>{c/=255;return sum+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
    return (luminance(fill.slice(0,3).map(c=>c*fill[3]))+.05)/(luminance(foreground)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  expect(await body.evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
  const frame=page.locator('.glass-shell').first();
  expect(await frame.evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
  expect(await frame.evaluate(e=>getComputedStyle(e,'::after').maskComposite.split(',').map(value=>value.trim()))).toEqual(['exclude','exclude']);
  expect(await frame.evaluate(e=>getComputedStyle(e,'::after').pointerEvents)).toBe('none');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  await expect.poll(()=>body.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(252, 253, 255)');
  await page.setViewportSize({width:390,height:844});
  expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('icy-water-mobile.webp');
  expect(await frame.evaluate(e=>getComputedStyle(e,'::after').display)).toBe('none');
  expect(await page.locator('.tray-command').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(252, 253, 255)');
  expect(await page.locator('.tray-command').evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  await page.emulateMedia({forcedColors:'active'});
  expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).toBe('none');
  expect(await frame.evaluate(e=>getComputedStyle(e,'::after').display)).toBe('none');
  await page.getByRole('searchbox').fill('Tiffany');await page.getByRole('searchbox').press('Enter');
  await expect(page.locator('.match-button').first()).toContainText('CLOUDS');
});
