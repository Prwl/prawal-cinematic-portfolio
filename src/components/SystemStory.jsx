import { useStory } from "../hooks/useStory.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { DetailLayer } from "./DetailLayer.jsx";

import { Refinery } from "./systems/Refinery.jsx";
import { Rails } from "./systems/Rails.jsx";
import { Lattice } from "./systems/Lattice.jsx";
import "../styles/system-story.css";

const narratives = {
  pipeline: ["A fragmented starting point.", "200+ sources enter through Connectors.", "Trifacta recipes straighten them into governed lanes.", "Data Serve distributes to cloud and analytics.", "87+ sources live. Each onboarded in 1⁠–⁠2 days."],
  transactions: ["Payment rails, waiting for a transaction.", "A merchant enters through enrollment APIs.", "Identity is verified, then scored and screened. One is held.", "Screened transactions settle through ACH and reporting.", "160K+ transactions a day. 99.9% uptime."],
  taxonomy: ["Campaign fields, bound by dependencies.", "One field changes.", "Every field that depends on it responds.", "The sheet resolves one campaign identifier.", "Naming stays consistent as dependencies change."]
};
// Each system is a separate directed scene. Shared scores live in scenePlayback.js.
const machines = { pipeline: Refinery, transactions: Rails, taxonomy: Lattice };

/** Published system concepts only; each machine is an abstraction, not architecture. */
export function SystemStory({ study }) {
  const { ref, reduce, live, active, confirmed, select } = useStory(5, 4);
  const compact = useMediaQuery("(max-width: 699px)");
  const Machine = machines[study.diagram];
  return (
    <article ref={ref} className="story-run system-story" data-kind={study.diagram} data-beat={active} data-live={live} data-reduced={reduce} aria-labelledby={`case-${study.id}`}>
      <div className="story-sticky wrap">
        <span className="system-story__room stage-bleed" aria-hidden="true" />
        <header className="system-story__head">
          <h3 id={`case-${study.id}`} className="scene-heading">{study.name}</h3>
          <p className="system-story__tagline">{study.title}</p>
        </header>
        <figure className="system-story__visual">
          <Machine active={active} compact={compact} live={live} reduce={reduce} />
          <figcaption>{study.diagram === "pipeline" ? "All three scenes are conceptual abstractions of published systems." : ""}</figcaption>
        </figure>
        <p className="system-story__narrative" aria-live="polite" aria-atomic="true"><span key={confirmed} className="beat">{narratives[study.diagram][confirmed]}</span></p>
        <div className="scene-footer">
          <button type="button" className="detail-link" onClick={() => select(4)}>View complete system</button>
          <DetailLayer title={study.name} label="Case study and technology" chapter="III">
            <figure className="evidence-machine"><Machine active={4} compact={compact} live={false} reduce={true} /><figcaption>{study.diagramLabel}</figcaption></figure>
            <ul className="evidence-outcomes">{study.outcomes.map(o => <li key={o.label}><strong>{o.figure}</strong><span>{o.label}</span></li>)}</ul>
            <p className="detail-lede">{study.summary}</p>
            <dl>{[["Domain", study.domain], ["Role", study.role], ["Tenure", study.tenure], ["Team", study.team]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            {study.stages.map((s) => <article key={s.name}><h3>{s.name}</h3><p>{s.detail}</p></article>)}

            <h3>Technology</h3>
            <p>{study.stack.join(", ")}</p>
            <p className="detail-note">{study.diagramLabel} Client work under NDA. No client screens are shown.</p>
          </DetailLayer>
        </div>
      </div>
    </article>
  );
}
