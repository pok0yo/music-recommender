import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import approved from '../../lib/approved-starters.json';
import {validTrack} from '../../lib/contracts';

test('the public starting catalog exactly matches the supported panel',()=>{
  const panel=JSON.parse(readFileSync('docs/evidence/stage-6-support-audit-v2.json','utf8')).panel as {supported:boolean;recording_mbid:string|null;artist:string}[];
  const supported=panel.filter(row=>row.supported);
  expect(approved.tracks).toHaveLength(32);expect(approved.tracks.every(validTrack)).toBe(true);
  expect(approved.tracks.map(track=>track.recording_id).sort()).toEqual(supported.map(row=>row.recording_mbid).sort());
  expect(new Set(supported.map(row=>row.artist)).size).toBe(10);
});

test('all 32 starting songs can be browsed, searched and confirmed',async({page})=>{
  test.setTimeout(60_000);await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry');
  await expect(page.locator('.rack-eyebrow')).toContainText('01 of 32');
  await page.getByText('Browse 32 songs',{exact:true}).click();
  const buttons=page.getByRole('navigation',{name:'Song sleeves'}).getByRole('button');await expect(buttons).toHaveCount(32);
  await buttons.last().click();await expect(page.locator('.rack-readout h2')).toHaveText('Garden Kisses');
  await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-rack-count','8');
  expect(new URL(page.url()).searchParams.has('seed')).toBe(false);
  await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('typical');
  for(const name of new Set(approved.tracks.map(track=>track.artist_credits[0].name))){
    await page.getByRole('searchbox').fill(name);await page.getByRole('button',{name:'Search',exact:true}).click();
    await expect(page.locator('.rack-eyebrow')).toContainText('Search matches');
    await expect(page.locator('.rack-artist')).toContainText(name);
  }
  await page.getByRole('searchbox').fill('Mi Amor');await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('Mi Amor');await page.getByRole('button',{name:'Discover',exact:true}).click();
  await expect(page.locator('.rack-current')).toContainText('Mi Amor');
  await expect.poll(()=>new URL(page.url()).searchParams.get('seed')).toBe(approved.tracks.find(track=>track.title==='Mi Amor')!.recording_id);
});
