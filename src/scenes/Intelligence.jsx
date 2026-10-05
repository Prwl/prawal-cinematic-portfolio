import { useId } from "react";
import { camera } from "../components/systems/camera.js";
import { intelligence, pillars, practice } from "../data/intelligence.js";
import { documents } from "../data/contact.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import "../styles/intelligence.css";

const FRAMEWORK_CUT = [0, 1, 2, 3, 4, 4, 4];

const short = ["Remove delivery friction.", "Keep engineering accountable.", "Make adoption repeatable.", "Measure stakeholder-visible results."];
// Where each principle is set around the core, in plan (x, y), and the
// direction it arrives from.
const SEATS = [[-2.3, 0], [0, -2.3], [2.3, 0], [0, 2.3]];
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);

/**
 * The model takes shape. A graphite core, engineering judgment, stands on a
 * pale plinth. Each principle is a stone block that slides in along its own
 * axis and locks against the core; a channel is cut between them as it
 * joins. At the last beat a ring binds all four and the model is whole.
 */
export function Intelligence() {
  const { ref, reduce, active, confirmed, select } = useStory(5, 4, FRAMEWORK_CUT, 1100);
  const compact = useMediaQuery("(max-width: 699px)");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const complete = active === 4;
  const confirmedComplete = confirmed === 4;
  const s = compact ? 46 : 70;
  const [cx, cy] = compact ? [300, 300] : [500, 290];
  const at = (x, y, z = 0) => [cx + (x - y) * COS * s, cy + (x + y) * SIN * s - z * s];
  const pts = (list) => list.map((p) => at(...p).map((n) => n.toFixed(1)).join(",")).join(" ");
  // A box's three visible faces: top, left (toward -x... +y) and right.
  const box = (x0, y0, x1, y1, z0, z1) => ({
    top: pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
    left: pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]),
    right: pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])
  });
  const order = [1, 0, "core", 2, 3];
  const plinth = box(-3.4, -3.4, 3.4, 3.4, -0.45, 0);
  const core = box(-0.55, -0.55, 0.55, 0.55, 0, 3.15);
  // Shadows fall along +x in plan: right and down on screen, from the one sun.
  const shadow = (x0, y0, x1, y1, len) => pts([[x0, y0], [x1 + len, y0], [x1 + len, y1], [x0, y1]]);

  return (
    <section id="intelligence" className="chapter intelligence bleed" aria-labelledby="intelligence-title">
      <Horizon />
      <div ref={ref} className="story-run assembly" data-reduced={reduce} data-complete={complete}>
        <div className="story-sticky wrap">
          <h2 id="intelligence-title" className="scene-heading">AI moves. Judgment stays.</h2>
          <span className="assembly__light stage-bleed" aria-hidden="true" data-complete={complete} />
          <div className="assembly__model" data-complete={complete}>
            <svg viewBox={compact ? "0 -30 600 650" : "-90 -40 1180 680"} role="img" aria-labelledby="assembly-title" data-complete={complete}>
              <title id="assembly-title">AI Engineering Leadership Framework. Four principles are set around engineering judgment: clarify leverage, protect judgment, operationalize adoption, prove outcomes. A conceptual presentation of the framework.</title>
              <defs>
                <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6f8f2" /><stop offset="1" stopColor="#cad5c8" /></linearGradient>
                <linearGradient id={`${uid}-left`} x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stopColor="#d8e1d3" /><stop offset="1" stopColor="#a2b39f" /></linearGradient>
                <linearGradient id={`${uid}-right`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9daf9e" /><stop offset="1" stopColor="#708674" /></linearGradient>
                <linearGradient id={`${uid}-core`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#586265" /><stop offset=".45" stopColor="#394346" /><stop offset="1" stopColor="#232c2e" /></linearGradient>
              </defs>
              <g className="assembly__camera" style={camera(compact ? 600 : 1000, 560, compact ? [[290, 235, .88], [330, 235, .88], [325, 300, .88], [275, 290, .88], [300, 270, 1.04]][active] : [[450, 210, .88], [555, 210, .88], [550, 245, .88], [455, 245, .88], [500, 260, 1.12]][active])}>
              <g className="assembly__plinth">
                <polygon className="face-left" points={plinth.left} />
                <polygon className="face-right" points={plinth.right} />
                <polygon className="face-top" points={plinth.top} />
              </g>
              {/* Channels cut from each seat to the core as its principle joins. */}
              {SEATS.map(([x, y], i) => (
                <path key={i} className="assembly__channel" data-cut={i < active || complete} d={`M${at(x * 0.62, y * 0.62)} L${at(x * 0.26, y * 0.26)}`} pathLength="1" />
              ))}
              <ellipse className="assembly__ring" data-cut={complete} cx={cx} cy={cy} rx={2.3 * s * COS * Math.SQRT2} ry={2.3 * s * SIN * Math.SQRT2} pathLength="1" />
              {order.map((k) => {
                if (k === "core") {
                  return (
                    <g key="core" className="assembly__core">
                      <polygon className="assembly__shadow" points={shadow(-0.55, -0.55, 0.55, 0.55, 2.4)} />
                      <polygon className="face-left" points={core.left} style={{ fill: `url(#${uid}-core)` }} />
                      <polygon className="face-right" points={core.right} />
                      <polygon className="face-top" points={core.top} />
                      <text x={cx} y={at(0, 0, 3.15)[1] - (compact ? 45 : 58)} textAnchor="middle" className="assembly__core-name">Engineering judgment</text>
                    </g>
                  );
                }
                const [x, y] = SEATS[k];
                const b = box(x - 0.62, y - 0.62, x + 0.62, y + 0.62, 0, 1.05 + k * 0.1);
                const [ox, oy] = at(x * 2.2, y * 2.2);
                const [hx, hy] = at(x, y);
                const lx = at(x * 1.18, y * 1.18, 1.05 + k * 0.1);
                const anchor = x - y < 0 ? "end" : "start";
                const nudge = x - y < 0 ? -34 : 34;
                return (
                  <g key={k} className="assembly__block" data-state={k < active || complete ? "set" : k === active ? "arriving" : "away"} style={{ "--ox": `${(ox - hx).toFixed(1)}px`, "--oy": `${(oy - hy).toFixed(1)}px` }}>
                    <polygon className="assembly__shadow" points={shadow(x - 0.62, y - 0.62, Math.min(x + 0.62, 2.9), y + 0.62, Math.min(0.8, 3.4 - x - 0.62))} />
                    <polygon className="face-left" points={b.left} style={{ fill: `url(#${uid}-left)` }} />
                    <polygon className="face-right" points={b.right} style={{ fill: `url(#${uid}-right)` }} />
                    <polygon className="face-top" points={b.top} style={{ fill: `url(#${uid}-top)` }} />
                    <text className="assembly__num" x={lx[0] + nudge} y={lx[1] - 18} textAnchor={anchor}>{String(k + 1).padStart(2, "0")}</text>
                    <text className="assembly__name" x={lx[0] + nudge} y={lx[1] - 64} textAnchor={anchor}>{pillars[k].title}</text>
                    <text className="assembly__line" x={lx[0] + nudge} y={lx[1] - 40} textAnchor={anchor}>{short[k]}</text>
                  </g>
                );
              })}
              </g>
            </svg>
          </div>
          <div className="assembly__caption" data-complete={confirmedComplete} aria-live="polite" aria-atomic="true">
            <div key={confirmed} className="beat">
              <h3>{confirmedComplete ? "One coherent model." : pillars[confirmed].title}</h3>
              <p>{confirmedComplete ? "AI Engineering Leadership Framework" : short[confirmed]}</p>
            </div>
          </div>
          <div className="scene-footer">
            <StoryControls labels={["Leverage", "Judgment", "Adoption", "Outcomes", "Full model"]} active={confirmed} onSelect={select} label="Framework principles" />
            <div className="assembly__links">
              <DetailLayer title="AI Engineering Leadership Framework" label="Framework and practice" chapter="V">
                <blockquote className="detail-quote"><p>“{intelligence.quote}”</p></blockquote>
                <p>{intelligence.standfirst}</p>
                {pillars.map((p, i) => <article key={p.title} className="detail-role"><p className="detail-role__year num">{String(i + 1).padStart(2, "0")}</p><div><h3>{p.title}</h3><p>{p.detail}</p></div></article>)}
                <article><h3>In practice</h3><ul>{practice.map((p) => <li key={p.what}><strong>{p.when} · {p.kind}</strong><p>{p.what}</p></li>)}</ul></article>
                <a className="action action--ghost" href={documents.framework.href} download={documents.framework.filename}>{documents.framework.label}</a>
              </DetailLayer>
              <a className="assembly__download text-link" href={documents.framework.href} download={documents.framework.filename}>Download the framework</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
