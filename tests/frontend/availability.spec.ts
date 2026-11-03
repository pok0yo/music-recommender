import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {demoMeta,demoTracks} from '../../lib/fixtures';
import {validCatalog,recommendationHint} from '../../lib/contracts';

const meta={...demoMeta,data_mode:'real' as const};
const zero={...demoTracks[0],available_recommendations:0};
const partial={...demoTracks[1],available_recommendations:3};
const unknown={...demoTracks[2]};

test('availability accepts older responses and rejects invalid counts',()=>{
  for(const count of [undefined,null,0,3,10]){
    expect(validCatalog({results:[{...zero,available_recommendations:count}],meta},'real')).toBe(true);
  }
  for(const count of [-1,11,1.5,true,'0'])expect(validCatalog({results:[{...zero,available_recommendations:count}],meta},'real')).toBe(false);
  expect(recommendationHint(zero)).toBe('No recommendations available yet');
  expect(recommendationHint({...zero,available_recommendations:1})).toBe('1 recommendation available');
  expect(recommendationHint(partial)).toBe('3 recommendations available');
  expect(recommendationHint(unknown)).toBeUndefined();
  expect(recommendationHint({...unknown,available_recommendations:10})).toBeUndefined();
});

test('zero availability keeps listening and browsing while blocking HTML and scene confirmation',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){return String(args[0]).includes('webgl')?null:original.apply(this,args);} as typeof original;
  });
  let recommendations=0;
  await page.route('http://127.0.0.1:8000/**',route=>{
    if(route.request().url().includes('/recommendations/')){recommendations++;return route.abort();}
    return route.fulfill({json:{results:[zero,partial,unknown],meta}});
  });
  await page.goto('/');
  await expect(page.locator('.scene-loader')).toHaveCount(0);
  await expect(page.locator('#rack-availability')).toContainText('You can still listen');
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('availability-desktop.png')});
  await page.locator('.orbital-hero').press('Enter');
  expect(recommendations).toBe(0);expect(new URL(page.url()).searchParams.has('seed')).toBe(false);
  await page.locator('.rack-listen > summary').click();
  await expect(page.getByRole('link',{name:/Search on Spotify/})).toBeVisible();
  await page.locator('.rack-listen > summary').click();
  await page.getByText('Browse 3 songs',{exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Song sleeves'})).toContainText('No recommendations available yet');
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('#rack-availability')).toHaveText('3 recommendations available.');
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('#rack-availability')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Previous song',exact:true}).click();
  await page.getByRole('button',{name:'Previous song',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('availability-narrow.png'),fullPage:true});
});

test('an onward-empty recommendation cannot be reseeded, and legacy seed actions show the same hint',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  let requests=0;
  const results=[zero,unknown,{...demoTracks[3],available_recommendations:10}].map((t,i)=>({...t,rank:i+1,reason_code:'shared_listeners',explanation:'Shared listening test.',shared_training_listeners:3,seed_training_listeners:5,candidate_training_listeners:5}));
  await page.route('http://127.0.0.1:8000/**',route=>{
    if(route.request().url().includes('/recommendations/')){
      requests++;
      const empty=route.request().url().includes(zero.recording_id);
      return route.fulfill({json:{seed:empty?zero:partial,results:empty?[]:results,alternatives:[],requested_limit:10,model_result_count:empty?10:3,omitted_metadata_count:empty?10:0,status:'limited',meta}});
    }
    return route.fulfill({json:{results:[partial,zero],meta}});
  });
  await page.goto('/');await expect(page.locator('.scene-loader')).toHaveCount(0);
  await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.getByRole('button',{name:'More like this',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeDisabled();
  await page.locator('.orbital-hero').press('Enter');expect(requests).toBe(1);
  await page.locator('.rack-listen > summary').click();
  await expect(page.getByRole('link',{name:/Search on Apple Music/})).toBeVisible();
  for(let variant=1;variant<=5;variant++){
    await page.goto(`/variants/v${variant}`);
    await expect(page.locator('.starter-button').filter({hasText:'typical'})).toBeDisabled();
    await expect(page.locator('.starter-button').filter({hasText:'typical'})).toContainText('No recommendations available yet');
  }
  await page.goto(`/?seed=${zero.recording_id}`);
  await expect(page.locator('.rack-readout h2')).toHaveText('Song details unavailable');
  await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  expect(requests).toBe(2);
});
