import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "../motion/gsap.js";
import { useReducedMotion } from "./useReducedMotion.js";
import { createScenePlayback, sceneScores } from "../lib/scenePlayback.js";
import { registerScene, releaseScene } from "../lib/sceneNavigation.js";

/** Scroll chooses a scene. A bounded clock directs its story; selectors explore afterward. */
export function useStory(count, resolved = 0) {
  const ref = useRef(null), control = useRef(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(resolved);
  const [live, setLive] = useState(false);
  const select = useCallback(beat => control.current?.select(Math.max(0, Math.min(count - 1, beat))), [count]);
  useLayoutEffect(() => {
    const el = ref.current;
    const score = sceneScores[el.dataset.kind] ?? Object.entries(sceneScores).find(([key]) => el.classList.contains(key))?.[1];
    if (!score) return;
    let timeline, visible = false;
    const paint = beat => { setActive(beat); el.dataset.finalFrame = String(beat === score.final); el.dataset.diagActive = beat; el.dataset.diagConfirmed = beat; };
    const machine = createScenePlayback({ finalBeat: score.final, onBeat: paint, onState: state => { el.dataset.sceneState = state; } });
    const finish = (beat = score.final) => {
      timeline?.kill();
      el.dataset.instant = "true";
      machine.resolve(beat); releaseScene(adapter);
    };
    const adapter = {
      el, gate: score.gate !== false && !reduce,
      state: () => machine.state,
      input: delta => machine.input(delta), finish,
      enter(immediate) {
        machine.enter({ immediate: immediate || reduce });
        if (machine.state !== "playing") { el.dataset.instant = "true"; return; }
        el.dataset.instant = "false";
        timeline = gsap.timeline({ onComplete: () => { machine.resolve(); releaseScene(adapter); } });
        for (const [at, beat] of score.beats) timeline.call(() => paint(beat), [], at);
        timeline.to({}, { duration: score.duration }, 0);
        if (document.hidden) timeline.pause();
      }
    };
    control.current = { select: beat => finish(beat) };
    el.dataset.sceneState = "unseen";
    el.dataset.moving = "false";
    if (!reduce) paint(score.beats[0][1]);
    const unregister = registerScene(adapter);
    const visibility = () => {
      const running = visible && !document.hidden && !reduce;
      el.dataset.live = String(running); setLive(running);
      if (machine.state === "playing") {
        if (document.hidden) timeline?.pause(); else timeline?.resume();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && machine.state === "resolved") machine.release();
      visibility();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", visibility);
    if (reduce) finish();
    return () => {
      unregister(); timeline?.kill(); observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      machine.dispose(); control.current = null;
    };
  }, [reduce]);
  return { ref, reduce, live, active, confirmed: active, select };
}
