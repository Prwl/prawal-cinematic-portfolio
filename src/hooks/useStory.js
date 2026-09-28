import { useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "../motion/gsap.js";
import { useReducedMotion } from "./useReducedMotion.js";

/** Discrete beats, native sticky layout, no scroll interception or idle loop. */
export function useStory(count, resolved = 0) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState(null);
  const [beat, setBeat] = useState(0);
  useLayoutEffect(() => {
    if (reduce) return;
    let previous = -1;
    const trigger = ScrollTrigger.create({ trigger: ref.current, start: "top top", end: "bottom bottom", onUpdate: self => {
      const next = Math.min(count - 1, Math.floor(self.progress * count));
      if (next !== previous) { previous = next; setBeat(next); setSelected(null); }
    }});
    return () => trigger.kill();
  }, [count, reduce]);
  return { ref, reduce, active: selected ?? (reduce ? resolved : beat), select: setSelected };
}
