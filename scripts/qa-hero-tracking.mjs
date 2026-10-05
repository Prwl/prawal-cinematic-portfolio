// The living portrait at the nine pointer positions (corners, edges,
// centre): each must be a distinct, clean pose. Writes a 3x3 sheet.
//   node scripts/qa-hero-tracking.mjs [url] [out.jpg]
import { chromium } from "playwright";
import sharp from "sharp";
const base = process.argv[2] || "http://127.0.0.1:5194/";
const out = process.argv[3] || "artifacts/qa/polish/hero-nine.jpg";
const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(base, { waitUntil: "networkidle" });
await page.mouse.move(720, 450);
await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
await page.waitForFunction(() => document.querySelector(".living")?.dataset.live !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(3000);
const box = await page.locator(".living").boundingBox();
const tiles = [];
const frames = [];
for (const fy of [0.03, 0.5, 0.97]) for (const fx of [0.02, 0.5, 0.98]) {
  await page.mouse.move(1440 * fx, 900 * fy, { steps: 10 });
  await page.waitForTimeout(1300);
  const clip = { x: box.x + box.width * 0.2, y: Math.max(0, box.y), width: box.width * 0.55, height: box.height * 0.5 };
  const png = await page.screenshot({ clip });
  tiles.push(png);
  frames.push((await sharp(png).resize(64, 58).greyscale().raw().toBuffer()));
}
// Distinctness: every pose differs from every other by a visible margin.
let minDiff = Infinity;
for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
  let d = 0; for (let k = 0; k < frames[i].length; k++) d += Math.abs(frames[i][k] - frames[j][k]);
  minDiff = Math.min(minDiff, d / frames[i].length);
}
const w = 400, h = Math.round(400 * (box.height * 0.5) / (box.width * 0.55));
await sharp({ create: { width: 3 * w, height: 3 * h, channels: 3, background: "#000" } })
  .composite(await Promise.all(tiles.map(async (t, i) => ({ input: await sharp(t).resize(w, h).toBuffer(), left: (i % 3) * w, top: Math.floor(i / 3) * h }))))
  .jpeg().toFile(out);
console.log(`nine poses captured; smallest mean difference between any two: ${minDiff.toFixed(2)} levels`);
if (minDiff < 1) process.exitCode = 1;
await browser.close();
