import { INK, rgba, mulberry32, label, cubicPoint, smooth, easeInOut, mix, route, distanceAtX, strokeRoute, sampleCubic, cueReporter } from "./common.js";

// Data Refinery, abstracted: many sources converge on Connectors, pass
// through Trifacta recipes, and Data Serve fans them out to destinations.
//
// The story, told once when the diagram comes into view: the architecture is
// dormant; the sources come up (input); one source's route lights in
// tungsten through all three stages to a destination (the meaningful path);
// then everyday traffic runs through it (outcome). Afterwards that route
// stays lit as the example path while the rest of the topology stays quiet.
const STAGES = ["Connectors", "Trifacta", "Data Serve"];
const DESTINATIONS = ["AWS S3", "GCP", "Azure ADLS", "Snowflake", "SFTP", "Analytics"];
const ROUTE_DEST = 3;

// Story beats, in seconds after the diagram first comes into view.
const WAKE = 0.9;
const TRACE_AT = 0.8;
const TRACE_FOR = 2.8;
const OUTCOME_AT = TRACE_AT + TRACE_FOR + 0.15;
const SETTLED_AT = OUTCOME_AT + 2.2;
const FLOW_AT = OUTCOME_AT + 0.2;

export function pipelineScene(ctx, width, height, { reduce = false, onCue } = {}) {
  let w = width;
  let h = height;
  let layout;
  let startAt = reduce ? -100 : Infinity;
  const report = cueReporter(onCue);
  const rand = mulberry32(11);
  const sourceSeeds = Array.from({ length: 42 }, () => [rand(), rand()]);
  const packets = Array.from({ length: 34 }, (_, i) => ({
    source: Math.floor(rand() * sourceSeeds.length),
    dest: Math.floor(rand() * DESTINATIONS.length),
    lane: Math.floor(rand() * 3),
    offset: i / 34,
    speed: 0.075 + rand() * 0.05
  }));

  function sourceCurve(i) {
    const s = layout.sources[i];
    const e = [layout.stageX[0], layout.midY];
    return [s, [s[0] + (e[0] - s[0]) * 0.55, s[1]], [e[0] - (e[0] - s[0]) * 0.25, e[1]], e];
  }

  function destCurve(i) {
    const s = [layout.stageX[2], layout.midY];
    const e = layout.dests[i];
    return [s, [s[0] + (e[0] - s[0]) * 0.45, s[1]], [e[0] - (e[0] - s[0]) * 0.5, e[1]], e];
  }

  function build() {
    const compact = w < 640;
    const top = h * (compact ? 0.2 : 0.18);
    const bottom = h * 0.9;
    const midY = (top + bottom) / 2;
    const stageX = compact ? [0.34, 0.52, 0.7].map((f) => f * w) : [0.34, 0.5, 0.66].map((f) => f * w);
    const sources = sourceSeeds.map(([a, b]) => [w * (0.03 + a * (compact ? 0.16 : 0.17)), top + b * (bottom - top)]);
    const destX = w * (compact ? 0.86 : 0.88);
    const dests = DESTINATIONS.map((_, i) => [destX, top + ((i + 0.5) / DESTINATIONS.length) * (bottom - top)]);
    const laneOffsets = [-0.12, 0, 0.12].map((f) => f * (bottom - top));
    layout = { compact, top, bottom, midY, stageX, sources, dests, laneOffsets };

    // The example route: the leftmost source in the upper half, so its thread
    // is long and clearly separate from the bundle.
    let pick = 0;
    sources.forEach(([x, y], i) => {
      if (y < midY - (bottom - top) * 0.12 && x < sources[pick][0]) pick = i;
    });
    const points = [...sampleCubic(...sourceCurve(pick)), ...sampleCubic(...destCurve(ROUTE_DEST)).slice(1)];
    // The lanes run straight between the first and last stage.
    const r = route(points);
    layout.route = r;
    layout.routeSource = pick;
    layout.gateDist = stageX.map((x) => distanceAtX(r, x));
  }

  build();

  function cueAt(since, head) {
    if (since < 0) return -1;
    if (since >= SETTLED_AT) return STAGES.length + 1;
    if (since >= OUTCOME_AT) return STAGES.length;
    let passed = -1;
    layout.gateDist.forEach((d, i) => head >= d - 1 && (passed = i));
    return passed;
  }

  return {
    start(t) {
      if (startAt === Infinity) startAt = t;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
      build();
    },
    draw(t) {
      const { top, bottom, midY, stageX, sources, dests, laneOffsets, compact, route: r, gateDist, routeSource } = layout;
      const since = t - startAt;
      // Dormant architecture sits at a low level until the story begins.
      const k = 0.32 + 0.68 * smooth(since / WAKE);
      const traced = easeInOut((since - TRACE_AT) / TRACE_FOR) * r.length;
      // After the outcome the example route settles to a steady, lower glow.
      const routeAlpha = 0.95 - 0.4 * smooth((since - OUTCOME_AT) / 1.4);
      const flow = smooth((since - FLOW_AT) / 1.6);
      const labelSize = compact ? 11 : 12;
      report(cueAt(since, traced));

      // Source threads.
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(INK.line, 0.075 * k);
      for (let i = 0; i < sources.length; i++) {
        const [p0, p1, p2, p3] = sourceCurve(i);
        ctx.beginPath();
        ctx.moveTo(...p0);
        ctx.bezierCurveTo(...p1, ...p2, ...p3);
        ctx.stroke();
      }
      // Input: the sources come up from left to right as the story starts.
      sources.forEach(([x, y]) => {
        const lit = smooth((since - 0.1 - (x / w) * 1.6) / 0.4);
        ctx.fillStyle = rgba(INK.bone, 0.28 + 0.55 * lit);
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      });

      // Lanes between stages.
      ctx.strokeStyle = rgba(INK.line, 0.16 * k);
      for (const off of laneOffsets) {
        ctx.beginPath();
        ctx.moveTo(stageX[0], midY + off);
        ctx.lineTo(stageX[2], midY + off);
        ctx.stroke();
      }

      // Destination threads.
      ctx.strokeStyle = rgba(INK.line, 0.13 * k);
      for (let i = 0; i < dests.length; i++) {
        const [p0, p1, p2, p3] = destCurve(i);
        ctx.beginPath();
        ctx.moveTo(...p0);
        ctx.bezierCurveTo(...p1, ...p2, ...p3);
        ctx.stroke();
      }

      // The meaningful path, traced in tungsten.
      if (traced > 0) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(INK.tungsten, routeAlpha);
        const head = strokeRoute(ctx, r, traced);
        ctx.lineWidth = 1;
        const [sx, sy] = sources[routeSource];
        ctx.fillStyle = rgba(INK.tungsten, routeAlpha);
        ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
        if (traced < r.length) {
          ctx.fillStyle = rgba(INK.tungsten, 1);
          ctx.fillRect(head[0] - 2.5, head[1] - 2.5, 5, 5);
        }
      }

      // Stage gates: dim until the path reaches them, warm while it passes,
      // then held up in bone.
      const gateH = (bottom - top) * 0.42;
      stageX.forEach((x, i) => {
        const reached = smooth((traced - gateDist[i]) / 8);
        const passing = reached * (1 - smooth((traced - gateDist[i] - r.length * 0.12) / (r.length * 0.1)));
        const colour = mix(INK.bone, INK.tungsten, since >= OUTCOME_AT ? 0 : passing);
        ctx.fillStyle = rgba(colour, 0.4 * k + 0.55 * Math.max(reached, flow));
        ctx.fillRect(x - 1, midY - gateH / 2, 2, gateH);
        const below = compact && i === 1;
        const ly = below ? midY + gateH / 2 + 22 : midY - gateH / 2 - 14;
        label(ctx, STAGES[i], x, ly, { align: "center", color: colour, alpha: 0.55 + 0.45 * Math.max(reached, flow), size: labelSize });
      });

      label(ctx, "200+ sources", w * 0.03, top - 22, { color: INK.bone, alpha: 0.45 + 0.4 * smooth(since / 1.2), size: labelSize });

      // Destinations: the route's destination lights with the path; the
      // rest come up with the everyday flow.
      const arrived = smooth((traced - r.length + 4) / 4);
      dests.forEach(([x, y], i) => {
        const onRoute = i === ROUTE_DEST;
        const lit = onRoute ? arrived : flow;
        const colour = onRoute ? mix(INK.bone, INK.tungsten, arrived * (routeAlpha / 0.95)) : INK.bone;
        ctx.fillStyle = rgba(colour, 0.35 * k + 0.55 * lit);
        ctx.fillRect(x - 2, y - 2, 4, 4);
        if (!compact || w > 420) label(ctx, DESTINATIONS[i], x + 10, y + 4, { color: onRoute && arrived > 0 ? colour : INK.bone, alpha: 0.45 + 0.4 * lit, size: compact ? 10 : labelSize });
      });

      // Everyday traffic, once the path has been shown: source curve (0-0.35),
      // lanes (0.35-0.7), destination curve (0.7-1).
      if (flow > 0.01) {
        for (const p of packets) {
          const phase = (t * p.speed + p.offset) % 1;
          let pos;
          if (phase < 0.35) {
            pos = cubicPoint(...sourceCurve(p.source), phase / 0.35);
          } else if (phase < 0.7) {
            const f = (phase - 0.35) / 0.35;
            const y = midY + laneOffsets[p.lane] * Math.sin(Math.PI * Math.min(1, f * 1.15));
            pos = [stageX[0] + (stageX[2] - stageX[0]) * f, y];
          } else {
            pos = cubicPoint(...destCurve(p.dest), (phase - 0.7) / 0.3);
          }
          const edge = phase > 0.96 ? (1 - phase) / 0.04 : phase < 0.04 ? phase / 0.04 : 1;
          ctx.fillStyle = rgba(INK.bone, 0.85 * edge * flow);
          ctx.fillRect(pos[0] - 1.5, pos[1] - 1.5, 3, 3);
        }
      }
    }
  };
}
