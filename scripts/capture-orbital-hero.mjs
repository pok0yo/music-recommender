import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const route = 'http://127.0.0.1:3000/prototypes/disc-tray/artwork/orbital-disc';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  if (process.argv.includes('--export-fallback')) {
    const page = await browser.newPage({ viewport: { width:1440, height:1000 }, deviceScaleFactor:1.25, reducedMotion:'reduce' });
    await page.goto(`${route}?mode=demo&fixture=entry`);
    await page.locator('.orbital-hero[data-model-ready]').waitFor();
    await page.locator('.orbital-hero').evaluate(e => { e.style.width='1600px'; e.style.height='1280px'; });
    const canvas = page.locator('.orbital-canvas canvas');
    await expect.poll(() => canvas.evaluate(e => [e.width,e.height])).toEqual([2000,1600]);
    const data = await canvas.evaluate(e => e.toDataURL('image/png'));
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    const path = `public/artwork/disc-tray/orbital-disc-model-${sha256(bytes).slice(0,12)}.png`;
    await writeFile(path, bytes);
    await writeFile('docs/art-direction/orbital-disc-model.json', JSON.stringify({
      observed_at:new Date().toISOString(), path, public_url:path.slice(6), width:2000, height:1600, sha256:sha256(bytes),
      origin:'Direct transparent PNG export from locally authored Three.js geometry, PBR thin-film/spectrum materials and sky/area-panel lighting. No AI-generated or reference pixels.',
      renderer:'three0.186.1 / Chrome '+browser.version(),
      sources:Object.fromEntries(await Promise.all(['components/orbital-scene.ts','components/orbital-hero.tsx'].map(async path => [path,sha256(await readFile(path))]))),
      license:'Original scene source belongs to this project; Three.js MIT notice retained in public/third-party/three/LICENSE.',
    },null,2)+'\n');
    console.log(path);
  } else {
    const name = process.argv.includes('--atmosphere') ? 'stage-9-disc-tray-atmosphere' : 'stage-9-orbital-centered';
    const output = 'docs/evidence/'+name;
    await mkdir(output,{recursive:true});
    const evidence = { observed_at:new Date().toISOString(), browser:browser.version(), data:'Demonstration fixtures only', captures:[] };
    const page = await browser.newPage();
    for (const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['user',550,766],['live',569,792],['medium',1253,705],['live-wide',1305,792]]) {
      await page.setViewportSize({width,height});
      for (const state of ['entry','tilt','fallback','results','about']) {
        await page.emulateMedia({reducedMotion: state === 'fallback' ? 'reduce' : 'no-preference'});
        await page.goto(`${route}${state === 'about' ? '/about' : ''}?mode=demo&fixture=${state === 'results' ? 'ten' : 'entry'}`);
        await page.locator(state === 'about' ? '.about-preview h1' : state === 'results' ? '.track-row' : '.starter-button').first().waitFor();
        if (!['about','results'].includes(state)) {
          await page.locator('.orbital-hero[data-model-ready]').waitFor();
          if (state === 'tilt') {
            await page.locator('.orbital-hero').scrollIntoViewIfNeeded();
            const box = await page.locator('.orbital-hero').boundingBox();
            await page.mouse.move(box.x+box.width*.8,box.y+box.height*.4);
            await page.waitForTimeout(500); // Capture the eased pose, never evidence of measured frame-rate.
          }
          if (state === 'fallback') { await page.locator('.orbital-canvas canvas').evaluate(e => e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()); await expect(page.locator('.orbital-fallback')).toBeVisible(); }
          await page.locator('.orbital-fallback').evaluate(e => e.decode());
        }
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0,0));
        const path = `${output}/${device}-${state}.png`;
        await page.screenshot({path,fullPage:true});
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        if (pageWidth > width+1) throw new Error(`Overflow in ${path}`);
        evidence.captures.push({path,state,device,viewport:{width,height},pageWidth,sha256:sha256(await readFile(path))});
        await page.mouse.move(0,0); console.log(path);
      }
    }
    await writeFile('docs/evidence/'+name+'-captures.json',JSON.stringify(evidence,null,2)+'\n');
  }
} finally { await browser.close(); }
