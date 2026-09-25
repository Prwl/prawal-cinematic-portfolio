import { INK, rgba, mulberry32, smooth, cueReporter } from "./common.js";

// Taxonomy, abstracted: a sheet of fields where each depends on fields to its
// left or above. Editing one lights every dependent cell in turn.
//
// The story, told once when the diagram comes into view: the sheet is dark;
// it comes up row by row (the generated sheet); one field is edited (input)
// and the dependency links carry the change through the sheet in tungsten
// (the meaningful path) until every dependent field has settled (outcome).
// Afterwards other edits keep cascading at the same quiet rhythm.
const COLS = 7;
const ROWS = 7;
const PERIOD = 3.2;
const STEP = 0.12;

const SHEET_FOR = 0.9;
const EDIT_AT = 1.1;

export function taxonomyScene(ctx, width, height, { reduce = false, onCue } = {}) {
  let w = width;
  let h = height;
  let startAt = reduce ? -100 : Infinity;
  const report = cueReporter(onCue);
  const rand = mulberry32(5);
  // Dependency graph: each cell may depend on the cell to its left and/or above.
  const deps = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const list = [];
      if (c > 0 && rand() < 0.72) list.push([r, c - 1]);
      if (r > 0 && rand() < 0.42) list.push([r - 1, c]);
      deps.push(list);
    }
  }
  const dependents = deps.map(() => []);
  deps.forEach((list, idx) => list.forEach(([r, c]) => dependents[r * COLS + c].push(idx)));

  // Precompute cascades (breadth-first depth) for a few edit roots, and the
  // links each cascade travels along.
  const roots = [0, COLS, COLS * 2 + 1, COLS * 3, COLS * 4 + 1, 1, COLS * 5];
  const cascades = roots.map((root) => {
    const depth = new Map([[root, 0]]);
    const links = [];
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift();
      for (const next of dependents[cur]) {
        if (!depth.has(next)) {
          depth.set(next, depth.get(cur) + 1);
          links.push([cur, next, depth.get(cur)]);
          queue.push(next);
        }
      }
    }
    return { root, depth, links, span: Math.max(...depth.values()) * STEP + 0.25 };
  });
  // The first story settles once its whole cascade has lit.
  const SETTLE_AT = EDIT_AT + cascades[0].span + 0.9;
  const SETTLED_AT = SETTLE_AT + 1.6;

  return {
    start(t) {
      if (startAt === Infinity) startAt = t;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    draw(t) {
      const since = t - startAt;
      const pad = Math.min(w, h) * 0.08;
      const cellW = (w - pad * 2) / COLS;
      const cellH = (h - pad * 2) / ROWS;
      const gap = Math.max(3, cellW * 0.08);
      const centre = (idx) => [pad + (idx % COLS) * cellW + cellW / 2, pad + Math.floor(idx / COLS) * cellH + cellH / 2];

      // Which edit is playing, and how far into it: the first edit belongs to
      // the story; later ones follow on the steady rhythm.
      let cascade = null;
      let local = 0;
      if (since >= EDIT_AT) {
        const after = since - EDIT_AT;
        const cycle = after < SETTLE_AT - EDIT_AT + 1.2 ? 0 : 1 + Math.floor((after - (SETTLE_AT - EDIT_AT + 1.2)) / PERIOD);
        local = cycle === 0 ? after : (after - (SETTLE_AT - EDIT_AT + 1.2)) % PERIOD;
        cascade = cascades[cycle % cascades.length];
      }

      let cue = -1;
      if (since >= SETTLED_AT) cue = 3;
      else if (since >= EDIT_AT) cue = 1;
      else if (since >= 0) cue = 0;
      report(cue);

      const activation = (idx) => {
        if (!cascade || !cascade.depth.has(idx)) return 0;
        const s = local - (cascade.depth.get(idx) * STEP + 0.25);
        return s > 0 ? Math.max(0, 1 - s / 1.6) : 0;
      };

      // Faint dependency ticks between neighbouring cells: the dormant graph.
      const sheet = (row) => smooth((since - (row / ROWS) * SHEET_FOR) / 0.35);
      ctx.lineWidth = 1;
      deps.forEach((list, idx) => {
        const [cx, cy] = centre(idx);
        for (const [dr, dc] of list) {
          const [sx, sy] = centre(dr * COLS + dc);
          ctx.strokeStyle = rgba(INK.line, 0.04 + 0.08 * sheet(Math.floor(idx / COLS)));
          ctx.beginPath();
          ctx.moveTo(sx + (cx - sx) * 0.42, sy + (cy - sy) * 0.42);
          ctx.lineTo(sx + (cx - sx) * 0.58, sy + (cy - sy) * 0.58);
          ctx.stroke();
        }
      });

      for (let r = 0; r < ROWS; r++) {
        const up = sheet(r);
        for (let c = 0; c < COLS; c++) {
          const idx = r * COLS + c;
          const x = pad + c * cellW + gap / 2;
          const y = pad + r * cellH + gap / 2;
          const cw = cellW - gap;
          const ch = cellH - gap;
          const lit = activation(idx);
          ctx.fillStyle = rgba(INK.line, 0.015 + 0.025 * up + 0.16 * lit);
          ctx.fillRect(x, y, cw, ch);
          ctx.strokeStyle = rgba(INK.line, 0.05 + 0.07 * up + 0.5 * lit);
          ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
          // A short value bar inside each cell, like a field's content.
          ctx.fillStyle = rgba(INK.bone, 0.08 + 0.12 * up + 0.6 * lit);
          ctx.fillRect(x + cw * 0.14, y + ch / 2 - 1, cw * (0.3 + ((idx * 37) % 40) / 100), 2);
        }
      }

      if (!cascade) return;

      // The meaningful path: the change travels along each dependency link in
      // turn, in tungsten, and the link cools once the field it feeds has lit.
      ctx.lineWidth = 1.5;
      for (const [from, to, d] of cascade.links) {
        const s = local - (d * STEP + 0.25);
        if (s <= 0) continue;
        const draw = smooth(s / STEP);
        const cool = 1 - smooth((s - 0.5) / 1.3);
        if (cool <= 0.01) continue;
        const [ax, ay] = centre(from);
        const [bx, by] = centre(to);
        ctx.strokeStyle = rgba(INK.tungsten, 0.85 * cool);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (bx - ax) * draw, ay + (by - ay) * draw);
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // The edited field.
      if (local > 0.05 && local < 2.2) {
        const idx = cascade.root;
        const x = pad + (idx % COLS) * cellW + gap / 2;
        const y = pad + Math.floor(idx / COLS) * cellH + gap / 2;
        ctx.strokeStyle = rgba(INK.tungsten, 1 - smooth((local - 1.6) / 0.6));
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellW - gap - 2, cellH - gap - 2);
        ctx.lineWidth = 1;
      }
    }
  };
}
