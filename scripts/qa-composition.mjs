// Composition QA: every scene, every beat, every viewport. Reports text that
// intersects a scene's foreground subject or another text block, headings
// under the header or outside the frame, controls another layer covers, and
// foreground subjects leaving the frame. Screenshots each beat.
//   node scripts/qa-composition.mjs [url] [--shots] [--only=selector]
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) || "http://127.0.0.1:5194/";
const shots = args.includes("--shots");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const out = "artifacts/qa/polish";
await mkdir(out, { recursive: true });

// Browser zoom at 110% and 125% on a 1440x900 window is a 1309x818 and a
// 1152x720 CSS viewport at the same physical size.
const sizes = (args.find((a) => a.startsWith("--sizes="))?.slice(8).split(",").map((s) => s.split("x").map(Number))) || [
  [1440, 900], [1366, 768], [1280, 720], [1024, 768], [820, 1180], [430, 932], [390, 844], [360, 800], [1309, 818, 1.1], [1152, 720, 1.25]
];
const SUBJECT = [
  ".hall__flat[data-state=current]",
  ".ascent__step[data-state=current] .ascent__year",
  ".exhibition__print[data-state=current]",
  ".study__station[data-current=true] .study__piece[data-lifted=true]",
  ".voices__face",
  ".assembly__model svg",
  ".system-story__visual svg",
  ".scale-scene__event svg[data-current=true]"
].join(",");

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
for (const [width, height, dpr = 1] of sizes) {
  const touch = width < 1100 && dpr === 1;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForTimeout(600);
  const runs = page.locator(only || ".story-run");
  const count = await runs.count();
  for (let r = 0; r < count; r++) {
    const run = runs.nth(r);
    const beats = Number(await run.getAttribute("data-beats")) || 1;
    const name = (await run.getAttribute("class")).split(" ")[1] + ((await run.getAttribute("data-kind")) ? `-${await run.getAttribute("data-kind")}` : "");
    for (let b = 0; b < beats; b++) {
      await run.evaluate((el, f) => {
        const top = el.getBoundingClientRect().top + scrollY;
        window.scrollTo({ top: top + Math.max(0, el.offsetHeight - innerHeight) * f, behavior: "instant" });
      }, (b + 0.5) / beats);
      await page.waitForTimeout(1500);
      const found = await run.evaluate((el, SUBJECT) => {
        const sticky = el.querySelector(".story-sticky");
        const vis = (e) => { const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
        const rect = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
        const hit = (a, c, pad = 2) => a.l < c.r - pad && a.r > c.l + pad && a.t < c.b - pad && a.b > c.t + pad;
        const name = (e) => (e.className?.baseVal ?? e.className ?? e.tagName).toString().split(" ")[0] || e.tagName;
        const texts = [...sticky.querySelectorAll("h2,h3,p,figcaption,blockquote")].filter((e) => !e.closest("[aria-hidden=true],svg,.detail-layer") && vis(e) && e.textContent.trim() && [e, ...(function* up(n) { while ((n = n.parentElement)) yield n; })(e)].every((n) => n.getBoundingClientRect().width > 2)).map((e) => { const range = document.createRange(); range.selectNodeContents(e); const b = range.getBoundingClientRect(); return { e, n: `${name(e)}:${e.textContent.trim().slice(0, 28)}`, r: { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } }; }).filter((t) => t.r.w > 2 && t.r.h > 2);
        const controls = [...sticky.querySelectorAll(".scene-footer button, .scene-footer a, .gallery-controls button")].filter((e) => vis(e) && !e.disabled);
        const subjects = [...sticky.querySelectorAll(SUBJECT)].filter(vis).map((e) => ({ n: name(e), r: rect(e) }));
        const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
        const issues = [];
        for (const t of texts) {
          for (const s of subjects) if (!s.n.includes("svg") && !s.n.startsWith("assembly") && hit(t.r, s.r, 4)) issues.push(`text/subject: "${t.n}" x ${s.n}`);
          if (t.r.t < header - 2) issues.push(`under header: "${t.n}" top ${Math.round(t.r.t)}`);
          if (t.r.b > innerHeight + 1 || t.r.r > innerWidth + 1 || t.r.l < -1) issues.push(`text outside frame: "${t.n}"`);
        }
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], c = texts[j];
          if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
          if (hit(a.r, c.r, 3)) issues.push(`text/text: "${a.n}" x "${c.n}"`);
        }
        for (const c of controls) {
          const b = c.getBoundingClientRect();
          if (b.bottom > innerHeight + 1 || b.right > innerWidth + 1) { issues.push(`control outside frame: ${c.textContent.trim() || c.getAttribute("aria-label")}`); continue; }
          const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          if (at && !c.contains(at)) issues.push(`control covered: ${c.textContent.trim() || c.getAttribute("aria-label")} by ${name(at)}`);
        }
        for (const s of subjects) {
          const vw = Math.max(0, Math.min(s.r.r, innerWidth) - Math.max(s.r.l, 0)), vh = Math.max(0, Math.min(s.r.b, innerHeight) - Math.max(s.r.t, header));
          const frac = (vw * vh) / Math.max(1, s.r.w * s.r.h);
          if (!s.n.includes("svg") && frac < 0.9) issues.push(`subject cropped: ${s.n} ${Math.round(frac * 100)}% in frame`);
        }
        for (const t of texts) {
          const c = getComputedStyle(t.e).color;
          if (/rgba?\([^)]*,\s*0?\.[0-3]\d*\)/.test(c)) issues.push(`faint text: "${t.n}" ${c}`);
        }
        return issues;
      }, SUBJECT);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (scroll > 0) found.push(`page overflow ${scroll}px`);
      if (found.length) report.push({ size: `${width}x${height}${dpr > 1 ? `@${dpr}` : ""}`, scene: name, beat: b, issues: found });
      if (shots) await page.screenshot({ path: `${out}/${width}x${height}-${name}-${b}.png` });
    }
  }
  if (errors.length) report.push({ size: `${width}x${height}`, scene: "page", issues: errors });
  await ctx.close();
  console.log(`${width}x${height}${dpr > 1 ? `@${dpr}` : ""}: ${report.filter((x) => x.size.startsWith(`${width}x${height}`)).length} beat(s) with findings`);
}
await browser.close();
await writeFile(`${out}/composition-${sizes.map(([w,h]) => `${w}x${h}`).join("_")}${only ? "-" + only.replace(/[^a-z0-9]/gi, "") : ""}.json`, JSON.stringify(report, null, 2));
const tally = {};
for (const x of report) for (const i of x.issues) { const k = `${x.scene} | ${i.replace(/\d+%|top \d+|\d+px/g, "#")}`; tally[k] = (tally[k] || []).concat(`${x.size}#${x.beat}`); }
for (const [k, v] of Object.entries(tally).sort()) console.log(`${k}  [${v.length}] ${v.slice(0, 6).join(" ")}${v.length > 6 ? " ..." : ""}`);

if (report.length) process.exitCode = 1;
