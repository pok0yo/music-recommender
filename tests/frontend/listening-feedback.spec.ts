import {test,expect} from '@playwright/test';
import {demoTracks,demoMeta} from '../../lib/fixtures';
import {validTrack} from '../../lib/contracts';
import {listeningDestinations} from '../../lib/listening';
import {parseDismissals} from '../../lib/use-feedback';

const route='/prototypes/disc-tray/artwork/orbital-disc?mode=real';
const spotify='https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6';
const linked={...demoTracks[1],listening_links:[{provider:'spotify' as const,url:spotify,verified_at:'2026-10-28T20:00:00Z',verification:'recording_relationship_and_destination' as const}]};
const meta={...demoMeta,data_mode:'real' as const};

test('link validation and storage reject unsafe values without inventing matches',()=>{
  expect(validTrack(linked)).toBe(true);
  expect(validTrack({...linked,listening_links:[{...linked.listening_links[0],url:'https://open.spotify.com.evil.test/track/6rqhFgbbKwnb9MLmUQDhG6'}]})).toBe(false);
  expect(validTrack({...linked,listening_links:[...linked.listening_links,...linked.listening_links]})).toBe(false);
  expect(listeningDestinations(linked).map(d=>d.verified)).toEqual([true,false,false]);
  expect(listeningDestinations({...demoTracks[0],title:'A & B ? / 曲'})[1].url).toContain('term=');
  expect(parseDismissals('{broken')).toEqual([]);
  expect(parseDismissals(JSON.stringify({version:1,ids:['javascript:alert(1)']}))).toEqual([]);
  expect(parseDismissals(JSON.stringify({version:1,ids:[demoTracks[1].recording_id,demoTracks[1].recording_id]}))).toEqual([demoTracks[1].recording_id]);
});

test.beforeEach(async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('http://127.0.0.1:8000/**',async request=>{
    const url=new URL(request.request().url());let body;
    if(url.pathname.endsWith('/starters')||url.pathname.endsWith('/search'))body={results:demoTracks.slice(0,4),meta};
    else {
      const id=url.pathname.split('/').at(-1),seed=demoTracks.find(t=>t.recording_id===id)!;
      const results=[linked,...demoTracks.slice(2,5)].filter(t=>t.recording_id!==id).slice(0,3).map((t,i)=>({...t,rank:i+1,reason_code:'shared_listeners',explanation:'Connected through shared listening in this test.',shared_training_listeners:3,seed_training_listeners:10,candidate_training_listeners:10}));
      body={seed,results,alternatives:[],requested_limit:10,model_result_count:results.length,omitted_metadata_count:0,status:'limited',meta};
    }
    await request.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
});

async function discover(page:import('@playwright/test').Page){
  await page.goto(route);await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
}

test('listen distinguishes exact links from searches; dismiss, undo and reseed preserve the scene',async({page})=>{
  await discover(page);const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  const seed=new URL(page.url()).searchParams.get('seed');
  await page.locator('.rack-listen summary').click();
  await expect(page.getByRole('link',{name:'Open Spotify (opens a new tab)'})).toHaveAttribute('href',spotify);
  await expect(page.getByRole('link',{name:'Search on Apple Music (opens a new tab)'})).toHaveAttribute('target','_blank');
  await page.locator('.rack-listen summary').press('Escape');await expect(page.locator('.rack-listen')).not.toHaveAttribute('open','');
  await page.getByRole('button',{name:'Not for me',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).not.toHaveText('CLOUDS');
  expect(new URL(page.url()).searchParams.get('seed')).toBe(seed);
  await expect(page.locator('.rack-feedback-status')).toContainText('1 hidden by feedback');
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  await page.getByRole('button',{name:'More like this',exact:true}).press('Enter');
  await expect.poll(()=>new URL(page.url()).searchParams.get('seed')).toBe(demoTracks[1].recording_id);
  expect(await canvas!.evaluate(node=>node===document.querySelector('.orbital-canvas canvas'))).toBe(true);
});

test('dismissals survive reload, all-hidden recovery works, and no recommendation request is made by feedback',async({page})=>{
  let calls=0;page.on('request',request=>{if(request.url().includes('/v1/recommendations/'))calls++;});
  await discover(page);await page.getByRole('button',{name:'Not for me',exact:true}).click();await page.reload();
  await expect(page.locator('.rack-feedback-status')).toContainText('1 hidden by feedback');
  await expect(page.locator('.rack-readout h2')).not.toHaveText('CLOUDS');
  await page.getByRole('button',{name:'Not for me',exact:true}).click();await page.getByRole('button',{name:'Not for me',exact:true}).click();
  await expect(page.locator('.rack-readout')).toContainText('All recommendations are hidden');
  await expect(page.getByRole('button',{name:'Discover',exact:true})).toBeDisabled();expect(calls).toBe(2);
  await page.getByRole('button',{name:'Reset feedback',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
});

test('blocked storage, a phone viewport and graphics fallback retain native feedback controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:unknown[]){return String(args[0]).includes('webgl')?null:original.apply(this,args as never);} as typeof original;});
  await discover(page);await page.getByRole('button',{name:'Not for me',exact:true}).click();
  await expect(page.locator('.rack-feedback-status')).toContainText('Feedback works for this visit');
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
