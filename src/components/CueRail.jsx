import { useEffect, useRef } from "react";
import { chapters } from "../data/chapters.js";

// How long the rail stays fully up after the chapter changes.
const AWAKE_AFTER_CUE = 2600;
// How close the pointer has to come to the rail, beyond its own width.
const APPROACH = 72;

/**
 * The cue list, fixed at the left on wide screens. The chapter on stage is
 * the lit cue; earlier cues stay readable, later ones wait in the dark.
 *
 * While the visitor is reading, the rail steps back to a column of numerals
 * with only the current cue named. It comes up again when the chapter
 * changes, when the pointer approaches it, or when keyboard focus enters it.
 */
export function CueRail({ active }) {
  const ref = useRef(null);
  const activeIndex = chapters.findIndex((c) => c.id === active);

  // A new chapter: bring the rail up briefly so the change is announced visually.
  useEffect(() => {
    const rail = ref.current;
    if (!rail || activeIndex < 0) return;
    rail.dataset.cue = "";
    const timer = setTimeout(() => delete rail.dataset.cue, AWAKE_AFTER_CUE);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  // Pointer approach. Only fine pointers reach this width; state lives on the
  // element, so moving the mouse never re-renders React.
  useEffect(() => {
    const rail = ref.current;
    if (!rail || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let x = Infinity;
    const apply = () => {
      frame = 0;
      const near = x <= rail.offsetWidth + APPROACH;
      if (near !== ("near" in rail.dataset)) {
        if (near) rail.dataset.near = "";
        else delete rail.dataset.near;
      }
    };
    const onMove = (e) => {
      x = e.clientX;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = Infinity;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <nav ref={ref} className="cue-rail" aria-label="Chapters" data-idle={activeIndex < 0 ? "" : undefined}>
      <ol>
        {chapters.map((c, i) => {
          const state = i === activeIndex ? "current" : i < activeIndex ? "past" : "next";
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="cue-rail__cue"
                data-state={state}
                aria-current={state === "current" ? "location" : undefined}
              >
                <span className="cue-rail__numeral num" aria-hidden="true">
                  {c.numeral}
                </span>
                <span className="cue-rail__title">{c.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
