import { useLayoutEffect, useRef, useState } from "react";
import { evolution, risers } from "../data/experience.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { gsap, ScrollTrigger } from "../motion/gsap.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/evolution.css";

/**
 * Six risers of a stage, each a role. On landscape screens the stage pins and
 * scrolling climbs it: the current riser is lit in tungsten, the ones below
 * stay up as ghosts. Elsewhere (phones, reduced motion) it is a stepped list
 * with every step lit.
 */
export function Evolution() {
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px) and (orientation: landscape) and (min-height: 620px)");
  const pinned = wide && !reduce;
  const [active, setActive] = useState(0);
  const stageRef = useRef(null);

  useLayoutEffect(() => {
    if (!pinned) return;
    const steps = risers.length;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: stageRef.current,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 0.55 * steps)}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const index = Math.min(steps - 1, Math.floor(self.progress * steps * 0.999));
          setActive((prev) => (prev === index ? prev : index));
        }
      });
    }, stageRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [pinned]);

  return (
    <section id="evolution" className="chapter evolution" aria-labelledby="evolution-title" data-mode={pinned ? "pinned" : "list"}>
      <Horizon />
      <div className="wrap evolution__head">
        <h2 id="evolution-title" className="h2" data-lamp>
          {evolution.heading}
        </h2>
        <p className="lede" data-lamp style={{ "--cue": 1 }}>
          {evolution.standfirst}
        </p>
      </div>

      <div ref={stageRef} className="evolution__stage">
        <div className="wrap evolution__frame">
          <ol className="evolution__roles">
            {risers.map((r, i) => {
              const state = !pinned ? "lit" : i === active ? "current" : i < active ? "past" : "next";
              return (
                <li
                  key={r.id}
                  className="role"
                  data-state={state}
                  style={{ "--step": i }}
                  data-lamp={pinned ? undefined : ""}
                  aria-current={pinned && i === active ? "step" : undefined}
                >
                  <span className="role__tread" aria-hidden="true" />
                  <h3 className="role__title">{r.title}</h3>
                  <p className="role__period label num">{r.period}</p>
                  <p className="role__org">
                    {r.org}
                    <span className="role__scope"> · {r.scope}</span>
                  </p>
                  <ul className="role__points">
                    {r.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>

          {pinned && (
            <div className="risers" aria-hidden="true">
              {risers.map((r, i) => (
                <div
                  key={r.id}
                  className="riser"
                  data-state={i === active ? "current" : i < active ? "past" : "next"}
                  style={{ "--step": i }}
                >
                  <span className="riser__spot" />
                  <span className="riser__year title-wide num">{r.years}</span>
                  <span className="riser__scope">{r.scope}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
