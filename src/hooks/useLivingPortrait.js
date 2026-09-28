import { useEffect, useRef } from "react";
import { living } from "../lib/media.js";
import { createLivingStage } from "./livingStage.js";

// The clip is a grid of head poses, one frame each (rows are pitch, up to
// down; columns are LivePortrait yaw, -15 to +15 degrees, which turns him
// from the viewer's right to the viewer's left), all re-posed from one
// resting image (scripts/prepare-video.mjs). Frames run in a serpentine walk
// of the grid, left to right on even rows and back on odd ones, so each frame
// follows a neighbour. It is played at 24fps only in name: a frame is found
// by seeking.
const FPS = 24;
const { nx: NX, ny: NY, centre: CENTRE } = living.grid;
export const frameAt = (col, row) => row * NX + (row % 2 ? NX - 1 - col : col);
export const REST_FRAME = frameAt(CENTRE[0], CENTRE[1]);

// Where the eyes sit in the 760x720 plate at rest.
const FACE = { x: 0.468, y: 0.213 };

// Pointer within this radius of the face (normalised) leaves him at rest.
const DEAD_ZONE = 0.1;
// Critically damped follow: a slight human delay, no overshoot.
const OMEGA = 10;
// The generated extremes introduce eye smearing and a pale keyed outline.
// Keep the performance in the clean, believable part of the pose grid.
const MAX_YAW = 0.72;
// Up has twelve filmed rows, down only six (7 degrees): down gets more of its
// smaller range so the lower diagonals read as clearly as the upper ones.
const MAX_PITCH_UP = 0.62;
const MAX_PITCH_DOWN = 0.9;
// Gain comes up over about 1.4s once he may notice the viewer, and goes down
// a little faster when the viewer leaves.
const GAIN_UP = 2.2;
const GAIN_DOWN = 3.2;
// The body follows the head (livingStage.js), in plate fractions at the head:
// a few pixels of turn toward the pointer, and the shoulders lift a little when
// he looks up and settle when he looks down. The stage rests when the pointer
// rests.
const BODY_TURN = 12 / 760;
const BODY_LIFT = 4 / 720;
const BODY_SETTLE = 6 / 720;
// The page's stone (src/styles/tokens.css --stone): the photograph's wall
// around him is graded to it, so he stands in the page's hall.
const STONE = [0xd4, 0xd1, 0xca];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Pose in [-1, 1] on each axis to a fractional grid position. The rest pose
// is an exact column and row; each side of it spans its own half of the grid.
// Columns run against the pointer: a pointer on the viewer's left needs him
// turned to the viewer's left, the last column.
export function gridPosition(px, py) {
  const [cx, cy] = CENTRE;
  const gx = cx - clamp(px, -1, 1) * (px > 0 ? cx : NX - 1 - cx);
  const gy = cy + clamp(py, -1, 1) * (py < 0 ? cy : NY - 1 - cy);
  return [gx, gy];
}

// Outside the dead zone the response eases in, then reaches the full pose at
// the edge of the screen.
function shape(v) {
  const m = Math.abs(v);
  if (m <= DEAD_ZONE) return 0;
  const t = Math.min(1, (m - DEAD_ZONE) / (1 - DEAD_ZONE));
  return Math.sign(v) * t * t * (3 - 2 * t);
}

/**
 * A living portrait that notices the viewer. The pointer sets a target pose
 * on both axes (yaw and pitch, so diagonals are real poses); the visible pose
 * follows it with a critically damped spring. The nearest pose is drawn into
 * a canvas from one decoder. This preserves the source frame's sharpness and
 * lets the newest pointer target win without waiting for four asynchronous
 * seeks to settle.
 *
 * Where WebGL is available the head canvas is not shown either: a WebGL
 * stage draws the poster, the head and a slight move of the whole figure
 * (livingStage.js), so his shoulders and chest turn and lift with
 * the head instead of standing frozen under it.
 *
 * Only runs when `enabled` (fine pointer, landscape desktop, motion allowed).
 * Tracking waits for `settled` (the title sequence has finished) and fades
 * out when the opening leaves the screen, the tab is hidden or the pointer
 * leaves the window. If the clip cannot be fetched or decoded, the poster
 * simply stays: the page never depends on video.
 */
export function useLivingPortrait(ref, { enabled, settled }) {
  // The intro finishing must not tear down the clip, so it is read live.
  const live = useRef({ settled, wake: () => {} });
  useEffect(() => {
    live.current.settled = settled;
    live.current.wake();
  }, [settled]);

  useEffect(() => {
    const root = ref.current;
    const videos = [...(root?.querySelectorAll("video") ?? [])];
    const canvas = root?.querySelector(".living__canvas");
    const glCanvas = root?.querySelector(".living__gl");
    const poster = root?.querySelector(".living__poster img");
    if (!enabled || !root || videos.length !== 1 || !canvas || !glCanvas || !poster) return;
    const ctx = canvas.getContext("2d");
    let stage = null;
    let headDirty = false;

    let disposed = false;
    let blobUrl = "";
    let ready = false;
    let inView = true;
    let pointerIn = false;
    let raf = 0;
    let last = 0;
    // Target, visible pose and velocity, per axis.
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0;
    let gain = 0;
    const copy = { el: videos[0], want: REST_FRAME, at: REST_FRAME };
    let shown = -1;
    // Face position in page coordinates, refreshed on resize only.
    let face = { x: 0, y: 0 };

    function measure() {
      const r = root.getBoundingClientRect();
      face = { x: r.left + r.width * FACE.x, y: r.top + window.scrollY + r.height * FACE.y };
    }

    const gainTarget = () => (ready && live.current.settled && inView && pointerIn && !document.hidden ? 1 : 0);

    // Latest wins: a seek in flight is never interrupted, and the newest
    // wanted frame is sought when it lands.
    function commit() {
      if (copy.want === copy.at || copy.el.seeking) return;
      copy.at = copy.want;
      copy.el.currentTime = (copy.at + 0.5) / FPS;
    }

    // The canvas only changes once every copy holds the frame it is for, so a
    // late seek can never mix the wrong poses.
    function paint() {
      if (copy.el.seeking || copy.at !== copy.want || copy.el.readyState < 2 || copy.at === shown) return;
      shown = copy.at;
      ctx.drawImage(copy.el, 0, 0, canvas.width, canvas.height);
      headDirty = true;
    }
    const onSeeked = () => {
      commit();
      paint();
      if (headDirty) live.current.wake();
    };

    function tick(now) {
      raf = 0;
      const dt = Math.min(1 / 30, (now - (last || now)) / 1000);
      last = now;
      const g = gainTarget();
      gain += (g - gain) * (1 - Math.exp(-dt * (g > gain ? GAIN_UP : GAIN_DOWN)));
      // The last percent is invisible; snap it so the loop can sleep.
      if (Math.abs(g - gain) < 0.01) gain = g;
      const aimX = tx * g;
      const aimY = ty * g;
      // Semi-implicit Euler on a critically damped spring.
      vx += (-2 * OMEGA * vx - OMEGA * OMEGA * (x - aimX)) * dt;
      vy += (-2 * OMEGA * vy - OMEGA * OMEGA * (y - aimY)) * dt;
      x += vx * dt;
      y += vy * dt;

      const [gx, gy] = gridPosition(x * MAX_YAW, y * (y < 0 ? MAX_PITCH_UP : MAX_PITCH_DOWN));
      copy.want = frameAt(Math.round(gx), Math.round(gy));
      commit();
      paint();

      // Draw only in response to a pose or gain change; no idle breathing loop.
      if (stage && ready) {
        if (headDirty) {
          stage.updateHead();
          headDirty = false;
        }
        const px = x;
        const py = y;
        stage.draw({
          turn: BODY_TURN * px,
          lift: py < 0 ? BODY_LIFT * py : BODY_SETTLE * py,
          breath: 0,
        });
      }

      const moving = Math.abs(vx) + Math.abs(vy) > 0.0005 || Math.abs(x - aimX) + Math.abs(y - aimY) > 0.0005;
      if (moving || gain !== g) raf = requestAnimationFrame(tick);
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

    copy.el.addEventListener("seeked", onSeeked);
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

    // The whole clip comes into memory once, so seeking never waits on the
    // network. The poster stays until the rest pose has been decoded.
    const controller = new AbortController();
    (async () => {
      try {
        // Never compete with the poster and fonts for the first paint.
        await new Promise((resolve) => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 1500 }) : setTimeout(resolve, 600)));
        if (disposed) return;
        const res = await fetch(videos[0].dataset.src, { signal: controller.signal, priority: "low" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blobUrl = URL.createObjectURL(await res.blob());
        if (disposed) return;
        await Promise.all(
          [copy].map(async (c) => {
            c.el.src = blobUrl;
            await new Promise((resolve, reject) => {
              c.el.addEventListener("loadeddata", resolve, { once: true });
              c.el.addEventListener("error", reject, { once: true });
            });
            c.el.currentTime = (c.at + 0.5) / FPS;
            await new Promise((resolve) => c.el.addEventListener("seeked", resolve, { once: true }));
          })
        );
        if (disposed) return;
        // Sizing the canvas clears it, so the blend must be drawn again even
        // if the copies already painted once at the default size.
        canvas.width = videos[0].videoWidth;
        canvas.height = videos[0].videoHeight;
        shown = -1;
        paint();
        // The stage needs the poster and body map decoded; without WebGL the
        // head canvas is shown as it is.
        try {
          const body = new Image();
          body.src = living.body;
          const alpha = new Image();
          alpha.src = living.alpha;
          await Promise.all([body.decode(), alpha.decode(), poster.decode()]);
          if (disposed) return;
          stage = createLivingStage(glCanvas, { poster, head: canvas, body, alpha, box: living.grid.box, stone: STONE });
          if (stage) {
            stage.updateHead();
            headDirty = false;
            root.dataset.gl = "";
          }
        } catch {
          stage = null;
        }
        ready = true;
        root.dataset.live = "";
        wake();
      } catch {
        // Poster stays. Nothing else depends on the clip.
        root.dataset.still = "";
      }
    })();

    const state = live.current;
    return () => {
      disposed = true;
      state.wake = () => {};
      controller.abort();
      cancelAnimationFrame(raf);
      copy.el.removeEventListener("seeked", onSeeked);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      resize.disconnect();
      io.disconnect();
      delete root.dataset.live;
      delete root.dataset.gl;
      if (blobUrl) {
        copy.el.removeAttribute("src");
        copy.el.load();
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [ref, enabled]);
}
