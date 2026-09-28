import { risers } from "../data/experience.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/evolution.css";

export function Evolution() {
  const { ref, reduce, active, select } = useStory(risers.length, risers.length - 1);
  const role = risers[active];
  return <section id="evolution" className="chapter evolution" aria-labelledby="evolution-title">
    <Horizon />
    <div ref={ref} className="story-run journey" data-reduced={reduce}>
      <div className="story-sticky wrap">
        <h2 id="evolution-title" className="scene-heading">Each step carried more weight.</h2>
        <div className="journey__architecture" aria-hidden="true">
          <div className="journey__vanishing" />
          {risers.map((r, i) => <div key={r.id} className="journey__step" data-current={i === active} style={{ "--distance": i - active, "--depth": Math.abs(i - active) }}><span>{r.years}</span><i /></div>)}
        </div>
        <div className="journey__caption" aria-live="polite" aria-atomic="true">
          <div key={active} className="beat"><h3>{role.title}</h3><p>{role.org}</p><p className="label journey__period">{role.period}</p><p className="journey__scope">{role.scope}</p></div>
        </div>
        <div className="scene-footer"><StoryControls labels={risers.map(r => r.years)} active={active} onSelect={select} label="Career stages" />
          <DetailLayer title="The complete career" label="Roles and responsibilities">{risers.map(r => <article key={r.id}><h3>{r.title}</h3><p className="label">{r.period}</p><p>{r.org} · {r.scope}</p><ul>{r.points.map(p => <li key={p}>{p}</li>)}</ul></article>)}</DetailLayer>
        </div>
      </div>
    </div>
  </section>;
}
