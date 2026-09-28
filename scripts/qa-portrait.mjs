// Living portrait gating and fallbacks: which contexts download the clip, go
// live or fall back to the still, and whether the loop sleeps when idle.
//   node scripts/qa-portrait.mjs [url]
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const base = process.argv[2] || "http://127.0.0.1:5190/";
async function run(name, ctxOpts, { block = false, reduced = false } = {}) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const mp4 = [];
  const errs = [];
  page.on("request", (r) => /\.mp4(?:$|\?t=)/.test(r.url()) && mp4.push(r.url().split("/").pop()));
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  if (block) await page.route("**/*.mp4", (r) => r.abort());
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__raf = 0;
    window.requestAnimationFrame = (cb) => { if (cb.name === "tick") window.__raf++; return raf(cb); };
  });
  await page.goto(base, { waitUntil: "networkidle" });
  const intro = await page.evaluate(() => document.documentElement.classList.contains("intro"));
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForTimeout(3500);
  const state = await page.evaluate(() => ({ live: document.querySelector(".living")?.hasAttribute("data-live"), still: document.querySelector(".living")?.hasAttribute("data-still"), video: !!document.querySelector(".living__video"), poster: document.querySelector(".living__poster img")?.complete }));
  let idle = "";
  if (state.live) {
    await page.mouse.move(200, 300); await page.waitForTimeout(2500);
    const a = await page.evaluate(() => window.__raf); await page.waitForTimeout(2000);
    const b = await page.evaluate(() => window.__raf);
    idle = ` portrait rAF calls in 2s idle after tracking: ${b - a}`;
  }
  console.log(`${name.padEnd(28)} intro=${intro} mp4=${JSON.stringify(mp4)} ${JSON.stringify(state)}${idle} errors=${errs.length ? errs.join(" | ") : "none"}`);
  await ctx.close();
}
await run("desktop mouse 1440x900", { viewport: { width: 1440, height: 900 } });
await run("desktop 1280x800", { viewport: { width: 1280, height: 800 } });
await run("desktop video blocked", { viewport: { width: 1440, height: 900 } }, { block: true });
await run("desktop reduced motion", { viewport: { width: 1440, height: 900 } }, { reduced: true });
await run("touch tablet landscape", { viewport: { width: 1366, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await run("tablet portrait 1024x1366", { viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await run("tablet 820x1180", { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await run("phone 390x844", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await browser.close();
