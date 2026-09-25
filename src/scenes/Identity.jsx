import { useRef } from "react";
import { identity } from "../data/profile.js";
import { useCueFocus, cueState } from "../hooks/useCueFocus.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/identity.css";

export function Identity() {
  const notesRef = useRef(null);
  const reduce = useReducedMotion();
  const focus = useCueFocus(notesRef, ".note", { enabled: !reduce });

  return (
    <section id="identity" className="chapter identity" aria-labelledby="identity-title">
      <Horizon variant="handoff" />
      <div className="wrap identity__grid">
        <div className="identity__intro">
          <h2 id="identity-title" className="h2" data-lamp>
            {identity.heading}
          </h2>
          {identity.paragraphs.map((p, i) => (
            <p key={i} className="body identity__para" data-lamp style={{ "--cue": i + 1 }}>
              {p}
            </p>
          ))}
        </div>

        <dl className="credits identity__credits" data-lamp style={{ "--cue": 2 }}>
          {identity.credits.map((c) => (
            <div key={c.label} className="credits__row">
              <dt className="credits__label">{c.label}</dt>
              <dd className="credits__value">{c.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="wrap">
        <ol ref={notesRef} className="notes" aria-label="Operating notes, in his words">
          {identity.notes.map((n, i) => (
            <li key={n.topic} className="note" data-state={cueState(i, focus, reduce)}>
              <p className="note__topic label">{n.topic}</p>
              <p className="note__text">{n.note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
