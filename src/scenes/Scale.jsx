import { useRef } from "react";
import { scale, figures } from "../data/scale.js";
import { useCueFocus, cueState } from "../hooks/useCueFocus.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/scale.css";

/**
 * Figures ignite as they reach the middle of the stage. Nothing counts up:
 * a figure is either dark or lit, like a segment on a board.
 */
export function Scale() {
  const listRef = useRef(null);
  const reduce = useReducedMotion();
  const focus = useCueFocus(listRef, ".figure", { band: "-38% 0px -50% 0px", enabled: !reduce });

  return (
    <section id="scale" className="chapter scale" aria-labelledby="scale-title">
      <Horizon />
      <div className="wrap">
        <h2 id="scale-title" className="h2 scale__title" data-lamp>
          {scale.heading}
        </h2>
        <ol ref={listRef} className="figures">
          {figures.map((f, i) => (
            <li key={f.figure + f.lead} className="figure" data-state={cueState(i, focus, reduce)}>
              <span className="figure__num title-wide num">{f.figure}</span>
              <p className="figure__text">
                <strong>{f.lead}</strong> {f.rest}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
