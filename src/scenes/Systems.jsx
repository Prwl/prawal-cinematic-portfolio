import { useId, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { systemsIntro, caseStudies, workIndex } from "../data/systems.js";
import { capabilitiesIntro, capabilityGroups, contexts } from "../data/capabilities.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/systems.css";

import { DetailLayer } from "../components/DetailLayer.jsx";
import { SystemStory } from "../components/SystemStory.jsx";

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
            Data, payments, dependencies. Three systems, three kinds of responsibility.
          </p>
        </div>

        <div className="systems__cases">
          {caseStudies.map((s) => (
            <SystemStory key={s.id} study={s} />
          ))}
        </div>

        <div className="systems__archive"><DetailLayer title="Capabilities and selected work" label="Full toolkit and project archive"><Capabilities /><WorkIndex /></DetailLayer></div>
      </div>
    </section>
  );
}
