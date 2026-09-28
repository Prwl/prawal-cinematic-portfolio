import { useEffect, useRef } from "react";
import { atlas, living } from "../lib/atlasMedia.js";
import { createLivingStage } from "./livingStage.js";
import { DIRECTIONS, nearestFrame, pickSpoke, pickStop, reach, screenAngle, usableSpoke } from "./atlasPose.js";

// Experiment (?hero=atlas): the living portrait driven by a curated
// directional atlas instead of the seeked pose-grid clip. atlasPose.js has
// the pose rules; scripts/atlas_build.py chooses the frames.
//
// Same stage, poster, crop and grade as production; what differs is where
// the head pictures come from and how he moves between them:
// - Every picture is a real frame of one take, decoded once up front, so a
//   pose is a drawImage: never a seek, never late, never out of order.
// - He turns the way people do, in committed moves: the pointer picks a stop
//   (a clean frame) and the take's own frames play to it at about their
//   filmed cadence. He only ever comes to rest on a stop, so a motion-soft
//   frame can be passed through but never held, and the blink Veo puts at
//   the start of most turns is cut across rather than played.
// - Two consecutive frames of one take may be mixed for a frame while he
//   moves (smoothing 24fps footage on a faster screen); frames of different
//   takes are never mixed (see DISSOLVE). Going to a neighbouring direction
//   the new take cuts in at the same turn; anything further, he looks back
//   through rest first.

// Where the eyes sit in the plate at rest (as useLivingPortrait).
const FACE = { x: 0.468, y: 0.213 };
const DEAD_ZONE = 0.1;
// Pointer smoothing only: the head's own motion comes from the footage.
const OMEGA = 14;
const GAIN_UP = 2.2;
const GAIN_DOWN = 3.2;
const BODY_TURN = 12 / 760;
const BODY_LIFT = 4 / 720;
const BODY_SETTLE = 6 / 720;
const STONE = [0xd4, 0xd1, 0xca];
// Atlas frames per second while turning (the footage is 24fps; spokes are
// thinned a little, so this plays close to the filmed speed).
const PLAY = 26;
// Below this reach he stays at rest.
const WAKE = 0.1;
// Neighbouring directions hand over by a dissolve this long, seconds, when he
// is turned at least HANDOFF; closer to rest he goes back through it.
const FADE = 0.14;
const HANDOFF = 0.25;
// Body follows the pose actually shown, per second.
const BODY_RATE = 8;
// Crossing between takes (a neighbouring direction, or over a blink run) is
// a cut by default: any dissolve between two takes showed a doubled face for
// its whole length (experiments/hero-atlas/REPORT.md). ?atlasBridge=dissolve brings
// the dissolve back for comparison.
const DISSOLVE = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("atlasBridge") === "dissolve";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
function shape(v) {
  const m = Math.abs(v);
  if (m <= DEAD_ZONE) return 0;
  const t = Math.min(1, (m - DEAD_ZONE) / (1 - DEAD_ZONE));
  return Math.sign(v) * t * t * (3 - 2 * t);
}

export function useAtlasPortrait(ref, { enabled, settled }) {
  const live = useRef({ settled, wake: () => {} });
  useEffect(() => {
    live.current.settled = settled;
    live.current.wake();
  }, [settled]);

  useEffect(() => {
    const root = ref.current;
    const canvas = root?.querySelector(".living__canvas");
    const glCanvas = root?.querySelector(".living__gl");
    const poster = root?.querySelector(".living__poster img");
    if (!enabled || !root || !canvas || !glCanvas || !poster) return;
    const { tile, passing, extents, spokes: spokeData } = atlas.manifest;
    const ctx = canvas.getContext("2d", { alpha: false });
    canvas.width = tile.width;
    canvas.height = tile.height;
    ctx.imageSmoothingQuality = "high";
    const usable = spokeData.map((s) => s.usable);

    // Per spoke, index 0 is the rest frame (shared), then the spoke's frames.
    // Filled once the pictures are decoded.
    let seq = [];
    let radii = [];
    let stops = [];

    let disposed = false;
    let ready = false;
    let stage = null;
    let inView = true;
    let pointerIn = false;
    let raf = 0;
    let last = 0;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0;
    let gain = 0;
    // Shown spoke, playhead along it (fractional frame index), target stop,
    // the picked direction (before borrowing), and a dissolve in progress.
    let spoke = -1, head = 0, stopK = 0, picked = -1;
    let fromPic = null, fade = 1;
    let bx = 0, by = 0;
    let lastKey = "";
    let face = { x: 0, y: 0 };
    // Instrumentation for scripts/qa-atlas-compare.mjs.
    const stats = { paints: 0, blended: 0, dissolves: 0, viaRest: 0, heldOffStop: 0 };
    root.__atlasStats = stats;

    function measure() {
      const r = root.getBoundingClientRect();
      face = { x: r.left + r.width * FACE.x, y: r.top + window.scrollY + r.height * FACE.y };
    }
    const gainTarget = () => (ready && live.current.settled && inView && pointerIn && !document.hidden ? 1 : 0);

    const pic = (s, k) => (s < 0 || k <= 0 ? seq[0][0] : seq[s][k]);
    function draw(p, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(p.src, 0, p.sy, p.w, p.h, 0, 0, tile.width, tile.height);
      ctx.globalAlpha = 1;
    }

    function paintHead() {
      const lo = Math.floor(head);
      const hi = Math.ceil(head);
      // Consecutive frames of one take: mixed only in a narrow band.
      const w = hi === lo ? 0 : ease(clamp((head - lo - 0.3) / 0.4, 0, 1));
      const key = `${spoke}|${lo}|${w.toFixed(3)}|${fromPic ? fade.toFixed(3) : "-"}`;
      if (key === lastKey) return false;
      lastKey = key;
      const now = () => {
        draw(pic(spoke, lo));
        if (w > 0.001) draw(pic(spoke, hi), w);
      };
      if (fromPic && fade < 1) {
        draw(fromPic);
        // The new take over the old, faded in: its own pair drawn at the
        // dissolve's weight.
        const a = ease(fade);
        draw(pic(spoke, lo), a);
        if (w > 0.001) draw(pic(spoke, hi), a * w);
      } else {
        now();
      }
      stats.paints++;
      if (w > 0.001) stats.blended++;
      return true;
    }

    function tick(now) {
      raf = 0;
      const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
      last = now;
      const g = gainTarget();
      gain += (g - gain) * (1 - Math.exp(-dt * (g > gain ? GAIN_UP : GAIN_DOWN)));
      if (Math.abs(g - gain) < 0.01) gain = g;
      const aimX = tx * g;
      const aimY = ty * g;
      vx += (-2 * OMEGA * vx - OMEGA * OMEGA * (x - aimX)) * dt;
      vy += (-2 * OMEGA * vy - OMEGA * OMEGA * (y - aimY)) * dt;
      x += vx * dt;
      y += vy * dt;

      let target = 0;
      if (ready) {
        const r = reach(x, y);
        const cur = spoke >= 0 && head > 0 ? Math.min(1, radii[spoke][Math.round(head)]) : 0;
        if (r >= WAKE) {
          picked = pickSpoke(x, y, picked);
          const want = usableSpoke(picked, screenAngle(x, y), usable);
          if (want >= 0 && want !== spoke) {
            if (spoke < 0 || head < 0.5) {
              // At rest every spoke starts from the same frame.
              spoke = want;
              head = 0;
              stopK = 0;
            } else if ((Math.abs(want - spoke) === 1 || Math.abs(want - spoke) === 7) && cur >= HANDOFF) {
              // Neighbouring direction: hand over at the same turn.
              fromPic = DISSOLVE ? pic(spoke, Math.round(head)) : null;
              fade = DISSOLVE ? 0 : 1;
              spoke = want;
              head = nearestFrame(radii[spoke], cur);
              stopK = -1;
              stats.dissolves++;
            } else {
              // Anything else: look back through rest first.
              if (stopK !== 0) stats.viaRest++;
              stopK = 0;
            }
          }
          if (spoke === want && spoke >= 0) {
            stopK = pickStop(stops[spoke], r, stopK);
          }
        } else {
          stopK = 0;
        }
        target = spoke >= 0 ? stops[spoke][Math.max(0, stopK)][0] : 0;
        const d = target - head;
        const step = PLAY * dt;
        let next = Math.abs(d) <= step ? target : head + Math.sign(d) * step;
        // Veo blinks as nearly every turn starts. A blink run is not played:
        // the head goes straight from the last open frame to the first open
        // frame beyond it, both from the same take.
        const run = spoke >= 0 ? seq[spoke] : null;
        const into = run && Math.round(next) !== Math.round(head) ? run[Math.round(next)] : null;
        if (into?.blink && (!fromPic || fade >= 1)) {
          const dir = Math.sign(d);
          let land = Math.round(next);
          while (land > 0 && land < run.length - 1 && run[land].blink) land += dir;
          fromPic = DISSOLVE ? pic(spoke, Math.round(head)) : null;
          fade = DISSOLVE ? 0 : 1;
          next = land;
          stats.blinkSkips = (stats.blinkSkips ?? 0) + 1;
        }
        head = next;
        if (head === 0 && target === 0 && spoke >= 0 && r < WAKE) spoke = -1;
        if (fade < 1) {
          fade = Math.min(1, fade + dt / FADE);
          if (fade >= 1) fromPic = null;
        }

        // The body follows the pose on screen, not the pointer.
        const p = pic(spoke, Math.round(head));
        const px = p.yaw === undefined ? 0 : clamp(-p.yaw / extents.yaw, -1, 1);
        const py = p.pitch === undefined ? 0 : clamp(p.pitch < 0 ? p.pitch / extents.up : p.pitch / extents.down, -1, 1);
        const kb = 1 - Math.exp(-dt * BODY_RATE);
        bx += (px - bx) * kb;
        by += (py - by) * kb;
        if (Math.abs(px - bx) + Math.abs(py - by) < 0.001) {
          bx = px;
          by = py;
        }

        if (paintHead()) stage?.updateHead();
        stage?.draw({ turn: BODY_TURN * bx, lift: by < 0 ? BODY_LIFT * by : BODY_SETTLE * by, breath: 0 });
      }

      const bodyMoving = ready && (() => {
        const p = pic(spoke, Math.round(head));
        const px = p.yaw === undefined ? 0 : clamp(-p.yaw / extents.yaw, -1, 1);
        return bx !== px;
      })();
      const moving = Math.abs(vx) + Math.abs(vy) > 0.0005 || Math.abs(x - aimX) + Math.abs(y - aimY) > 0.0005 || head !== target || fade < 1 || bodyMoving;
      if (moving || gain !== g) raf = requestAnimationFrame(tick);
      else {
        last = 0;
        // Never at rest off a stop.
        if (ready && spoke >= 0 && head > 0 && !seq[spoke][Math.round(head)].stop) stats.heldOffStop++;
      }
    }

    const wake = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    };
    live.current.wake = wake;

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      pointerIn = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fy = face.y - window.scrollY;
      const dx = e.clientX - face.x;
      const dy = e.clientY - fy;
      tx = shape(clamp(dx / (dx < 0 ? face.x : vw - face.x), -1, 1));
      ty = shape(clamp(dy / (dy < 0 ? fy : vh - fy), -1, 1));
      wake();
    }
    function onLeave() {
      pointerIn = false;
      tx = 0;
      ty = 0;
      wake();
    }

    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    const resize = new ResizeObserver(() => {
      measure();
      stage?.resize();
      lastKey = "";
      wake();
    });
    resize.observe(root);
    measure();
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio > 0.5;
        wake();
      },
      { threshold: [0, 0.5, 1] }
    );
    io.observe(root);

    const controller = new AbortController();
    const bitmaps = [];
    const bitmap = async (url) => {
      const res = await fetch(url, { signal: controller.signal, priority: "low" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const b = await createImageBitmap(await res.blob());
      bitmaps.push(b);
      return b;
    };
    (async () => {
      try {
        await new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 600)));
        if (disposed) return;
        const t0 = performance.now();
        const centre = await bitmap(atlas.centre);
        const loaded = await Promise.all(
          spokeData.map(async (s) => {
            if (!s.usable) return null;
            const [st, pa] = await Promise.all([s.files.stops ? bitmap(atlas.files[s.files.stops]) : null, s.files.passing ? bitmap(atlas.files[s.files.passing]) : null]);
            return { stops: st, passing: pa };
          })
        );
        if (disposed) return;
        stats.loadMs = Math.round(performance.now() - t0);
        const rest = { src: centre, sy: 0, w: tile.width, h: tile.height, stop: true, yaw: 0, pitch: 0 };
        seq = spokeData.map((s, i) => [
          rest,
          ...s.frames.map((f) => {
            const size = f.strip === "stops" ? tile : passing;
            return { src: loaded[i][f.strip], sy: f.k * size.height, w: size.width, h: size.height, stop: f.stop, blink: f.blink, yaw: f.yaw, pitch: f.pitch };
          }),
        ]);
        radii = spokeData.map((s) => [0, ...s.frames.map((f) => f.r)]);
        stops = spokeData.map((s) => [[0, 0], ...s.frames.map((f, k) => [k + 1, f.r]).filter((_, k) => s.frames[k].stop)]);
        paintHead();
        const body = new Image();
        body.src = living.body;
        const alpha = new Image();
        alpha.src = living.alpha;
        await Promise.all([body.decode(), alpha.decode(), poster.decode()]);
        if (disposed) return;
        stage = createLivingStage(glCanvas, { poster, head: canvas, body, alpha, box: atlas.manifest.box, stone: STONE });
        if (stage) {
          stage.updateHead();
          root.dataset.gl = "";
        }
        ready = true;
        root.dataset.live = "";
        wake();
      } catch {
        root.dataset.still = "";
      }
    })();

    const state = live.current;
    return () => {
      disposed = true;
      state.wake = () => {};
      controller.abort();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      resize.disconnect();
      io.disconnect();
      delete root.dataset.live;
      delete root.dataset.gl;
      bitmaps.forEach((b) => b.close?.());
    };
  }, [ref, enabled]);
}
