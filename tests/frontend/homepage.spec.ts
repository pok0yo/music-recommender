import {test,expect} from '@playwright/test';
import {demoMeta,demoTracks} from '../../lib/fixtures';

const meta={...demoMeta,data_mode:'real' as const};

test.beforeEach(async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('http://127.0.0.1:8000/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/starters'))return route.fulfill({json:{results:demoTracks.slice(0,4),meta}});
    if(url.pathname.endsWith('/search'))return route.fulfill({json:{results:[demoTracks[1]],meta}});
    const seed=demoTracks.find(t=>url.pathname.endsWith(t.recording_id))!;
    const results=demoTracks.filter(t=>t!==seed).slice(0,3).map((t,i)=>({...t,rank:i+1,reason_code:'shared_listeners',explanation:'Connected through shared listening in this test.',shared_training_listeners:3,seed_training_listeners:10,candidate_training_listeners:10}));
    return route.fulfill({json:{seed,results,alternatives:[],requested_limit:10,model_result_count:results.length,omitted_metadata_count:0,status:'limited',meta}});
  });
});

test('homepage uses the selected real interface, with explicit demo and development access',async({page})=>{
  await page.goto('/');
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await expect(page).toHaveTitle('Music Recommender — discover your next song');
  await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  await expect(page.locator('.rack-dev-bar')).toHaveCount(0);
  await page.getByRole('button',{name:'Details +',exact:true}).click();
  await expect(page.locator('#rack-details')).toContainText('limited, verified catalog');
  await expect(page.locator('#rack-details')).toContainText('Feedback stays on this device');
  await expect(page.locator('.rack-listen summary')).toBeVisible();
  await page.goto('/?mode=demo');
  await expect(page.locator('.rack-catalog-note')).toContainText('Demonstration only');
  await expect(page.locator('.rack-listen')).toHaveCount(0);
  await page.getByRole('link',{name:'Use trained recommendations'}).click();
  await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  await page.goto('/?dev=1');
  await page.getByText('Environment controls',{exact:true}).click();
  await expect(page.getByRole('slider',{name:'Color intensity'})).toBeVisible();
});

test('shared searches, reload, seed links, Back and Forward restore the same discovery states',async({page})=>{
  await page.goto('/?q=Tiffany');
  await expect(page.getByRole('searchbox')).toHaveValue('Tiffany');
  await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  await page.reload();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await expect.poll(()=>new URL(page.url()).searchParams.get('seed')).toBe(demoTracks[1].recording_id);
  await page.goBack();
  await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');
  await expect(page.locator('.rack-current')).toHaveCount(0);
  expect(await canvas!.evaluate(e=>e===document.querySelector('.orbital-canvas canvas'))).toBe(true);
  await page.goForward();
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await page.reload();
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await expect(page.locator('.rack-eyebrow')).toContainText('Recommendations');
  await page.getByRole('searchbox').fill('Daniel');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');
  expect(new URL(page.url()).searchParams.has('seed')).toBe(false);
  await page.goBack();
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await expect(page.locator('.rack-eyebrow')).toContainText('Recommendations');
});

test('a new search cancels a pending seed request so it cannot rewrite the shared URL',async({page})=>{
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/v1/recommendations/**',async route=>{await gate;await route.fulfill({status:503,json:{code:'unavailable',message:'Unavailable'}}).catch(()=>{});});
  await page.goto('/');
  await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  const request=page.waitForRequest('**/v1/recommendations/**');
  await page.getByRole('button',{name:'Discover',exact:true}).click();await request;
  const canceled=page.waitForEvent('requestfailed',{predicate:r=>r.url().includes('/v1/recommendations/')});
  await page.getByRole('searchbox').fill('Tiffany');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await canceled;release();
  await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  expect(new URL(page.url()).searchParams.get('q')).toBe('Tiffany');
  expect(new URL(page.url()).searchParams.has('seed')).toBe(false);
});

test('existing Orbital links restore seed context and invalid search links show a recoverable error',async({page})=>{
  await page.goto(`/prototypes/disc-tray/artwork/orbital-disc?q=Tiffany&seed=${demoTracks[1].recording_id}`);
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
  await expect(page.getByRole('searchbox')).toHaveValue('Tiffany');
  await expect(page.locator('.rack-dev-bar')).toHaveCount(0);
  await page.goto('/?q=x');
  await expect(page.locator('.rack-display [role=alert]')).toContainText('between 2 and 200');
  await expect(page.getByRole('searchbox')).toHaveValue('x');
  await page.getByRole('searchbox').fill('Tiffany');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
});

test('software rendering keeps the 3D scene and native song controls within its pixel budget',async({page})=>{
  await page.goto('/');
  const host=page.locator('.orbital-canvas');
  await expect(host).toHaveAttribute('data-rack','true');
  const graphics=await host.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>{
    const gl=canvas.getContext('webgl2')!,info=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=String(gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
    return {renderer,width:canvas.width,cssWidth:canvas.clientWidth};
  });
  const software=/swiftshader|llvmpipe|softpipe|software/i.test(graphics.renderer);
  console.log('Graphics calibration',graphics,software?'software':'full');
  await expect(host).toHaveAttribute('data-render-quality',software?'software':'full');
  if(software)expect(graphics.width).toBeLessThanOrEqual(Math.ceil(graphics.cssWidth*.75));
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.locator('.rack-current')).toContainText('CLOUDS');
});

test('missing display metadata is distinguished from a model with no connections',async({page})=>{
  await page.route('**/v1/recommendations/**',route=>route.fulfill({json:{seed:demoTracks[0],results:[],alternatives:[],requested_limit:10,model_result_count:10,omitted_metadata_count:10,status:'limited',meta}}));
  await page.goto(`/?seed=${demoTracks[0].recording_id}`);
  await expect(page.locator('.rack-readout h2')).toHaveText('Song details unavailable');
  await expect(page.locator('.rack-readout')).toContainText('Connections were found');
  await expect(page.locator('.rack-message')).toContainText('10 model results have no verified display metadata');
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeDisabled();
  await expect(page.locator('.rack-data-label')).toHaveText('Trained recommendations');
  await page.getByRole('searchbox').fill('Tiffany');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
});
