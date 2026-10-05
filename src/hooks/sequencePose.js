// The hero image sequence: the pure parts of
// useSequencePortrait, kept apart so they can be tested.

// Production's pointer calibration (useLivingPortrait.js), unchanged: a dead
// zone around the face, a smoothstep ease out to the screen's edge, and the
// pose held to the believable 72% of the 22 degree range.
export const DEAD_ZONE = 0.1;
export const MAX_YAW = 0.72;
export const YAW_RANGE = 22;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function shape(v) {
  const m = Math.abs(v);
  if (m <= DEAD_ZONE) return 0;
  const t = Math.min(1, (m - DEAD_ZONE) / (1 - DEAD_ZONE));
  return Math.sign(v) * t * t * (3 - 2 * t);
}

// A pose in [-1, 1] (positive: pointer to the viewer's right) to LivePortrait
// yaw in degrees. Negative yaw turns him to the viewer's right, toward the
// pointer, exactly as production's grid columns do.
export const yawFor = (pose) => -clamp(pose, -1, 1) * MAX_YAW * YAW_RANGE;

// Production's vertical calibration (useLivingPortrait.js, gridPosition): a
// pose in [-1, 1] (negative: pointer above) to pitch in degrees, negative up,
// reaching 62% of 15 degrees up and 90% of 7 down.
export const pitchFor = (pose) => (pose < 0 ? Math.max(pose, -1) * 0.62 * 15 : Math.min(pose, 1) * 0.9 * 7);

// Choosing a frame. Every frame has a filmed pose (yaw, pitch, degrees,
// relative to rest). The page can make up a little pitch with its head tilt
// (`tilt`: { up, down } degrees, the most that reads without stretching), but
// no yaw. A frame's cost for a target pose is:
// - its yaw miss, doubled: a sideways jump is what the eye catches first;
// - the pitch the tilt has to make up, lightly, so a filmed pose wins over a
//   tilted one;
// - any pitch the tilt cannot reach, heavily.
export function frameCost(f, target, tilt) {
  const dy = f.yaw - target.yaw;
  const need = target.pitch - f.pitch; // positive: the target is lower than the frame
  const beyond = need > 0 ? Math.max(0, need - tilt.down) : Math.max(0, -need - tilt.up);
  return 2 * dy * dy + 0.3 * need * need + 4 * beyond * beyond;
}

// How far up and down the head can go at each yaw: the filmed pitch of the
// frames near that yaw, plus the tilt. Where no frames were filmed (the lower
// diagonals; up between the nod and the turned takes) the reach is short, so
// the page keeps the target inside it instead of jumping across a hole to a
// frame of another pose. The reach is smoothed to change by at most SLOPE
// degrees of pitch per degree of yaw, never exceeding what was filmed, so the
// target glides along the edge of the footage.
// Up looks at frames within 2.25 degrees of yaw (the straight-up take drifts
// 2 degrees to the viewer's left as it rises). Down looks wider (2.5)
// and may grow faster (SLOPE_DOWN): its filmed frames are few, and lie up to a
// couple of degrees either side of centre.
export const SLOPE = 1.6;
export const SLOPE_DOWN = 2;
export const NEAR_UP = 2.25;
const NEAR_DOWN = 2.5;
export function reachOf(frames, tilt, step = 0.25, span = 24) {
  const yaws = [];
  for (let y = -span; y <= span + 1e-9; y += step) yaws.push(y);
  const raw = yaws.map((y) => {
    let up = 0;
    let down = 0;
    for (const f of frames) {
      const d = Math.abs(f.yaw - y);
      if (d <= NEAR_UP) up = Math.max(up, tilt.up - f.pitch);
      if (d <= NEAR_DOWN) down = Math.max(down, f.pitch + tilt.down);
    }
    return [up, down];
  });
  const erode = (k, slope) => yaws.map((y) => Math.min(...raw.map((r, j) => r[k] + slope * Math.abs(yaws[j] - y))));
  return { step, span, up: erode(0, SLOPE), down: erode(1, SLOPE_DOWN) };
}
export function reachable(target, reach) {
  if (!reach) return target;
  // Interpolated between the table's yaws, so the limit moves smoothly.
  const u = (Math.max(-reach.span, Math.min(reach.span, target.yaw)) + reach.span) / reach.step;
  const i = Math.min(reach.up.length - 2, Math.floor(u));
  const f = u - i;
  const up = reach.up[i] + (reach.up[i + 1] - reach.up[i]) * f;
  const down = reach.down[i] + (reach.down[i + 1] - reach.down[i]) * f;
  return { yaw: target.yaw, pitch: Math.max(-up, Math.min(down, target.pitch)) };
}

// The shown frame changes only when another is clearly better: by 0.6 (a
// yaw miss of about 0.8 degrees), or by three quarters of its own cost when
// it is already close: settling on a target always ends on its best frame (at
// rest, the rest frame itself), and a trembling hand never flickers between two.
//
// Frames from any take but the primary one (the rest frame's) cost TAKE_COST
// more. Generations render the face alike at matched poses, but not
// identically, so the primary take (plus the tilt) keeps every pose it can
// reach, above all the centre and the level sweep, and the others come in
// only where it cannot: well up, or straight down. Between takes the page
// cuts: at matched poses the faces differ like neighbouring frames, and a
// crossfade would show two of them at once.
export const CHOICE_MARGIN = 0.6;
export const TAKE_COST = 6;
export function chooseFrame(frames, target, shown, tilt, { usable = () => true, primary } = {}) {
  const cost = (k) => frameCost(frames[k], target, tilt) + (primary !== undefined && frames[k].take !== primary ? TAKE_COST : 0);
  let best = -1;
  let low = Infinity;
  for (let k = 0; k < frames.length; k++) {
    if (!usable(k)) continue;
    const c = cost(k);
    if (c < low) [best, low] = [k, c];
  }
  if (shown >= 0 && usable(shown)) {
    const own = cost(shown);
    if (own - low < Math.min(CHOICE_MARGIN, own * 0.75)) return shown;
  }
  return best;
}

// Where two runs of one take meet (`joins`: pairs of frame indices, the same
// pose filmed far apart in time), their fine detail differs more than
// neighbours do. While either is shown and the target's yaw lies between
// theirs, the page crossfades them by position; elsewhere it shows one frame.
// The last 2% at either end is left to the single frame, so at rest the rest
// frame shows alone. Returns { a, b, mix } (mix 0 is a alone) or null.
const JOIN_EDGE = 0.02;
export function joinAt(frames, joins, shown, target) {
  for (const [a, b] of joins ?? []) {
    if (shown !== a && shown !== b) continue;
    const mix = (frames[a].yaw - target.yaw) / (frames[a].yaw - frames[b].yaw);
    if (mix > JOIN_EDGE && mix < 1 - JOIN_EDGE) return { a, b, mix };
  }
  return null;
}

// What the page shows for a target: each take's own best frame (chosen with
// its own hysteresis, remembered in `memory`), and of those the cheapest, the
// primary take counted TAKE_COST dearer. Between takes the page always cuts,
// never crossfades: each generation draws the head's outline, and holds the
// eyes, a little differently, and a blend shows both (a doubled hairline, two
// sets of irises), however well the poses and faces line up. The take shown
// last stays until another is better by CUT_HOLD, so a target resting on the
// boundary between two never flickers. Within the primary take, a join (see
// joinAt) blends its two frames by position. Returns { a, b, mix }: frame a,
// and frame b blended in by mix (b is -1 when mix is 0).
export const CUT_HOLD = 2.5;
export function chooseView(frames, target, memory, tilt, { usable = () => true, primary, joins } = {}) {
  memory.byTake ??= new Map();
  const best = [];
  for (const take of new Set(frames.map((f) => f.take))) {
    const mine = (i) => frames[i].take === take && usable(i);
    const k = chooseFrame(frames, target, memory.byTake.get(take) ?? -1, tilt, { usable: mine });
    if (k < 0) continue;
    memory.byTake.set(take, k);
    // Takes are ranked by their best cost, which moves smoothly with the
    // target; the frame each shows keeps its hysteresis. Ranked by the held
    // frame instead, a take's cost would drop in a step when its frame
    // changes, and the page could cut back and forth.
    let free = Infinity;
    for (let i = 0; i < frames.length; i++) if (mine(i)) free = Math.min(free, frameCost(frames[i], target, tilt));
    best.push([free + (primary !== undefined && take !== primary ? TAKE_COST : 0), k]);
  }
  best.sort((x, y) => x[0] - y[0]);
  if (!best.length) return { a: -1, b: -1, mix: 0 };
  const held = best.findIndex(([, k]) => frames[k].take === memory.take);
  if (held > 0 && best[held][0] - best[0][0] < CUT_HOLD) best.unshift(...best.splice(held, 1));
  const a = best[0][1];
  const join = joinAt(frames, joins, a, target);
  if (join && usable(join.b)) return join;
  memory.take = frames[a].take;
  return { a, b: -1, mix: 0 };
}

// The tilt, degrees, positive looking up, that brings a frame's pitch toward
// the target's, within what reads without stretching.
export function tiltFor(f, target, tilt) {
  const need = target.pitch - f.pitch;
  return need > 0 ? -Math.min(need, tilt.down) : Math.min(-need, tilt.up);
}

// Critically damped spring toward a fixed target, solved exactly over dt: the
// same motion at 30, 60 or 120 frames a second, and no overshoot however long
// a frame takes (a hitch cannot make it jump past the target).
export function spring(x, v, target, omega, dt) {
  const d = x - target;
  const e = Math.exp(-omega * dt);
  const c = v + omega * d;
  return [target + (d + c * dt) * e, (v - omega * c * dt) * e];
}
