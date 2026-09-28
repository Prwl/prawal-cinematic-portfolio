import { useRef } from "react";
import { living } from "../lib/media.js";
import { useLivingPortrait } from "../hooks/useLivingPortrait.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

// Only a fine pointer on a landscape desktop gets the clip. Touch, phones,
// upright tablets and reduced motion keep the neutral frame and never
// download the video.
const TRACKING = "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (orientation: landscape)";

/**
 * Prawal in the hall. The rest pose is always painted first; on a desktop
 * with a mouse the head clip takes over the head once decoded, on the same
 * picture, and he turns toward the pointer (useLivingPortrait).
 */
const { box } = living.grid;

export function LivingPortrait({ className = "", settled }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const capable = useMediaQuery(TRACKING);
  const enabled = capable && !reduce;
  useLivingPortrait(ref, { enabled, settled });

  return (
    <div ref={ref} className={`living ${className}`} aria-hidden="true">
      <div className="living__frame">
        <picture className="living__poster">
          <source type="image/avif" srcSet={living.avif} />
          <img src={living.webp} width={living.width} height={living.height} alt="" decoding="async" fetchPriority="high" draggable="false" />
        </picture>
        {/* The head, drawn from one hidden copy of the pose clip. Keeping a
            single decoded frame avoids the soft double-image and seek stalls
            that appeared when four compressed frames were blended. */}
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
            <video
              className="living__video"
              data-src={living.video}
              muted
              playsInline
              preload="none"
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
