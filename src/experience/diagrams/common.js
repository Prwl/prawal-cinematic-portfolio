export const INK = {
  bone: [236, 233, 226],
  bone3: [138, 134, 126],
  line: [236, 233, 226],
  tungsten: [243, 184, 121],
  backlight: [159, 176, 189]
};

export const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

export function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function label(ctx, text, x, y, { align = "left", color = INK.bone3, alpha = 1, size = 11, weight = 600 } = {}) {
  ctx.font = `${weight} ${size}px Archivo, ui-sans-serif, system-ui, sans-serif`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(size * 0.1).toFixed(1)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillText(text.toUpperCase(), x, y);
}

export function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
  ];
}

export const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export const easeInOut = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/** Mix two ink colours; used where a stroke warms from bone to tungsten. */
export const mix = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));

/** A polyline with cumulative lengths, for tracing a lit path along it. */
export function route(points) {
  const dist = [0];
  for (let i = 1; i < points.length; i++) {
    dist.push(dist[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, dist, length: dist.at(-1) };
}

/** Distance along a route of the first point at or past x. */
export function distanceAtX(r, x) {
  for (let i = 1; i < r.points.length; i++) {
    const [x0] = r.points[i - 1];
    const [x1] = r.points[i];
    if (x1 >= x) return r.dist[i - 1] + (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * (r.dist[i] - r.dist[i - 1]));
  }
  return r.length;
}

/** Stroke a route from its start to `upTo` pixels along it; returns the head point. */
export function strokeRoute(ctx, r, upTo) {
  const end = Math.max(0, Math.min(r.length, upTo));
  ctx.beginPath();
  ctx.moveTo(...r.points[0]);
  let head = r.points[0];
  for (let i = 1; i < r.points.length; i++) {
    if (r.dist[i] <= end) {
      ctx.lineTo(...r.points[i]);
      head = r.points[i];
      continue;
    }
    const f = (end - r.dist[i - 1]) / (r.dist[i] - r.dist[i - 1] || 1);
    head = [r.points[i - 1][0] + (r.points[i][0] - r.points[i - 1][0]) * f, r.points[i - 1][1] + (r.points[i][1] - r.points[i - 1][1]) * f];
    ctx.lineTo(...head);
    break;
  }
  ctx.stroke();
  return head;
}

export function sampleCubic(p0, p1, p2, p3, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => cubicPoint(p0, p1, p2, p3, i / n));
}

/**
 * Story cues shared by the case-study diagrams and the text beside them.
 * -1: dormant. 0..n-1: that stage is lit now. n: the outcome. n + 1: settled.
 */
export function cueReporter(onCue) {
  let last = null;
  return (cue) => {
    if (cue === last) return;
    last = cue;
    onCue?.(cue);
  };
}
