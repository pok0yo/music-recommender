import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Inactive release: use responses produced by the real API's snapshot verifier.
const cases=JSON.parse(await readFile('data/processed/catalog-expansion-v2/ui-cases.json','utf8'));
const live=process.argv.includes('--live');
const browser=await chromium.launch({channel:'chrome'}),samples=[],errors=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const responses=[];page.on('response',response=>{if(live&&response.url().startsWith('http://127.0.0.1:8000/'))responses.push(response);});
  page.on('pageerror',error=>errors.push(error.message));
  if(!live)await page.route('http://127.0.0.1:8000/**',async route=>{
    const url=new URL(route.request().url());let body;
    if(url.pathname==='/v1/catalog/starters')body=cases.starters;
    else if(url.pathname==='/v1/catalog/search')body=cases.searches[url.searchParams.get('q')];
    else if(url.pathname.startsWith('/v1/recommendations/'))body=cases.recommendations[url.pathname.split('/').at(-1)];
    assert(body,`Unverified pending API request: ${url.pathname}`);
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:3000/prototypes/disc-tray/artwork/orbital-disc?mode=real');
  await page.getByText('Browse 32 songs',{exact:true}).waitFor();
  assert.equal(await page.locator('.rack-data-label').innerText(),'Trained recommendations');
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  for(const [artist,track] of Object.entries(cases.selections)){
    await page.getByRole('searchbox').fill(artist);await page.getByRole('button',{name:'Search',exact:true}).click();
    const search=cases.searches[artist];
    await page.getByText(`Browse ${search.results.length} songs`,{exact:true}).waitFor();
    const list=page.locator('.rack-song-list');if(!await list.evaluate(node=>node.open))await list.locator('summary').click();
    await page.getByRole('navigation',{name:'Song sleeves'}).getByRole('button').nth(search.results.findIndex(r=>r.recording_id===track.recording_id)).click();
    await page.getByRole('button',{name:'Discover',exact:true}).click();
    const expected=cases.recommendations[track.recording_id];
    await page.waitForFunction(title=>document.querySelector('.rack-readout h2')?.textContent===title,expected.results[0].title);
    assert.equal(new URL(page.url()).searchParams.get('seed'),track.recording_id);
    await page.getByRole('button',{name:'Details +',exact:true}).click();
    assert.match(await page.locator('#rack-details').innerText(),/Shared training listeners/);
    await page.getByRole('button',{name:'Discover',exact:true}).click();
    const child=expected.results[0].recording_id;
    await page.waitForFunction(seed=>new URL(location.href).searchParams.get('seed')===seed,child);
    samples.push({artist,selected:track.title,recommended:expected.results[0].title,reseeded:true});
    await page.getByRole('button',{name:'Change starting song',exact:true}).click();
  }
  assert(await canvas.evaluate(node=>node===document.querySelector('.orbital-canvas canvas')));
  assert.deepEqual(errors,[]);
  if(live){assert(responses.length>=10);for(const response of responses){assert.equal(response.status(),200);const body=await response.json();assert.equal(body.meta.catalog_version,cases.starters.meta.catalog_version);assert.equal(body.meta.data_mode,'real');}}
  await writeFile(`docs/evidence/catalog-expansion-v2-${live?'activation-ui':'ui'}.json`,JSON.stringify({passed:true,activated:live,catalogVersion:cases.starters.meta.catalog_version,samples,errors,canvasRetained:true,scope:live?'Live real-mode website requests to the activated local PostgreSQL catalog':'Real-model pending API response replay in real-mode UI; active catalog unchanged',limitations:[...(live?[]:['Not a live PostgreSQL release activation']),'Physical-device and Safari checks not performed']},null,2)+'\n');
  console.log(JSON.stringify({passed:true,samples}));
} finally {await browser.close();}
