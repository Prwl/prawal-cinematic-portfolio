import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";

/**
 * Hosts a canvas scene. The scene factory receives (ctx, width, height, api)
 * and returns { draw(timeSeconds), resize?(w, h), setLevel?(n), dispose?() }.
 *
 * - Device pixel ratio is capped to keep fill cost predictable on phones.
 * - The loop only runs while the canvas is on screen and the tab is visible.
 * - Under reduced motion a single composed frame is drawn at `stillTime`.
 * - A scene with start(t) begins its story the first time most of the canvas
 *   is on screen; until then it draws its dormant state.
 * - A scene whose isStill() returns true has come to rest: the loop stops and
 *   the last frame stays on the canvas.
 */
export function CanvasStage({ scene, label, className, stillTime = 6, maxDpr = 1.75, sceneRef, options }) {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let width = 0;
    let height = 0;
    let instance = null;
    let frame = 0;
    let running = false;
    let onScreen = false;
    let still = false;
    let start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    function size() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!instance) instance = scene(ctx, width, height, { reduce, ...options });
      else instance.resize?.(width, height);
      if (sceneRef) sceneRef.current = instance;
    }

    function render(now) {
      ctx.clearRect(0, 0, width, height);
      instance.draw(reduce ? stillTime : (now - start) / 1000);
    }

    function loop(now) {
      render(now);
      if (instance.isStill?.()) {
        still = true;
        running = false;
        return;
      }
      frame = requestAnimationFrame(loop);
    }

    function update() {
      const shouldRun = !reduce && !still && onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        frame = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    }

    size();
    render(performance.now());

    const resizeObserver = new ResizeObserver(() => {
      size();
      if (!running) render(performance.now());
    });
    resizeObserver.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        update();
      },
      { rootMargin: "80px" }
    );
    io.observe(canvas);

    let cueIo = null;
    if (instance.start) {
      cueIo = new IntersectionObserver(
        ([entry]) => {
          if (entry.intersectionRatio < 0.45) return;
          instance.start(now());
          cueIo.disconnect();
        },
        { threshold: [0, 0.45] }
      );
      cueIo.observe(canvas);
    }

    const onVisibility = () => update();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      io.disconnect();
      cueIo?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      instance?.dispose?.();
      if (sceneRef) sceneRef.current = null;
    };
    // The scene factory and options are static per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return label ? (
    <canvas ref={canvasRef} className={className} role="img" aria-label={label} />
  ) : (
    <canvas ref={canvasRef} className={className} aria-hidden="true" />
  );
}
