import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'});
const layering=process.argv.includes('--hero-layering');
const output='docs/evidence/'+(layering?'stage-9-hero-layering':process.argv.includes('--chrome-atmosphere')?'stage-9-chrome-atmosphere':'stage-9-site-liquid-glass');
const evidence={observed_at:new Date().toISOString(),browser:browser.version(),data:'Demonstration fixtures only',captures:[]};
await mkdir(output,{recursive:true});
try {
  const cases=[];
  if(layering){
    for(const state of ['entry','results','about','opaque'])cases.push({device:'desktop',width:1440,height:900,state});
    for(const state of ['entry','about'])cases.push({device:'mobile',width:390,height:844,state});
    for(const state of ['entry','model-hover'])cases.push({device:'reference',width:1908,height:938,state});
  }else{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]) for(const state of ['entry','hover','focus','results','about','disabled','opaque']) cases.push({device,width,height,state});
  for(const variant of [1,3,4,5]) for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]) cases.push({device,width,height,state:'results',variant});
  cases.push({device:'user',width:550,height:766,state:'entry'},{device:'live',width:1305,height:792,state:'entry'});
  }
  for(const item of cases){
    const {device,width,height,state,variant}=item;
    const page=await browser.newPage({viewport:{width,height}});
    if(state==='opaque'){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});}
    const path=variant?`/variants/v${variant}`:'/prototypes/disc-tray/artwork/orbital-disc';
    const fixture=state==='results'?'ten':state==='disabled'?'rate-limit':'entry';
    await page.goto(`http://127.0.0.1:3000${path}${state==='about'?'/about':''}?mode=demo&fixture=${fixture}`);
    await page.locator('main h1').waitFor();
    if(state==='opaque') await expect.poll(()=>page.locator('.app-surface :is(button,a,input[type=search],select,summary,.app-header,.shell-body,.about-index,.preview-bar,.proto-picker)').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).backdropFilter!=='none').length)).toBe(0);
    if(state==='results') await expect(page.locator('.track-row')).toHaveCount(10);
    if(state==='disabled') await expect(page.locator('.problem button')).toBeDisabled();
    await page.evaluate(()=>document.fonts.ready);
    if(!variant && ['entry','hover','focus','opaque','model-hover'].includes(state)) await expect(page.locator('.orbital-hero')).toHaveAttribute('data-model-ready','true');
    if(state==='model-hover'){await page.locator('.orbital-hero').hover({position:{x:300,y:180}});await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-render-state','running');await page.waitForTimeout(200);}
    if(state==='hover'){const control=page.getByRole('button',{name:'Search',exact:true});await control.hover();await expect(control).toHaveAttribute('data-glass-active','true');await page.waitForTimeout(260);}
    if(state==='focus') await page.getByRole('searchbox').focus();
    await page.evaluate(()=>scrollTo(0,0));
    const file=`${output}/${variant?'v'+variant+'-':''}${device}-${state}.png`;
    await page.screenshot({path:file,fullPage:true});
    const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);if(pageWidth>width+1) throw Error(`Overflow: ${file}`);
    evidence.captures.push({...item,path:file,pageWidth,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
    await page.close();console.log(file);
  }
  await writeFile(output+'-captures.json',JSON.stringify(evidence,null,2)+'\n');
} finally {await browser.close();}
