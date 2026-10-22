import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const route='/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry';

test('native interactive surfaces reflect the pointer without moving or changing their actions',async({page})=>{
  await page.goto(route);
  await expect(page.locator('#liquid-glass-distortion')).toHaveCount(1);
  const controls=[page.getByRole('searchbox'),page.getByLabel('Data source'),page.getByRole('button',{name:'Search',exact:true}),page.getByRole('link',{name:'Discover',exact:true}),page.getByRole('button',{name:'Preview Orbital Disc',exact:true}),page.locator('.starter-button').first()];
  for(const control of controls){
    const before=(await control.boundingBox())!;
    await control.hover();
    await expect(control).toHaveAttribute('data-glass-active','true');
    expect(await control.evaluate(e=>getComputedStyle(e).backdropFilter)).toContain('blur');
    const after=(await control.boundingBox())!;
    expect(after.width).toBeCloseTo(before.width,1);expect(after.height).toBeCloseTo(before.height,1);
    await page.mouse.move(0,0);await expect(control).not.toHaveAttribute('data-glass-active','true');
  }
  await page.getByRole('searchbox').fill('Tiffany');await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button',{name:/CLOUDS.*Use this song/}).click();
  const details=page.locator('.track-row summary').first();await details.hover();await expect(details).toHaveAttribute('data-glass-active','true');
  await details.focus();await page.keyboard.press('Enter');await expect(page.locator('.track-row details').first()).toHaveAttribute('open','');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('glass has static motion/transparency fallbacks and never adds control semantics',async({page})=>{
  await page.goto(route);
  const search=page.getByRole('button',{name:'Search',exact:true});await search.hover();await expect(search).toHaveAttribute('data-glass-active','true');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(search).not.toHaveAttribute('data-glass-active','true');
  await page.mouse.move(0,0);await search.hover();await expect(search).not.toHaveAttribute('data-glass-active','true');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  await expect.poll(()=>page.evaluate(()=>matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  await expect(search.locator('.glass-effect')).toBeHidden();
  const surfaces=page.locator('.app-surface :is(button,a,input[type=search],select,summary,.app-header,.shell-body,.about-index,.preview-bar,.proto-picker)');
  await expect.poll(()=>surfaces.evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).backdropFilter!=='none').length)).toBe(0);
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
  await page.emulateMedia({forcedColors:'active'});await expect(search.locator('.glass-effect')).toBeHidden();
  await expect.poll(()=>surfaces.evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).backdropFilter!=='none').length)).toBe(0);
  expect(await search.evaluate(e=>getComputedStyle(e,'::before').display)).toBe('none');
  await page.getByRole('searchbox').fill('Tiffany');await search.click();await expect(page.locator('.match-button').first()).toContainText('CLOUDS');
});
