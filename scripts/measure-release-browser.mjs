import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {cpus,platform} from 'node:os';

const percentile=(values,fraction)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*fraction)-1];
const report={measured_at:new Date().toISOString(),platform:platform(),cpu:cpus()[0]?.model,
  method:'Headless installed browsers; loopback HTTP, DPR 1. Frontend requests are forwarded unchanged to the isolated real API on port 8001. Keyboard activation to displayed recommendations includes automation overhead. Five warm-ups per sample; selections cycle through the 32 approved starters, with shorter samples covering a subset. Animation stays enabled.',
  limitations:'Viewport emulation and CPU throttling are not physical phones or Safari. Frame intervals measure browser scheduling, not GPU completion. Not deployed-network performance.',samples:[]};
expect(percentile([4,1,3,2],.95)).toBe(4);

for(const [channel,width,height,slowdown,count] of [['chrome',1440,900,1,100],['chrome',390,844,1,32],['chrome',390,844,4,10],['msedge',1440,900,1,32]]){
  const browser=await chromium.launch({channel});
  try{
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[],metas=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://127.0.0.1:8000/**',route=>route.continue({url:route.request().url().replace(':8000',':8001')}));
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:slowdown});
    const start=performance.now();await page.goto('http://127.0.0.1:3000/');
    await expect(page.locator('.orbital-canvas')).toHaveAttribute('data-rack','true');
    await expect(page.locator('.rack-eyebrow')).toContainText('01 of 32');
    const ready_ms=performance.now()-start;
    const renderer=await page.locator('.orbital-canvas canvas').evaluate(canvas=>{
      const gl=canvas.getContext('webgl2'),info=gl.getExtension('WEBGL_debug_renderer_info');
      return info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    });
    await page.waitForTimeout(1500);
    const frames=await page.evaluate(()=>new Promise(resolve=>{
      const intervals=[],tasks=[];let before=performance.now(),start=before;
      const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(entry=>entry.duration)));
      observer.observe({type:'longtask'});
      function frame(now){intervals.push(now-before);before=now;if(now-start<5000)requestAnimationFrame(frame);else{observer.disconnect();resolve({intervals,tasks})}}
      requestAnimationFrame(frame);
    }));
    const timings=[];
    for(let i=0;i<count+5;i++){
      if(i)await page.getByRole('button',{name:'Change starting song',exact:true}).click();
      const shelf=page.locator('.rack-song-list');
      if(await shelf.getAttribute('open')===null)await shelf.locator('summary').click();
      await page.getByRole('navigation',{name:'Song sleeves'}).getByRole('button').nth(i%32).click();
      const button=page.getByRole('button',{name:'Discover',exact:true});await button.focus();
      const response=page.waitForResponse(r=>r.url().includes('/v1/recommendations/')&&r.status()===200);
      const started=performance.now();await button.press('Enter');
      await expect(page.locator('.rack-eyebrow')).toContainText('Recommendations');
      const elapsed=performance.now()-started,body=await (await response).json();
      expect(body.meta.data_mode).toBe('real');expect(body.results).toHaveLength(10);metas.push(body.meta);
      if(i>=5)timings.push(elapsed);
    }
    expect(timings).toHaveLength(count);expect(errors).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    const sample={channel,browser:browser.version(),width,height,cpu_slowdown:slowdown,count,ready_ms,
      median_ms:percentile(timings,.5),p95_ms:percentile(timings,.95),max_ms:Math.max(...timings),
      target_met:percentile(timings,.95)<2000,renderer,
      frames:{count:frames.intervals.length,p95_interval_ms:percentile(frames.intervals,.95),max_interval_ms:Math.max(...frames.intervals),over_33ms:frames.intervals.filter(t=>t>33.4).length,long_tasks:frames.tasks},
      meta:metas[0],page_errors:errors};
    report.samples.push(sample);console.log(JSON.stringify(sample));
    await writeFile('docs/evidence/release-phase-3-browser.json',JSON.stringify(report,null,2)+'\n');
  }finally{await browser.close();}
}
