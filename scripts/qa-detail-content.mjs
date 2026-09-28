import { chromium } from "playwright";
import assert from "node:assert/strict";
import { identity } from "../src/data/profile.js";
import { risers } from "../src/data/experience.js";
import { caseStudies, workIndex } from "../src/data/systems.js";
import { capabilityGroups } from "../src/data/capabilities.js";
import { pillars, practice } from "../src/data/intelligence.js";
import { awards, credentials, learningArchive, recommendations, appearances, publication } from "../src/data/recognition.js";
const browser=await chromium.launch({channel:"chrome"});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce",hasTouch:true});
await page.goto(process.argv[2] || "http://localhost:5190/",{waitUntil:"networkidle"});
const cases=[
 ["Leadership, education and background",[...identity.paragraphs,...identity.credits.map(c=>c.value),...identity.notes.map(n=>n.note)]],
 ["Roles and responsibilities",risers.flatMap(r=>[r.title,r.period,...r.points])],
 ["Full toolkit and project archive",[...capabilityGroups.flatMap(g=>g.items.map(i=>i.name)),...workIndex.flatMap(g=>g.items.map(i=>i.detail))]],
 ["Framework and practice",[...pillars.map(p=>p.detail),...practice.map(p=>p.what)]],
 ["Awards and their stories",awards.map(a=>a.note)],
 ["Open the certification archive",[...credentials.map(c=>c.title),...learningArchive.flatMap(g=>g.items)]],
 ["Open events and publication",[...appearances.map(a=>a.title),publication.detail]],
 ["All 12 voices",recommendations.map(r=>r.quote)]
];
for(const [label,texts] of cases){
 await page.getByRole("button",{name:label,exact:true}).click();
 const dialog=page.getByRole("dialog");
 const text=await dialog.textContent();
 for(const expected of texts)assert(text.includes(expected),`Missing in ${label}: ${expected}`);
 await page.getByRole("button",{name:"Close details",exact:true}).click();
 console.log(`${label}: ${texts.length} records verified`);
}
for(let i=0;i<caseStudies.length;i++){
 await page.getByRole("button",{name:"Case study and technology",exact:true}).nth(i).click();
 const text=await page.getByRole("dialog").textContent();
 for(const expected of [caseStudies[i].summary,...caseStudies[i].stages.map(s=>s.detail),...caseStudies[i].stack])assert(text.includes(expected),`Missing case content ${expected}`);
 await page.keyboard.press("Escape");
}
await page.locator(".voices").scrollIntoViewIfNeeded();
for(let i=1;i<recommendations.length;i++){
 await page.getByRole("button",{name:"Next voice",exact:true}).click();
 assert((await page.locator(".voices__quote").innerText()).includes(recommendations[i].quote));
}
assert(await page.getByRole("button",{name:"Next voice",exact:true}).isDisabled());
console.log("All three systems and all twelve voices verified");
await browser.close();
