import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin='http://127.0.0.1:3000',api='http://127.0.0.1:8000';
const release=JSON.parse(await readFile('data/processed/catalog-expansion-v2/release.json','utf8'));
async function get(path){const response=await fetch(api+path);assert.equal(response.status,200);const body=await response.json();assert.equal(body.meta.data_mode,'real');assert.equal(body.meta.catalog_version,release.catalog_version);return body;}
assert.equal((await get('/health/ready')).status,'ready');
const starters=(await get('/v1/catalog/starters')).results;assert.equal(starters.length,32);
const seed=starters[0],recommendations=await get('/v1/recommendations/'+seed.recording_id);
assert(recommendations.results.length>1);assert(recommendations.results.every(track=>track.listening_links.length===0));
assert((await get('/v1/catalog/search?q=Tiffany')).results.length>0);
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'}),errors=[],external=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.emulateMedia({reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(origin)&&!request.url().startsWith(api)&&!request.url().startsWith('data:'))external.push(request.url());});
  await page.goto(origin+'/prototypes/disc-tray/artwork/orbital-disc?mode=real');
  await page.getByText('Browse 32 songs',{exact:true}).waitFor();
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  await page.getByRole('button',{name:'Discover',exact:true}).click();
  const title=page.locator('.rack-readout h2');await title.filter({hasText:recommendations.results[0].title}).waitFor();
  await page.locator('.rack-listen summary').click();
  for(const service of ['Spotify','Apple Music','YouTube Music'])assert.equal(await page.getByRole('link',{name:`Search on ${service} (opens a new tab)`}).count(),1);
  await page.locator('.rack-listen summary').press('Escape');
  await page.getByRole('button',{name:'Not for me',exact:true}).click();
  assert.equal(new URL(page.url()).searchParams.get('seed'),seed.recording_id);
  assert((await page.locator('.rack-feedback-status').innerText()).includes('1 hidden by feedback'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await title.innerText(),recommendations.results[0].title);
  const response=page.waitForResponse(api+'/v1/recommendations/'+recommendations.results[0].recording_id);
  await page.getByRole('button',{name:'More like this',exact:true}).click();assert.equal((await response).status(),200);
  await page.getByRole('button',{name:'Not for me',exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('seed'),recommendations.results[0].recording_id);
  await page.goBack();await page.locator('.rack-current').filter({hasText:seed.title}).waitFor();
  assert(await canvas.evaluate(node=>node===document.querySelector('.orbital-canvas canvas')));
  await page.screenshot({path:'test-results/listening-feedback-real.png'});
  await page.goto(origin+'/prototypes/disc-tray/artwork/orbital-disc?mode=demo');
  await page.getByText('Listening destinations are available in real mode.',{exact:true}).waitFor();
  assert.equal(await page.locator('.rack-listen a').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();}
const evidence={verified_at:new Date().toISOString(),catalog_version:release.catalog_version,live_real_api:true,starters:starters.length,search:true,listen_search_fallbacks:3,verified_pilot_active:false,dismiss_undo_reseed_history:true,retained_canvas:true,demo_destinations_absent:true,unsolicited_external_requests:external.length,page_errors:errors,limitations:['Provider playback and physical devices not tested','Prepared verified links remain inactive']};
await writeFile('docs/evidence/listening-feedback-verification.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
