import { INK, rgba, mulberry32, label, smooth, easeInOut, mix, cueReporter } from "./common.js";

// Enrollment & Transactions, abstracted: transactions travel a rail through
// enroll, verify, screen and settle gates. Some are held at the screen gate.
//
// The story, told once when the diagram comes into view: the rail is
// dormant; one transaction enters (input) and the rail lights in tungsten
// behind it gate by gate (the meaningful path) until it settles (outcome).
// Then everyday traffic runs, and flagged transactions are held at the screen.
const GATES = ["Enroll", "Verify", "Screen", "Settle"];

const WAKE = 0.8;
const LEAD_AT = 0.6;
const LEAD_FOR = 3.4;
const OUTCOME_AT = LEAD_AT + LEAD_FOR + 0.1;
const SETTLED_AT = OUTCOME_AT + 2.2;
const FLOW_AT = OUTCOME_AT + 0.1;

export function transactionsScene(ctx, width, height, { reduce = false, onCue } = {}) {
  let w = width;
  let h = height;
  let startAt = reduce ? -100 : Infinity;
  const report = cueReporter(onCue);
  const rand = mulberry32(23);
  const CYCLE = 9; // seconds for one transaction to cross
  const items = Array.from({ length: 22 }, (_, i) => ({
    offset: i / 22 + rand() * 0.02,
    flagged: rand() < 0.14,
    lane: rand() * 2 - 1
  }));

  function geometry() {
    const compact = w < 640;
    const railY = h * (compact ? 0.42 : 0.4);
    const heldY = h * 0.78;
    const x0 = w * 0.05;
    const x1 = w * 0.95;
    const gates = GATES.map((_, i) => x0 + (x1 - x0) * (0.16 + i * 0.25));
    return { compact, railY, heldY, x0, x1, gates };
  }

  return {
    start(t) {
      if (startAt === Infinity) startAt = t;
    },
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    draw(t) {
      const { compact, railY, heldY, x0, x1, gates } = geometry();
      const since = t - startAt;
      const k = 0.32 + 0.68 * smooth(since / WAKE);
      const band = compact ? 12 : 22;
      const size = compact ? 11 : 12;
      const flow = smooth((since - FLOW_AT) / 1.4);
      // The lead transaction's position along the rail.
      const leadF = easeInOut((since - LEAD_AT) / LEAD_FOR);
      const leadX = x0 + (x1 - x0) * leadF;
      const leading = since > LEAD_AT - 0.3 && since < OUTCOME_AT + 0.6;
      const trailAlpha = 0.9 - 0.9 * smooth((since - OUTCOME_AT) / 1.8);

      let cue = -1;
      if (since >= SETTLED_AT) cue = GATES.length + 1;
      else if (since >= OUTCOME_AT) cue = GATES.length;
      else if (since >= 0) gates.forEach((g, i) => leadX >= g - 1 && (cue = i));
      report(cue);

      // Rail and held siding.
      ctx.fillStyle = rgba(INK.line, 0.14 * k);
      ctx.fillRect(x0, railY - band, x1 - x0, 1);
      ctx.fillRect(x0, railY + band, x1 - x0, 1);
      ctx.strokeStyle = rgba(INK.line, 0.14 * k);
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(gates[2], railY + band);
      ctx.lineTo(gates[2] + (compact ? 12 : 24), heldY);
      ctx.lineTo(gates[3] - 10, heldY);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, "Held for review", gates[2] + (compact ? 12 : 24), heldY + 20, { alpha: 0.6 + 0.4 * flow, size: compact ? 10 : size });

      // The meaningful path: the rail lights behind the lead transaction.
      if (leadF > 0 && trailAlpha > 0.01) {
        ctx.fillStyle = rgba(INK.tungsten, trailAlpha);
        ctx.fillRect(x0, railY - 0.75, leadX - x0, 1.5);
      }

      // Everyday traffic.
      const flash = gates.map(() => 0);
      const positions = flow > 0.01 ? items.map((item) => {
        const phase = (t / CYCLE + item.offset) % 1;
        let x = x0 + (x1 - x0) * phase;
        let y = railY + item.lane * band * 0.55;
        let held = false;
        if (item.flagged && x > gates[2]) {
          // Diverted at the screen gate, then parked on the siding.
          const d = (x - gates[2]) / (w * 0.08);
          const f = smooth(d);
          x = gates[2] + Math.min(x - gates[2], (compact ? 12 : 24) + (gates[3] - gates[2] - 40) * smooth(d / 3));
          y = railY + (heldY - railY) * f;
          held = true;
        }
        gates.forEach((g, gi) => {
          const dist = Math.abs(x - g);
          if (!held || gi < 3) flash[gi] = Math.max(flash[gi], Math.max(0, 1 - dist / 22) * flow);
        });
        return { x, y, held, phase };
      }) : [];

      // Gates: warm while the lead passes, then bone, flashing with traffic.
      gates.forEach((g, i) => {
        const gh = band * 3.2;
        const reached = leadF > 0 ? smooth((leadX - g) / 6) : 0;
        const passing = since < OUTCOME_AT ? reached * (1 - smooth((leadX - g - (x1 - x0) * 0.1) / ((x1 - x0) * 0.08))) : 0;
        const colour = mix(INK.bone, INK.tungsten, passing);
        const lit = Math.max(reached, flow);
        ctx.fillStyle = rgba(colour, 0.35 * k + 0.25 * lit + 0.35 * Math.max(passing, flash[i]));
        ctx.fillRect(g - 1, railY - gh / 2, 2, gh);
        label(ctx, GATES[i], g, railY - gh / 2 - 14, { align: "center", color: colour, alpha: 0.55 + 0.45 * lit, size });
      });

      // Outcome: settled.
      const settled = since >= OUTCOME_AT - 0.2 ? 1 - smooth((since - OUTCOME_AT - 1.2) / 1.2) : 0;
      label(ctx, "Settled", x1, railY + band + 22, {
        align: "right",
        color: mix(INK.bone3, INK.tungsten, settled),
        alpha: 0.7 + 0.3 * Math.max(settled, flow),
        size: compact ? 10 : size
      });

      if (leading) {
        const fade = since < LEAD_AT ? smooth((since - LEAD_AT + 0.3) / 0.3) : 1 - smooth((since - OUTCOME_AT) / 0.6);
        ctx.fillStyle = rgba(INK.tungsten, fade);
        ctx.fillRect(leadX - 4.5, railY - 2, 9, 4);
      }

      for (const p of positions) {
        const edge = p.phase > 0.97 ? (1 - p.phase) / 0.03 : p.phase < 0.02 ? p.phase / 0.02 : 1;
        if (p.held) {
          ctx.fillStyle = rgba(INK.tungsten, 0.95 * edge * flow);
          ctx.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
        } else {
          ctx.fillStyle = rgba(INK.bone, 0.9 * edge * flow);
          ctx.fillRect(p.x - 3, p.y - 1, 6, 2);
        }
      }
    }
  };
}
