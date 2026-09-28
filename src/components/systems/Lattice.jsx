import { useId } from "react";

// Taxonomy as a lattice of campaign fields seen in isometric. One field is
// edited and lifts; the change travels down its dependencies, a wave of
// fields rising in order of distance; the fields that make up the name drop
// their parts into one campaign identifier. An abstraction of the published
// behaviour, not the sheet itself.
const COLS = 6;
const ROWS = 5;
const EDITED = "1,0";
const DEPENDS = [
  ["1,0", "2,0"], ["1,0", "1,1"],
  ["2,0", "3,0"], ["2,0", "2,1"],
  ["1,1", "1,2"], ["1,1", "2,2"],
  ["3,0", "4,1"], ["2,1", "3,2"], ["1,2", "1,3"], ["2,2", "3,3"],
  ["4,1", "5,2"], ["3,2", "4,3"], ["1,3", "2,4"]
];
// The fields whose values compose the identifier, in reading order.
const KEYS = ["1,0", "5,2", "4,3", "3,3", "2,4"];

// Distance from the edited field, for the order of the wave.
const depth = { [EDITED]: 0 };
for (let changed = true; changed; ) {
  changed = false;
  for (const [a, b] of DEPENDS) if (a in depth && !(b in depth)) { depth[b] = depth[a] + 1; changed = true; }
}

function frame(compact) {
  return compact
    ? { w: 600, h: 560, tw: 50, th: 26, O: [300, 60], slab: 9, bar: { x: 70, y: 440, w: 460, h: 40 } }
    : { w: 1200, h: 640, tw: 64, th: 33, O: [600, 70], slab: 11, bar: { x: 370, y: 520, w: 460, h: 42 } };
}

export function Lattice({ active, compact }) {
  const uid = useId();
  const f = frame(compact);
  const at = (c, r) => [f.O[0] + (c - r) * f.tw, f.O[1] + (c + r) * f.th];
  const top = (x, y) => `${x},${y - f.th} ${x + f.tw},${y} ${x},${y + f.th} ${x - f.tw},${y}`;
  const left = (x, y) => `${x - f.tw},${y} ${x},${y + f.th} ${x},${y + f.th + f.slab} ${x - f.tw},${y + f.slab}`;
  const right = (x, y) => `${x + f.tw},${y} ${x},${y + f.th} ${x},${y + f.th + f.slab} ${x + f.tw},${y + f.slab}`;
  const seg = f.bar.w / KEYS.length;
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([c, r]);

  const state = (key) => {
    if (key === EDITED) return active >= 1 ? "edited" : "dormant";
    if (key in depth && active >= 2) return KEYS.includes(key) && active >= 3 ? "key" : "resolved";
    return "dormant";
  };

  return (
    <svg className="machine lattice" viewBox={`0 0 ${f.w} ${f.h}`} role="img" aria-labelledby={uid} data-beat={active}>
      <title id={uid}>Conceptual abstraction: a lattice of campaign fields. One field is edited, its dependent fields update in order of distance, and the key fields compose a single campaign identifier.</title>
      {cells.map(([c, r]) => {
        const key = `${c},${r}`;
        const [x, y] = at(c, r);
        const s = state(key);
        return (
          <g key={key} className="lattice__cell" data-state={s} style={{ "--wave": depth[key] ?? 0 }}>
            <polygon className="lattice__left" points={left(x, y)} />
            <polygon className="lattice__right" points={right(x, y)} />
            <polygon className="lattice__top" points={top(x, y)} />
          </g>
        );
      })}
      {DEPENDS.map(([a, b]) => {
        const [x1, y1] = at(...a.split(",").map(Number));
        const [x2, y2] = at(...b.split(",").map(Number));
        return <path key={a + b} className="lattice__edge" data-lit={active >= 2} d={`M${x1},${y1 - 14} L${x2},${y2 - 14}`} pathLength="1" style={{ "--wave": depth[a] }} />;
      })}
      {(() => { const [x, y] = at(1, 0); return <text className="machine__name lattice__note" data-lit={active >= 1} x={x - f.tw - 12} y={y - 18} textAnchor="end">Edited field</text>; })()}

      {/* The identifier: each key field drops its part into place. */}
      <g className="lattice__identifier" data-lit={active >= 3}>
        {KEYS.map((key, i) => {
          const [x, y] = at(...key.split(",").map(Number));
          const bx = f.bar.x + seg * i + seg / 2;
          return <path key={key} className="lattice__drop" d={`M${x},${y - 14 - 22} C${x},${f.bar.y - 60} ${bx},${f.bar.y - 80} ${bx},${f.bar.y}`} pathLength="1" style={{ "--n": i }} />;
        })}
        <rect className="lattice__bar" x={f.bar.x} y={f.bar.y} width={f.bar.w} height={f.bar.h} />
        {KEYS.map((key, i) => (
          <rect key={key} className="lattice__part" x={f.bar.x + seg * i + 5} y={f.bar.y + 5} width={seg - 10} height={f.bar.h - 10} style={{ "--n": i }} />
        ))}
        <text className="machine__label" x={f.bar.x + f.bar.w / 2} y={f.bar.y + f.bar.h + 32} textAnchor="middle">Campaign identifier</text>
      </g>
    </svg>
  );
}
