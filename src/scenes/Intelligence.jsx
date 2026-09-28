import { intelligence, pillars, practice } from "../data/intelligence.js";
import { documents } from "../data/contact.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import "../styles/intelligence.css";

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
  const { ref, reduce, active, select } = useStory(5, 4);
  const compact = useMediaQuery("(max-width: 699px)");
  const complete = active === 4;
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
  const core = box(-0.55, -0.55, 0.55, 0.55, 0, 2.9);
  // Shadows fall along +x in plan: right and down on screen, from the one sun.
  const shadow = (x0, y0, x1, y1, len) => pts([[x0, y0], [x1 + len, y0], [x1 + len, y1], [x0, y1]]);

  return (
    <section id="intelligence" className="chapter intelligence bleed" aria-labelledby="intelligence-title">
      <Horizon />
      <div ref={ref} className="story-run assembly" data-reduced={reduce}>
        <div className="story-sticky wrap">
          <h2 id="intelligence-title" className="scene-heading">AI moves. Judgment stays.</h2>
          <span className="assembly__light stage-bleed" aria-hidden="true" data-complete={complete} />
          <div className="assembly__model">
            <svg viewBox={compact ? "0 0 600 560" : "-90 0 1180 560"} role="img" aria-labelledby="assembly-title" data-complete={complete}>
              <title id="assembly-title">AI Engineering Leadership Framework. Four principles are set around engineering judgment: clarify leverage, protect judgment, operationalize adoption, prove outcomes. A conceptual presentation of the framework.</title>
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
                      <polygon className="face-left" points={core.left} />
                      <polygon className="face-right" points={core.right} />
                      <polygon className="face-top" points={core.top} />
                      <text x={compact ? cx : at(0.55, -0.55, 2.4)[0] + 18} y={compact ? at(0, 0, 2.9)[1] - 34 : at(0.55, -0.55, 2.4)[1]} textAnchor={compact ? "middle" : "start"} className="assembly__core-name">Engineering judgment</text>
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
                    <polygon className="face-left" points={b.left} />
                    <polygon className="face-right" points={b.right} />
                    <polygon className="face-top" points={b.top} />
                    <text className="assembly__num" x={lx[0] + nudge} y={lx[1] - 22} textAnchor={anchor}>{String(k + 1).padStart(2, "0")}</text>
                    <text className="assembly__name" x={lx[0] + nudge} y={lx[1] - 44} textAnchor={anchor}>{pillars[k].title}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="assembly__caption" aria-live="polite" aria-atomic="true">
            <div key={active} className="beat">
              <h3>{complete ? "One coherent model." : pillars[active].title}</h3>
              <p>{complete ? "AI Engineering Leadership Framework" : short[active]}</p>
            </div>
          </div>
          <div className="scene-footer">
            <StoryControls labels={["Leverage", "Judgment", "Adoption", "Outcomes", "Full model"]} active={active} onSelect={select} label="Framework principles" />
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
