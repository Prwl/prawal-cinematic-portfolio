// Mechanical layout and accessibility checks at every QA viewport.
//   node scripts/qa-layout.mjs [url]
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:5190/";
const viewports = {
  "1440x900": [1440, 900, false],
  "1366x768": [1366, 768, false],
  "1280x800": [1280, 800, false],
  "1024x1366": [1024, 1366, true],
  "820x1180": [820, 1180, true],
  "430x932": [430, 932, true],
  "390x844": [390, 844, true],
  "360x800": [360, 800, true]
};

const browser = await chromium.launch({ channel: "chrome" });
let failures = 0;

for (const [name, [width, height, touch]] of Object.entries(viewports)) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForTimeout(500);

  const report = await page.evaluate((isTouch) => {
    const vw = document.documentElement.clientWidth;
    const out = { overflowX: document.documentElement.scrollWidth - vw, escaping: [], smallTargets: [], missingAlt: [], tinyText: [] };
    const scrollers = [...document.querySelectorAll(".exhibition__wall, .voices__names")];
    const inScroller = (el) => scrollers.some((s) => s.contains(el));
    for (const el of document.querySelectorAll("main *, header *")) {
      if (inScroller(el) || el.closest("[aria-hidden='true']") || el.closest(".visually-hidden") || el.closest("[hidden]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        if (!el.closest(".prologue__camera, .epilogue__stage")) out.escaping.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      const style = getComputedStyle(el);
      if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(style.fontSize) < 11) {
        out.tinyText.push(`${el.tagName.toLowerCase()}.${el.className} ${style.fontSize}`);
      }
    }
    if (isTouch) {
      for (const el of document.querySelectorAll("a, button, summary")) {
        if (el.closest("[hidden]") || el.classList.contains("skip-link")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        // Inline text links inside running copy are exempt (WCAG 2.5.8 inline exception).
        const inline = getComputedStyle(el).display === "inline";
        if (!inline && (r.height < 24 || r.width < 24)) out.smallTargets.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    for (const img of document.querySelectorAll("img")) if (!img.hasAttribute("alt")) out.missingAlt.push(img.src);
    out.escaping = [...new Set(out.escaping)].slice(0, 12);
    return out;
  }, touch);

  const problems = report.overflowX > 0 || report.escaping.length || report.smallTargets.length || report.missingAlt.length || report.tinyText.length;
  if (problems) failures++;
  console.log(`\n${name}: overflowX=${report.overflowX}`);
  for (const k of ["escaping", "smallTargets", "missingAlt", "tinyText"]) if (report[k].length) console.log(`  ${k}:\n    ${report[k].join("\n    ")}`);
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} viewport(s) with findings` : "\nAll viewports clean.");
