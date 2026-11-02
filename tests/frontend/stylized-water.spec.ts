import {test,expect} from '@playwright/test';
import {createWaterGeometry} from '../../components/stylized-water';

// CPU graphics checks need layout and motion coverage, not full-resolution capture cost.
test.use({deviceScaleFactor:process.env.CI||process.env.PLAYWRIGHT_SOFTWARE ? 0.5 : 1});

test('water keeps its horizon and concentrates bounded geometry around the player',()=>{
  const counts:number[]=[];
  for(const [software,narrow] of [[true,false],[false,true],[false,false]]){
    const geometry=createWaterGeometry(software,narrow),position=geometry.attributes.position;
    counts.push(position.count);geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.toArray()).toEqual([-1000,-1000,0]);
    expect(geometry.boundingBox!.max.toArray()).toEqual([1000,1000,0]);
    expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
    const row=Math.sqrt(position.count),middle=(row-1)/2;
    expect(position.getX(middle+1)-position.getX(middle)).toBeLessThan(position.getX(1)-position.getX(0));
    geometry.dispose();
  }
  expect(counts[0]).toBeLessThan(counts[1]);expect(counts[1]).toBeLessThan(counts[2]);
  expect(counts[2]).toBeLessThan(26_000);
});

test('displaced water compiles, moves, freezes in place and retains the mounted discovery scene',async({page},testInfo)=>{
  test.setTimeout(process.env.CI||process.env.PLAYWRIGHT_SOFTWARE?180_000:30_000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/shader|webgl|three/i.test(message.text()))errors.push(message.text());});
  await page.goto('/?mode=demo&dev=1');
  await expect(page.locator('main')).toHaveAttribute('data-scene-status','ready');
  await expect(page.locator('.scene-loader')).toHaveCount(0);
  const canvas=await page.locator('.orbital-canvas canvas').elementHandle();
  const timing=await page.evaluate(()=>new Promise<{frames:number;median:number;p95:number;max:number}>(resolve=>{
    const intervals:number[]=[];let start=0,previous=0;
    const frame=(now:number)=>{if(!start)start=now;if(previous)intervals.push(now-previous);previous=now;
      if(now-start<3000)requestAnimationFrame(frame);else{intervals.sort((a,b)=>a-b);resolve({frames:intervals.length,median:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1)!});}};
    requestAnimationFrame(frame);
  }));
  await testInfo.attach('water-frame-intervals',{body:JSON.stringify(timing),contentType:'application/json'});
  // Sample open water away from the moving player, its reflection and the HTML controls.
  const water=()=>page.screenshot({clip:{x:25,y:690,width:150,height:150}});
  const moving=await water();await page.waitForTimeout(700);
  expect((await water()).equals(moving)).toBe(false);
  await page.getByRole('button',{name:'Details +',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Pause motion',exact:true}).press('Enter');
  await expect(page.locator('.orbital-hero')).toHaveAttribute('data-motion-paused','true');
  await page.waitForTimeout(350);
  const paused=await water();await page.waitForTimeout(700);
  expect((await water()).equals(paused)).toBe(true);
  await page.getByText('Environment controls',{exact:true}).press('Enter');
  await page.getByRole('slider',{name:'Reflections',exact:true}).fill('0');
  await page.waitForTimeout(150);
  const dry=await page.screenshot({clip:{x:300,y:600,width:400,height:270}});
  await page.getByRole('slider',{name:'Reflections',exact:true}).fill('1');
  await page.waitForTimeout(150);
  expect((await page.screenshot({clip:{x:300,y:600,width:400,height:270}})).equals(dry)).toBe(false);
  await page.getByRole('slider',{name:'Water speed',exact:true}).fill('0');
  await page.getByText('Environment controls',{exact:true}).press('Enter');
  await page.getByRole('button',{name:'Resume motion',exact:true}).press('Enter');
  await page.waitForTimeout(350);
  const stopped=await water();await page.waitForTimeout(700);
  expect((await water()).equals(stopped)).toBe(true);
  await page.getByText('Environment controls',{exact:true}).press('Enter');
  await page.getByRole('button',{name:'Reset environment',exact:true}).press('Enter');
  await page.getByText('Environment controls',{exact:true}).press('Enter');
  await page.waitForTimeout(350);
  const resumed=await water();await page.waitForTimeout(700);
  expect((await water()).equals(resumed)).toBe(false);
  await page.getByRole('button',{name:'Next song',exact:true}).click();
  await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  expect(await canvas!.evaluate(el=>el===document.querySelector('.orbital-canvas canvas'))).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('stylized-water-desktop.png')});
});

test('narrow reduced-motion water stays still while keyboard camera and song controls work',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?mode=demo');await expect(page.locator('main')).toHaveAttribute('data-scene-status','ready');
  await expect(page.locator('.scene-loader')).toBeHidden();
  const host=page.locator('.orbital-canvas');await expect(host).toHaveAttribute('data-render-state','still');
  const before=await host.locator('canvas').screenshot();await page.waitForTimeout(600);
  expect((await host.locator('canvas').screenshot()).equals(before)).toBe(true);
  const figure=page.locator('.orbital-hero');await figure.focus();
  const angle=await host.getAttribute('data-orbit-angle');await page.keyboard.press('ArrowLeft');
  await expect(host).not.toHaveAttribute('data-orbit-angle',angle!);
  await page.getByRole('button',{name:'Next song',exact:true}).click();await expect(page.locator('.rack-readout h2')).toHaveText('CLOUDS');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:testInfo.outputPath('stylized-water-mobile.png')});
});
