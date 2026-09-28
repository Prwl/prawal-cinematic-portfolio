// Hero atlas experiment: production living portrait vs ?hero=atlas, driven by
// the same pointer paths and measured the same way, without touching either
// implementation. Every head picture either one uploads to its WebGL stage is
// caught at texImage2D and fingerprinted.
//   node scripts/qa-atlas-compare.mjs [baseUrl] [outDir]
// Writes <outDir>/compare.json and a nine-pose sheet per variant.
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2] || "http://127.0.0.1:5190/";
const outDir = process.argv[3] || "artifacts/atlas/compare";
await mkdir(outDir, { recursive: true });
const W = 1440, H = 900;

const INSTRUMENT = () => {
  const log = (window.__heroLog = { inputs: [], heads: [], draws: 0 });
  const snap = document.createElement("canvas");
  snap.width = 48;
  snap.height = 48;
  const sctx = snap.getContext("2d", { willReadFrequently: true });
  const orig = WebGLRenderingContext.prototype.texImage2D;
  WebGLRenderingContext.prototype.texImage2D = function (...args) {
    const src = args[args.length - 1];
    if (src instanceof HTMLCanvasElement && src.classList.contains("living__canvas")) {
      // The face: the top middle of the head picture.
      sctx.drawImage(src, src.width * 0.3, src.height * 0.1, src.width * 0.4, src.height * 0.5, 0, 0, 48, 48);
      const d = sctx.getImageData(0, 0, 48, 48).data;
      const g = new Uint8Array(48 * 48);
      for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      log.heads.push({ t: performance.now(), g: Array.from(g) });
    }
    return orig.apply(this, args);
  };
  const draw = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function (...args) {
    log.draws++;
    return draw.apply(this, args);
  };
  window.addEventListener("pointermove", (e) => log.inputs.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), { capture: true, passive: true });
};

const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};
const pct = (v, p) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

async function laplacianVar(png) {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < info.height - 1; y++)
    for (let x = 1; x < info.width - 1; x++) {
      const i = y * info.width + x;
      const l = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - info.width] - data[i + info.width];
      s += l;
      s2 += l * l;
      n++;
    }
  return s2 / n - (s / n) ** 2;
}

async function run(variant) {
  const browser = await chromium.launch({ channel: "chrome", args: ["--enable-precise-memory-info"] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await context.addInitScript(INSTRUMENT);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  // What the head costs to fetch, from the files themselves (the dev
  // server's response bodies are not reliable for this).
  const bytes = {};
  if (variant === "atlas") {
    for (const f of await readdir("src/assets/atlas")) if (f.endsWith(".webp")) bytes[f] = (await stat(`src/assets/atlas/${f}`)).size;
  } else {
    bytes["prawal-living.mp4"] = (await stat("src/assets/media/living/prawal-living.mp4")).size;
  }
  await page.goto(variant === "atlas" ? `${base}?hero=atlas` : base, { waitUntil: "networkidle" });
  await page.mouse.move(W / 2, H / 2);
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector(".living")?.dataset.live !== undefined, null, { timeout: 30000 });
  const readyMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  const box = await page.locator(".living").boundingBox();
  const face = { x: box.x + box.width * 0.468, y: box.y + box.height * 0.213 };
  const clip = { x: box.x + box.width * 0.25, y: Math.max(0, box.y), width: box.width * 0.45, height: box.height * 0.42 };
  const reset = () => page.evaluate(() => { window.__heroLog.heads.length = 0; window.__heroLog.inputs.length = 0; });
  const heads = () => page.evaluate(() => window.__heroLog.heads);

  // 1. Neutral: pointer on the face (inside the dead zone) for two seconds.
  await page.mouse.move(face.x, face.y, { steps: 8 });
  await page.waitForTimeout(1500);
  await reset();
  const restA = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const restB = await page.screenshot({ clip });
  const restHeads = (await heads()).length;
  const restRaw = [await sharp(restA).greyscale().raw().toBuffer(), await sharp(restB).greyscale().raw().toBuffer()];

  // 2. Slow circle around the face, 6 s, then back to the face.
  await reset();
  const perf0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const N = 360;
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    await page.mouse.move(W / 2 + Math.cos(a) * W * 0.47, H / 2 - Math.sin(a) * H * 0.47);
    await page.waitForTimeout(16);
  }
  await page.mouse.move(face.x, face.y, { steps: 20 });
  await page.waitForTimeout(1200);
  const perf1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const sweep = await heads();

  // 3. Step response: from rest, jump the pointer to each edge and time the
  //    first new head picture and the settle.
  const steps = [];
  for (const [fx, fy] of [[0.98, 0.5], [0.02, 0.5], [0.5, 0.03], [0.5, 0.97], [0.98, 0.03], [0.02, 0.97]]) {
    await page.mouse.move(face.x, face.y);
    await page.waitForTimeout(1400);
    await reset();
    await page.mouse.move(W * fx, H * fy);
    await page.waitForTimeout(1400);
    const log = await page.evaluate(() => window.__heroLog);
    const tIn = log.inputs[0]?.t;
    const hs = log.heads.filter((h) => h.t >= tIn);
    if (!hs.length) continue;
    const final = hs[hs.length - 1];
    let settled = hs.find((h) => diff(h.g, final.g) < 0.5)?.t ?? final.t;
    steps.push({ first: hs[0].t - tIn, settle: settled - tIn });
  }

  // 4. The nine positions, held.
  const tiles = [];
  const sharp9 = [];
  for (const fy of [0.03, 0.5, 0.97]) for (const fx of [0.02, 0.5, 0.98]) {
    await page.mouse.move(W * fx, H * fy, { steps: 10 });
    await page.waitForTimeout(1500);
    const png = await page.screenshot({ clip });
    tiles.push(png);
    // Sharpness of the face itself (upper middle of the clip).
    const meta = await sharp(png).metadata();
    const faceCrop = await sharp(png).extract({ left: Math.round(meta.width * 0.25), top: Math.round(meta.height * 0.12), width: Math.round(meta.width * 0.5), height: Math.round(meta.height * 0.45) }).png().toBuffer();
    sharp9.push(await laplacianVar(faceCrop));
  }
  const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  const stats = await page.evaluate(() => document.querySelector(".living").__atlasStats ?? null);
  const tw = 360, th = Math.round((tw * clip.height) / clip.width);
  await sharp({ create: { width: 3 * tw, height: 3 * th, channels: 3, background: "#000" } })
    .composite(await Promise.all(tiles.map(async (t, i) => ({ input: await sharp(t).resize(tw, th).toBuffer(), left: (i % 3) * tw, top: Math.floor(i / 3) * th }))))
    .jpeg({ quality: 88 })
    .toFile(path.join(outDir, `${variant}-nine.jpg`));
  await browser.close();

  // Smoothness over the sweep: consecutive head pictures should change by a
  // steady small amount; a pop is a change far above the typical one.
  const d = [];
  for (let k = 1; k < sweep.length; k++) d.push(diff(sweep[k].g, sweep[k - 1].g));
  const moving = d.filter((v) => v > 0.05);
  const med = pct(moving, 50);
  const dur = sweep.length > 1 ? (sweep[sweep.length - 1].t - sweep[0].t) / 1000 : 1;
  const gaps = [];
  for (let k = 1; k < sweep.length; k++) gaps.push(sweep[k].t - sweep[k - 1].t);
  return {
    variant,
    readyMs,
    neutral: { headUpdatesWhileStill: restHeads, restDriftLevels: round(diff(restRaw[0], restRaw[1]), 3) },
    sweep: {
      headUpdates: sweep.length,
      updatesPerSecond: round(sweep.length / dur, 1),
      frameGapP95ms: round(pct(gaps, 95), 1),
      stepMedian: round(med, 2),
      stepP95: round(pct(moving, 95), 2),
      stepMax: round(Math.max(0, ...moving), 2),
      pops: moving.filter((v) => v > 4 * med).length,
      popRatio: round(pct(moving, 95) / (med || 1), 2),
    },
    response: {
      firstPictureMs: round(pct(steps.map((s) => s.first), 50), 1),
      settleMs: round(pct(steps.map((s) => s.settle), 50), 0),
    },
    faceSharpness: { median: round(pct(sharp9, 50), 1), min: round(Math.min(...sharp9), 1), perPose: sharp9.map((v) => round(v, 1)) },
    cost: {
      scriptMsDuringSweep: round((perf1.ScriptDuration - perf0.ScriptDuration) * 1000, 0),
      taskMsDuringSweep: round((perf1.TaskDuration - perf0.TaskDuration) * 1000, 0),
      jsHeapMB: round(heap / 1e6, 1),
      downloadMB: round(Object.values(bytes).reduce((a, b) => a + b, 0) / 1e6, 2),
      files: bytes,
    },
    atlasStats: stats,
  };
}

const results = [];
for (const v of ["living", "atlas"]) {
  const r = await run(v);
  console.log(JSON.stringify(r, null, 1));
  results.push(r);
}
await writeFile(path.join(outDir, "compare.json"), JSON.stringify(results, null, 2));
