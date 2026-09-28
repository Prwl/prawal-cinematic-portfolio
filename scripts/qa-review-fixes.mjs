import {chromium} from "playwright";
const browser=await chromium.launch({channel:"chrome"});
for(const width of [1440,820,390,360])for(const reduce of [false,true]){
 const page=await browser.newPage({viewport:{width,height:width===1440?900:width===820?1180:width===390?844:800},reducedMotion:reduce?"reduce":"no-preference",hasTouch:width<1000});
 await page.goto("http://localhost:5190/",{waitUntil:"networkidle"});
 await page.evaluate(()=>document.querySelector(".prologue__skip")?.click());
 await page.waitForFunction(()=>!document.querySelector(".page").inert);
 for(const [selector,name] of [[".journey","journey"],[".system-story:nth-child(3)","taxonomy"]]){
  await page.locator(selector).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY+(el.offsetHeight-innerHeight)*.56,behavior:"instant"}));
  await page.waitForTimeout(900);
  await page.screenshot({path:`artifacts/qa/final/fix-${width}-${reduce?"reduced":"motion"}-${name}.png`});
 }
 await page.close();
}
await browser.close();
