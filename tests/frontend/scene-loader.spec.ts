import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {demoMeta,demoTracks} from '../../lib/fixtures';

const meta={...demoMeta,data_mode:'real' as const};

test('first paint covers unfinished graphics and reveals only a drawn scene with settled data',async({page},testInfo)=>{
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/v1/catalog/starters',async route=>{await gate;await route.fulfill({json:{results:demoTracks,meta}});});
  await page.goto('/');
  const loader=page.getByRole('region',{name:'Loading music discovery'});
  await expect(loader).toBeVisible();
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  await expect(page.locator('.rack-startup-content')).toHaveAttribute('inert','');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.locator('.rack-fallback-cabinet')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('loading-desktop.png')});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  release();
  await expect(page.locator('main')).toHaveAttribute('data-scene-status','ready');
  await expect(page.locator('.scene-loader')).toBeHidden();
  await expect(page.locator('.scene-loader')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toBeVisible();
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('.scene-loader')).toBeHidden();
  expect(await canvas!.evaluate(el=>el===document.querySelector('.orbital-canvas canvas'))).toBe(true);
  await canvas!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('main')).toHaveAttribute('data-scene-status','unavailable');
  await expect(page.locator('.scene-loader')).toBeHidden();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('failed graphics and catalog requests reveal truthful recovery controls instead of trapping the viewer',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){return String(args[0]).includes('webgl')?null:original.apply(this,args);} as typeof original;
  });
  await page.route('**/v1/catalog/starters',route=>route.fulfill({status:503,json:{code:'unavailable',message:'Unavailable'}}));
  await page.goto('/');
  await expect(page.locator('.scene-loader')).toBeHidden();
  await expect(page.locator('main')).toHaveAttribute('data-scene-status','unavailable');
  await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  await expect(page.locator('.rack-fallback-note')).toBeVisible();
  await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  await page.route('**/v1/catalog/starters',route=>route.fulfill({json:{results:demoTracks,meta}}));
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  await expect(page.locator('.scene-loader')).toBeHidden();
});

test('slow startup offers keyboard access to song controls and reduced motion stays still on a narrow screen',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install();
  await page.addInitScript(()=>Object.defineProperty(document.fonts,'ready',{get:()=>new Promise(()=>{})}));
  await page.route('**/v1/catalog/starters',route=>route.fulfill({json:{results:demoTracks,meta}}));
  await page.goto('/');
  await expect(page.getByRole('region',{name:'Loading music discovery'})).toBeVisible();
  expect(await page.locator('.scene-loader-disc').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:testInfo.outputPath('loading-mobile.png')});
  await page.clock.fastForward(8100);
  await page.getByRole('button',{name:'Use song controls',exact:false}).press('Enter');
  await expect(page.locator('.scene-loader')).toBeHidden();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.locator('.rack-fallback-cabinet')).toBeHidden();
});
