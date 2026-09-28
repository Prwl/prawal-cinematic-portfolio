// Visual QA captures.
//   node scripts/qa-screenshots.mjs <mode> [url] [outDir]
// Modes:
//   intro     frames of the title sequence at desktop and phone sizes
//   settled   first viewport (intro skipped) at every QA viewport
//   full      full-page captures at every QA viewport, lamps lit
//   reduced   full-page desktop + phone with prefers-reduced-motion
//   sections  viewport captures of every chapter (QA_VIEWPORTS=a,b to choose sizes)
// Console errors, page errors and failed requests are printed for every run.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [mode = "settled", base = "http://localhost:5190/", out = ".impeccable/review/shots"] = process.argv.slice(2);

export const viewports = {
  "1440x900": { width: 1440, height: 900 },
  "1366x768": { width: 1366, height: 768 },
  "1280x800": { width: 1280, height: 800 },
  "1024x1366-tablet": { width: 1024, height: 1366, mobile: true },
  "820x1180-tablet": { width: 820, height: 1180, mobile: true },
  "430x932": { width: 430, height: 932, mobile: true },
  "390x844": { width: 390, height: 844, mobile: true },
  "360x800": { width: 360, height: 800, mobile: true }
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

async function open(name, vp, { reduced = false, hash = "" } = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    reducedMotion: reduced ? "reduce" : "no-preference"
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`[${name}] console.${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[${name}] pageerror: ${err.message}`));
  page.on("requestfailed", (req) => problems.push(`[${name}] requestfailed: ${req.url()} ${req.failure()?.errorText}`));
  page.on("response", (res) => {
    if (res.status() >= 400) problems.push(`[${name}] HTTP ${res.status()}: ${res.url()}`);
  });
  await page.goto(base + hash, { waitUntil: "networkidle" });
  return { context, page };
}

async function settle(page) {
  // Skip the title sequence, then wait for fonts and images.
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function lightAll(page) {
  // Walk the page so every lamp and scroll trigger fires, then return to top.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y < height; y += Math.round(vh * 0.6)) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => document.querySelectorAll("[data-lamp]").forEach((el) => el.setAttribute("data-lit", "")));
  await page.waitForTimeout(1300);
}

if (mode === "intro") {
  for (const name of ["1440x900", "390x844"]) {
    const { context, page } = await open(name, viewports[name]);
    let last = 0;
    for (const t of [300, 1200, 2200, 3200, 4200, 5200, 7000]) {
      await page.waitForTimeout(t - last);
      last = t;
      await page.screenshot({ path: path.join(out, `intro-${name}-${t}ms.png`) });
    }
    await context.close();
  }
}

if (mode === "settled") {
  for (const [name, vp] of Object.entries(viewports)) {
    const { context, page } = await open(name, vp);
    await settle(page);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `settled-${name}.png`) });
    await context.close();
  }
}

if (mode === "full" || mode === "reduced") {
  const reduced = mode === "reduced";
  const names = reduced ? ["1440x900", "390x844"] : Object.keys(viewports);
  for (const name of names) {
    const { context, page } = await open(name, viewports[name], { reduced });
    await settle(page);
    await lightAll(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${mode}-${name}.png`), fullPage: true });
    await context.close();
  }
}

if (mode === "sections") {
  // Viewport-sized captures of each chapter at desktop and phone.
  const names = process.env.QA_VIEWPORTS ? process.env.QA_VIEWPORTS.split(",") : ["1440x900", "390x844"];
  for (const name of names) {
    const { context, page } = await open(name, viewports[name]);
    await settle(page);
    await lightAll(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll("main section[id]")].map((s) => s.id));
    for (const id of ids) {
      const tops = await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        const top = el.getBoundingClientRect().top + scrollY;
        return { top, height: el.offsetHeight };
      }, id);
      const steps = Math.max(1, Math.ceil(tops.height / viewports[name].height));
      for (let s = 0; s < Math.min(steps, 6); s++) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), tops.top + s * viewports[name].height);
        await page.waitForTimeout(900);
        await page.screenshot({ path: path.join(out, `section-${name}-${id}-${s}.png`) });
      }
    }
    await context.close();
  }
}

if (mode === "evidence") {
  // Stitched full-page captures for the finish review. A single screenshot
  // taller than 16,384px wraps in Chrome, so the page is captured in tiles.
  const sharp = (await import("sharp")).default;
  for (const [file, name, dpr] of [["desktop.png", "1440x900", 1], ["mobile.png", "390x844", 1]]) {
    const vp = viewports[name];
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dpr, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await settle(page);
    await lightAll(page);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const tiles = [];
    for (let y = 0; y < total; y += vp.height) {
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
      await page.waitForTimeout(700);
      const actual = await page.evaluate(() => scrollY);
      tiles.push({ input: await page.screenshot(), top: actual });
      if (y === 0) await page.addStyleTag({ content: ".site-header, .cue-rail { visibility: hidden !important; }" });
    }
    const height = Math.min(total, tiles.at(-1).top + vp.height);
    await sharp({ create: { width: vp.width, height, channels: 3, background: "#d4d1ca" } })
      .composite(tiles.map((t) => ({ input: t.input, top: t.top, left: 0 })))
      .png()
      .toFile(path.join(path.dirname(out), file));
    console.log(`${file}: ${vp.width}x${height} from ${tiles.length} tiles`);
    await context.close();
  }
}

await browser.close();
console.log(problems.length ? problems.join("\n") : "No console errors, page errors or failed requests.");
