/**
 * Scroll position to story beat, and when a beat's words may confirm.
 * Pure: no DOM, no React, so both rules are testable on their own.
 */

/**
 * The slot for a scroll progress. Deterministic: any delta, one frame or a
 * scrollbar jump across many boundaries, resolves straight to the slot for
 * that position. `band` (progress units) lets the current slot hold a hair
 * past its own edges so a resting hand on a boundary cannot flicker it.
 */
export function slotAt(progress, slots, previous = -1, band = 0) {
  const p = Math.min(1, Math.max(0, progress));
  const raw = Math.min(slots - 1, Math.floor(p * slots));
  if (previous < 0 || previous >= slots || raw === previous || band <= 0) return raw;
  return p >= previous / slots - band && p < (previous + 1) / slots + band ? previous : raw;
}

/** Boundary band: a quarter slot at most, about 24px of scroll at least. */
export function boundaryBand(slots, distance) {
  return distance > 0 ? Math.min(0.25 / slots, 24 / distance) : 0;
}

// `arrival` is a scene's full shot. From rest the camera eases in and out
// (--ease-in-out) and its subject is framed, about 95% of the way, at 72% of
// that. A camera retargeted mid-move follows on (--ease-follow, story.css) and
// is as far along at half of it. Words confirm at the frame, not the stop, so
// a reader who rests briefly still gets them.
export const FRAMED = 0.72;
export const FOLLOW = 0.5;

/**
 * One confirmation in flight at a time. Each new target cancels the pending
 * one, so a stale beat can never confirm and the newest target always does.
 * A target follows on (`follow`) when the camera is still travelling, its
 * words may already have confirmed, or when the reader is moving fast enough
 * (`hurry`) to reach the next beat before a shot from rest would frame.
 */
export function createConfirmer({ arrival, onMove, onConfirm, schedule = setTimeout, cancel = clearTimeout, now = () => performance.now() }) {
  let timer = null;
  let movedAt = -Infinity;
  return {
    target(beat, hurry = false) {
      const at = now();
      const follow = hurry || timer !== null || at - movedAt < arrival;
      if (timer !== null) cancel(timer);
      movedAt = at;
      onMove(follow);
      timer = schedule(() => {
        timer = null;
        onConfirm(beat);
      }, Math.round(arrival * (follow ? FOLLOW : FRAMED)));
      return follow;
    },
    get pending() {
      return timer !== null;
    },
    dispose() {
      if (timer !== null) cancel(timer);
      timer = null;
    }
  };
}

/**
 * Whether a reader at `velocity` (px/s) will cross out of the beat at `slot`
 * before `framed` ms have passed: then its shot must follow on.
 */
export function hurried(stops, slot, progress, velocity, distance, framed) {
  if (!velocity || distance <= 0) return false;
  const beat = stops[slot];
  let edge = slot;
  if (velocity > 0) { while (edge < stops.length && stops[edge] === beat) edge++; if (edge === stops.length) return false; }
  else { while (edge >= 0 && stops[edge] === beat) edge--; if (edge < 0) return false; edge++; }
  const px = Math.abs(edge / stops.length - progress) * distance;
  return (px / Math.abs(velocity)) * 1000 < framed;
}
