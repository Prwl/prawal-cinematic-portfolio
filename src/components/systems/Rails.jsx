import { useEffect, useId, useRef } from "react";
import { camera } from "./camera.js";

// Enrollment and Transactions as payment rails: a track receding into the
// distance through four checkpoints (enroll, verify, screen, settle).
// Transactions travel the rails; at the screen one is turned onto a siding
// and held; the rest settle into the ledger at the far end. The rails are a
// metaphor for the published flow, not an architecture drawing.
const GATES = [
  { name: "Enroll", t: 0.1, from: 1 },
  { name: "Verify", t: 0.34, from: 2 },
  { name: "Screen", t: 0.58, from: 2 },
  { name: "Settle", t: 0.84, from: 3 }
];

// The camera travels down the line with the transaction: the first gate,
// verification and screening with the siding, settlement and the ledger, then
// the whole line.
const SHOTS = {
  wide: [null, [420, 310, 1.15], [725, 325, 1.12], [990, 240, 1.48], null],
  compact: [null, [260, 560, 1.24], [390, 330, 1.14], [440, 200, 1.42], null]
};

function frame(compact) {
  return compact
    ? { w: 600, h: 820, N: [150, 770], F: [470, 150], across: [1, 0.22], width: 92, post: 190, depth: 2.4 }
    : { w: 1200, h: 640, N: [110, 520], F: [1080, 270], across: [0.62, 0.78], width: 96, post: 230, depth: 2.4 };
}

export function Rails({ active, compact, live = true, reduce = false }) {
  const uid = useId();
  const svg = useRef(null);
  const f = frame(compact);
  const shot = SHOTS[compact ? "compact" : "wide"][active];
  const [fx, fy, zoom] = shot ?? [f.w / 2, f.h / 2, 1];
  // Names disappear wholly when their gate leaves a deliberately close shot.
  const labelVisible = (x, y, width = 110) => Math.abs(x - fx) < f.w / (2 * zoom) - width && Math.abs(y - fy) < f.h / (2 * zoom) - 30;

  const len = Math.hypot(...f.across);
  const ax = f.across[0] / len, ay = f.across[1] / len;
  const sc = (t) => 1 / (1 + f.depth * t);
  const p = (t) => (1 - sc(t)) / (1 - sc(1));
  const C = (t) => [f.N[0] + (f.F[0] - f.N[0]) * p(t), f.N[1] + (f.F[1] - f.N[1]) * p(t)];
  const side = (t, k) => { const [x, y] = C(t); const hw = f.width * sc(t) * k; return [x + ax * hw, y + ay * hw]; };
  const path = (t0, t1, k = 0, n = 40) => Array.from({ length: n + 1 }, (_, i) => side(t0 + ((t1 - t0) * i) / n, k)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const end = active >= 3 ? 1 : active >= 2 ? GATES[2].t : active >= 1 ? GATES[0].t + 0.04 : 0;
  const [sx, sy] = side(GATES[2].t, 1);
  const hold = compact ? [sx + 40, sy + 90] : [sx + 60, sy + 110];

  // SMIL runs only while the scene is on screen and motion is allowed.
  useEffect(() => {
    const el = svg.current;
    if (!el?.pauseAnimations) return;
    if (live && !reduce) el.unpauseAnimations();
    else el.pauseAnimations();
  }, [live, reduce]);
  // The held transaction makes its one journey each time the screen is reached.
  useEffect(() => {
    svg.current?.querySelectorAll('animateMotion[begin="indefinite"]').forEach((a) => a.beginElement?.());
  }, [active]);

  return (
    <svg ref={svg} className="machine rails" viewBox={`0 0 ${f.w} ${f.h}`} role="img" aria-labelledby={uid} data-beat={active}>
      <title id={uid}>Conceptual abstraction: transactions travel payment rails through enrollment, identity verification, scoring and fraud screening, and settlement. One flagged transaction is turned onto a siding and held for review.</title>
      <g className="machine__camera" style={camera(f.w, f.h, SHOTS[compact ? "compact" : "wide"][active])}>
      {/* Sleepers and the two rails. */}
      <g className="rails__bed">
        {Array.from({ length: 30 }, (_, i) => {
          const t = i / 29;
          const [x1, y1] = side(t, -1.25), [x2, y2] = side(t, 1.25);
          return <line key={i} className="rails__sleeper" x1={x1} y1={y1} x2={x2} y2={y2} style={{ strokeWidth: 5 * sc(t) }} data-lit={t <= end + 0.001} />;
        })}
        <path className="rails__rail" d={path(0, 1, -1)} />
        <path className="rails__rail" d={path(0, 1, 1)} />
        <path className="rails__run" d={path(0, 1, 0)} pathLength="1" style={{ strokeDashoffset: 1 - p(end) }} />
      </g>

      {/* The siding where a flagged transaction is held for review. */}
      <g className="rails__siding" data-lit={active >= 2}>
        <path className="rails__branch" d={`M${sx.toFixed(1)},${sy.toFixed(1)} C${(sx + 10).toFixed(1)},${(sy + 50).toFixed(1)} ${(hold[0] - 30).toFixed(1)},${hold[1].toFixed(1)} ${hold[0].toFixed(1)},${hold[1].toFixed(1)}`} pathLength="1" />
        <rect className="rails__held" x={hold[0] - 6} y={hold[1] - 6} width="12" height="12" />
        <text className="machine__name" style={{ opacity: active >= 2 && active !== 3 ? 1 : 0 }} x={compact ? hold[0] - 14 : hold[0] + 18} y={compact ? hold[1] + 36 : hold[1] + 5} textAnchor={compact ? "end" : "start"}>Held for review</text>
      </g>

      {/* Checkpoints: portals standing across the rails. */}
      {GATES.map((g) => {
        const s = sc(g.t);
        const a = side(g.t, -1.45), b = side(g.t, 1.45);
        const h = f.post * s;
        const w = Math.max(5, 15 * s);
        return (
          <g key={g.name} className="rails__gate" data-lit={active >= g.from}>
            <polygon className="rails__plane" points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] - h} ${a[0]},${a[1] - h}`} />
            <rect className="rails__return" x={a[0] + w / 2} y={a[1] - h + w * .6} width={w * .6} height={h} />
            <rect className="rails__return" x={b[0] + w / 2} y={b[1] - h + w * .6} width={w * .6} height={h} />
            <rect className="rails__post" x={a[0] - w / 2} y={a[1] - h} width={w} height={h} />
            <rect className="rails__post" x={b[0] - w / 2} y={b[1] - h} width={w} height={h} />
            <line className="rails__lintel" x1={a[0]} y1={a[1] - h} x2={b[0]} y2={b[1] - h} style={{ strokeWidth: w }} />
            <line className="rails__key" x1={a[0]} y1={a[1] - h + w} x2={b[0]} y2={b[1] - h + w} />
            <text className="machine__label" style={{ opacity: labelVisible((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h - 16, 65) ? 1 : 0 }} x={(a[0] + b[0]) / 2} y={Math.min(a[1], b[1]) - h - 16} textAnchor="middle">{g.name}</text>
          </g>
        );
      })}

      {/* The ledger at the end of the line: settled rows. */}
      <g className="rails__ledger" data-lit={active >= 3}>
        {Array.from({ length: 9 }, (_, i) => {
          const [x, y] = C(1);
          return <line key={i} x1={x + 34} y1={y - 96 + i * 10} x2={x + 96} y2={y - 96 + i * 10} style={{ transitionDelay: `${i * 70}ms` }} />;
        })}
      </g>

      {/* Transactions in motion, once there is somewhere to go. */}
      {active >= 1 && !reduce && (
        <g key={active} className="rails__traffic">
          {Array.from({ length: active >= 3 ? 7 : 4 }, (_, i) => {
            const dur = active >= 3 ? 7 : 3.4;
            return (
              <circle key={i} className="rails__packet" r="7">
                <animateMotion dur={`${dur}s`} begin={`-${(i * dur) / (active >= 3 ? 7 : 4)}s`} repeatCount="indefinite" path={path(0, end, 0, 60)} />
                <animate attributeName="r" values={`8;${(8 * sc(end)).toFixed(1)}`} dur={`${dur}s`} begin={`-${(i * dur) / (active >= 3 ? 7 : 4)}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
          {active >= 2 && (
            <circle className="rails__packet rails__packet--held" r={(7 * sc(GATES[2].t)).toFixed(1)}>
              <animateMotion dur="3s" begin="indefinite" fill="freeze" path={`${path(0, GATES[2].t, 0, 40)} L${sx.toFixed(1)},${sy.toFixed(1)} C${(sx + 10).toFixed(1)},${(sy + 50).toFixed(1)} ${(hold[0] - 30).toFixed(1)},${hold[1].toFixed(1)} ${hold[0].toFixed(1)},${hold[1].toFixed(1)}`} />
            </circle>
          )}
        </g>
      )}
      {active >= 1 && reduce && (
        <g className="rails__traffic">
          {[0.2, 0.46, 0.7].filter((t) => t <= end).map((t) => { const [x, y] = C(t); return <circle key={t} className="rails__packet" cx={x} cy={y} r={(8 * sc(t)).toFixed(1)} />; })}
          {active >= 2 && <circle className="rails__packet rails__packet--held" cx={hold[0]} cy={hold[1]} r="5" />}
        </g>
      )}
      </g>
      <text className="machine__figure rails__figure" data-lit={active === 4} x={f.w - 30} y={f.h - 40} textAnchor="end">160K+</text>
    </svg>
  );
}
