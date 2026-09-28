import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://localhost:5190/";
const out = "artifacts/qa/final";
await mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:"chrome"});
const results = [], errors = [];
const sizes = [[1440,900],[1366,768],[1280,800],[1024,1366],[820,1180],[430,932],[390,844],[360,800]];
for (const [width,height] of sizes) {
 const context = await browser.newContext({viewport:{width,height},hasTouch:width<1100,isMobile:width<1100});
 const page = await context.newPage();
 const requests=[];
 page.on("pageerror",e=>errors.push(`${width}: ${e.message}`));
 page.on("console",m=>m.type()==="error" && errors.push(`${width}: ${m.text()}`));
 page.on("response",r=>r.status()>=400 && errors.push(`${width}: HTTP ${r.status()} ${r.url()}`));
 page.on("request",r=>/\.mp4(?:$|\?t=)/.test(r.url()) && requests.push(r.url()));
 await page.goto(base,{waitUntil:"networkidle"});
 await page.locator(".story-run").first().waitFor();
 await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
 await page.waitForFunction(() => !document.querySelector("main .page").inert);
 await page.waitForTimeout(400);
 await page.screenshot({path:`${out}/${width}-hero.png`});
 const scenes=page.locator(".story-run");
 for(let i=0;i<await scenes.count();i++) {
  const scene=scenes.nth(i);
  await scene.evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*.56,behavior:"instant"}));
  await page.waitForTimeout(800);
  const info=await scene.evaluate(el=>{
   const stick=el.querySelector(".story-sticky");const r=stick.getBoundingClientRect();
   const controls=[...stick.querySelectorAll("button,a")].filter(e=>!e.disabled);
   return {kind:el.className,top:r.top,bottom:r.bottom,overflow:document.documentElement.scrollWidth-innerWidth,offscreen:controls.filter(e=>{const b=e.getBoundingClientRect();return b.left<0||b.right>innerWidth+1||b.bottom>innerHeight+2}).map(e=>e.textContent)};
  });
  if(info.overflow>0||info.offscreen.length)errors.push(`${width}: ${JSON.stringify(info)}`);
  if([1440,390,360,820].includes(width))await page.screenshot({path:`${out}/${width}-scene-${i}.png`});
  // A real keyboard opener, native modal containment, Escape, focus and scroll restoration.
  const opener=scene.locator(".detail-link");
  await opener.focus(); const before=await page.evaluate(()=>scrollY);
  
  await page.keyboard.press("Enter");
  const dialog=page.getByRole("dialog");await dialog.waitFor({state:"visible"});
  assert(await dialog.locator("h2").textContent());
  await page.keyboard.press("Shift+Tab");
  assert(await page.evaluate(()=>!!document.activeElement.closest("dialog")),"focus escaped dialog");
  await page.keyboard.press("Escape");await dialog.waitFor({state:"detached"});
  assert(await opener.evaluate(el=>document.activeElement===el),"focus not restored");
  assert(Math.abs(await page.evaluate(()=>scrollY)-before)<2,"scroll position lost");
 }
 for(const selector of [".archive",".voices","#contact"]) {
  await page.locator(selector).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-80,behavior:"instant"}));
  await page.waitForTimeout(900);
  if([1440,390].includes(width))await page.screenshot({path:`${out}/${width}-${selector.replace(/[.#]/g,"")}.png`});
 }
 if(width<1100 && requests.length)errors.push(`${width}: touch downloaded portrait video`);
 results.push({width,height,scenes:await scenes.count(),touchVideoRequests:requests.length});
 await context.close();
 console.log(`${width}x${height} done`);
}
// Reduced motion preserves resolved diagrams and selectable content.
for(const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce",hasTouch:width<700});
 await page.goto(base,{waitUntil:"networkidle"});
 assert.equal(await page.locator(".assembly__model").getAttribute("data-complete"),"true");
 for(const selector of [".journey",".system-story",".assembly"]) {
  await page.locator(selector).first().evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY,behavior:"instant"}));
  await page.screenshot({path:`${out}/${width}-reduced-${selector.slice(1)}.png`});
 }
 await page.close();
}
await browser.close();
await writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({results,errors},null,2));
if(errors.length)process.exitCode=1;
