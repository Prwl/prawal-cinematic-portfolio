// The hero image sequence (/) against the previous MP4 hero
// (/?hero=living) in real Chrome, driven by the
// same pointer paths and measured the same way, without touching either
// implementation. Every head picture either one uploads to its WebGL stage is
// caught at texImage2D, fingerprinted and tagged with the yaw it shows.
//   node scripts/qa-hero-sequence.mjs [baseUrl] [outDir]
// Writes <outDir>/compare.json, per-variant pose sheets and filmstrips, and a
// side-by-side recording (<outDir>/side-by-side.mp4).
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import grid from "../src/assets/media/living/prawal-living.json" with { type: "json" };
import sequence from "../src/assets/sequence/sequence.json" with { type: "json" };
import { shape, yawFor } from "../src/hooks/sequencePose.js";

const base = process.argv[2] || "http://127.0.0.1:5190/";
const outDir = process.argv[3] || "artifacts/hero-sequence";
await mkdir(outDir, { recursive: true });
const W = 1440, H = 900;
const VARIANTS = {
  living: { url: `${base}?hero=living`, box: grid.box },
  sequence: { url: base, box: sequence.box },
};

// Runs in the page before anything else. `info` carries the variant's head box
// (plate fractions) and how to read the yaw a head picture shows.
const INSTRUMENT = (info) => {
  const log = (window.__qa = { inputs: [], heads: [], rafs: [] });
  // Face and skin regions in plate fractions, mapped into the head picture.
  const FACE = [0.39, 0.1, 0.16, 0.24];
  const SKIN = [0.445, 0.225, 0.045, 0.035];
  const snap = document.createElement("canvas");
  snap.width = snap.height = 96;
  const sctx = snap.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingQuality = "high";
  const region = (src, [x, y, w, h]) => {
    const b = info.box;
    const sw = src.width, sh = src.height;
    return [((x - b.left) / b.width) * sw, ((y - b.top) / b.height) * sh, (w / b.width) * sw, (h / b.height) * sh];
  };
  const read = (src, r, n) => {
    sctx.clearRect(0, 0, 96, 96);
    sctx.drawImage(src, ...region(src, r), 0, 0, n, n);
    return sctx.getImageData(0, 0, n, n).data;
  };
  const shownYaw = () => {
    if (info.variant === "living") {
      const v = document.querySelector(".living__video");
      const i = Math.floor(v.currentTime * 24);
      const row = Math.floor(i / info.nx);
      const k = i % info.nx;
      const col = row % 2 ? info.nx - 1 - k : k;
      return { yaw: info.yaw[col], pitch: info.pitch[row], frame: i };
    }
    const f = document.querySelector(".living").__sequenceStats.frame;
    return { yaw: info.yawFit[f], pitch: 0, frame: f };
  };
  const orig = WebGLRenderingContext.prototype.texImage2D;
  WebGLRenderingContext.prototype.texImage2D = function (...args) {
    const src = args[args.length - 1];
    const isHead = (src instanceof HTMLCanvasElement && src.classList.contains("living__canvas")) || src instanceof ImageBitmap;
    if (isHead && document.querySelector(".living")?.dataset.live !== undefined) {
      const d = read(src, FACE, 96);
      const g = new Array(48 * 48);
      for (let y = 0; y < 48; y++)
        for (let x = 0; x < 48; x++) {
          let s = 0;
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const i = ((2 * y + dy) * 96 + 2 * x + dx) * 4;
            s += d[i] + d[i + 1] + d[i + 2];
          }
          g[y * 48 + x] = s / 12;
        }
      const sk = read(src, SKIN, 8);
      const rgb = [0, 1, 2].map((c) => {
        let s = 0;
        for (let i = 0; i < 64; i++) s += sk[i * 4 + c];
        return s / 64;
      });
      log.heads.push({ t: performance.now(), g, rgb, ...shownYaw() });
    }
    return orig.apply(this, args);
  };
  const loop = (t) => {
    log.rafs.push(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
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

// Memory as macOS accounts it (phys_footprint, which includes GPU and IOSurface
// allocations the process owns), for the page's renderer and the GPU process.
async function processes(browser) {
  const cdp = await browser.newBrowserCDPSession();
  const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
  await cdp.detach();
  return processInfo.filter((p) => p.type === "renderer" || p.type === "GPU");
}
function footprintMB(pid) {
  try {
    const out = execFileSync("footprint", ["-p", String(pid)], { stdio: ["ignore", "pipe", "ignore"] }).toString();
    const m = out.match(/Footprint:\s*([\d.]+)\s*(KB|MB|GB)/);
    return m ? Number(m[1]) * { KB: 1 / 1024, MB: 1, GB: 1024 }[m[2]] : null;
  } catch {
    return null;
  }
}
async function memory(browser) {
  const r = {};
  for (const p of await processes(browser)) {
    const key = p.type === "GPU" ? "gpuMB" : "rendererMB";
    r[key] = round((r[key] ?? 0) + (footprintMB(p.id) ?? 0), 1);
    r[key.replace("MB", "CpuS")] = round((r[key.replace("MB", "CpuS")] ?? 0) + p.cpuTime, 2);
  }
  return r;
}

async function open(variant, { record } = {}) {
  const browser = await chromium.launch({ channel: "chrome", args: ["--enable-precise-memory-info"] });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: record ? 1 : 2,
    ...(record ? { recordVideo: { dir: path.join(outDir, `video-${variant}`), size: { width: W, height: H } } } : {}),
  });
  const info = {
    variant,
    box: VARIANTS[variant].box,
    nx: grid.nx,
    yaw: grid.yaw,
    pitch: grid.pitch,
    yawFit: sequence.frames.map((f) => f.yawFit),
  };
  await context.addInitScript(INSTRUMENT, info);
  const page = await context.newPage();
  const opened = Date.now();
  await page.goto(VARIANTS[variant].url, { waitUntil: "networkidle" });
  await page.mouse.move(W / 2, H / 2);
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelector(".living")?.dataset.live !== undefined, null, { timeout: 30000 });
  const readyMs = Date.now() - t0;
  await page.waitForTimeout(2500);
  const box = await page.locator(".living").boundingBox();
  const face = { x: box.x + box.width * 0.468, y: box.y + box.height * 0.213 };
  return { browser, context, page, box, face, readyMs, opened };
}

// The pointer paths, identical for both variants. Each step moves the pointer
// and waits a display frame.
function paths(face) {
  const P = [];
  const seg = (name, pts, hold = 0) => P.push({ name, pts, hold });
  const line = (a, b, ms) => {
    const n = Math.max(1, Math.round(ms / 16));
    return Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  };
  seg("neutral", [[face.x, face.y]], 3000);
  seg("toLeft", line([face.x, face.y], [W * 0.02, face.y], 400), 1500);
  seg("slowLeftToRight", line([W * 0.02, face.y], [W * 0.98, face.y], 4000), 1500);
  seg("fastReversals", Array.from({ length: Math.round(3000 / 16) }, (_, k) => [W / 2 + Math.sin(2 * Math.PI * 3 * k * 0.016) * W * 0.42, face.y]), 1500);
  for (const [n, fx, fy] of [["centreToRight", 0.98, null], ["centreToLeft", 0.02, null], ["centreToTop", null, 0.03], ["centreToBottom", null, 0.97]]) {
    seg(`${n}:reset`, [[face.x, face.y]], 1500);
    seg(n, line([face.x, face.y], [fx == null ? face.x : W * fx, fy == null ? face.y : H * fy], 48), 1500);
  }
  seg("circle", Array.from({ length: 376 }, (_, k) => [W / 2 + Math.cos((k / 375) * 2 * Math.PI) * W * 0.47, H / 2 - Math.sin((k / 375) * 2 * Math.PI) * H * 0.47]), 0);
  seg("circle:return", line([W * 0.97, H / 2], [face.x, face.y], 320), 1500);
  const corners = [[0.97, 0.04], [0.03, 0.96], [0.97, 0.96], [0.03, 0.04]];
  let at = [face.x, face.y];
  for (const [fx, fy] of corners) {
    seg("diagonals", line(at, [W * fx, H * fy], 128), 1200);
    at = [W * fx, H * fy];
  }
  seg("returnToNeutral", line(at, [face.x, face.y], 128), 2000);
  return P;
}

async function drive(page, P) {
  const marks = [];
  for (const s of P) {
    const t0 = await page.evaluate(() => performance.now());
    for (const [x, y] of s.pts) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(16);
    }
    const t1 = await page.evaluate(() => performance.now());
    if (s.hold) await page.waitForTimeout(s.hold);
    const t2 = await page.evaluate(() => performance.now());
    marks.push({ name: s.name, t0, t1, t2 });
  }
  return marks;
}

// What the pointer asks for at each display frame, with production's own
// calibration and no smoothing: the yaw both variants are trying to show.
function targetYaw(inputs, rafs, face) {
  let i = 0, yaw = 0;
  return rafs.map((t) => {
    while (i < inputs.length && inputs[i].t <= t) {
      const dx = inputs[i++].x - face.x;
      yaw = yawFor(shape(Math.max(-1, Math.min(1, dx / (dx < 0 ? face.x : W - face.x)))));
    }
    return { t, yaw };
  });
}

function analyse(log, marks, face) {
  const target = targetYaw(log.inputs, log.rafs, face);
  const out = {};
  for (const m of marks) {
    if (m.name.endsWith(":reset")) continue;
    const key = m.name.replace(":return", "");
    const hs = log.heads.filter((h) => h.t >= m.t0 && h.t <= m.t2);
    const steps = [];
    for (let k = 1; k < hs.length; k++) steps.push(diff(hs[k].g, hs[k - 1].g));
    const moving = steps.filter((v) => v > 0.05);
    const med = pct(moving, 50);
    // Flicker: back to the frame shown two pictures ago within 150 ms.
    let flicker = 0;
    for (let k = 2; k < hs.length; k++) if (hs[k].frame === hs[k - 2].frame && hs[k].frame !== hs[k - 1].frame && hs[k].t - hs[k - 2].t < 150) flicker++;
    // Tracking: the yaw on screen at each display frame against the pointer's
    // target; lag is the shift that best explains the difference.
    const tw = target.filter((s) => s.t >= m.t0 && s.t <= m.t2);
    let hi = log.heads.findLastIndex((h) => h.t < m.t0);
    const shown = tw.map((s) => {
      while (hi + 1 < log.heads.length && log.heads[hi + 1].t <= s.t) hi++;
      return hi >= 0 ? log.heads[hi].yaw : 0;
    });
    let bestLag = 0, bestErr = Infinity;
    for (let lag = 0; lag <= 40; lag++) {
      let e = 0, n = 0;
      for (let k = lag; k < tw.length; k++) {
        e += (shown[k] - tw[k - lag].yaw) ** 2;
        n++;
      }
      if (n && e / n < bestErr) {
        bestErr = e / n;
        bestLag = lag;
      }
    }
    const span = (v) => (v.length ? Math.max(...v) - Math.min(...v) : 0);
    // Tone: frame-to-frame change of the skin's chromaticity and brightness.
    const tone = [];
    for (let k = 1; k < hs.length; k++) {
      const a = hs[k - 1].rgb, b = hs[k].rgb;
      const sa = a[0] + a[1] + a[2], sb = b[0] + b[1] + b[2];
      tone.push({ luma: Math.abs(sb - sa) / 3, chroma: 1000 * Math.hypot(b[0] / sb - a[0] / sa, b[1] / sb - a[1] / sa) });
    }
    const r = (out[key] ??= { pictures: 0, stepMedian: [], stepP95: [], stepMax: [], pops: 0, flicker: 0, lagMs: [], rmsYawError: [], shownYawSpan: [], targetYawSpan: [], toneLumaP95: [], toneChromaP95: [] });
    r.pictures += hs.length;
    r.stepMedian.push(round(med));
    r.stepP95.push(round(pct(moving, 95)));
    r.stepMax.push(round(Math.max(0, ...moving)));
    r.pops += moving.filter((v) => v > 3.5 * med && v > 6).length;
    r.flicker += flicker;
    const dts = [];
    for (let k = 1; k < tw.length; k++) dts.push(tw[k].t - tw[k - 1].t);
    r.lagMs.push(round(bestLag * (pct(dts, 50) || 16.7), 0));
    r.rmsYawError.push(round(Math.sqrt(bestErr === Infinity ? 0 : bestErr)));
    r.shownYawSpan.push(round(span(shown), 1));
    r.targetYawSpan.push(round(span(tw.map((s) => s.yaw)), 1));
    r.toneLumaP95.push(round(pct(tone.map((t) => t.luma), 95)));
    r.toneChromaP95.push(round(pct(tone.map((t) => t.chroma), 95)));
    if (/^centreTo/.test(m.name)) {
      const tIn = log.inputs.find((p) => p.t >= m.t0)?.t ?? m.t0;
      const after = hs.filter((h) => h.t >= tIn);
      const last = after.at(-1);
      r.firstPictureMs = after.length ? round(after[0].t - tIn, 0) : null;
      r.settleMs = last ? round(last.t - tIn, 0) : null;
      r.picturesAfterSettle = after.filter((h) => h.t > m.t1 + 900).length;
    }
    if (m.name === "neutral") r.picturesWhileStill = hs.length;
    if (m.name === "returnToNeutral") r.endsOnFrame = log.heads.filter((h) => h.t <= m.t2).at(-1)?.frame ?? null;
  }
  return out;
}

async function run(variant) {
  const { browser, page, box, face, readyMs } = await open(variant);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const clip = { x: box.x + box.width * 0.3, y: Math.max(0, box.y), width: box.width * 0.36, height: box.height * 0.42 };
  const memIdle = await memory(browser);
  const perf0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  // Neutral stability: two screenshots 1.5 s apart with the pointer on him.
  await page.mouse.move(face.x, face.y, { steps: 4 });
  await page.waitForTimeout(1500);
  const restA = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const restB = await page.screenshot({ clip });
  await page.evaluate(() => {
    const q = window.__qa;
    q.inputs.length = q.heads.length = q.rafs.length = 0;
  });
  const marks = await drive(page, paths(face));
  const perf1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const memActive = await memory(browser);
  const log = await page.evaluate(() => window.__qa);

  // Held poses: a horizontal strip of nine, and the nine screen positions.
  const strip = [];
  const sharpStrip = [];
  for (let k = 0; k < 9; k++) {
    await page.mouse.move(W * (0.02 + (0.96 * k) / 8), face.y, { steps: 6 });
    await page.waitForTimeout(1300);
    const png = await page.screenshot({ clip });
    strip.push(png);
    const meta = await sharp(png).metadata();
    sharpStrip.push(await laplacianVar(await sharp(png).extract({ left: Math.round(meta.width * 0.2), top: Math.round(meta.height * 0.15), width: Math.round(meta.width * 0.6), height: Math.round(meta.height * 0.5) }).png().toBuffer()));
  }
  const nine = [];
  for (const fy of [0.03, 0.5, 0.97]) for (const fx of [0.02, 0.5, 0.98]) {
    await page.mouse.move(W * fx, H * fy, { steps: 8 });
    await page.waitForTimeout(1300);
    nine.push(await page.screenshot({ clip }));
  }
  // Vertical response, from the screen itself (the sequence tilts in its
  // shader, so it uploads no new picture): how far the face moves from the
  // centre pose when the pointer goes to the top and bottom edges.
  const grey = (png) => sharp(png).resize(160).greyscale().raw().toBuffer();
  const [centre, top, bottom] = await Promise.all([nine[4], nine[1], nine[7]].map(grey));
  const vertical = { up: round(diff(centre, top)), down: round(diff(centre, bottom)) };
  const heap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  const stats = await page.evaluate(() => document.querySelector(".living").__sequenceStats ?? null);
  await browser.close();

  const tw = 300, th = Math.round((tw * clip.height) / clip.width);
  const sheet = async (tiles, cols, file) =>
    sharp({ create: { width: cols * tw, height: Math.ceil(tiles.length / cols) * th, channels: 3, background: "#000" } })
      .composite(await Promise.all(tiles.map(async (t, i) => ({ input: await sharp(t).resize(tw, th).toBuffer(), left: (i % cols) * tw, top: Math.floor(i / cols) * th }))))
      .jpeg({ quality: 90 })
      .toFile(path.join(outDir, file));
  await sheet(strip, 9, `${variant}-strip.jpg`);
  await sheet(nine, 3, `${variant}-nine.jpg`);

  const rawA = await sharp(restA).greyscale().raw().toBuffer();
  const rawB = await sharp(restB).greyscale().raw().toBuffer();
  const bytes = {};
  if (variant === "living") bytes["prawal-living.mp4"] = (await stat("src/assets/media/living/prawal-living.mp4")).size;
  else for (const f of await readdir("src/assets/sequence")) if (f.startsWith("head-")) bytes[f] = (await stat(`src/assets/sequence/${f}`)).size;
  const dur = (marks.at(-1).t2 - marks[0].t0) / 1000;
  return {
    variant,
    readyMs,
    neutralDriftLevels: round(diff(rawA, rawB), 3),
    paths: analyse(log, marks, face),
    verticalResponse: vertical,
    faceSharpness: { median: round(pct(sharpStrip, 50), 1), min: round(Math.min(...sharpStrip), 1), perPose: sharpStrip.map((v) => round(v, 1)) },
    cost: {
      durationS: round(dur, 1),
      mainThreadTaskMs: round((perf1.TaskDuration - perf0.TaskDuration) * 1000, 0),
      scriptMs: round((perf1.ScriptDuration - perf0.ScriptDuration) * 1000, 0),
      rendererCpuPct: round((100 * (memActive.rendererCpuS - memIdle.rendererCpuS)) / dur, 1),
      gpuCpuPct: round((100 * (memActive.gpuCpuS - memIdle.gpuCpuS)) / dur, 1),
      jsHeapMB: round(heap / 1e6, 1),
      footprintIdle: { rendererMB: memIdle.rendererMB, gpuMB: memIdle.gpuMB },
      footprintActive: { rendererMB: memActive.rendererMB, gpuMB: memActive.gpuMB },
      headDownloadMB: round(Object.values(bytes).reduce((a, b) => a + b, 0) / 1e6, 2),
      headFiles: Object.keys(bytes).length,
    },
    sequenceStats: stats,
  };
}

// A recording of the same paths, the head from each variant side by side.
async function record(variant) {
  const { browser, context, page, box, face, opened } = await open(variant, { record: true });
  const video = page.video();
  // The recording starts with the page; the paths start once he is live.
  const offset = (Date.now() - opened) / 1000;
  await drive(page, paths(face).filter((s) => ["toLeft", "slowLeftToRight", "fastReversals", "circle", "circle:return", "diagonals", "returnToNeutral"].includes(s.name)));
  await context.close();
  await browser.close();
  const file = path.join(outDir, `${variant}.webm`);
  await rename(await video.path(), file);
  await rm(path.join(outDir, `video-${variant}`), { recursive: true, force: true });
  return { file, offset, crop: { x: Math.round(box.x + box.width * 0.24), y: Math.max(0, Math.round(box.y)), w: Math.round(box.width * 0.48 / 2) * 2, h: Math.round(box.height * 0.6 / 2) * 2 } };
}

const results = [];
for (const v of Object.keys(VARIANTS)) {
  const r = await run(v);
  console.log(JSON.stringify(r, null, 1));
  results.push(r);
}
await writeFile(path.join(outDir, "compare.json"), JSON.stringify(results, null, 2));

const rec = [];
for (const v of Object.keys(VARIANTS)) rec.push(await record(v));
// Labels as pictures: ffmpeg builds without freetype have no drawtext.
const labels = [];
for (const [i, text] of ["production MP4", "image sequence"].entries()) {
  const file = path.join(outDir, `label-${i}.png`);
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="44"><rect width="100%" height="100%" rx="6" fill="white" fill-opacity="0.8"/><text x="14" y="30" font-family="Helvetica" font-size="24">${text}</text></svg>`)).png().toFile(file);
  labels.push(file);
}
const pane = (i) => `[${i}:v]crop=${rec[i].crop.w}:${rec[i].crop.h}:${rec[i].crop.x}:${rec[i].crop.y},scale=-2:600[c${i}];[c${i}][${i + 2}:v]overlay=12:12[v${i}]`;
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-ss", String(rec[0].offset), "-i", rec[0].file,
  "-ss", String(rec[1].offset), "-i", rec[1].file,
  "-i", labels[0], "-i", labels[1],
  "-filter_complex", `${pane(0)};${pane(1)};[v0][v1]hstack=inputs=2:shortest=1,fps=30`,
  "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", path.join(outDir, "side-by-side.mp4"),
]);
for (const f of [...labels, ...rec.map((r) => r.file)]) await rm(f);
console.log(`wrote ${outDir}/compare.json, strips, nine-pose sheets and side-by-side.mp4`);
