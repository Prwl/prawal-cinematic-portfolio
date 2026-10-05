import { risers } from "../data/experience.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/evolution.css";

// Each step rises higher than the last: the weight a role carried, made into
// stone. Rises in cqh, cumulative to each tread.
// The two leadership arrivals hold longest; the earlier steps keep the climb.

const RISE = [13, 15, 17.5, 20.5, 24, 28];
const TOP = RISE.map((_, i) => RISE.slice(0, i + 1).reduce((a, b) => a + b, 0));

/**
 * The ascent. A stone staircase seen from below and to the left; the camera
 * climbs it one step per beat. The step on stage takes the light and its
 * year is cut into its face; the steps already climbed fall away below the
 * frame, the ones still ahead rise out of it into haze.
 */
export function Evolution() {
  const { ref, reduce, active, confirmed, select } = useStory(risers.length, risers.length - 1);
  const role = risers[confirmed];
  return (
    <section id="evolution" className="chapter evolution bleed" aria-labelledby="evolution-title">
      <Horizon />
      <div ref={ref} className="story-run ascent" data-complete={active === risers.length - 1} data-reduced={reduce}>
        <div className="story-sticky wrap">
          <h2 id="evolution-title" className="scene-heading">Each step carried more weight.</h2>
          <div className="scene-band">
          <div className="ascent__space stage-bleed" aria-hidden="true">
            <span className="ascent__ground" />
            <div className="ascent__stair" style={{ "--x": active, "--top": TOP[active] }}>
              {risers.map((r, i) => (
                <div key={r.id} className="ascent__step" data-state={i < active ? "passed" : i === active ? "current" : "ahead"} style={{ "--i": i, "--t": TOP[i], "--d": Math.abs(i - active) }}>
                  <span className="ascent__front"><span className="ascent__year">{r.years}</span><span className="ascent__scope">{r.scope}</span></span>
                  <span className="ascent__riser" />
                  <span className="ascent__tread" />
                </div>
              ))}
            </div>
          </div>
          </div>
          <div className="ascent__caption" aria-live="polite" aria-atomic="true">
            <div key={confirmed} className="beat">
              <h3>{role.title}</h3>
              <p>{role.org}</p>
              <p className="ascent__detail">{role.scope}</p>
              <p className="label">{role.period}</p>
            </div>
          </div>
          <div className="scene-footer">
            <StoryControls labels={risers.map((r) => r.years)} active={confirmed} onSelect={select} label="Career stages" />
            <DetailLayer title="The complete career" label="Roles and responsibilities" chapter="II">
              <ol className="evidence-ascent" aria-label="Responsibility progression">{risers.map((r, i) => <li key={r.id} style={{ "--step": i }}><span>{r.years}</span><strong>{r.title}</strong></li>)}</ol>
              {risers.map((r) => (
                <article key={r.id} className="detail-role">
                  <p className="detail-role__year num">{r.years}</p>
                  <div><h3>{r.title}</h3><p className="label">{r.period}</p><p>{r.org} · {r.scope}</p><ul>{r.points.map((p) => <li key={p}>{p}</li>)}</ul></div>
                </article>
              ))}
            </DetailLayer>
          </div>
        </div>
      </div>
    </section>
  );
}
