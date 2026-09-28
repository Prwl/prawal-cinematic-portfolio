// Drives a real mouse over the opening and reports the portrait frame at
// each pointer position, the follow timing and the return
// to rest. Face crops are written to the output directory.
//   node scripts/qa-tracking.mjs [outDir] [url]
import { chromium } from "playwright";
const [out = ".impeccable/review/tracking", base = "http://127.0.0.1:5190/"] = process.argv.slice(2);
await (await import("node:fs/promises")).mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
await page.waitForFunction(() => document.querySelector(".living")?.hasAttribute("data-live"), null, { timeout: 8000 });
const face = await page.evaluate(() => { const r = document.querySelector(".living").getBoundingClientRect(); return { x: r.left + r.width * 0.468, y: r.top + r.height * 0.213, box: [r.left, r.top, r.width, r.height] }; });
console.log("face", JSON.stringify(face));
const clip = { x: face.x - 170, y: Math.max(0, face.y - 170), width: 340, height: 340 };
const frameNow = () => page.evaluate(() => Math.round(document.querySelector(".living__video").currentTime * 24 - 0.5));
const observed = {};
const at = [["center", face.x, face.y], ["left-edge", 5, face.y], ["left-mid", face.x * 0.5, face.y], ["near-face", face.x - 40, face.y + 20], ["right-edge", 1435, face.y], ["up", face.x, 5], ["down", face.x, 895], ["up-left", 40, 40], ["down-right", 1400, 880]];
await page.mouse.move(face.x, face.y);
await page.waitForTimeout(2200); // gain ramp
for (const [k, x, y] of at) {
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(1200);
  const f = await frameNow();
  observed[k] = f;
  console.log(k.padEnd(11), "frame", f);
  await page.screenshot({ path: `${out}/${k}.png`, clip });
}
// Timing: how quickly does the head follow a jump from centre to right edge?
await page.mouse.move(face.x, face.y); await page.waitForTimeout(1500);
const samples = [];
const t0 = Date.now();
await page.mouse.move(1435, face.y);
for (let i = 0; i < 14; i++) { await page.waitForTimeout(60); samples.push(`${Date.now() - t0}ms:${await frameNow()}`); }
console.log("follow", samples.join(" "));
// Leave the window: should return to neutral.
await page.mouse.move(1435, face.y); await page.waitForTimeout(800);
await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent("pointerleave")));
await page.waitForTimeout(1600);
console.log("after leave frame", await frameNow());
// Scroll away: gain should fade and the loop stop.
await page.mouse.move(1400, 450); await page.waitForTimeout(1000);
await page.mouse.wheel(0, 900); await page.waitForTimeout(1800);
console.log("scrolled frame", await frameNow());
if (Math.abs(observed.up - observed.center) < 2 || Math.abs(observed.down - observed.center) < 2) errs.push("Vertical pointer travel did not change the head pose");
if (observed["left-edge"] === observed["right-edge"]) errs.push("Horizontal tracking did not turn the head");
if (errs.length) process.exitCode = 1;
console.log(errs.join("\n") || "no errors");
await browser.close();
