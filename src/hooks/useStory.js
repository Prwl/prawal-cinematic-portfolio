import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "../motion/gsap.js";
import { useReducedMotion } from "./useReducedMotion.js";
export function useStory(count, resolved = 0, sequence = null, arrival = 940) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState(null);
  const [beat, setBeat] = useState(0);
  const [live, setLive] = useState(false);
  const [arrived, setArrived] = useState(0);
  const active = selected ?? (reduce ? resolved : beat);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { el.dataset.moving = "false"; return; }
    el.dataset.moving = "true";
    const timer = window.setTimeout(() => { el.dataset.moving = "false"; setArrived(active); }, arrival);
    return () => window.clearTimeout(timer);
  }, [active, arrival, reduce]);
  useLayoutEffect(() => {
    if (reduce) return;
    let previous = -1;
    const trigger = ScrollTrigger.create({ trigger: ref.current, start: "top top", end: "bottom bottom", onUpdate: self => {
      const stops = sequence ?? Array.from({ length: count }, (_, i) => i);
      const next = stops[Math.min(stops.length - 1, Math.floor(self.progress * stops.length))];
      if (next !== previous) { previous = next; setBeat(next); setSelected(null); }
    }});
    return () => trigger.kill();
  }, [count, reduce, sequence]);
  useEffect(() => { if (ref.current) ref.current.dataset.beats = count; }, [count]);
  useEffect(() => { if (ref.current) { ref.current.dataset.diagActive = active; ref.current.dataset.diagConfirmed = reduce ? active : arrived; } });
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el.querySelector(".story-sticky") ?? el);
    return () => io.disconnect();
  }, []);
  return { ref, reduce, live, active, confirmed: reduce ? active : arrived, select: setSelected };
}
