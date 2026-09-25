import { useRef } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { intelligence, pillars, practice } from "../data/intelligence.js";
import { documents } from "../data/contact.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useCueFocus } from "../hooks/useCueFocus.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/intelligence.css";

// The framework as a loop around a fixed centre: AI circulates through the
// four pillars; engineering judgment stays where it is.
const NODES = [
  [90, 90],
  [470, 90],
  [470, 470],
  [90, 470]
];
const CENTRE = [280, 280];
// Pillar titles sit outside the square, above the top pair and below the bottom pair.
// Two lines each (numeral, then title) so the bottom pair never meet.
const LABELS = [
  { x: 90, y: 30, anchor: "start" },
  { x: 470, y: 30, anchor: "end" },
  { x: 470, y: 512, anchor: "end" },
  { x: 90, y: 512, anchor: "start" }
];
const LOOP = `M${NODES[0]} L${NODES[1]} L${NODES[2]} L${NODES[3]} Z`;
// Scene steps: 0 introduces the framework, 1-4 are the pillars, 5 closes the loop.
const COMPLETE = pillars.length + 1;

function nodeState(i, step) {
  if (step >= COMPLETE) return "lit";
  if (i === step - 1) return "current";
  return i < step - 1 ? "lit" : "dark";
}

/**
 * The framework drawn as the scene itself. Each pillar takes the light in
 * turn: its node warms, the loop draws on to it from the previous pillar, and
 * a line runs from it to the fixed centre. When the last pillar has been
 * read the loop closes and the light returns to engineering judgment.
 */
function FrameworkDiagram({ step, reduce }) {
  const complete = step >= COMPLETE;
  const centreLit = step === 0 || complete;
  return (
    <svg className="loop" viewBox="0 0 560 550" role="img" aria-labelledby="loop-title" data-step={step}>
      <title id="loop-title">
        The four pillars of the AI Engineering Leadership Framework in sequence, clarify leverage, protect judgment,
        operationalize adoption and prove outcomes, around a fixed centre labelled engineering judgment.
      </title>
      <path d={LOOP} className="loop__track" />
      {NODES.map((from, i) => {
        const to = NODES[(i + 1) % NODES.length];
        // Segment i arrives at pillar i + 1; the last one closes the loop.
        const arrives = i + 2;
        const state = i === NODES.length - 1 ? (complete ? "lit" : "dark") : step > arrives ? "lit" : step === arrives ? "current" : "dark";
        return <path key={`seg-${i}`} d={`M${from} L${to}`} pathLength="1" className="loop__segment" data-state={state} />;
      })}
      {NODES.map(([x, y], i) => (
        <path key={`spoke-${i}`} d={`M${x} ${y} L${CENTRE}`} pathLength="1" className="loop__spoke" data-state={nodeState(i, step)} />
      ))}
      <rect x={CENTRE[0] - 16} y={CENTRE[1] - 16} width="32" height="32" className="loop__centre" data-lit={centreLit ? "" : undefined} />
      <text x={CENTRE[0]} y={CENTRE[1] + 50} textAnchor="middle" className="loop__centre-label" data-lit={centreLit ? "" : undefined}>
        Engineering judgment
      </text>
      {NODES.map(([x, y], i) => {
        const state = nodeState(i, step);
        const l = LABELS[i];
        return (
          <g key={pillars[i].title} className="loop__pillar" data-state={state}>
            <rect x={x - 7} y={y - 7} width="14" height="14" className="loop__node" />
            <text x={l.x} y={l.y} textAnchor={l.anchor} className="loop__label">
              <tspan className="loop__num">{String(i + 1).padStart(2, "0")}</tspan>
              <tspan className="loop__title" x={l.x} dy="24">
                {pillars[i].title}
              </tspan>
            </text>
          </g>
        );
      })}
      {complete && !reduce && (
        <rect x="-5" y="-5" width="10" height="10" className="loop__signal">
          <animateMotion dur="9s" repeatCount="indefinite" path={LOOP} rotate="0" />
        </rect>
      )}
    </svg>
  );
}

export function Intelligence() {
  const reduce = useReducedMotion();
  const stepsRef = useRef(null);
  const focus = useCueFocus(stepsRef, ".framework__step", { band: "-46% 0px -46% 0px", enabled: !reduce });
  // Under reduced motion the framework is shown whole, as its closing frame.
  const step = reduce ? COMPLETE : focus.current;
  const stepState = (i) => (reduce ? "lit" : i === focus.current ? "current" : i < focus.current ? "past" : "next");

  return (
    <section id="intelligence" className="chapter intelligence" aria-labelledby="intelligence-title">
      <Horizon />
      <div className="wrap">
        <figure className="intelligence__quote" data-lamp>
          <blockquote>
            <h2 id="intelligence-title" className="h2 intelligence__h2">
              “{intelligence.quote}”
            </h2>
          </blockquote>
          <figcaption className="label">Prawal Sharma, on AI adoption</figcaption>
        </figure>
      </div>

      <div className="framework" data-mode={reduce ? "still" : "scene"}>
        <div className="wrap framework__grid">
          <div className="framework__stage">
            <div className="framework__diagram">
              <FrameworkDiagram step={step} reduce={reduce} />
            </div>
          </div>

          <ol ref={stepsRef} className="framework__steps">
            <li className="framework__step framework__step--intro" data-state={stepState(0)}>
              <p className="lede framework__lede">{intelligence.standfirst}</p>
            </li>
            {pillars.map((p, i) => (
              <li key={p.title} className="framework__step" data-state={stepState(i + 1)}>
                <span className="framework__num num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="framework__title">{p.title}</h3>
                <p className="framework__detail">{p.detail}</p>
              </li>
            ))}
            <li className="framework__step framework__step--close" data-state={stepState(COMPLETE)}>
              <a className="action action--ghost" href={documents.framework.href} download={documents.framework.filename}>
                {documents.framework.label}
                <DownloadSimple size={16} weight="bold" aria-hidden="true" />
              </a>
            </li>
          </ol>
        </div>
      </div>

      <div className="wrap">
        <div className="practice">
          <h3 className="h3 practice__title" data-lamp>
            In practice
          </h3>
          <ol className="practice__list">
            {practice.map((p, i) => (
              <li key={p.what} className="practice__row" data-lamp style={{ "--cue": i % 4 }}>
                <span className="practice__when num">{p.when}</span>
                <span className="practice__what">{p.what}</span>
                <span className="practice__kind">{p.kind}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
