import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin=process.env.VERIFY_ORIGIN||'http://127.0.0.1:3000',api=process.env.VERIFY_API_URL||'http://127.0.0.1:8000';
const release=JSON.parse(await readFile('data/processed/catalog-expansion-v2/release.json','utf8'));
const pilotActive=process.argv.includes('--pilot-active');
const links=pilotActive?JSON.parse(await readFile('data/processed/listening-links-v1/links.json','utf8')):[];
function checkLinks(track){assert.deepEqual(track.listening_links,links.filter(link=>link.recording_id===track.recording_id).map(({recording_id,canonical_recording_id,...link})=>link));}
async function get(path){const response=await fetch(api+path);assert.equal(response.status,200);const body=await response.json();assert.equal(body.meta.data_mode,'real');assert.equal(body.meta.catalog_version,release.catalog_version);return body;}
assert.equal((await get('/health/ready')).status,'ready');
const starters=(await get('/v1/catalog/starters')).results;assert.equal(starters.length,32);
starters.forEach(checkLinks);
const seed=starters[0],recommendations=await get('/v1/recommendations/'+seed.recording_id);
assert(recommendations.results.length>1);recommendations.results.forEach(checkLinks);
assert((await get('/v1/catalog/search?q=Tiffany')).results.length>0);
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'}),errors=[],external=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.emulateMedia({reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(origin)&&!request.url().startsWith(api)&&!request.url().startsWith('data:'))external.push(request.url());});
  await page.goto(origin+'/?mode=real');
  await page.getByText('Browse 32 songs',{exact:true}).waitFor();
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  await page.getByRole('button',{name:'Discover',exact:true}).click();
  const title=page.locator('.rack-readout h2');await title.filter({hasText:recommendations.results[0].title}).waitFor();
  await page.locator('.rack-listen summary').click();
  for(const [provider,service] of [['spotify','Spotify'],['apple_music','Apple Music'],['youtube_music','YouTube Music']]){
    const exact=recommendations.results[0].listening_links.find(link=>link.provider===provider);
    const anchor=page.getByRole('link',{name:`${exact?'Open':'Search on'} ${service} (opens a new tab)`});
    assert.equal(await anchor.count(),1);if(exact)assert.equal(await anchor.getAttribute('href'),exact.url);
  }
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
  if(pilotActive){
    for(const [provider,service] of [['spotify','Spotify'],['apple_music','Apple Music'],['youtube_music','YouTube Music']]){
      const sample=links.find(link=>link.provider===provider);assert(sample);
      await page.goto(origin+'/?mode=real&seed='+sample.recording_id);
      await page.locator('.rack-current').click();await page.locator('.rack-listen summary').click();
      assert.equal(await page.getByRole('link',{name:`Open ${service} (opens a new tab)`}).getAttribute('href'),sample.url);
    }
  }
  await page.goto(origin+'/?mode=demo');
  await page.getByText('Listening destinations are available in real mode.',{exact:true}).waitFor();
  assert.equal(await page.locator('.rack-listen a').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();}
const evidence={verified_at:new Date().toISOString(),catalog_version:release.catalog_version,live_real_api:true,starters:starters.length,search:true,listen_services:3,verified_pilot_active:pilotActive,verified_link_counts_by_provider:pilotActive?Object.fromEntries(['spotify','apple_music','youtube_music'].map(provider=>[provider,links.filter(link=>link.provider===provider).length])):null,starters_with_links:starters.filter(track=>track.listening_links.length).length,dismiss_undo_reseed_history:true,retained_canvas:true,demo_destinations_absent:true,unsolicited_external_requests:external.length,page_errors:errors,limitations:['Provider playback and physical devices not tested',...(pilotActive?[]:['Prepared verified links remain inactive'])]};
await writeFile(process.env.VERIFY_REPORT||`docs/evidence/listening-feedback-${pilotActive?'activation-ui':'verification'}.json`,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
