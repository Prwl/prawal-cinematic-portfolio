import { useEffect, useRef } from "react";
import { createSequenceStage } from "./sequenceStage.js";
import { chooseView, frameCost, pitchFor, reachOf, reachable, shape, spring, tiltFor, yawFor } from "./sequencePose.js";

// Where the eyes sit in the plate at rest (as production).
const FACE = { x: 0.468, y: 0.213 };
// Production's follow: critically damped, a slight human delay, no overshoot.
const OMEGA = 10;
const GAIN_UP = 2.2;
const GAIN_DOWN = 3.2;
// Production's body turn with the head, in plate fractions at the head.
const BODY_TURN = 12 / 760;
// The head tilt (sequenceStage.js) makes up pitch the frames did not film,
// never more than 5 degrees up and 3 down: it cannot move his eyes, so a
// larger one reads as stretching (at 10 degrees the jaw visibly lengthens
// looking up). Filmed up, down and diagonal frames come first; the tilt only
// bridges between them.
// &tilt=up,down (degrees) overrides the range, for comparing sizes.
const tiltParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tilt")?.split(",").map(Number) : null;
const [TILT_UP, TILT_DOWN] = tiltParam?.length === 2 && tiltParam.every((v) => v >= 0 && v <= 15) ? tiltParam : [5, 3];
const TILT = { up: TILT_UP, down: TILT_DOWN };
const RAD = Math.PI / 180;
// Decoded frames kept at once (about 1.5 MB each), and how many of the frames
// nearest the target are decoded ahead.
const CACHE = 64;
const AHEAD = 10;
// Where the page cuts from one take to another (sequencePose.js, chooseView),
// or steps more than FADE_STEP degrees within one (a gap in the footage), the
// old frame dissolves into the new over CUT_FADE seconds, both tilted to the
// same pose: each generation draws the face a little differently, and an
// instant swap reads as the face changing or jumping. It is short, so the two
// are seen together only in passing. &cutfade=seconds overrides it, for
// inspection.
const fadeParam = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("cutfade")) : NaN;
const CUT_FADE = fadeParam >= 0 && fadeParam <= 5 ? fadeParam : 0.14;
const FADE_STEP = 2.5;
const BODY_LIFT = 4 / 720;
const BODY_SETTLE = 6 / 720;
// The page's stone (src/styles/tokens.css --stone).
const STONE = [0xd4, 0xd1, 0xca];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * The hero portrait (SequencePortrait). The head is real frames from a few takes of
 * one look (scripts/prepare-sequence.mjs), each with its filmed pose. The
 * pointer sets a target pose through production's calibration, on both axes;
 * the frame nearest it is shown (sequencePose.js, chooseView), preferring the
 * rest frame's own take wherever it and the tilt can reach, and a small head
 * tilt makes up the pitch it misses. Between takes it cuts, at matched poses;
 * across a join within the rest frame's take it blends two frames by
 * position, each tilted to the same pose. All frames are fetched once; they
 * are decoded to ImageBitmaps as the pose approaches them, and a change
 * uploads one bitmap to a copy of production's WebGL stage. No video, no
 * seeking: a reversal is just a different bitmap.
 *
 * Runs only when `enabled` (the caller keeps production's gating), waits for
 * `settled`, and fades out when the opening leaves the screen, the tab hides
 * or the pointer leaves, like production. If anything fails the poster stays.
 */
export function useSequencePortrait(ref, { enabled, settled, onPoster }) {
  const live = useRef({ settled, wake: () => {}, onPoster });
  useEffect(() => {
    live.current.settled = settled;
    live.current.onPoster = onPoster;
    live.current.wake();
  }, [settled, onPoster]);

  useEffect(() => {
    const root = ref.current;
    const glCanvas = root?.querySelector(".living__gl");
    if (!enabled || !root || !glCanvas) return;

    let disposed = false;
    let stage = null;
    let frames = [];
    let blobs = [];
    const bitmaps = new Map();
    const decoding = new Set();
    const used = new Map();
    let faces = [];
    let joins = [];
    let primary;
    let reach = null;
    const memory = {};
    let second = -1;
    let ready = false;
    let inView = true;
    let pointerIn = false;
    let raf = 0;
    let last = 0;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0;
    let gain = 0;
    let shown = -1;
    // The frame last chosen, and the one dissolving out after a cut.
    let current = -1;
    let fading = -1;
    let fadeT = 1;
    let face = { x: 0, y: 0 };
    const stats = (root.__sequenceStats = { decodeMs: 0, frames: 0, bitmapMB: 0, uploads: 0, decoded: 0 });

    // Frames decode as the pose nears them; the least recently shown go when
    // the cache is full (never the shown, fading or rest frame).
    let restIndex = -1;
    function evict() {
      while (bitmaps.size > CACHE) {
        let oldest = -1;
        for (const k of bitmaps.keys()) if (k !== shown && k !== second && k !== fading && k !== restIndex && (oldest < 0 || (used.get(k) ?? 0) < (used.get(oldest) ?? 0))) oldest = k;
        if (oldest < 0) return;
        bitmaps.get(oldest).close();
        bitmaps.delete(oldest);
      }
    }
    function ensure(k) {
      if (bitmaps.has(k) || decoding.has(k) || !blobs[k]) return null;
      decoding.add(k);
      return createImageBitmap(blobs[k]).then(
        (b) => {
          decoding.delete(k);
          if (disposed) return b.close();
          bitmaps.set(k, b);
          used.set(k, performance.now());
          stats.decoded++;
          stats.bitmapMB = Math.round(bitmaps.size * b.width * b.height * 4e-5) / 10;
          evict();
          wake();
        },
        () => decoding.delete(k)
      );
    }
    function prefetch(target) {
      const near = frames.map((f, k) => [frameCost(f, target, TILT), k]).sort((a, b) => a[0] - b[0]);
      for (let n = 0; n < AHEAD && n < near.length; n++) ensure(near[n][1]);
    }

    function measure() {
      const r = root.getBoundingClientRect();
      face = { x: r.left + r.width * FACE.x, y: r.top + window.scrollY + r.height * FACE.y };
    }

    const gainTarget = () => (ready && live.current.settled && inView && pointerIn && !document.hidden ? 1 : 0);

    function tick(now) {
      raf = 0;
      // The spring is exact for any step; the cap only stops a return from a
      // hidden tab being treated as one long frame of motion.
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      const g = gainTarget();
      gain += (g - gain) * (1 - Math.exp(-dt * (g > gain ? GAIN_UP : GAIN_DOWN)));
      if (Math.abs(g - gain) < 0.01) gain = g;
      const aimX = tx * gain;
      const aimY = ty * gain;
      [x, vx] = spring(x, vx, aimX, OMEGA, dt);
      [y, vy] = spring(y, vy, aimY, OMEGA, dt);

      if (stage && ready) {
        const target = reachable({ yaw: yawFor(x), pitch: pitchFor(y) }, reach);
        prefetch(target);
        // One frame, or two blended by position across a join
        // (sequencePose.js, chooseView). Two slots
        // hold them; a frame already in either slot is not uploaded again.
        const view = chooseView(frames, target, memory, TILT, { usable: (k) => bitmaps.has(k), primary, joins });
        if (view.a >= 0) {
          // A cut to another take starts a dissolve from the frame shown until
          // now; a join's own blend, or a cut with no fade, ends it.
          if (view.mix > 0 || CUT_FADE === 0) fadeT = 1;
          else if (current >= 0 && view.a !== current && bitmaps.has(current) && (frames[view.a].take !== frames[current].take || Math.hypot(frames[view.a].yaw - frames[current].yaw, frames[view.a].pitch - frames[current].pitch) > FADE_STEP)) {
            fading = current;
            fadeT = 0;
          }
          current = view.a;
          if (fadeT < 1) fadeT = Math.min(1, fadeT + dt / CUT_FADE);
          const out = fadeT < 1 && bitmaps.has(fading) ? 1 - fadeT * fadeT * (3 - 2 * fadeT) : 0;
          if (!out) fading = -1;
          const want = view.mix > 0 ? [[view.a, 1 - view.mix], [view.b, view.mix]] : out ? [[view.a, 1 - out], [fading, out]] : [[view.a, 1]];
          const one = want.find(([k]) => k === shown) ?? want[0];
          const two = want.find(([k]) => k !== one[0]);
          if (one[0] !== shown) {
            shown = one[0];
            stage.updateHead(bitmaps.get(shown), faces[shown]);
            stats.uploads++;
          }
          if (two && two[0] !== second) {
            second = two[0];
            stage.updateHead2(bitmaps.get(second), faces[second]);
            stats.uploads++;
          }
          stats.frame = view.mix > 0.5 ? view.b : view.a;
          stats.fading = out ? fading : -1;
          stats.blend = two ? [shown, second, Math.round(two[1] * 100) / 100] : null;
          used.set(shown, now);
          if (two) used.set(second, now);
          stage.draw({
            turn: BODY_TURN * x,
            lift: y < 0 ? BODY_LIFT * y : BODY_SETTLE * y,
            tilt: tiltFor(frames[shown], target, TILT) * RAD,
            tilt2: two ? tiltFor(frames[second], target, TILT) * RAD : 0,
            mix: two ? two[1] : 0,
          });
        }
      }

      const moving = Math.abs(vx) + Math.abs(vy) > 0.0005 || Math.abs(x - aimX) + Math.abs(y - aimY) > 0.0005;
      if (moving || gain !== g || fading >= 0) raf = requestAnimationFrame(tick);
      else last = 0;
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
    (async () => {
      try {
        await new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 600)));
        if (disposed) return;
        const { sequence } = await import("../lib/sequenceMedia.js");
        const { manifest } = sequence;
        if (disposed) return;
        // The resting picture must be this take's own rest frame, so the head
        // lands on its own poster.
        live.current.onPoster?.(sequence.poster);
        // &takes=1 keeps only the rest frame's own take (left and right filmed,
        // up and down by the tilt alone), for comparison.
        const restFrame = manifest.frames[manifest.rest];
        const keep = new URLSearchParams(window.location.search).get("takes") === "1" ? (f) => f.take === restFrame.take : () => true;
        const kept = manifest.frames.map((f, k) => [f, k]).filter(([f]) => keep(f));
        const index = new Map(kept.map(([, k], i) => [k, i]));
        frames = kept.map(([f]) => f);
        faces = frames.map((f) => f.face[0]);
        restIndex = index.get(manifest.rest);
        joins = (manifest.joins ?? []).filter((pair) => pair.every((k) => index.has(k))).map((pair) => pair.map((k) => index.get(k)));
        primary = frames[restIndex].take;
        reach = reachOf(frames, TILT);
        const t0 = performance.now();
        const load = async (url) => {
          const res = await fetch(url, { signal: controller.signal, priority: "low" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        };
        const image = async (url) => {
          const img = new Image();
          img.src = url;
          await img.decode();
          return img;
        };
        const [fetched, poster, body, alpha] = await Promise.all([
          Promise.all(kept.map(([, k]) => load(sequence.frames[k]))),
          image(sequence.poster),
          image(sequence.body),
          image(sequence.alpha),
        ]);
        blobs = fetched;
        if (disposed) return;
        // Before he goes live: the rest frame and its neighbours, and the best
        // frame for every point of a coarse grid over the field, so a sudden
        // move anywhere has a good frame at once while its own decodes.
        const best = (target) => frames.map((f, k) => [frameCost(f, target, TILT), k]).sort((a, b) => a[0] - b[0]);
        const first = new Set([...best({ yaw: 0, pitch: 0 }).slice(0, 12).map(([, k]) => k), ...joins.flat()]);
        for (let gx = -1; gx <= 1.001; gx += 0.25)
          for (let gy = -1; gy <= 1.001; gy += 0.5) {
            const v = chooseView(frames, reachable({ yaw: yawFor(gx), pitch: pitchFor(gy) }, reach), {}, TILT, { primary, joins });
            first.add(v.a);
            if (v.b >= 0) first.add(v.b);
          }
        await Promise.all([...first].map(ensure));
        if (disposed || !bitmaps.has(restIndex)) return;
        stats.decodeMs = Math.round(performance.now() - t0);
        stats.frames = frames.length;
        shown = stats.frame = restIndex;
        const head = bitmaps.get(shown);
        stage = createSequenceStage(glCanvas, { poster, head, body, alpha, box: manifest.box, stone: STONE, plateSize: manifest.plate, ellipse: manifest.head });
        if (!stage) throw new Error("no WebGL");
        stage.updateHead(head, faces[shown]);
        root.dataset.gl = "";
        ready = true;
        root.dataset.live = "";
        stage.draw({ turn: 0, lift: 0, tilt: 0 });
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
      for (const b of bitmaps.values()) b.close();
      bitmaps.clear();
    };
  }, [ref, enabled]);
}
