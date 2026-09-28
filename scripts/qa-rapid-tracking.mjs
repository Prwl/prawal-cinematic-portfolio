// Stress the living portrait with pointer input faster than a person can
// comfortably produce. Reports actual decoded frames painted to the head
// canvas, not merely requested video seek positions.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const [out = "artifacts/qa/rapid-tracking", base = "http://127.0.0.1:5190/"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  window.__headDraws = [];
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function patched(source, ...args) {
    if (this.canvas?.classList?.contains("living__canvas")) {
      window.__headDraws.push({ at: performance.now(), frame: Math.round((source.currentTime || 0) * 24 - 0.5) });
    }
    return drawImage.call(this, source, ...args);
  };
});
await page.goto(base, { waitUntil: "networkidle" });
await page.locator(".prologue__skip").click().catch(() => {});
await page.waitForFunction(() => document.querySelector(".living")?.hasAttribute("data-live"), null, { timeout: 10000 });
const face = await page.locator(".living").evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * 0.468, y: r.top + r.height * 0.213 };
});
const points = {
  centre: [face.x, face.y],
  left: [8, face.y],
  right: [1432, face.y],
  up: [face.x, 8],
  down: [face.x, 892],
  nw: [12, 12],
  ne: [1428, 12],
  se: [1428, 888],
  sw: [12, 888],
};

await page.mouse.move(...points.centre);
await page.waitForTimeout(1800);
await page.evaluate(() => { window.__headDraws.length = 0; });
const started = Date.now();

// Hard reversals and crossed diagonals, 45–70ms apart.
const sequence = ["left", "right", "up", "down", "nw", "se", "ne", "sw", "right", "left"];
for (let pass = 0; pass < 3; pass++) {
  for (const name of sequence) {
    await page.mouse.move(...points[name], { steps: 2 });
    await page.waitForTimeout(45);
  }
}

// A fast orbit catches directional discontinuities that edge jumps miss.
for (let i = 0; i <= 48; i++) {
  const a = (i / 48) * Math.PI * 2;
  await page.mouse.move(face.x + Math.cos(a) * 350, face.y + Math.sin(a) * 230);
  await page.waitForTimeout(12);
}
await page.mouse.move(...points.centre);
await page.waitForTimeout(1200);

const draws = await page.evaluate(() => window.__headDraws);
const gaps = draws.slice(1).map((d, i) => d.at - draws[i].at);
const jumps = draws.slice(1).map((d, i) => Math.abs(d.frame - draws[i].frame));
const report = {
  durationMs: Date.now() - started,
  paintedFrames: draws.length,
  uniqueFrames: new Set(draws.map((d) => d.frame)).size,
  maxPaintGapMs: gaps.length ? Math.round(Math.max(...gaps)) : null,
  averagePaintGapMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
  maxFrameJump: jumps.length ? Math.max(...jumps) : null,
  returnFrame: draws.at(-1)?.frame ?? null,
  draws,
};
await page.screenshot({ path: `${out}/final.png` });
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, draws: undefined }, null, 2));
await browser.close();
