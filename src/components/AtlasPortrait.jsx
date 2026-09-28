import { useRef } from "react";
import { atlas, living } from "../lib/atlasMedia.js";
import { useAtlasPortrait } from "../hooks/useAtlasPortrait.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

const TRACKING = "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (orientation: landscape)";

/**
 * Experiment (?hero=atlas): LivingPortrait's markup and gating, with the head
 * drawn from the curated directional atlas (useAtlasPortrait) instead of the
 * pose-grid clip. Same poster, same stage, same styles.
 */
export function AtlasPortrait({ className = "", settled }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const capable = useMediaQuery(TRACKING);
  const enabled = capable && !reduce;
  useAtlasPortrait(ref, { enabled, settled });
  const { box } = atlas.manifest;

  return (
    <div ref={ref} className={`living ${className}`} data-hero="atlas" aria-hidden="true">
      <div className="living__frame">
        <picture className="living__poster">
          <source type="image/avif" srcSet={living.avif} />
          <img src={living.webp} width={living.width} height={living.height} alt="" decoding="async" fetchPriority="high" draggable="false" />
        </picture>
        {enabled && <canvas className="living__gl" />}
        {enabled && (
          <div
            className="living__head"
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
              "--feather": `${box.feather * 100}%`,
            }}
          >
            <canvas className="living__canvas" />
          </div>
        )}
      </div>
    </div>
  );
}
