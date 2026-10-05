import {chromium} from "playwright";
import {writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
const b=await chromium.launch({channel:"chrome"});
const p=await b.newPage({viewport:{width:1440,height:900}});
const url="http://127.0.0.1:5196/";
await p.goto(url+"#intelligence",{waitUntil:"networkidle"});await p.waitForTimeout(1400);
assert.notEqual(await p.evaluate(()=>document.documentElement.style.overflow),"hidden","deep link was trapped");
assert(await p.locator(".assembly").evaluate(e=>e.getBoundingClientRect().top<innerHeight),"deep link missed target");
await p.goto(url);await p.keyboard.press("Escape");await p.waitForTimeout(1200);
await p.locator(".hall").evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"}));await p.waitForTimeout(150);
assert.equal(await p.locator(".hall").getAttribute("data-scene-state"),"playing");
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(200);
assert.notEqual(await p.evaluate(()=>document.documentElement.style.overflow),"hidden","resize stranded lock");
await p.waitForTimeout(1100);await p.locator(".ascent").evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"}));await p.waitForTimeout(250);
const before=await p.locator(".ascent").getAttribute("data-diag-active");
// Deterministically exercise the browser visibility event pathway.
await p.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});await p.waitForTimeout(1200);
assert.equal(await p.locator(".ascent").getAttribute("data-diag-active"),before,"hidden timeline advanced");
assert.equal(await p.locator(".ascent").getAttribute("data-live"),"false");
await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});await p.waitForTimeout(4000);
assert.notEqual(await p.locator(".ascent").getAttribute("data-scene-state"),"playing");
// Profile one automatic machine and its idle/offscreen states with Chrome metrics.
const cdp=await p.context().newCDPSession(p);await cdp.send("Performance.enable");
await p.locator(".system-story[data-kind=pipeline]").evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"}));
const m0=await cdp.send("Performance.getMetrics");await p.waitForTimeout(4100);const m1=await cdp.send("Performance.getMetrics");
await p.waitForTimeout(2000);const m2=await cdp.send("Performance.getMetrics");
await p.keyboard.press("End");await p.waitForTimeout(1000);
assert.equal(await p.locator(".system-story[data-kind=pipeline]").getAttribute("data-live"),"false");
const touch=await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await touch.goto(url);await touch.keyboard.press("Escape");await touch.waitForTimeout(1200);await touch.locator(".hall").evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:"instant"}));
const tc=await touch.context().newCDPSession(touch);const y0=await touch.evaluate(()=>scrollY);
await tc.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:195,y:650}]});
for(const y of [580,490,390,290,200]){await tc.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:195,y}]});await touch.waitForTimeout(30);}
await tc.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await touch.waitForTimeout(300);
const y1=await touch.evaluate(()=>scrollY);assert(y1>y0,"touch scroll did not move");assert.notEqual(await touch.evaluate(()=>document.documentElement.style.overflow),"hidden");
const values=m=>Object.fromEntries(m.metrics.map(v=>[v.name,v.value]));const a=values(m0),d=values(m1),e=values(m2);
const report={deepLink:true,resize:true,visibilityPauseResume:true,touch:{from:y0,to:y1},profile:{playbackSeconds:4.1,playbackTaskSeconds:d.TaskDuration-a.TaskDuration,playbackLayoutCount:d.LayoutCount-a.LayoutCount,idleSeconds:2,idleTaskSeconds:e.TaskDuration-d.TaskDuration,idleLayoutCount:e.LayoutCount-d.LayoutCount},note:"Chrome headless metrics; visibilitychange handler simulated, touch synthesized with CDP; no physical device claim."};
await writeFile("artifacts/scene-engine/edges.json",JSON.stringify(report,null,2));console.log(report);await b.close();
