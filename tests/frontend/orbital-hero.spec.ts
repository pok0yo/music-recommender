import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Euler, Matrix4 } from 'three';

const route = '/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry&interface=classic';
const pixels = (canvas: Locator) => canvas.evaluate(async (e: HTMLCanvasElement) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e.toDataURL()));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
});

const modelBounds = (canvas: Locator) => canvas.evaluate((c: HTMLCanvasElement) => {
      const gl = c.getContext('webgl2')!;
      const rgba = new Uint8Array(c.width*c.height*4); gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
      let left=c.width,right=0,top=c.height,bottom=0,opaque=0,pink=0;
      for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
        const i=(y*c.width+x)*4;
        if(rgba[i+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,c.height-1-y);bottom=Math.max(bottom,c.height-1-y);}
        if(rgba[i+3]>240){opaque++;if(rgba[i]>rgba[i+1]+12 && rgba[i+2]>rgba[i+1]+4)pink++;}
      }
      const rect=c.getBoundingClientRect(), scale=rect.width/c.width;
      return {left:rect.x+left*scale,right:rect.x+right*scale,top:rect.y+top*scale,bottom:rect.y+bottom*scale,
        pinkFraction:pink/opaque,unclipped:left>1 && top>1 && right<c.width-2 && bottom<c.height-2};
    });

test('staged 3D silhouette fits its environment and leaves controls clear', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion:'reduce' });
  for (const width of [320,390,550,569,768,1024,1253,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(route);
    await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
    const canvas = page.locator('.orbital-canvas canvas');
    const bounds = await modelBounds(canvas);
    expect(bounds.unclipped).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    expect(await page.locator('.orbital-hero').evaluate(e => getComputedStyle(e).backgroundImage)).toContain('disc-stage-soft-focus.webp');
    const scene=(await page.locator('.orbital-hero').boundingBox())!;
    expect(bounds.left).toBeGreaterThanOrEqual(scene.x-1);
    expect(bounds.right).toBeLessThanOrEqual(scene.x+scene.width+1);
    expect(bounds.top).toBeGreaterThanOrEqual(scene.y-1);
    expect(bounds.bottom).toBeLessThanOrEqual(scene.y+scene.height+1);
    if(width>=1024){
      const tray=(await page.locator('.disc-tray > .glass-shell').first().boundingBox())!;
      const notice=(await page.locator('.demo-notice').boundingBox())!;
      const search=(await page.locator('.search-controls').boundingBox())!;
      const hero=(await page.locator('.orbital-hero').boundingBox())!;
      expect(Math.abs(hero.y+hero.height/2-(tray.y+tray.height/2))).toBeLessThan(1);
      expect(bounds.top).toBeGreaterThan(notice.y+notice.height);
      expect(bounds.left).toBeGreaterThan(search.x+search.width);
      if(width===1440){expect(hero.width/tray.width).toBeGreaterThan(.59);expect((await canvas.boundingBox())!.width).toBeGreaterThan(650);}
    } else {
      const choices=(await page.locator('.starting-points').boundingBox())!;
      expect(bounds.top).toBeGreaterThan(choices.y+choices.height);
    }
    if([390,1440].includes(width)) expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
});

test('hero uses a separate decoded plate independently of the page finish',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route);
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.evaluate(()=>document.fonts.ready);
  const scene=page.locator('.orbital-hero'), before=await scene.boundingBox();
  await page.getByRole('combobox',{name:'Background finish'}).selectOption('crisp');
  expect(await scene.boundingBox()).toEqual(before);
  expect(await scene.evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('disc-stage-soft-focus.webp');
  expect(await page.locator('.app-surface').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('extended-crisp-wide.webp');
  expect(await page.evaluate(async()=>{const image=new Image();image.src='/artwork/disc-tray/environment/disc-stage-soft-focus.webp';await image.decode();return [image.naturalWidth,image.naturalHeight];})).toEqual([1440,900]);
  const tray=(await page.locator('.disc-tray > .glass-shell').first().boundingBox())!;
  const search=(await page.locator('.search-controls').boundingBox())!;
  expect(search.x-tray.x).toBeLessThan(50);
  expect(search.x+search.width).toBeLessThan(before!.x);
});

test('idle and hover animate while reduced motion, hidden pages and offscreen views stop rendering', async ({ page }) => {
  await page.goto(route);
  const hero=page.locator('.orbital-hero'), host=page.locator('.orbital-canvas'), canvas=host.locator('canvas');
  await expect(hero).toHaveAttribute('data-model-ready','true');
  await expect(page.getByRole('button',{name:/Pause motion|Resume motion/})).toHaveCount(0);
  await expect(host).toHaveAttribute('data-render-state','running');
  const idle=await pixels(canvas);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(() => pixels(canvas)).not.toBe(idle);
  await hero.hover({position:{x:300,y:180}});
  await expect(host).toHaveAttribute('data-render-state','running');
  await expect.poll(() => pixels(canvas)).not.toBe(idle);
  await page.mouse.move(0,0);
  await expect(host).toHaveAttribute('data-render-state','running');
  const afterLeave=await pixels(canvas);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(() => pixels(canvas)).not.toBe(afterLeave);
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(host).toHaveAttribute('data-render-state','hidden');
  const hidden=await pixels(canvas); await page.waitForTimeout(100); expect(await pixels(canvas)).toBe(hidden);
  await page.evaluate(() => { Object.defineProperty(document,'hidden',{configurable:true,value:false}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(host).toHaveAttribute('data-render-state','running');
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

test('rendered whole-model Y turn and half-turn oscillation retain bobbing, hover and framing',async({page})=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:1280,height:800});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date('2026-10-23T12:00:00Z')});
  await page.addInitScript(()=>{
    Reflect.set(window,'orbitalMatrices',[]);
    const names=new WeakMap<WebGLUniformLocation,string>();
    const location=WebGL2RenderingContext.prototype.getUniformLocation;
    WebGL2RenderingContext.prototype.getUniformLocation=function(...args){
      const result=location.apply(this,args); if(result)names.set(result,args[1]); return result;
    };
    const clear=WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear=function(...args){
      if((this.canvas as HTMLCanvasElement).parentElement?.classList.contains('orbital-canvas'))Reflect.set(window,'orbitalMatrices',[]);
      return clear.apply(this,args);
    };
    const matrix=WebGL2RenderingContext.prototype.uniformMatrix4fv;
    WebGL2RenderingContext.prototype.uniformMatrix4fv=function(...args){
      if(args[0] && names.get(args[0])==='modelViewMatrix' && (this.canvas as HTMLCanvasElement).parentElement?.classList.contains('orbital-canvas')){
        (Reflect.get(window,'orbitalMatrices') as number[][]).push(Array.from(args[2]));
      }
      return matrix.apply(this,args);
    };
  });
  await page.goto(route+'&water=still');
  await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-render-state','still');
  await page.clock.pauseAt(new Date('2026-10-23T13:00:00Z'));
  const matrices=()=>page.evaluate(()=>Reflect.get(window,'orbitalMatrices') as number[][]);
  const first=await matrices(), heights:number[]=[];
  const frontColor=(await modelBounds(page.locator('.orbital-canvas canvas'))).pinkFraction;
  expect(frontColor).toBeGreaterThan(.015);
  expect(first.length).toBeGreaterThan(0);
  const ring=(values:number[][])=>values.find(m=>Math.abs(Math.hypot(m[0],m[1],m[2])-1.13)<.001)!;
  expect(ring(first)).toBeDefined();
  const outer=new Matrix4().makeRotationFromEuler(new Euler(.12,-.32,.18));
  const initialRotation=new Matrix4().extractRotation(new Matrix4().fromArray(ring(first)));
  const pose=(values:number[][])=>{
    // Cancel the default outer tilt and fixed ring orientation from the GPU transform.
    const rotation=outer.clone().invert().multiply(new Matrix4().extractRotation(new Matrix4().fromArray(ring(values))))
      .multiply(initialRotation.clone().invert()).multiply(outer);
    const angles=new Euler().setFromRotationMatrix(rotation,'YXZ');
    return {yaw:angles.y,roll:angles.z<-.001 ? angles.z+Math.PI*2 : Math.max(0,angles.z)};
  };
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.runFor(32);
  await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-render-state','running');
  for(let second=0;second<7;second++){
    await page.clock.runFor(1000);
    heights.push(ring(await matrices())[13]);
  }
  const last=await matrices();
  const early=pose(last);
  expect(early.yaw).toBeGreaterThan(.25); expect(early.yaw).toBeLessThan(.32);
  expect(early.roll).toBeGreaterThan(0); expect(early.roll).toBeLessThan(.15);
  const travel=Math.max(...heights)-Math.min(...heights);
  expect(travel).toBeGreaterThan(.08); expect(travel).toBeLessThan(.125);
  await page.mouse.move(1200,200);
  await page.clock.runFor(500);
  const hover=await matrices();
  expect(Math.abs(ring(hover)[2]-ring(last)[2])).toBeGreaterThan(.04);
  await page.mouse.move(0,0);
  await page.clock.runFor(1000);
  expect(Math.abs(ring(await matrices())[2]-ring(hover)[2])).toBeGreaterThan(.04);
  const canvas=page.locator('.orbital-canvas canvas'), stage=(await page.locator('.orbital-hero').boundingBox())!;
  const poses:{yaw:number;roll:number}[]=[];
  const colors:number[]=[];
  let previousYaw=pose(await matrices()).yaw,totalYaw=previousYaw;
  for(let quarter=0;quarter<4;quarter++){
    await page.clock.runFor(40_000);
    const current=pose(await matrices()); poses.push(current);
    const advance=Math.atan2(Math.sin(current.yaw-previousYaw),Math.cos(current.yaw-previousYaw));
    expect(advance).toBeGreaterThan(1.5); expect(advance).toBeLessThan(1.7);
    totalYaw+=advance; previousYaw=current.yaw;
    expect(current.roll).toBeGreaterThanOrEqual(0); expect(current.roll).toBeLessThanOrEqual(Math.PI+.01);
    const bounds=await modelBounds(canvas);
    colors.push(bounds.pinkFraction);
    if(quarter===1)expect(bounds.pinkFraction).toBeGreaterThan(.015);
    expect(bounds.unclipped).toBe(true);
    expect(bounds.left).toBeGreaterThanOrEqual(stage.x);
    expect(bounds.right).toBeLessThanOrEqual(stage.x+stage.width);
    expect(bounds.top).toBeGreaterThanOrEqual(stage.y);
    expect(bounds.bottom).toBeLessThanOrEqual(stage.y+stage.height);
    await page.screenshot({path:test.info().outputPath(`whole-turn-${quarter+1}.png`)});
  }
  expect(totalYaw).toBeGreaterThan(Math.PI*2);
  expect(poses[1].roll).toBeGreaterThan(poses[0].roll);
  expect(poses[1].roll).toBeGreaterThan(Math.PI-.3);
  expect(poses[2].roll).toBeLessThan(poses[1].roll);
  expect(poses[3].roll).toBeLessThan(poses[2].roll);
  expect(poses[3].roll).toBeLessThan(.4);
  test.info().annotations.push({type:'idle-motion',description:JSON.stringify({early_pose:early,sampled_poses:poses,total_yaw:totalYaw,bob_peak_to_peak_scene_units:travel,front_pink_fraction:frontColor,sampled_pink_fractions:colors,full_turn_framing:true})});
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
  await expect(page.locator('.track-row')).toHaveCount(10); await expect(page.locator('.orbital-hero')).toHaveClass(/is-docked/);
});

test('keyboard order prioritizes song choices, results dock the model and About removes it', async ({ page }) => {
  await page.setViewportSize({width:550,height:766}); await page.goto(route);
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.getByRole('searchbox').focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Search',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Browse starting songs',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.starter-button').first()).toBeFocused();
  await expect(page.locator('.orbital-hero').getByRole('button')).toHaveCount(1);
  await expect(page.locator('.disc-selector')).toHaveAttribute('inert','');
  await page.locator('.starter-button').first().click();
  await expect(page.locator('.track-row')).toHaveCount(10); await expect(page.locator('.orbital-hero')).toHaveClass(/is-docked/);
  await page.getByRole('button',{name:'Change song',exact:true}).click();
  await expect(page.getByRole('searchbox')).toBeFocused(); await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
  await page.getByRole('link',{name:'How it works',exact:true}).click();
  await expect(page.locator('.orbital-hero')).toHaveCount(0);
});
