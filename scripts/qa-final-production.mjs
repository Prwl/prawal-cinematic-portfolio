import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const report=[];
for(const [width,height]of [[1440,900],[1366,768],[1280,720],[1024,768],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<700,isMobile:width<700});const errors=[],videos=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&errors.push(m.text()));page.on('response',r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));page.on('request',r=>r.url().endsWith('.mp4')&&videos.push(r.url()));
 await page.addInitScript(()=>{window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})});
 await page.goto('http://127.0.0.1:5197/',{waitUntil:'networkidle'});await page.evaluate(()=>document.querySelector('.prologue__skip')?.click());
 await page.locator('.system-story[data-kind="pipeline"]').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));
 await page.locator('.system-story[data-kind="pipeline"] .story-controls button').nth(3).click();await page.waitForTimeout(1100);
 await page.mouse.wheel(0,16000);await page.waitForTimeout(100);await page.mouse.wheel(0,-6000);await page.waitForTimeout(100);
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(1700);
 const metrics=await page.evaluate(()=>({cls:window.__cls,overflow:document.documentElement.scrollWidth-innerWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),resources:performance.getEntriesByType('resource').filter(r=>/\.(js|css|avif|webp)/.test(r.name)).map(r=>({file:r.name.split('/').pop(),bytes:r.decodedBodySize}))}));
 if(width<700&&videos.length)errors.push('mobile hero video request');if(metrics.overflow>0||metrics.broken.length)errors.push('overflow or broken image');
 await page.screenshot({path:`artifacts/qa/final-cinematography/production-${width}-contact.png`});report.push({width,height,videos:videos.length,...metrics,errors});console.log(width,'errors',errors.length,'CLS',metrics.cls);await page.close();
}await browser.close();await writeFile('artifacts/qa/final-cinematography/production.json',JSON.stringify(report,null,2));if(report.some(r=>r.errors.length))process.exitCode=1;
