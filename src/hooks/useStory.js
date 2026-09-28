import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "../motion/gsap.js";
import { useReducedMotion } from "./useReducedMotion.js";

/**
 * Discrete beats, native sticky layout, no scroll interception or idle loop.
 * `live` is true while the scene is on screen, so looping scene motion (a
 * system's flow) runs only where it can be seen.
 */
export function useStory(count, resolved = 0) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState(null);
  const [beat, setBeat] = useState(0);
  const [live, setLive] = useState(false);
  useLayoutEffect(() => {
    if (reduce) return;
    let previous = -1;
    const trigger = ScrollTrigger.create({ trigger: ref.current, start: "top top", end: "bottom bottom", onUpdate: self => {
      const next = Math.min(count - 1, Math.floor(self.progress * count));
      if (next !== previous) { previous = next; setBeat(next); setSelected(null); }
    }});
    return () => trigger.kill();
  }, [count, reduce]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, reduce, live, active: selected ?? (reduce ? resolved : beat), select: setSelected };
}
