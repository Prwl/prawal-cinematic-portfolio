import { useRef, useState } from "react";
import { living } from "../lib/media.js";
import { LivingPortrait } from "./LivingPortrait.jsx";
import { useSequencePortrait } from "../hooks/useSequencePortrait.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

// Production's gating (LivingPortrait.jsx).
const TRACKING = "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (orientation: landscape)";

/**
 * The hero portrait: the head is one continuous filmed turn from a
 * single generation, drawn from predecoded bitmaps (useSequencePortrait) on
 * production's stage, styles and composition. Touch, phones, upright tablets
 * and reduced motion get production's LivingPortrait, which for them is the
 * existing static poster; none of the sequence is fetched.
 */
export function SequencePortrait({ className = "", settled }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const capable = useMediaQuery(TRACKING);
  const enabled = capable && !reduce;
  const [poster, setPoster] = useState(null);
  useSequencePortrait(ref, { enabled, settled, onPoster: setPoster });

  if (!enabled) return <LivingPortrait className={className} settled={settled} />;
  return (
    <div ref={ref} className={`living ${className}`} data-hero="sequence" aria-hidden="true">
      <div className="living__frame">
        <picture className="living__poster">
          {!poster && <source type="image/avif" srcSet={living.avif} />}
          <img src={poster ?? living.webp} width={living.width} height={living.height} alt="" decoding="async" fetchPriority="high" draggable="false" />
        </picture>
        <canvas className="living__gl" />
      </div>
    </div>
  );
}
