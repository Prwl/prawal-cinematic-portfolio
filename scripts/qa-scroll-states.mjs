// Scroll-state reliability matrix, in real Chrome, at every supported size:
// large jumps both ways, direction independence, a hand resting on a
// boundary, a pause mid-transition, an immediate reverse, anchor navigation,
// a resize mid-scene and reduced motion. Every case must settle on a beat
// whose words, controls and imagery describe that beat.
//   node scripts/qa-scroll-states.mjs [url]
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { storyStateScript } from "./story-state.mjs";

const url = process.argv[2] || "http://127.0.0.1:5190/";
const sizes = process.env.QA_SIZE ? [process.env.QA_SIZE.split("x").map(Number)] : [[1440, 900], [1366, 768], [1280, 720], [1024, 768], [390, 844]];
const RUNS = { identity: ".hall", evolution: ".ascent", refinery: '.system-story[data-kind="pipeline"]', enrollment: '.system-story[data-kind="transactions"]', taxonomy: '.system-story[data-kind="taxonomy"]', scale: ".scale-scene", intelligence: ".assembly", exhibition: ".exhibition", study: ".study", voices: ".voices" };
const CAPTIONS = ".hall__line, .ascent__caption, .system-story__narrative, .exhibition__label, .study__caption, .scale-scene__metric, .assembly__caption, .voices__stage";

const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const scrollToY = (page, y) => page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
const runBox = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  return { top: el.getBoundingClientRect().top + scrollY, len: el.offsetHeight - innerHeight };
}, sel);

/** The settled state of one run: beat, words, controls, camera and imagery agree. */
const settled = (page, sel) => page.evaluate(({ sel, CAPTIONS }) => {
  const el = document.querySelector(sel);
  const cap = el.querySelector(CAPTIONS);
  const moving = el.getAnimations({ subtree: true }).filter((a) => a.playState === "running" && /transform/.test(a.transitionProperty ?? "") && !a.effect.target.closest(".machine__group, .machine__flow")).length;
  const current = [...el.querySelectorAll('[data-state="current"] img, [data-current="true"] [data-lifted="true"] img')];
  const story = window.__story(el);
  return {
    active: story.active,
    confirmed: story.confirmed,
    moving: story.moving,
    reduced: el.dataset.reduced === "true",
    caption: cap ? +getComputedStyle(cap).opacity : 1,
    text: cap?.textContent.trim().length ?? 0,
    camera: moving,
    blankImages: current.filter((img) => !(img.complete && img.naturalWidth > 0)).length
  };
}, { sel, CAPTIONS });

function check(errors, label, s, expect = {}) {
  const problems = [];
  if (s.moving) problems.push("still moving");
  if (s.active !== s.confirmed) problems.push(`words ${s.confirmed} for beat ${s.active}`);
  if (s.caption < 0.95) problems.push(`caption opacity ${s.caption}`);
  if (!s.text) problems.push("empty caption");
  if (s.camera) problems.push("camera still travelling");
  if (s.blankImages) problems.push(`${s.blankImages} unloaded active image(s)`);
  if (expect.active !== undefined && s.active !== expect.active) problems.push(`beat ${s.active}, expected ${expect.active}`);
  if (problems.length) errors.push(`${label}: ${problems.join(", ")}`);
  return s;
}

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
await mkdir("artifacts/qa/scroll-states", { recursive: true });
for (const [w, h] of sizes) {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  const page = await ctx.newPage();
  await page.addInitScript(storyStateScript);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForTimeout(800);
  const pageEnd = await page.evaluate(() => document.documentElement.scrollHeight);

  for (const [name, sel] of Object.entries(RUNS)) {
    const box = await runBox(page, sel);
    if (box.len <= 0) continue; // short landscape: the run is not pinned
    for (const p of [0.12, 0.5, 0.88]) {
      const y = Math.round(box.top + box.len * p);
      // Large forward jump from the top of the page, as a scrollbar drag does.
      await scrollToY(page, 0); await frame(page);
      await scrollToY(page, y); await page.waitForTimeout(1700);
      const fwd = check(errors, `${name} jump down to ${p}`, await settled(page, sel));
      // The same place reached from the bottom: the same beat.
      await scrollToY(page, pageEnd); await frame(page);
      await scrollToY(page, y); await page.waitForTimeout(1700);
      check(errors, `${name} jump up to ${p}`, await settled(page, sel), { active: fwd.active });
    }
  }

  // Boundary, pause mid-transition, immediate reverse: on the scenes whose
  // narrative must not slip.
  for (const name of ["identity", "evolution", "refinery", "enrollment", "taxonomy", "intelligence", "exhibition"]) {
    const sel = RUNS[name];
    const box = await runBox(page, sel);
    if (box.len <= 0) continue;
    // Find the first boundary after 20% of the run.
    await scrollToY(page, box.top + box.len * 0.2); await page.waitForTimeout(1500);
    const from = (await settled(page, sel)).active;
    let y = box.top + box.len * 0.2;
    let beat = from;
    while (beat === from && y < box.top + box.len) {
      y += 6; await scrollToY(page, y); await frame(page);
      beat = (await settled(page, sel)).active;
    }
    // A hand resting on the boundary: small movements either side.
    let flips = 0, last = beat;
    for (let i = 0; i < 24; i++) {
      await scrollToY(page, y + (i % 2 ? -8 : 8)); await frame(page);
      const now = (await settled(page, sel)).active;
      if (now !== last) flips++;
      last = now;
    }
    if (flips > 1) errors.push(`${name}: boundary flickered ${flips} times under 8px movements`);
    await page.waitForTimeout(1700);
    check(errors, `${name} after boundary jiggle`, await settled(page, sel));
    // Pause mid-transition: the old words must already be gone.
    await scrollToY(page, y - box.len * 0.15); await page.waitForTimeout(1700);
    const before = await settled(page, sel);
    await scrollToY(page, y + box.len * 0.08); await page.waitForTimeout(220);
    const mid = await settled(page, sel);
    if (mid.active !== before.active && mid.caption > 0.5 && mid.confirmed !== mid.active) errors.push(`${name}: stale words ${mid.confirmed} shown mid-move to ${mid.active}`);
    await page.waitForTimeout(1700);
    check(errors, `${name} resumed after mid-transition pause`, await settled(page, sel));
    // Immediate reverse: forward a beat and straight back.
    await scrollToY(page, y + box.len * 0.08); await frame(page); await frame(page);
    await scrollToY(page, y - box.len * 0.15); await page.waitForTimeout(1700);
    check(errors, `${name} immediate reverse`, await settled(page, sel), { active: before.active });
  }

  // Resize mid-scene: the beat is recomputed for the new layout and settles.
  {
    const box = await runBox(page, RUNS.intelligence);
    if (box.len > 0) {
      await scrollToY(page, box.top + box.len * 0.6); await page.waitForTimeout(1500);
      await page.setViewportSize({ width: w === 390 ? 430 : Math.round(w * 0.85), height: h });
      await page.waitForTimeout(400);
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(1800);
      check(errors, "intelligence after resize", await settled(page, RUNS.intelligence));
    }
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) errors.push(`horizontal overflow ${overflow}px`);
  await ctx.close();

  // Anchor navigation: a fresh load straight onto a chapter.
  for (const hash of ["#systems", "#intelligence", "#recognition"]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 });
    const p = await c.newPage();
    await p.addInitScript(storyStateScript);
    p.on("pageerror", (e) => errors.push(`pageerror ${hash}: ${e.message}`));
    await p.goto(url + hash, { waitUntil: "networkidle" });
    await p.waitForTimeout(1800);
    const state = await p.evaluate(() => [...document.querySelectorAll(".story-run")].map((el) => window.__story(el)));
    state.forEach((s, i) => { if (s.moving || s.active !== s.confirmed) errors.push(`anchor ${hash}: run ${i} unsettled ${JSON.stringify(s)}`); });
    await c.close();
  }

  // Reduced motion: every chapter resolved, no transition state at all.
  {
    const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, reducedMotion: "reduce" });
    const p = await c.newPage();
    await p.addInitScript(storyStateScript);
    await p.goto(url, { waitUntil: "networkidle" });
    for (const [name, sel] of Object.entries(RUNS)) {
      await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(80);
      const s = await settled(p, sel);
      if (!s.reduced || s.moving || s.caption < 0.95 || s.active !== s.confirmed) errors.push(`reduced motion ${name}: ${JSON.stringify(s)}`);
    }
    await c.close();
  }

  report.push({ size: `${w}x${h}`, errors });
  console.log(`${w}x${h}: ${errors.length ? errors.length + " problem(s)\n  " + errors.join("\n  ") : "ok"}`);
}
await browser.close();
await writeFile("artifacts/qa/scroll-states/report.json", JSON.stringify(report, null, 2));
if (report.some((r) => r.errors.length)) process.exitCode = 1;
