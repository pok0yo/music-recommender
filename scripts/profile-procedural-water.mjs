import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {cpus} from 'node:os';
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'});
const report={observed_at:new Date().toISOString(),browser:browser.version(),cpu:cpus()[0]?.model,
  scope:'Local headless browser, three-second samples after warmup; task duration includes the whole page. GL submission time excludes GPU completion. No video, battery or physical-device comparison.',samples:[]};
try{
  for(const [width,height] of [[1440,900],[390,844]])for(const background of ['hazy','crisp']){
    const page=await browser.newPage({viewport:{width,height}});
    await page.addInitScript(()=>{
      window.waterProfile={draws:[],submissionMs:0};
      const original=WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements=function(...args){
        if(!this.canvas.classList.contains('water-canvas'))return original.apply(this,args);
        const now=performance.now();const result=original.apply(this,args);
        window.waterProfile.submissionMs+=performance.now()-now;window.waterProfile.draws.push(now);return result;
      };
    });
    await page.goto(`http://127.0.0.1:3000/prototypes/disc-tray/artwork/orbital-disc?mode=demo&fixture=entry&background=${background}&water=still`);
    await page.locator('.app-footer').scrollIntoViewIfNeeded();
    const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
    const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
    for(const motion of ['still','moving']){
      if(motion==='moving'){
        await page.getByRole('combobox',{name:'Water movement'}).selectOption('moving');
        await page.locator('.app-footer').scrollIntoViewIfNeeded();
        await expect(page.locator('.water-layer')).toHaveAttribute('data-water-state','running');
      }
      await page.waitForTimeout(1500);
      await page.evaluate(()=>{window.waterProfile={draws:[],submissionMs:0};});
      const before=await metrics();await page.waitForTimeout(3000);const after=await metrics();
      const profile=await page.evaluate(()=>{
        const c=document.querySelector('.water-canvas'),gl=c?.getContext('webgl2'),info=gl?.getExtension('WEBGL_debug_renderer_info');
        return {...window.waterProfile,pixels:c?c.width*c.height:0,renderer:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):null};
      });
      const durationMs=(after.Timestamp-before.Timestamp)*1000,draws=profile.draws.length;
      expect(draws).toBeLessThanOrEqual(durationMs/1000*30+2);expect(profile.pixels).toBeLessThanOrEqual(650000);
      if(motion==='moving')expect(draws).toBeGreaterThan(0);else expect(draws).toBe(0);
      report.samples.push({width,height,background,motion,durationMs,draws,drawsPerSecond:draws/(durationMs/1000),pixels:profile.pixels,renderer:profile.renderer,submissionMs:profile.submissionMs,
        taskMs:(after.TaskDuration-before.TaskDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,layouts:after.LayoutCount-before.LayoutCount,styleRecalculations:after.RecalcStyleCount-before.RecalcStyleCount});
    }
    await page.close();
  }
  await writeFile('docs/evidence/stage-9-procedural-water-profile.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.samples,null,2));
}finally{await browser.close();}
