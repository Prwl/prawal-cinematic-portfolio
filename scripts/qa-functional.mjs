// Functional QA against a running build.
//   node scripts/qa-functional.mjs [url]
// Checks: console/network errors, in-page anchors, résumé and framework
// downloads, keyboard focus order and visibility, mobile menu focus handling.
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:4190/";
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];
const log = (...a) => console.log(...a);

// ---------- Desktop ----------
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && problems.push(`console.${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));
  await page.goto(base, { waitUntil: "networkidle" });

  // The title sequence plays on a fresh visit; a key press settles it.
  const introPlayed = await page.evaluate(() => document.documentElement.classList.contains("intro-started"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  log(`intro played on first visit: ${introPlayed}`);

  // Anchors all resolve.
  const anchors = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.querySelector(h))
  );
  if (anchors.length) problems.push(`broken anchors: ${anchors.join(", ")}`);
  log(`in-page anchors checked, broken: ${anchors.length}`);

  // Downloads.
  for (const selector of ['.prologue__actions a[download]', '.intelligence a[download]', '.epilogue a[download]']) {
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.click(selector)]);
    const file = await download.path();
    const { statSync } = await import("node:fs");
    log(`download via ${selector}: ${download.suggestedFilename()} (${statSync(file).size} bytes)`);
    if (statSync(file).size < 10000) problems.push(`download too small: ${selector}`);
  }

  // Keyboard: first stops after load, each with a visible focus outline.
  await page.goto(base + "#identity", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.focus("body");
  const stops = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        const visible = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        return `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 28)}" outline=${visible}`;
      })
    );
  }
  log("tab order:\n  " + stops.join("\n  "));
  if (stops.some((s) => s.endsWith("outline=false"))) problems.push("a focus stop has no visible outline");

  // External links respond.
  const external = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="http"]')].map((a) => a.href))]);
  for (const url of external) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
      log(`external ${res.status} ${url}`);
    } catch (e) {
      log(`external FAILED ${url} ${e.message}`);
    }
  }
  await context.close();
}

// ---------- Phone: menu focus ----------
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`mobile pageerror: ${e.message}`));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.click(".prologue__skip");
  await page.click(".site-header__toggle");
  const firstFocus = await page.evaluate(() => document.activeElement.textContent.trim());
  const mainInert = await page.evaluate(() => document.querySelector("main").inert);
  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => document.getElementById("cue-menu").hidden && !document.querySelector("main").inert);
  log(`mobile menu: first focus "${firstFocus}", page inert while open: ${mainInert}, closes on Escape: ${closed}`);
  if (!mainInert || !closed) problems.push("mobile menu focus handling");
  await context.close();
}

await browser.close();
console.log(problems.length ? "\nPROBLEMS:\n" + problems.join("\n") : "\nNo functional problems found.");
