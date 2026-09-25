import { useCallback, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { systemsIntro, caseStudies, workIndex } from "../data/systems.js";
import { capabilitiesIntro, capabilityGroups, contexts } from "../data/capabilities.js";
import { CanvasStage } from "../experience/CanvasStage.jsx";
import { pipelineScene } from "../experience/diagrams/pipeline.js";
import { transactionsScene } from "../experience/diagrams/transactions.js";
import { taxonomyScene } from "../experience/diagrams/taxonomy.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/systems.css";

const scenes = { pipeline: pipelineScene, transactions: transactionsScene, taxonomy: taxonomyScene };
const layouts = ["band", "split-left", "split-right"];

/**
 * A case study is a small system story told by its diagram: dormant
 * architecture, an input, one path lit through the stages, then the outcome.
 * The diagram reports each beat as a cue, and the stage it is lighting is lit
 * in the text beside it at the same moment. Attributes are written directly so
 * the canvas loop never re-renders React.
 */
function useStoryCues(ref, stageCount) {
  return useCallback(
    (cue) => {
      const el = ref.current;
      if (!el) return;
      el.querySelectorAll(".case__stage").forEach((li, i) => {
        li.dataset.state = cue < 0 ? "dark" : i === cue ? "current" : i < cue || cue >= stageCount ? "lit" : "dark";
      });
      const outcomes = el.querySelector(".case__outcomes");
      if (outcomes) outcomes.dataset.state = cue < stageCount ? "dark" : cue === stageCount ? "current" : "lit";
    },
    [ref, stageCount]
  );
}

function CaseStudy({ study, index }) {
  const layout = layouts[index % layouts.length];
  const titleId = `case-${study.id}`;
  const ref = useRef(null);
  const onCue = useStoryCues(ref, study.stages.length);
  const options = useMemo(() => ({ onCue }), [onCue]);
  return (
    <article ref={ref} className="case" data-layout={layout} aria-labelledby={titleId}>
      <header className="case__head" data-lamp>
        <h3 id={titleId} className="h3 case__title">
          {study.name}
        </h3>
        <p className="case__tagline">{study.title}</p>
      </header>

      <figure className="case__figure" data-lamp style={{ "--cue": 1 }}>
        <div className="case__diagram">
          <CanvasStage scene={scenes[study.diagram]} label={study.diagramLabel} className="case__canvas" stillTime={4.2} options={options} />
        </div>
        <figcaption className="case__caption">{study.diagramLabel}</figcaption>
      </figure>

      <div className="case__body">
        <p className="body case__summary" data-lamp>
          {study.summary}
        </p>

        <dl className="case__credits" data-lamp style={{ "--cue": 1 }}>
          {[
            ["Domain", study.domain],
            ["Role", study.role],
            ["Tenure", study.tenure],
            ["Team", study.team]
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <ol className="case__stages">
          {study.stages.map((s, i) => (
            <li key={s.name} className="case__stage" data-lamp style={{ "--cue": i }}>
              <h4 className="case__stage-name">{s.name}</h4>
              <p>{s.detail}</p>
            </li>
          ))}
        </ol>

        {study.outcomes.length > 0 && (
          <dl className="case__outcomes" data-lamp>
            {study.outcomes.map((o) => (
              <div key={o.label}>
                <dt className="case__num title-wide num">{o.figure}</dt>
                <dd>{o.label}</dd>
              </div>
            ))}
          </dl>
        )}

        <details className="fineprint">
          <summary>Fine print</summary>
          <p>
            <span className="label">Built with</span> {study.stack.join(", ")}
          </p>
          <p>Client work under NDA. Descriptions come from the résumé and case-study material; no client screens are shown.</p>
        </details>
      </div>
    </article>
  );
}

function Capabilities() {
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const liveId = useId();
  const shown = preview ?? selected;
  const item = shown && capabilityGroups.flatMap((g) => g.items).find((i) => i.name === shown);
  const lit = new Set(item?.usedIn ?? []);
  const summary = item
    ? `${item.name}: ${item.usedIn.map((id) => contexts.find((c) => c.id === id).label).join(", ")}.`
    : capabilitiesIntro.hint;

  return (
    <section className="patch" aria-labelledby="patch-title">
      <div className="patch__head" data-lamp>
        <h3 id="patch-title" className="h3">
          {capabilitiesIntro.heading}
        </h3>
      </div>

      <div className="patch__grid">
        <div className="patch__channels">
          {capabilityGroups.map((group, gi) => (
            <div key={group.id} className="patch__group" data-lamp style={{ "--cue": gi % 3 }}>
              <h4 className="patch__group-label label">{group.label}</h4>
              <ul className="patch__items">
                {group.items.map((it) => (
                  <li key={it.name}>
                    <button
                      type="button"
                      className="patch__item"
                      aria-pressed={selected === it.name}
                      aria-describedby={liveId}
                      onClick={() => setSelected((s) => (s === it.name ? null : it.name))}
                      onPointerEnter={(e) => e.pointerType === "mouse" && setPreview(it.name)}
                      onPointerLeave={() => setPreview(null)}
                    >
                      {it.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="patch__fixtures">
          <p id={liveId} className="patch__summary" aria-live="polite">
            {summary}
          </p>
          <ul className="patch__contexts" data-active={item ? "" : undefined}>
            {contexts.map((c) => (
              <li key={c.id} className="patch__context" data-lit={lit.has(c.id) ? "" : undefined}>
                <span className="patch__context-label">{c.label}</span>
                <span className="patch__context-detail">{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function WorkIndex() {
  return (
    <div className="index">
      {workIndex.map((group) => (
        <div key={group.group} className="index__group" data-lamp>
          <h3 className="index__title label">{group.group}</h3>
          <ul className="index__list">
            {group.items.map((it) => (
              <li key={it.name} className="index__item">
                {it.href ? (
                  <a className="index__name text-link" href={it.href} target="_blank" rel="noreferrer">
                    {it.name}
                    <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="index__name">{it.name}</span>
                )}
                <span className="index__detail">{it.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Systems() {
  return (
    <section id="systems" className="chapter systems" aria-labelledby="systems-title">
      <Horizon />
      <div className="wrap">
        <div className="systems__head">
          <h2 id="systems-title" className="h2" data-lamp>
            {systemsIntro.heading}
          </h2>
          <p className="lede" data-lamp style={{ "--cue": 1 }}>
            {systemsIntro.standfirst}
          </p>
        </div>

        <div className="systems__cases">
          {caseStudies.map((s, i) => (
            <CaseStudy key={s.id} study={s} index={i} />
          ))}
        </div>

        <Capabilities />
        <WorkIndex />
      </div>
    </section>
  );
}
