// Final pass: transition coverage, Contact framing, archive access, and
// reduced-motion compositions at the requested sizes (zoom-equivalent CSS
// viewports included). Run against a local dev or production server.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.argv[2] || "http://127.0.0.1:5190/";
const out = "artifacts/qa/polish-edges";
await mkdir(out, { recursive: true });
const sizes = [[1440,900],[1366,768],[1280,720],[1024,768],[820,1180],[430,932],[390,844],[360,800],[1309,818],[1152,720]];
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".prologue__skip").click();
  await page.waitForTimeout(400);
  // Sample the actual release from Taxonomy, including the former dead zone.
  const passage = await page.evaluate(() => {
    const last = document.querySelector('.system-story[data-kind="taxonomy"]');
    const scale = document.querySelector('.scale-scene');
    return [last.getBoundingClientRect().bottom + scrollY - innerHeight, scale.getBoundingClientRect().top + scrollY];
  });
  const transition = [];
  for (let i = 0; i <= 4; i++) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), passage[0] + (passage[1] - passage[0]) * i / 4);
    await page.waitForTimeout(700);
    const visible = await page.evaluate(() => {
      const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
      return [...document.querySelectorAll('.system-story[data-kind="taxonomy"] .machine, .scale-scene__metric, .scale-scene__event, .system-story[data-kind="taxonomy"] .system-story__narrative, .scale-scene .scene-heading')].map(e => {
        const r = e.getBoundingClientRect();
        return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(header, r.top));
      }).reduce((a,b) => Math.max(a,b), 0);
    });
    transition.push(Math.round(visible));
    if (visible < 100) errors.push(`empty transition sample ${i}: ${visible}px`);
    if ([1440,360,1024].includes(width)) await page.screenshot({ path: `${out}/${width}-passage-${i}.png` });
  }
  // Every recommendation remains selectable even when it is not featured.
  const voices = page.locator('.voices');
  await voices.evaluate(e => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY, behavior: "instant" }));
  for (let i = 0; i < 12; i++) {
    const button = page.locator('.voices__row button').nth(i);
    await button.click();
    if (await button.getAttribute('aria-pressed') !== 'true') errors.push(`voice ${i} cannot be selected`);
  }
  // All award entries remain manually accessible.
  const exhibition = page.locator('.exhibition');
  await exhibition.evaluate(e => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY, behavior: "instant" }));
  await page.waitForTimeout(200);
  for (let i = 1; i < 10; i++) await page.getByRole('button', { name: 'Next award', exact: true }).click();
  if (!(await page.locator('.gallery-controls span').textContent()).includes('10 / 10')) errors.push('award archive navigation incomplete');
  // A short landscape frame must fit the final invitation below the header.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(1300);
  const contact = await page.evaluate(() => {
    const r = document.querySelector('#contact-title').getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
    return { top: r.top, bottom: r.bottom, header, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  if (contact.top < contact.header) errors.push(`Contact heading clipped: ${contact.top}`);
  if (contact.overflow > 0) errors.push(`overflow: ${contact.overflow}`);
  await page.screenshot({ path: `${out}/${width}-contact.png` });
  results.push({ width, height, transition, contact, errors });
  await page.close();
  console.log(`${width}x${height}: ${errors.length} findings`);
}
for (const width of [1440,390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'networkidle' });
  const resolved = await page.evaluate(() => ({
    assembly: document.querySelector('.assembly__model svg').dataset.complete,
    machines: [...document.querySelectorAll('.machine')].map(e => e.dataset.beat),
    sticky: [...document.querySelectorAll('.story-sticky')].some(e => getComputedStyle(e).position === 'sticky')
  }));
  results.push({ width, reduced: resolved, errors: resolved.assembly !== 'true' || resolved.sticky || resolved.machines.some(b => b !== '4') ? ['reduced motion did not resolve'] : [] });
  await page.close();
}
await browser.close();
await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2));
if (results.some(r => r.errors.length)) process.exitCode = 1;
