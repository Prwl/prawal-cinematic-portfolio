// A service topology projected on the back wall like a gobo: tiers of nodes,
// rectilinear links between neighbouring tiers, and signals travelling along
// them. It is atmosphere, so it is drawn in the cool backlight, never tungsten.

const BACKLIGHT = [159, 176, 189];
const BONE = [236, 233, 226];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function topologyScene(ctx, width, height, options = {}) {
  const { focusX = 0.66, focusY = 0.4, reach = 0.75, awake = false, seed = 7, density = 1 } = options;
  let w = width;
  let h = height;
  let nodes = [];
  let links = [];
  let signals = [];
  // Wake is scheduled by the title sequence; settled views start awake.
  let wakeAt = awake ? -10 : Infinity;
  let level = awake ? 1 : 0;
  let targetLevel = level;
  let lastT = 0;
  // Once settled, signals stop travelling and nodes stop breathing: the set
  // comes to rest and the host can stop drawing.
  let settleAt = Infinity;
  const SETTLE_FOR = 2.8;

  function build() {
    const rand = mulberry32(seed);
    const tiers = Math.max(6, Math.round(w / 150));
    const perTier = Math.max(4, Math.round((h / 120) * density));
    nodes = [];
    links = [];
    const grid = [];
    for (let i = 0; i < tiers; i++) {
      const x = ((i + 0.5) / tiers) * w + (rand() - 0.5) * (w / tiers) * 0.3;
      const column = [];
      for (let j = 0; j < perTier; j++) {
        if (rand() < 0.28) continue;
        const y = ((j + 0.5) / perTier) * h + (rand() - 0.5) * (h / perTier) * 0.5;
        const node = { x, y, tier: i, phase: rand() * Math.PI * 2, size: rand() < 0.15 ? 3 : 2 };
        const dx = (x / w - focusX) / reach;
        const dy = (y / h - focusY) / (reach * 1.1);
        node.falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
        node.wakeDelay = (x / w) * 1.1 + rand() * 0.35;
        column.push(node);
        nodes.push(node);
      }
      grid.push(column);
    }
    for (let i = 0; i < grid.length - 1; i++) {
      for (const a of grid[i]) {
        const targets = grid[i + 1];
        if (!targets.length) continue;
        const count = rand() < 0.35 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const b = targets[Math.floor(rand() * targets.length)];
          // Rectilinear route: out, across, in. Reads as architecture, not a web.
          const midX = a.x + (b.x - a.x) * (0.35 + rand() * 0.3);
          const points = [
            [a.x, a.y],
            [midX, a.y],
            [midX, b.y],
            [b.x, b.y]
          ];
          let length = 0;
          for (let p = 1; p < points.length; p++) {
            length += Math.abs(points[p][0] - points[p - 1][0]) + Math.abs(points[p][1] - points[p - 1][1]);
          }
          links.push({ a, b, points, length, falloff: Math.min(a.falloff, b.falloff) });
        }
      }
    }
    signals = [];
    const signalCount = Math.min(18, Math.round(links.length / 5));
    for (let s = 0; s < signalCount; s++) {
      signals.push({ link: links[Math.floor(rand() * links.length)], offset: rand(), speed: 70 + rand() * 90 });
    }
  }

  function pointAt(link, distance) {
    let remaining = distance;
    const pts = link.points;
    for (let p = 1; p < pts.length; p++) {
      const seg = Math.abs(pts[p][0] - pts[p - 1][0]) + Math.abs(pts[p][1] - pts[p - 1][1]);
      if (remaining <= seg) {
        const f = seg === 0 ? 0 : remaining / seg;
        return [pts[p - 1][0] + (pts[p][0] - pts[p - 1][0]) * f, pts[p - 1][1] + (pts[p][1] - pts[p - 1][1]) * f];
      }
      remaining -= seg;
    }
    return pts[pts.length - 1];
  }

  build();

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      build();
    },
    /** Start the ignition sequence at scene time `t` (seconds). */
    wake(t = lastT) {
      wakeAt = t;
      targetLevel = 1;
    },
    setLevel(v) {
      targetLevel = v;
    },
    /** Bring the topology to rest over a few seconds. */
    settle() {
      if (settleAt === Infinity) settleAt = lastT;
    },
    isStill() {
      return lastT - settleAt > SETTLE_FOR && Math.abs(targetLevel - level) < 0.01;
    },
    draw(t) {
      const dt = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      level += (targetLevel - level) * Math.min(1, dt * 2.5);
      if (level < 0.005) return;
      const since = t - wakeAt;
      const calm = 1 - smooth((t - settleAt) / SETTLE_FOR);

      ctx.lineWidth = 1;
      for (const link of links) {
        const lit = smooth((since - link.a.wakeDelay) / 0.9) * link.falloff * level;
        if (lit <= 0.01) continue;
        ctx.strokeStyle = rgba(BACKLIGHT, 0.3 * lit);
        ctx.beginPath();
        ctx.moveTo(link.points[0][0], link.points[0][1]);
        for (let p = 1; p < link.points.length; p++) ctx.lineTo(link.points[p][0], link.points[p][1]);
        ctx.stroke();
      }

      for (const node of nodes) {
        const lit = smooth((since - node.wakeDelay) / 0.6) * node.falloff * level;
        if (lit <= 0.01) continue;
        const breathe = calm * (0.75 + 0.25 * Math.sin(t * 0.8 + node.phase)) + (1 - calm) * 0.8;
        ctx.fillStyle = rgba(BACKLIGHT, 0.95 * lit * breathe);
        const s = node.size;
        ctx.fillRect(node.x - s / 2, node.y - s / 2, s, s);
      }

      const signalsLive = smooth((since - 1.4) / 1.2) * level * calm;
      if (signalsLive > 0.01) {
        for (const signal of signals) {
          const { link } = signal;
          const travel = (t * signal.speed + signal.offset * link.length) % (link.length + 120);
          if (travel > link.length) continue;
          const head = pointAt(link, travel);
          const tail = pointAt(link, Math.max(0, travel - 26));
          const a = 0.95 * link.falloff * signalsLive;
          const gradient = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
          gradient.addColorStop(0, rgba(BONE, 0));
          gradient.addColorStop(1, rgba(BONE, a));
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          // Tail follows the route through corners.
          const steps = 6;
          for (let i = 0; i <= steps; i++) {
            const p = pointAt(link, Math.max(0, travel - 26 + (26 * i) / steps));
            if (i === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
          }
          ctx.stroke();
        }
      }
    }
  };
}
