import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';

const route = '/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry';
const pixels = (canvas: Locator) => canvas.evaluate(async (e: HTMLCanvasElement) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e.toDataURL()));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
});

test('floating 3D silhouette is centered in its tray, fits every width and leaves controls clear', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion:'reduce' });
  for (const width of [320,390,550,569,768,1024,1253,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(route);
    await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
    const canvas = page.locator('.orbital-canvas canvas');
    const bounds = await canvas.evaluate((c: HTMLCanvasElement) => {
      const gl = c.getContext('webgl2')!;
      const rgba = new Uint8Array(c.width*c.height*4); gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
      let left=c.width,right=0,top=c.height,bottom=0;
      for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) if(rgba[(y*c.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,c.height-1-y);bottom=Math.max(bottom,c.height-1-y);}
      const rect=c.getBoundingClientRect(), scale=rect.width/c.width;
      return {left:rect.x+left*scale,right:rect.x+right*scale,top:rect.y+top*scale,bottom:rect.y+bottom*scale,
        unclipped:left>1 && top>1 && right<c.width-2 && bottom<c.height-2};
    });
    expect(bounds.unclipped).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator('.orbital-hero').evaluate(e => getComputedStyle(e).backgroundImage)).toBe('none');
    if(width>=768){
      const tray=(await page.locator('.disc-tray > .glass-shell').first().boundingBox())!;
      const notice=(await page.locator('.demo-notice').boundingBox())!;
      const search=(await page.locator('.search-controls').boundingBox())!;
      const hero=(await page.locator('.orbital-hero').boundingBox())!;
      expect(Math.abs(hero.y+hero.height/2-(tray.y+tray.height/2))).toBeLessThan(1);
      expect(bounds.top).toBeGreaterThan(notice.y+notice.height);
      expect(bounds.left).toBeGreaterThan(search.x+search.width);
      if(width===1440){expect(bounds.right).toBeGreaterThan(tray.x+tray.width);expect((await canvas.boundingBox())!.width).toBeGreaterThan(500);}
    } else {
      const choices=(await page.locator('.starting-points').boundingBox())!;
      expect(bounds.top).toBeGreaterThan(choices.y+choices.height);
    }
    if([390,1440].includes(width)) expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
});

test('opaque model pixels paint above the tray rim at its right edge',async({page})=>{
  await page.setViewportSize({width:1920,height:1100});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route);
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  const tray=(await page.locator('.disc-tray > .glass-shell').first().boundingBox())!;
  const clip={x:Math.floor(tray.x+tray.width-6),y:Math.floor(tray.y),width:6,height:Math.ceil(tray.height)};
  const points=await page.locator('.orbital-canvas canvas').evaluate((c:HTMLCanvasElement,clip)=>{
    const gl=c.getContext('webgl2')!,rgba=new Uint8Array(c.width*c.height*4),rect=c.getBoundingClientRect(),points:number[]=[];
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    for(let y=0;y<clip.height;y++)for(let x=0;x<clip.width;x++){
      const px=Math.floor((clip.x+x+.5-rect.x)*c.width/rect.width),py=c.height-1-Math.floor((clip.y+y+.5-rect.y)*c.height/rect.height);
      if(px>=0&&px<c.width&&py>=0&&py<c.height&&rgba[(py*c.width+px)*4+3]===255)points.push((y*clip.width+x)*4);
    }
    return points;
  },clip);
  expect(points.length).toBeGreaterThan(20);
  const before=await sharp(await page.screenshot({clip})).ensureAlpha().raw().toBuffer();
  await page.addStyleTag({content:'.app-surface[data-artwork=orbital-disc] .disc-tray > .glass-shell:first-child::after { visibility:hidden!important; }'});
  const withoutRim=await sharp(await page.screenshot({clip})).ensureAlpha().raw().toBuffer();
  let difference=0;
  for(const offset of points)for(let channel=0;channel<3;channel++)difference=Math.max(difference,Math.abs(before[offset+channel]-withoutRim[offset+channel]));
  test.info().annotations.push({type:'model-rim-pixels',description:JSON.stringify({opaquePixels:points.length,maxChannelDifference:difference})});
  expect(difference).toBeLessThanOrEqual(2);
});

test('idle is still, hover responds and motion stops on leave or reduced motion', async ({ page }) => {
  await page.goto(route);
  const hero=page.locator('.orbital-hero'), host=page.locator('.orbital-canvas'), canvas=host.locator('canvas');
  await expect(hero).toHaveAttribute('data-model-ready','true');
  await expect(page.getByRole('button',{name:/Pause motion|Resume motion/})).toHaveCount(0);
  await expect(host).toHaveAttribute('data-render-state','still');
  const idle=await pixels(canvas);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await pixels(canvas)).toBe(idle);
  await hero.hover({position:{x:300,y:180}});
  await expect(host).toHaveAttribute('data-render-state','running');
  await expect.poll(() => pixels(canvas)).not.toBe(idle);
  await page.mouse.move(0,0);
  await expect(host).toHaveAttribute('data-render-state','still');
  const stopped=await pixels(canvas);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await pixels(canvas)).toBe(stopped);
  await page.emulateMedia({reducedMotion:'reduce'});
  await hero.hover();
  await expect(host).toHaveAttribute('data-render-state','still');
  const reduced=await pixels(canvas); await page.mouse.move(0,0); expect(await pixels(canvas)).toBe(reduced);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:550,height:300}); await page.evaluate(() => scrollTo(0,0));
  await expect(host).toHaveAttribute('data-render-state','offscreen');
  await hero.hover(); await expect(host).toHaveAttribute('data-render-state','running');
  await page.evaluate(() => scrollTo(0,0)); await expect(host).toHaveAttribute('data-render-state','offscreen');
});

test('WebGL unavailable and lost contexts show the real static render while discovery keeps working', async ({ page }) => {
  await page.goto(route);
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.locator('.orbital-canvas canvas').evaluate((e: HTMLCanvasElement) => e.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('.orbital-fallback')).toBeVisible();
  await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toHaveCount(0);
  await page.addInitScript(() => {
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof getContext>){return String(args[0]).includes('webgl') ? null : getContext.apply(this,args);} as typeof getContext;
  });
  await page.reload();
  await expect(page.locator('.orbital-fallback')).toBeVisible();
  await expect.poll(() => page.locator('.orbital-fallback').evaluate((e:HTMLImageElement) => e.complete && e.naturalWidth>0)).toBe(true);
  await page.getByRole('searchbox').fill('Tiffany'); await page.getByRole('searchbox').press('Enter');
  await page.getByRole('button',{name:/CLOUDS.*Use this song/}).click();
  await expect(page.locator('.track-row')).toHaveCount(10); await expect(page.locator('.orbital-hero')).toHaveCount(0);
});

test('keyboard order prioritizes song choices and working/About states remove the model', async ({ page }) => {
  await page.setViewportSize({width:550,height:766}); await page.goto(route);
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.locator('.starter-button').last().focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'How these recommendations work',exact:true})).toBeFocused();
  await page.locator('.starter-button').first().click();
  await expect(page.locator('.track-row')).toHaveCount(10); await expect(page.locator('.orbital-canvas')).toHaveCount(0);
  await page.getByRole('button',{name:'Change song',exact:true}).click();
  await expect(page.getByRole('searchbox')).toBeFocused(); await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.getByRole('link',{name:'About the recommendations',exact:true}).click();
  await expect(page.locator('.orbital-hero')).toHaveCount(0);
});
