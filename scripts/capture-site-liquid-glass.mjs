import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'});
const layering=process.argv.includes('--hero-layering');
const icy=process.argv.includes('--icy-water');
const iridescent=process.argv.includes('--iridescent');
const water=process.argv.includes('--procedural-water');
const output='docs/evidence/'+(water?'stage-9-procedural-water':iridescent?'stage-9-iridescent':icy?'stage-9-icy-water':layering?'stage-9-hero-layering':process.argv.includes('--chrome-atmosphere')?'stage-9-chrome-atmosphere':'stage-9-site-liquid-glass');
const evidence={observed_at:new Date().toISOString(),browser:browser.version(),data:'Demonstration fixtures only',captures:[]};
await mkdir(output,{recursive:true});
try {
  const cases=[];
  if(water){
    for(const background of ['hazy','crisp']){
      for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]])for(const state of ['entry','results','about','opaque','reduced','still'])cases.push({background,device,width,height,state});
      for(const state of ['entry','water'])cases.push({background,device:'reference',width:1881,height:905,state});
    }
  }else if(iridescent){
    for(const background of ['hazy','crisp']){
      for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]])for(const state of ['entry','focus','results','about','opaque','error'])cases.push({background,device,width,height,state});
      for(const state of ['entry','model-hover'])cases.push({background,device:'reference',width:1881,height:905,state});
    }
  }else if(icy){
    for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]])for(const state of ['entry','hover','focus','results','about','disabled','opaque','zero','error','long'])cases.push({device,width,height,state});
    for(const state of ['entry','model-hover','results','about'])cases.push({device:'reference',width:1908,height:938,state});
  }else if(layering){
    for(const state of ['entry','results','about','opaque'])cases.push({device:'desktop',width:1440,height:900,state});
    for(const state of ['entry','about'])cases.push({device:'mobile',width:390,height:844,state});
    for(const state of ['entry','model-hover'])cases.push({device:'reference',width:1908,height:938,state});
  }else{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]) for(const state of ['entry','hover','focus','results','about','disabled','opaque']) cases.push({device,width,height,state});
  for(const variant of [1,3,4,5]) for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]) cases.push({device,width,height,state:'results',variant});
  cases.push({device:'user',width:550,height:766,state:'entry'},{device:'live',width:1305,height:792,state:'entry'});
  }
  for(const item of cases){
    const {device,width,height,state,variant,background}=item;
    const page=await browser.newPage({viewport:{width,height}});
    if(state==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
    if(state==='opaque'){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});}
    const path=variant?`/variants/v${variant}`:'/prototypes/disc-tray/artwork/orbital-disc';
    const fixture=state==='results'?'ten':state==='disabled'?'rate-limit':['zero','error','long'].includes(state)?state:'entry';
    await page.goto(`http://127.0.0.1:3000${path}${state==='about'?'/about':''}?mode=demo&fixture=${fixture}${background?'&background='+background:''}${state==='still'?'&water=still':''}`);
    await page.locator('main h1').waitFor();
    if(state==='opaque') await expect.poll(()=>page.locator('.app-surface :is(button,a,input[type=search],select,summary,.app-header,.shell-body,.about-index,.preview-bar,.proto-picker)').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).backdropFilter!=='none').length)).toBe(0);
    if(['results','long'].includes(state)) await expect(page.locator('.track-row')).toHaveCount(10);
    if(state==='long') await expect(page.locator('.track-row').first()).toContainText('A quiet place between');
    if(state==='zero') await expect(page.getByText('No supported connections for this song yet.')).toBeVisible();
    if(state==='error') await expect(page.locator('.problem')).toContainText('We could not load recommendations.');
    if(state==='disabled') await expect(page.locator('.problem button')).toBeDisabled();
    await page.evaluate(()=>document.fonts.ready);
    if(!variant && ['entry','hover','focus','opaque','model-hover',...(water?['reduced','still','water']:[])].includes(state)) await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
    if(water)await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
    if(state==='model-hover'){await page.locator('.orbital-hero').hover({position:{x:300,y:180}});await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-render-state','running');await page.waitForTimeout(200);}
    if(state==='hover'){const control=page.getByRole('button',{name:'Search',exact:true});await control.hover();await expect(control).toHaveAttribute('data-glass-active','true');await page.waitForTimeout(260);}
    if(state==='focus') await page.getByRole('searchbox').focus();
    if(water&&['opaque','reduced','still'].includes(state))await expect(page.locator('.water-layer')).toHaveAttribute('data-water-state','still');
    await page.evaluate(()=>scrollTo(0,0));
    const file=`${output}/${background?background+'-':''}${variant?'v'+variant+'-':''}${device}-${state}.png`;
    const capture=await page.screenshot({path:file,fullPage:true});
    if(water){const height=await page.evaluate(()=>document.documentElement.scrollHeight);if(capture.readUInt32BE(20)!==height)throw Error(`Incomplete document: ${file}`);}
    const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);if(pageWidth>width+1) throw Error(`Overflow: ${file}`);
    evidence.captures.push({...item,path:file,pageWidth,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
    if(water&&state==='water'){
      await page.locator('.app-footer').scrollIntoViewIfNeeded();
      await expect(page.locator('.water-layer')).toHaveAttribute('data-water-state','running');
      await page.waitForTimeout(1500);
      for(let frame=0;frame<3;frame++){
        const path=`${output}/${background}-water-${frame}.png`;
        await page.screenshot({path});
        evidence.captures.push({...item,frame,path,pageWidth,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
        if(frame<2)await page.waitForTimeout(1000);
      }
    }
    await page.close();console.log(file);
  }
  await writeFile(output+'-captures.json',JSON.stringify(evidence,null,2)+'\n');
} finally {await browser.close();}
