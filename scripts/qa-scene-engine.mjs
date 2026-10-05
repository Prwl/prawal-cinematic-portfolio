import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const dir = "artifacts/scene-engine";
await mkdir(dir, {recursive:true});
const browser = await chromium.launch({channel:"chrome"});
const report = [];
const selectors = [".hall", ".ascent", ".system-story[data-kind=pipeline]", ".system-story[data-kind=transactions]", ".system-story[data-kind=taxonomy]", ".scale-scene", ".assembly", ".exhibition", ".study", ".voices"];
const url = "http://127.0.0.1:5196/";
await Promise.all([[1440,900],[1366,768],[1280,720],[1024,768],[390,844]].map(async ([width,height]) => {
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:width<700,isMobile:width<700});
 const errors=[]; page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>m.type()==="error"&&errors.push(m.text()));
 page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(url,{waitUntil:"networkidle"});await page.keyboard.press("Escape");await page.waitForTimeout(1100);
 const scenes=[];
 for (const [i,s] of selectors.entries()) {
   const el=page.locator(s);
   await el.evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"}));
   await page.waitForTimeout(180);
   const start=await el.getAttribute("data-scene-state");
   await page.waitForTimeout(4200);
   const result=await el.evaluate(e=>({state:e.dataset.sceneState,beat:e.dataset.diagActive,rect:e.getBoundingClientRect().toJSON(),sticky:e.querySelector(".story-sticky").getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth-innerWidth,locked:document.documentElement.style.overflow}));
   assert.notEqual(result.state,"playing",`${s} did not finish`);assert.equal(result.overflow,0,`${width} overflow`);assert.notEqual(result.locked,"hidden",`${s} stranded lock`);
   scenes.push({s,start,...result});await page.screenshot({path:`${dir}/${width}-${i}.png`});
 }
 // All evidence rooms, native Escape and focus restoration.
 const drawers=page.locator(".detail-link[aria-haspopup=dialog]");
 for(let i=0;i<await drawers.count();i++) {
   const trigger=drawers.nth(i);await trigger.focus();await trigger.press("Enter");
   const dialog=page.locator("dialog[open]");await dialog.waitFor();
   assert(await dialog.evaluate(e=>e.contains(document.activeElement)),"dialog focus missing");
   await page.keyboard.press("Shift+Tab");assert(await dialog.evaluate(e=>e.contains(document.activeElement)),"focus escaped");
   await page.waitForTimeout(300);
   if(i<5)await page.screenshot({path:`${dir}/${width}-drawer-${i}.png`});
   await dialog.evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(100);
   await page.keyboard.press("Escape");assert(await trigger.evaluate(e=>e===document.activeElement),"focus not restored");
 }
 const broken=await page.locator("img").evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.currentSrc));
 assert.equal(broken.length,0,`broken images: ${broken}`);
 await page.locator("#contact").evaluate(e=>e.scrollIntoView());await page.waitForTimeout(1800);await page.screenshot({path:`${dir}/${width}-contact.png`});
 report.push({width,height,scenes,errors,broken,drawers:await drawers.count()});console.log(width,"complete",errors);await page.close();
}));
await writeFile(`${dir}/qa.json`,JSON.stringify(report,null,2));
// Real wheel event lifecycle, no programmatic navigation bypass.
const p=await browser.newPage({viewport:{width:1440,height:900}});await p.goto(url);await p.keyboard.press("Escape");await p.waitForTimeout(1100);
await p.locator(".hall").evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY));await p.waitForTimeout(150);
assert.equal(await p.locator(".hall").getAttribute("data-scene-state"),"playing");const heldY=await p.evaluate(()=>scrollY);
await p.mouse.wheel(0,1500);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>scrollY),heldY);
await p.waitForTimeout(200);await p.mouse.wheel(0,400);await p.mouse.wheel(0,400);await p.waitForTimeout(100);
assert.notEqual(await p.locator(".hall").getAttribute("data-scene-state"),"playing");
await p.locator(".ascent").evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY));await p.waitForTimeout(100);await p.mouse.wheel(0,-100);await p.waitForTimeout(150);assert.notEqual(await p.locator(".ascent").getAttribute("data-scene-state"),"playing");
await p.keyboard.press("End");await p.waitForTimeout(500);assert.notEqual(await p.evaluate(()=>document.documentElement.style.overflow),"hidden");
await p.locator(".hall").evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY));await p.waitForTimeout(200);assert.notEqual(await p.locator(".hall").getAttribute("data-scene-state"),"playing");
// Zoom equivalent layout size, and browser page scale at DPR2.
for(const zoom of [1.1,1.25]) { await p.setViewportSize({width:Math.round(1440/zoom),height:Math.round(900/zoom)});await p.locator(".assembly").evaluate(e=>e.scrollIntoView());await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);await p.screenshot({path:`${dir}/zoom-${zoom}.png`}); }
await p.close();
const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce",hasTouch:true});await reduced.goto(url);await reduced.waitForTimeout(500);
for(const s of selectors){assert(["resolved","released"].includes(await reduced.locator(s).getAttribute("data-scene-state")));}
assert.notEqual(await reduced.evaluate(()=>document.documentElement.style.overflow),"hidden");await reduced.screenshot({path:`${dir}/reduced.png`});await reduced.close();
await browser.close();await writeFile(`${dir}/qa.json`,JSON.stringify(report,null,2));assert(report.every(r=>!r.errors.length));console.log("All scene navigation and drawer checks passed");
