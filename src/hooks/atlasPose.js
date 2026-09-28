// Pose logic for the directional atlas hero (experiment, ?hero=atlas).
// Pure functions, so the rules can be tested without a browser.
//
// The atlas is a centre and eight spokes (right, up-right, up, up-left, left,
// down-left, down, down-right, as the viewer sees them). A spoke is one
// take's own consecutive frames walking out from the rest frame. Some frames
// are "stops" (clean, on the spoke's axis): the head only ever comes to rest
// on a stop, and between stops it plays the take's frames in order, as filmed
// (scripts/atlas_build.py).

export const DIRECTIONS = ["right", "upright", "up", "upleft", "left", "downleft", "down", "downright"];
// Screen angle of each spoke, radians, y up.
export const ANGLES = DIRECTIONS.map((_, i) => (i * Math.PI) / 4);

const TAU = Math.PI * 2;
const wrap = (a) => ((a % TAU) + TAU) % TAU;
// Shortest signed distance between two angles.
export const angleBetween = (a, b) => {
  const d = wrap(b - a);
  return d > Math.PI ? d - TAU : d;
};

/**
 * Spoke to draw for each direction. A direction the archive does not film
 * cleanly borrows the usable neighbour nearest the pointer's own angle, so it
 * is never faked.
 */
export function usableSpoke(s, angle, usable) {
  if (usable[s]) return s;
  const a = (s + 7) % 8;
  const b = (s + 1) % 8;
  if (usable[a] && usable[b]) return Math.abs(angleBetween(ANGLES[a], angle)) <= Math.abs(angleBetween(ANGLES[b], angle)) ? a : b;
  return usable[a] ? a : usable[b] ? b : -1;
}

/**
 * The direction for a pose: the nearest, but a direction already shown is
 * kept until the pose is `hysteresis` radians past the boundary, so a pointer
 * sitting on a boundary cannot flick the head between two takes.
 * `x` is the viewer's right, `y` is down (pointer space).
 */
export function pickSpoke(x, y, current, hysteresis = 0.14) {
  const a = wrap(Math.atan2(-y, x));
  const nearest = Math.round(a / (Math.PI / 4)) % 8;
  if (current < 0 || current === nearest) return nearest;
  const off = Math.abs(angleBetween(ANGLES[current], a));
  return off > Math.PI / 8 + hysteresis ? nearest : current;
}

export const screenAngle = (x, y) => wrap(Math.atan2(-y, x));

/**
 * How far along a spoke, 0 (rest) to 1 (full reach). Chebyshev, so the
 * screen's corners reach the diagonals' full turn and its edges the axes',
 * and a diagonal is not twice as easy to reach as a side.
 */
export const reach = (x, y) => Math.min(1, Math.max(Math.abs(x), Math.abs(y)));

/**
 * The stop to head for. `stops` are [index, radius] pairs, ascending, the
 * first [0, 0] (rest); a radius past 1 counts as 1. The current stop is kept
 * until another is nearer by `margin`, so the head does not dither between
 * two stops under a pointer resting halfway.
 */
export function pickStop(stops, r, current = -1, margin = 0.06) {
  const eff = (k) => Math.min(1, stops[k][1]);
  let best = 0;
  for (let k = 1; k < stops.length; k++) if (Math.abs(eff(k) - r) < Math.abs(eff(best) - r)) best = k;
  if (current >= 0 && current < stops.length && current !== best) {
    if (Math.abs(eff(current) - r) <= Math.abs(eff(best) - r) + margin) return current;
  }
  return best;
}

/**
 * The frame nearest a radius on a spoke (for handing the head from one spoke
 * to its neighbour at the same turn). `radii` ascending, radii[0] = 0.
 */
export function nearestFrame(radii, r) {
  let best = 0;
  for (let k = 1; k < radii.length; k++) if (Math.abs(radii[k] - r) < Math.abs(radii[best] - r)) best = k;
  return best;
}
