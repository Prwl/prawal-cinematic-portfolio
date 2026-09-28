import { chromium } from "playwright";
const browser = await chromium.launch({channel:"chrome"});
for (const [name,width,height] of [["desktop",1440,900],["mobile",390,844]]) {
 const page = await browser.newPage({viewport:{width,height},hasTouch:width<700,isMobile:width<700});
 await page.goto("http://localhost:5190",{waitUntil:"networkidle"});
 await page.keyboard.press("Escape");
 for(const [scene,button] of [["journey","2021"],["system-story","Output"],["assembly","Full model"]]) {
  const stage = page.locator(`.${scene}`).first();
  await stage.evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY,behavior:"instant"}));
  await page.waitForTimeout(1000);
  await stage.getByRole("button",{name:button,exact:true}).click();
  await page.waitForTimeout(800);
  await page.screenshot({path:`artifacts/qa/prototype-${name}-${scene}.png`});
 }
 await page.close();
}
await browser.close();
