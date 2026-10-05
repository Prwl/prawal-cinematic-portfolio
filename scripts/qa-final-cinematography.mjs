import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out='artifacts/qa/final-cinematography'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const results=[];
const sizes=process.env.QA_SIZE ? [process.env.QA_SIZE.split("x").map(Number)] : [[1440,900],[1366,768],[1280,720],[1024,768],[390,844]];
for(const [width,height] of sizes) for(const dpr of (process.env.QA_DPR ? [Number(process.env.QA_DPR)] : [1,2])) {
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:width<700,isMobile:width<700});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(process.argv[2]||'http://127.0.0.1:5196/',{waitUntil:'networkidle'});await page.evaluate(()=>document.querySelector('.prologue__skip')?.click());
 const frames=[];
 for(const selector of ['.ascent','.system-story[data-kind="pipeline"]','.system-story[data-kind="transactions"]','.system-story[data-kind="taxonomy"]','.assembly','.exhibition']) {
  const run=page.locator(selector);await run.evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await page.waitForTimeout(100);
  const buttons=run.locator('.story-controls button'); const count=await buttons.count();
  for(let i=0;i<count;i++){
   await buttons.nth(i).click();await page.waitForTimeout(1550);
   const state=await run.evaluate(e=>{const svg=e.querySelector('svg.machine, .assembly__model svg');const clip=svg?.getBoundingClientRect();const texts=svg?[...svg.querySelectorAll('text')].filter(t=>getComputedStyle(t).opacity!=='0'&&t.getBoundingClientRect().width>0).map(t=>{const r=t.getBoundingClientRect();return {text:t.textContent,px:getComputedStyle(t).fontSize,box:[r.left,r.top,r.right,r.bottom],outside:r.top<clip.top-1||r.bottom>clip.bottom+1||r.left<clip.left-1||r.right>clip.right+1}}):[];return {texts,overflow:document.documentElement.scrollWidth-innerWidth,caption:e.querySelector('.assembly__caption')?.getBoundingClientRect().toJSON(),model:e.querySelector('.assembly__plinth')?.getBoundingClientRect().toJSON()};});
   frames.push({selector,i,...state});if(state.overflow>0)errors.push('overflow '+selector);
   if(dpr===1)await page.screenshot({path:`${out}/${width}-${selector.includes('system-story')?selector.match(/kind="(.*?)"/)[1]:selector.slice(1)}-${i}.png`});
  }
  // Reverse and interrupt the actual scroll-driven camera.
  for(const f of [.9,.6,.3,.1]){await run.evaluate((e,f)=>scrollTo({top:e.getBoundingClientRect().top+scrollY+(e.offsetHeight-innerHeight)*f,behavior:'instant'}),f);await page.waitForTimeout(120);}
 }
 // Wheel fling, slow native wheel, reverse, and anchor navigation.
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.mouse.wheel(0,12000);await page.waitForTimeout(200);await page.mouse.wheel(0,-4500);await page.waitForTimeout(200);for(let i=0;i<4;i++){await page.mouse.wheel(0,140);await page.waitForTimeout(100)}
 await page.evaluate(()=>document.querySelector('a[href="#systems"]')?.click());await page.waitForTimeout(1600);
 const detail=page.locator('.system-story').first().locator('.detail-link');await detail.focus();await page.keyboard.press('Enter');await page.waitForTimeout(150);const dialog=await page.locator('dialog[open]').count();await page.keyboard.press('Tab');const trapped=await page.evaluate(()=>!!document.activeElement?.closest('dialog'));await page.keyboard.press('Escape');const restored=await detail.evaluate(e=>document.activeElement===e);if(!dialog||!trapped||!restored)errors.push('dialog keyboard/focus');
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await page.waitForTimeout(1600);
 const contact=await page.locator('#contact').evaluate(e=>({height:e.offsetHeight,viewport:innerHeight,portrait:e.querySelector('.epilogue__figure').getBoundingClientRect().toJSON(),heading:e.querySelector('h2').getBoundingClientRect().toJSON()}));
 await page.screenshot({path:`${out}/${width}-contact-dpr${dpr}.png`});
 const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));if(broken.length)errors.push(...broken);
 results.push({width,height,dpr,frames,contact,errors});console.log(`${width}x${height}@${dpr}: ${errors.length} errors`);await context.close();
}
for(const width of [1440,390]){const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await p.goto(process.argv[2]||'http://127.0.0.1:5196/',{waitUntil:'networkidle'});const state=await p.evaluate(()=>({assembly:document.querySelector('.assembly__model svg').dataset.complete,machines:[...document.querySelectorAll('.machine')].map(e=>e.dataset.beat),sticky:[...document.querySelectorAll('.story-sticky')].some(e=>getComputedStyle(e).position==='sticky')}));results.push({width,reduced:state,errors:state.sticky||state.assembly!=='true'||state.machines.some(b=>b!=='4')?['reduced-motion']:[]});await p.close();}
await browser.close();await writeFile(`${out}/${process.env.QA_SIZE ? "production-recheck" : "report"}.json`,JSON.stringify(results,null,2));if(results.some(r=>r.errors.length))process.exitCode=1;
