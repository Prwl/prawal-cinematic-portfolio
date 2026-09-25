import { useEffect, useState } from "react";

/**
 * For a list of elements, reports the index of the one crossing the middle
 * band of the viewport, and the furthest index reached so far. Used to light
 * one item at a time while earlier ones stay up.
 */
export function useCueFocus(containerRef, selector, { band = "-42% 0px -42% 0px", enabled = true } = {}) {
  const [state, setState] = useState({ current: -1, reached: -1 });

  useEffect(() => {
    if (!enabled) return;
    const items = [...containerRef.current.querySelectorAll(selector)];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = items.indexOf(entry.target);
          setState((s) => (s.current === index ? s : { current: index, reached: Math.max(s.reached, index) }));
        }
      },
      { rootMargin: band, threshold: 0 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef, selector, band, enabled]);

  return state;
}

export function cueState(index, { current, reached }, reduce) {
  if (reduce) return "lit";
  if (index === current) return "current";
  if (index <= reached) return "lit";
  return "dark";
}
