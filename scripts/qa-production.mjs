import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser=await chromium.launch({channel:"chrome"});
const report=[];
for(const [width,height,touch] of [[1440,900,false],[1068,760,false],[390,844,true]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch});
 const errors=[],videos=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));
 page.on("request",r=>r.url().endsWith(".mp4")&&videos.push(r.url()));
 await page.addInitScript(()=>{
  window.qaMetrics={cls:0,portraitFrames:0};
  const raf=requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>{if(cb.name==="tick")window.qaMetrics.portraitFrames++;return raf(cb);};
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.qaMetrics.cls+=e.value;}).observe({type:"layout-shift",buffered:true});
 });
 await page.goto("http://localhost:4190/",{waitUntil:"networkidle"});
 await page.waitForTimeout(8500);
 assert(!(await page.locator(".page").evaluate(e=>e.inert)),"intro did not finish");
 await page.screenshot({path:`artifacts/qa/final/${width}-production-hero.png`});
 await page.mouse.move(width-10,height/2);await page.waitForTimeout(3000);
 const before=await page.evaluate(()=>window.qaMetrics.portraitFrames);await page.waitForTimeout(1100);
 const after=await page.evaluate(()=>window.qaMetrics.portraitFrames);
 const metrics=await page.evaluate(()=>({cls:window.qaMetrics.cls,resources:performance.getEntriesByType("resource").filter(r=>r.name.endsWith(".js")||r.name.endsWith(".css")).map(r=>({name:r.name.split("/").pop(),bytes:r.decodedBodySize}))}));
 for(const [selector,suffix] of [[".system-story:nth-child(3)","taxonomy"],[".journey","journey"],[".assembly","assembly"]]){
  await page.locator(selector).evaluate(e=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY+(e.offsetHeight-innerHeight)*.56,behavior:"instant"}));
  await page.waitForTimeout(900);await page.screenshot({path:`artifacts/qa/final/${width}-production-${suffix}.png`});
 }
 report.push({width,height,errors,videoRequests:videos.length,portraitFramesWhileIdle:after-before,...metrics});
 assert.equal(errors.length,0);if(touch)assert.equal(videos.length,0);
 await page.close();
}
await browser.close();
await writeFile("artifacts/qa/final/production.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
