import { useId, useMemo } from "react";
import { mulberry32 } from "../../lib/random.js";

// The Data Refinery as a machine that turns disorder into order. Two hundred
// sources arrive as loose, uneven streams; Connectors gathers them; three
// Trifacta recipe screens straighten them into a few governed lanes; Data
// Serve fans them out to six destinations. Positions tell the story, they are
// not an architecture drawing.
//
// Geometry lives in flow space: u runs along the flow (0 to 1200), v across
// it (0 to 640). A wide frame draws u left to right; an upright phone frame
// turns the machine so the flow runs top to bottom.
const DESTINATIONS = ["AWS S3", "GCP", "Azure ADLS", "Snowflake", "SFTP", "Analytics"];
const SOURCES = 28;
const LANES = 6;
const A = 400; // Connectors
const SCREENS = [575, 625, 675]; // Trifacta recipes
const S = 820; // Data Serve
const D = 1030; // destinations

function frame(compact) {
  return compact
    ? { w: 600, h: 820, P: (u, v) => [30 + v * (540 / 640), 20 + u * (780 / 1200)] }
    : { w: 1200, h: 640, P: (u, v) => [u, v] };
}

export function Refinery({ active, compact }) {
  const uid = useId();
  const hatch = `${uid.replace(/[^a-zA-Z0-9_-]/g, "")}-hatch`;
  const { w, h, P } = frame(compact);
  const labelAt = (u, v) => {
    const [x, y] = compact ? P(u, 150) : P(u, v);
    return compact ? { x, y: y + 7, textAnchor: "end" } : { x, y, textAnchor: "middle" };
  };
  const pt = (u, v) => P(u, v).map((n) => n.toFixed(1)).join(",");
  const poly = (pts) => pts.map(([u, v]) => pt(u, v)).join(" ");

  // Loose streams: each source wanders in from the edge on its own curve.
  const streams = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: SOURCES }, (_, i) => {
      const v0 = 40 + (i / (SOURCES - 1)) * 560 + (rand() - 0.5) * 16;
      const u0 = 24 + rand() * 150;
      const port = 190 + (i % 8) * (260 / 7);
      const c1 = [u0 + 90 + rand() * 60, v0 + (rand() - 0.5) * 160];
      const c2 = [A - 90 - rand() * 50, port + (rand() - 0.5) * 120];
      return { start: [u0, v0], d: [[u0, v0], c1, c2, [A - 12, port]], delay: (rand() * 1.6).toFixed(2) };
    });
  }, []);
  const lanes = Array.from({ length: LANES }, (_, k) => 230 + k * 36);
  const dests = DESTINATIONS.map((name, j) => ({ name, v: 70 + j * 100 }));
  const curve = ([p0, c1, c2, p1]) => `M${pt(...p0)} C${pt(...c1)} ${pt(...c2)} ${pt(...p1)}`;

  const lit = (from) => active >= from;
  return (
    <svg className="machine refinery" viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={uid} data-beat={active}>
      <title id={uid}>Conceptual abstraction: many loose source streams converge into Connectors, are straightened by Trifacta recipe screens into a few governed lanes, and Data Serve fans them out to AWS S3, GCP, Azure ADLS, Snowflake, SFTP and analytics.</title>
      <text className="machine__figure" data-lit={lit(1)} x={compact ? 570 : 34} y={compact ? 96 : 612} textAnchor={compact ? "end" : "start"}>200+</text>

      {/* Loose streams, and the flow along them once lit. */}
      <g className="machine__group" data-lit={lit(1)}>
        {streams.map((s, i) => (
          <g key={i}>
            <path className="machine__wire" d={curve(s.d)} />
            <path className="machine__flow" d={curve(s.d)} style={{ animationDelay: `-${s.delay}s` }} />
            <rect className="machine__source" x={P(...s.start)[0] - 3} y={P(...s.start)[1] - 3} width="6" height="6" />
          </g>
        ))}
      </g>

      {/* Connectors: the intake that gathers every stream. */}
      <g className="machine__stage" data-lit={lit(1)}>
        <polygon className="machine__slab" points={poly([[A - 12, 160], [A + 12, 160], [A + 12, 480], [A - 12, 480]])} />
        {Array.from({ length: 8 }, (_, i) => <line key={i} className="machine__port" x1={P(A - 12, 190 + i * (260 / 7))[0]} y1={P(A - 12, 190 + i * (260 / 7))[1]} x2={P(A + 12, 190 + i * (260 / 7))[0]} y2={P(A + 12, 190 + i * (260 / 7))[1]} />)}
        <text className="machine__label" {...labelAt(A, 130)}>Connectors</text>
      </g>

      {/* Governed lanes through the recipe screens to Data Serve. */}
      <g className="machine__group" data-lit={lit(2)}>
        {lanes.map((v, k) => (
          <g key={k}>
            <path className="machine__wire machine__wire--lane" d={`M${pt(A + 12, 190 + (k + 1) * 37)} C${pt(A + 80, 190 + (k + 1) * 37)} ${pt(SCREENS[0] - 70, v)} ${pt(SCREENS[0] - 20, v)} L${pt(S - 12, v)}`} />
            <path className="machine__flow machine__flow--lane" d={`M${pt(A + 12, 190 + (k + 1) * 37)} C${pt(A + 80, 190 + (k + 1) * 37)} ${pt(SCREENS[0] - 70, v)} ${pt(SCREENS[0] - 20, v)} L${pt(S - 12, v)}`} style={{ animationDelay: `-${k * 0.27}s` }} />
          </g>
        ))}
      </g>
      <g className="machine__stage" data-lit={lit(2)}>
        {SCREENS.map((u, i) => (
          <g key={u} className="machine__screen" style={{ "--step": i }}>
            <polygon className="machine__lattice" points={poly([[u - 5, 200], [u + 5, 200], [u + 5, 440], [u - 5, 440]])} style={{ fill: `url(#${hatch})` }} />
          </g>
        ))}
        <text className="machine__label" {...labelAt(625, 170)}>{compact ? "Recipes" : "Trifacta recipes"}</text>
      </g>

      {/* Data Serve and the fan-out to destinations. */}
      <g className="machine__stage" data-lit={lit(3)}>
        <polygon className="machine__slab" points={poly([[S - 12, 210], [S + 12, 210], [S + 12, 430], [S - 12, 430]])} />
        <text className="machine__label" {...labelAt(S, 180)}>Data Serve</text>
      </g>
      <g className="machine__group" data-lit={lit(3)}>
        {dests.map(({ name, v }, j) => {
          const d = `M${pt(S + 12, 250 + j * 28)} C${pt(S + 110, 250 + j * 28)} ${pt(D - 110, v)} ${pt(D - 8, v)}`;
          const [x, y] = P(D, v);
          return (
            <g key={name}>
              <path className="machine__wire" d={d} />
              <path className="machine__flow machine__flow--out" d={d} style={{ animationDelay: `-${j * 0.31}s` }} />
              <rect className="machine__dest" x={x - 5} y={y - 5} width="10" height="10" />
              <text className="machine__name" x={compact ? x : x + 20} y={compact ? y + (j % 2 ? 58 : 32) : y + 5} textAnchor={compact ? "middle" : "start"}>{name}</text>
            </g>
          );
        })}
      </g>
      <defs>
        <pattern id={hatch} width="10" height="7" patternUnits="userSpaceOnUse">
          <rect width="10" height="7" fill="var(--machine-slab)" />
          <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="var(--machine-line)" />
        </pattern>
      </defs>
    </svg>
  );
}
