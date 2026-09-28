// Hero atlas experiment: every head picture each variant uploads during three
// moves (rest to the right edge; right edge to the top-right corner, a
// neighbouring direction; right edge to the left edge, across), as
// filmstrips, so transitions can be judged frame by frame.
//   node scripts/qa-atlas-filmstrip.mjs [baseUrl] [outDir] [extra atlas query, e.g. atlasBridge=dissolve]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2] || "http://127.0.0.1:5190/";
const outDir = process.argv[3] || "artifacts/atlas/compare";
const extra = process.argv[4] || "";
const variants = extra ? ["atlas"] : ["living", "atlas"];
const tag = extra ? `-${extra.split("=").pop()}` : "";
await mkdir(outDir, { recursive: true });
const W = 1440, H = 900;
const CAPTURE = () => {
  window.__shots = [];
  window.__rec = false;
  const orig = WebGLRenderingContext.prototype.texImage2D;
  WebGLRenderingContext.prototype.texImage2D = function (...args) {
    const src = args[args.length - 1];
    if (window.__rec && src instanceof HTMLCanvasElement && src.classList.contains("living__canvas")) {
      const c = document.createElement("canvas");
      c.width = 220;
      c.height = Math.round((220 * src.height) / src.width);
      c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
      window.__shots.push({ t: performance.now(), url: c.toDataURL("image/jpeg", 0.85) });
    }
    return orig.apply(this, args);
  };
};

for (const variant of variants) {
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await context.addInitScript(CAPTURE);
  const page = await context.newPage();
  await page.goto(variant === "atlas" ? `${base}?hero=atlas${extra ? `&${extra}` : ""}` : base, { waitUntil: "networkidle" });
  await page.mouse.move(W / 2, H / 2);
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForFunction(() => document.querySelector(".living")?.dataset.live !== undefined, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const box = await page.locator(".living").boundingBox();
  const face = { x: box.x + box.width * 0.468, y: box.y + box.height * 0.213 };
  const moves = [
    ["rest-to-right", [face.x, face.y], [W - 4, face.y]],
    ["right-to-upright", [W - 4, face.y], [W - 4, 4]],
    ["right-to-left", [W - 4, face.y], [4, face.y]],
  ];
  for (const [name, from, to] of moves) {
    await page.mouse.move(...from, { steps: 5 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__shots.length = 0; window.__rec = true; });
    await page.mouse.move(...to, { steps: 12 });
    await page.waitForTimeout(1300);
    const shots = await page.evaluate(() => { window.__rec = false; return window.__shots; });
    if (!shots.length) continue;
    const imgs = await Promise.all(shots.slice(0, 40).map((s) => sharp(Buffer.from(s.url.split(",")[1], "base64")).toBuffer()));
    const meta = await sharp(imgs[0]).metadata();
    const cols = 10, rows = Math.ceil(imgs.length / cols);
    await sharp({ create: { width: cols * meta.width, height: rows * meta.height, channels: 3, background: "#fff" } })
      .composite(imgs.map((input, i) => ({ input, left: (i % cols) * meta.width, top: Math.floor(i / cols) * meta.height })))
      .jpeg({ quality: 85 })
      .toFile(path.join(outDir, `${variant}${tag}-${name}.jpg`));
    console.log(`${variant} ${name}: ${shots.length} head pictures over ${Math.round(shots.at(-1).t - shots[0].t)}ms`);
  }
  await browser.close();
}
