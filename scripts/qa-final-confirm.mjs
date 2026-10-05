import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({channel:'chrome'});const report=[];
for(const [w,h] of (process.env.QA_SIZE ? [process.env.QA_SIZE.split("x").map(Number)] : [[1440,900],[1366,768],[1280,720],[1024,768],[390,844]])) {
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:w<700});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>m.type()==='error'&&errors.push(m.text()));
 await p.goto(process.argv[2]||'http://127.0.0.1:5196/',{waitUntil:'networkidle'});await p.evaluate(()=>document.querySelector('.prologue__skip')?.click());
 for(const [s,beat]of [['.assembly',2],['.assembly',4],['.system-story[data-kind="taxonomy"]',3],['.ascent',5]]) {
  await p.locator(s).evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await p.locator(s+' .story-controls button').nth(beat).click();await p.waitForTimeout(1650);
  await p.screenshot({path:`artifacts/qa/final-cinematography/confirm-${w}-${s.includes('taxonomy')?'taxonomy':s.slice(1)}-${beat}.png`});
 }
 await p.locator('.exhibition').evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'}));await p.waitForTimeout(1200);
 const rail=await p.evaluate(()=>{const r=document.querySelector('.exhibition__print[data-state=current]').getBoundingClientRect();const rail=document.querySelector('.cue-rail__cue[data-state=current]')?.getBoundingClientRect();return {frame:r.toJSON(),rail:rail?.toJSON(),collision:rail?.width>0&&r.left<rail.right};});if(rail.collision)errors.push('rail collision');
 await p.screenshot({path:`artifacts/qa/final-cinematography/confirm-${w}-recognition.png`});
 for(let i=0;i<9;i++){await p.getByRole('button',{name:'Next award',exact:true}).click();await p.waitForTimeout(50);}await p.waitForTimeout(1000);
 const loaded=await p.evaluate(()=>{const img=document.querySelector('.exhibition__print[data-state=current] img');return img.complete&&img.naturalWidth>0;});if(!loaded)errors.push('blank active award');
 await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(1600);await p.screenshot({path:`artifacts/qa/final-cinematography/confirm-${w}-contact.png`});
 const contact=await p.evaluate(()=>{const r=document.querySelector('.epilogue__figure').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:document.querySelector('#contact').offsetHeight,heading:document.querySelector('#contact-title').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth-innerWidth};});if(contact.overflow>0)errors.push('overflow');if(w<700&&contact.top<68)errors.push('mobile portrait under header');
 report.push({w,h,rail,loaded,contact,errors});console.log(w,errors);await p.close();
}await b.close();await writeFile(`artifacts/qa/final-cinematography/${process.env.QA_SIZE ? 'confirm-repair' : 'confirm'}.json`,JSON.stringify(report,null,2));if(report.some(r=>r.errors.length))process.exitCode=1;
