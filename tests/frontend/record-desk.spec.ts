import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {demoID,demoMeta,demoTracks} from '../../lib/fixtures';
import {mkdir} from 'node:fs/promises';
import {PerspectiveCamera,Vector3} from 'three';
import approvedStarters from '../../lib/approved-starters.json';

const route='/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=';
const out='docs/evidence/stage-9-record-desk';

test('environment sliders update the mounted scene and reset to softer defaults',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route+'entry&dev=1');
  const host=page.locator('.orbital-canvas');await expect(host).toHaveAttribute('data-rack','true');
  const canvas=await host.locator('canvas').elementHandle();
  await page.getByText('Environment controls',{exact:true}).click();
  const intensity=page.getByRole('slider',{name:'Color intensity'});
  await expect(intensity).toHaveValue('0.55');
  const before=await host.locator('canvas').screenshot();
  await intensity.fill('0');await intensity.dispatchEvent('input');
  await expect(intensity).toHaveValue('0');await page.waitForTimeout(150);
  expect((await host.locator('canvas').screenshot()).equals(before)).toBe(false);
  await page.getByRole('slider',{name:'Sun height'}).fill('0.3');
  await page.getByRole('button',{name:'Reset environment'}).click();
  await expect(intensity).toHaveValue('0.55');
  expect(await canvas!.evaluate(node=>node===document.querySelector('.orbital-canvas canvas'))).toBe(true);
});

test('physical sleeves preview without confirming and the loaded CD recalls its seed',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route+'entry');
  const host=page.locator('.orbital-canvas');await expect(host).toHaveAttribute('data-rack','true');
  const box=(await host.boundingBox())!,camera=new PerspectiveCamera(35,box.width/box.height,.1,2000),target=new Vector3(0,.15,0);
  camera.position.copy(new Vector3(.53,.2,.79).normalize().multiplyScalar(19.5)).add(target);camera.lookAt(target);camera.setViewOffset(box.width,box.height,210,0,box.width,box.height);camera.updateMatrixWorld();
  const click=async(point:Vector3)=>{point.project(camera);await page.mouse.click(box.x+(point.x+1)*box.width/2,box.y+(1-point.y)*box.height/2);};
  await click(new Vector3(2.69,-.3,.85));await expect(page.locator('.rack-readout h2')).toHaveText(approvedStarters.tracks[7].title);
  expect(new URL(page.url()).searchParams.has('seed')).toBe(false);await expect(host).toHaveAttribute('data-rack-phase','browsing');
  await page.getByRole('button',{name:'Discover',exact:true}).click();await expect(host).toHaveAttribute('data-rack-phase','loaded');
  await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  await click(new Vector3(-.68,1.865,0));await expect(page.locator('.rack-readout h2')).toHaveText(approvedStarters.tracks[7].title);
  await expect(page.locator('.rack-eyebrow')).toContainText('Current starting song');
});

test('search, preview, discover, evidence and reseeding share one mounted scene',async({page})=>{
  test.setTimeout(process.env.CI||process.env.PLAYWRIGHT_SOFTWARE?90_000:45_000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(route+'entry');const host=page.locator('.orbital-canvas'),title=page.locator('.rack-readout h2');
  await expect(host).toHaveAttribute('data-rack','true');const canvas=await host.locator('canvas').elementHandle();
  await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(title).toHaveText('CLOUDS');
  await expect(host).toHaveAttribute('data-rack-phase','browsing');expect(new URL(page.url()).searchParams.has('seed')).toBe(false);
  await page.getByRole('searchbox').fill('Daniel');await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(title).toHaveText('Always');await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.locator('.rack-current')).toContainText('Always');await expect(title).toHaveText('typical');
  await expect(host).toHaveAttribute('data-rack-phase','loaded');
  expect(new URL(page.url()).searchParams.get('seed')).toBe(approvedStarters.tracks[2].recording_id);
  await page.getByRole('button',{name:'Details +',exact:true}).click();await expect(page.locator('#rack-details')).toContainText('Connected through shared listening');
  await expect(page.locator('#rack-details')).toContainText('illustrative, not model results');
  await mkdir(out,{recursive:true});await page.screenshot({path:out+'/details.png'});
  await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('#rack-details')).toBeHidden();
  await expect(title).toHaveText('CLOUDS');await expect(page.locator('.rack-current')).toContainText('Always');
  await page.getByRole('button',{name:'Discover',exact:true}).click();await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await expect.poll(()=>new URL(page.url()).searchParams.get('seed')).toBe(approvedStarters.tracks[1].recording_id);
  await page.goBack();await expect(page.locator('.rack-current')).toContainText('Always');
  await page.getByRole('button',{name:'Change starting song',exact:true}).click();await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(host).toHaveAttribute('data-rack-phase','browsing',{timeout:18_000});
  expect(await host.locator('canvas').evaluate((element,old)=>element===old,canvas)).toBe(true);expect(errors).toEqual([]);
});

test('reduced motion keeps every song, current seed and camera controls usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route+'ten');const host=page.locator('.orbital-canvas');
  await expect(host).toHaveAttribute('data-render-state','still');await page.getByText('Browse 10 songs',{exact:true}).click();
  await page.getByRole('navigation',{name:'Song sleeves'}).getByRole('button').last().click();
  await expect(host).toHaveAttribute('data-rack-count','2');await expect(page.locator('.rack-current')).toContainText('typical');
  const figure=page.locator('.orbital-hero');await figure.focus();const before=await host.getAttribute('data-orbit-angle');await page.keyboard.press('ArrowLeft');await expect(host).not.toHaveAttribute('data-orbit-angle',before!);
  await page.getByRole('button',{name:'Details +',exact:true}).click();await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(host).toHaveAttribute('data-orbit-angle',before!);
  await page.getByRole('button',{name:/^Starting song typical/}).click();await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('empty, limited, failed and pending requests retain honest recovery',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route+'no-match');await expect(page.locator('.rack-readout h2')).toHaveText('No matching songs');await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeDisabled();
  await page.goto(route+'zero');await expect(page.locator('.rack-readout h2')).toHaveText('No connections yet');await expect(page.locator('.rack-current')).toContainText('typical');
  await page.goto(route+'missing');await expect(page.locator('.rack-message')).toContainText('7 model results');await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('.rack-eyebrow')).toContainText('02 of 3 · rank 3');
  await page.goto(route+'error');await expect(page.locator('.rack-display').getByRole('alert')).toContainText('could not load recommendations');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeEnabled();
  await page.goto(route+'rate-limit');await expect(page.getByRole('button',{name:/Try again in/})).toBeDisabled();
  await page.goto(route+'loading');await expect(page.locator('.rack-eyebrow')).toContainText('Finding connections');
  await page.getByRole('searchbox').fill('Tiffany');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
});

test('phone, long text and graphics fallback keep the display usable',async({page})=>{
  test.setTimeout(60_000);await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto(route+'long');
    await expect(page.locator('.rack-readout h2')).toContainText('A quiet place');
    expect((await page.locator('.orbital-canvas').boundingBox())!.height).toBeGreaterThan(200);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('button',{name:'Details +',exact:true}).click();
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});await page.goto(route+'entry');await expect(page.locator('.rack-readout h2')).toHaveText('typical');await page.screenshot({path:out+'/phone.png'});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof get>){return String(args[0]).includes('webgl')?null:get.apply(this,args);} as typeof get;});
  await page.reload();await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  await page.getByRole('button',{name:'Discover',exact:true}).click();await expect(page.locator('.rack-current')).toContainText('CLOUDS');
});

test('real API requests use selected IDs and never substitute demonstration results',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const meta={...demoMeta,data_mode:'real'};
  await page.route('**/v1/catalog/starters',route=>route.fulfill({json:{results:demoTracks.slice(0,4),meta}}));
  await page.route('**/v1/recommendations/**',route=>route.fulfill({status:503,json:{message:'unavailable'}}));
  await page.goto(route+'entry');await expect(page.getByRole('link',{name:'Use trained recommendations'})).toHaveAttribute('href','?mode=real');
  await page.getByRole('link',{name:'Use trained recommendations'}).click();await expect(page.locator('.rack-readout h2')).toHaveText('typical');await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  const request=page.waitForRequest('**/v1/recommendations/'+demoID(2));await page.getByRole('button',{name:'Discover',exact:true}).click();await request;
  await expect(page.locator('.rack-display').getByRole('alert')).toContainText('temporarily unavailable');await expect(page.locator('.rack-display')).not.toContainText('Demonstration');await expect(page.locator('.rack-current')).toContainText('CLOUDS');
});
