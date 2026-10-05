// Scroll-choreography trace. Drives native scroll through the story runs in
// real Chrome and samples every frame: the beat on stage, the beat whose words
// are confirmed, whether those words are visible and how far the camera has
// travelled toward the beat. Reports, per beat, how long a viewer could
// actually see it, and whether each PRIMARY beat survived.
//
//   node scripts/qa-scroll-trace.mjs [url] [profiles] [WxH]
//
// Profiles (comma separated; prefix "-" to scroll bottom to top):
//   630        constant speed, px/s
//   g1         gentle trackpad flicks (250-500px each, rests), seed 1
//   m1         moderate flicks (600-1100px each, short rests), seed 1
// TRACE_SCENES=refinery,taxonomy limits the run; TRACE_FRAMES=1 keeps frames.
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { storyStateScript } from "./story-state.mjs";

const url = process.argv[2] || "http://127.0.0.1:5190/";
const profiles = (process.argv[3] || "630,g1,g2,g3,m1,-g1").split(",");
const [w, h] = (process.argv[4] || "1440x900").split("x").map(Number);
const out = process.env.TRACE_OUT || "artifacts/qa/scroll-trace";

// name, run, camera, caption, primary beats
const SCENES = [
  ["identity", ".hall", ".hall__depth", ".hall__line", [0, 3]],
  ["evolution", ".ascent", ".ascent__stair", ".ascent__caption", [4, 5]],
  ["refinery", '.system-story[data-kind="pipeline"]', ".machine__camera", ".system-story__narrative", [1, 2, 3]],
  ["enrollment", '.system-story[data-kind="transactions"]', ".machine__camera", ".system-story__narrative", [1, 2, 3]],
  ["taxonomy", '.system-story[data-kind="taxonomy"]', ".machine__camera", ".system-story__narrative", [1, 2, 3]],
  ["scale", ".scale-scene", ".scale-scene__event", ".scale-scene__metric", [0, 3]],
  ["intelligence", ".assembly", ".assembly__camera", ".assembly__caption", [4]],
  ["exhibition", ".exhibition", ".exhibition__track", ".exhibition__label", [0, 4]],
  ["study", ".study", ".study__table", ".study__caption", [0, 1, 2]],
  ["voices", ".voices", null, ".voices__stage", []]
];
const only = process.env.TRACE_SCENES?.split(",");
const scenes = only ? SCENES.filter(([n]) => only.includes(n)) : SCENES;

// A deterministic session of flicks: each launches, decays exponentially, and
// rests. Returns travelled distance at t ms.
function session(kind, seed) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const [dMin, dMax, rMin, rMax, tau] = kind === "g" ? [250, 500, 350, 900, 230] : [600, 1100, 250, 650, 300];
  const flicks = [];
  let t = 0, at = 0;
  for (let i = 0; i < 400; i++) {
    const d = dMin + rand() * (dMax - dMin);
    flicks.push({ t, at, d });
    t += 5 * tau + rMin + rand() * (rMax - rMin);
    at += d * (1 - Math.exp(-5));
  }
  return { flicks, tau };
}

async function trace(page, profile) {
  const reverse = profile.startsWith("-");
  const p = reverse ? profile.slice(1) : profile;
  const plan = /^[gm]\d+$/.test(p) ? session(p[0], Number(p.slice(1))) : { speed: Number(p) };
  return page.evaluate(async ({ scenes, plan, reverse }) => {
    const travel = plan.speed
      ? (t) => (plan.speed * t) / 1000
      : (t) => {
        const f = plan.flicks.findLast((x) => x.t <= t);
        return f.at + f.d * (1 - Math.exp(-Math.min(t - f.t, 5 * plan.tau) / plan.tau));
      };
    const runs = scenes.map(([name, run, cam, cap]) => {
      const el = document.querySelector(run);
      return { name, el, sticky: el.querySelector(".story-sticky"), cam: cam && el.querySelector(cam), cap: el.querySelector(cap) };
    });
    const first = runs[0].el.getBoundingClientRect().top + scrollY - innerHeight;
    const last = runs.at(-1).el.getBoundingClientRect().bottom + scrollY;
    const [from, to] = reverse ? [last, first] : [first, last];
    scrollTo({ top: from, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 1600));
    const frames = [];
    let tEnd = null;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        const t = now - t0;
        const rec = { t, y: scrollY, s: [] };
        for (const r of runs) {
          const box = r.el.getBoundingClientRect();
          if (box.bottom < 0 || box.top > innerHeight) continue;
          const sb = r.sticky.getBoundingClientRect();
          const seen = (Math.min(innerHeight, sb.bottom) - Math.max(0, sb.top)) / Math.min(innerHeight, sb.height);
          const anims = r.cam ? r.cam.getAnimations({ subtree: r.name === "scale" }).filter((a) => a.playState === "running" && (a.transitionProperty ?? "").includes("transform")) : [];
          rec.s.push({
            n: r.name,
            on: seen >= 0.6,
            ...(({ active, confirmed, moving }) => ({ a: active, c: confirmed, m: moving }))(window.__story(r.el)),
            o: +getComputedStyle(r.cap).opacity,
            f: r.el.dataset.follow === "true",
            cam: anims.length ? Math.min(...anims.map((a) => a.effect.getComputedTiming().progress ?? 1)) : 1
          });
        }
        frames.push(rec);
        const d = travel(t);
        if (d >= Math.abs(to - from)) {
          // Hold at the end long enough for any pending confirmation.
          tEnd ??= t;
          if (t > tEnd + 1800) return resolve();
        } else scrollTo({ top: from + Math.sign(to - from) * d, behavior: "instant" });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return frames;
  }, { scenes, plan, reverse });
}

function analyse(frames) {
  const result = {};
  const prev = {};
  for (let i = 1; i < frames.length; i++) {
    const dt = frames[i].t - frames[i - 1].t;
    for (const s of frames[i].s) {
      const sc = (result[s.n] ??= { beats: {}, confirmed: [], visited: [], stale: 0, multiJump: 0 });
      const p = prev[s.n];
      prev[s.n] = s;
      if (!s.on) continue;
      const b = (sc.beats[s.a] ??= { active: 0, framed: 0, caption: 0, reach: 0 });
      b.active += dt;
      b.reach = Math.max(b.reach, s.cam);
      // Framed: the camera is at least 85% of the way to this beat's shot.
      if (s.cam >= 0.85) b.framed += dt;
      const visible = s.o > 0.5;
      if (visible && s.c === s.a) b.caption += dt;
      // Stale: settled words that describe another beat than the one on stage.
      if (visible && !s.m && s.c !== s.a && s.n !== "voices") sc.stale += dt;
      if (sc.visited.at(-1) !== s.a) sc.visited.push(s.a);
      if (visible && !s.m && sc.confirmed.at(-1) !== s.c) sc.confirmed.push(s.c);
      if (p?.on && Math.abs(s.a - p.a) > 1) sc.multiJump++;
    }
  }
  for (const sc of Object.values(result)) {
    for (const b of Object.values(sc.beats)) for (const k of ["active", "framed", "caption"]) b[k] = Math.round(b[k]);
    sc.stale = Math.round(sc.stale);
  }
  return result;
}

// PRIMARY survives: framed and read. Supporting contributes: the camera reached it.
const primaryOk = (b) => b && b.framed >= 300 && b.caption >= 250;
const supportOk = (b) => b && b.reach >= 0.8;

const browser = await chromium.launch({ channel: "chrome" });
await mkdir(out, { recursive: true });
const report = {};
await Promise.all(profiles.map(async (profile) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  await page.addInitScript(storyStateScript);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".prologue__skip")?.click());
  await page.waitForTimeout(800);
  const frames = await trace(page, profile);
  const result = analyse(frames);
  // The resting state after the run: every scene settled on a beat whose
  // words match it.
  const settled = await page.evaluate(() => [...document.querySelectorAll(".story-run")].every((el) => { const s = window.__story(el); return !s.moving && s.active === s.confirmed; }));
  report[profile] = { errors, settled, scenes: result };
  if (process.env.TRACE_FRAMES) await writeFile(`${out}/frames-${w}x${h}-${profile}.json`, JSON.stringify(frames));
  await page.close();
}));
await browser.close();

let failed = false;
for (const profile of profiles) {
  const { errors, settled, scenes: result } = report[profile];
  console.log(`\n=== ${w}x${h} ${profile}  settled=${settled} ${errors.length ? errors.join(" | ") : ""}`);
  if (errors.length || !settled) failed = true;
  for (const [name, , , , primary] of scenes) {
    const sc = result[name];
    if (!sc) continue;
    const beats = Object.entries(sc.beats).map(([k, b]) => `${primary.includes(+k) ? "P" : ""}${k}:${b.active}/${b.framed}/${b.caption}`).join(" ");
    const lost = primary.filter((k) => !primaryOk(sc.beats[k]));
    const unreached = Object.keys(sc.beats).filter((k) => !primary.includes(+k) && !supportOk(sc.beats[k]));
    if (sc.stale) failed = true;
    console.log(`${name.padEnd(12)} words[${sc.confirmed.join("")}] stage[${sc.visited.join("")}] stale=${sc.stale} lostP=[${lost}] unreachedS=[${unreached}] | active/framed/caption ${beats}`);
  }
}
await writeFile(`${out}/trace-${w}x${h}.json`, JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
