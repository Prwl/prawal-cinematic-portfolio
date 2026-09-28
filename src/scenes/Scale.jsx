import { useEffect, useRef } from "react";
import { scale, figures } from "../data/scale.js";
import { useStory } from "../hooks/useStory.js";
import { StoryControls } from "../components/StoryControls.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/scale.css";

/**
 * The one darker passage: a graphite colonnade between the fog-lit rooms,
 * where the light goes down for the numbers. Figures ignite as they reach the
 * middle of the screen. Nothing counts up: a figure is either a ghost or lit,
 * like a segment on a board.
 */
export function Scale() {
  const { ref, reduce, active, select } = useStory(figures.length);
  const metric = figures[active];
  const coreRef = useRef(null);

  // The fixed chrome takes graphite ink only while the solid dark is behind
  // it: the header against the top strip of the screen, the rail against its
  // middle. Written to the elements directly; nothing re-renders.
  useEffect(() => {
    const core = coreRef.current;
    const watch = (el, rootMargin) => {
      if (!el) return null;
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) el.dataset.env = "dark";
        else delete el.dataset.env;
      }, { rootMargin });
      io.observe(core);
      return () => {
        io.disconnect();
        delete el.dataset.env;
      };
    };
    const stops = [watch(document.querySelector(".site-header"), "0px 0px -92% 0px"), watch(document.querySelector(".cue-rail"), "-42% 0px -42% 0px")];
    return () => stops.forEach((stop) => stop?.());
  }, []);

  return (
    <section id="scale" className="chapter scale" aria-labelledby="scale-title" data-env="dark">
      <span ref={coreRef} className="scale__core" aria-hidden="true" />
      <Horizon />
      <div ref={ref} className="story-run scale-scene" data-reduced={reduce}>
        <div className="story-sticky wrap">
          <h2 id="scale-title" className="scene-heading">{scale.heading}</h2>
          <div className="scale-scene__structure" aria-hidden="true" style={{"--metric":active}}>{figures.map((f,i)=><i key={f.figure} style={{"--column":i}} />)}</div>
          <div className="scale-scene__metric" aria-live="polite" aria-atomic="true"><span key={active} className="title-wide num beat">{metric.figure}</span><p key={`${active}-lead`} className="beat beat--late">{metric.lead.replace(/,$/, "")}</p></div>
          <div className="scene-footer"><StoryControls labels={["Payments","Sources","Onboarding","AI delivery","Trust","Experience"]} active={active} onSelect={select} label="Scale metrics" /><DetailLayer title="Scale, with context" label="Evidence behind the figures">{figures.map(f=><article key={f.figure}><h3>{f.figure}</h3><p><strong>{f.lead}</strong> {f.rest}</p></article>)}</DetailLayer></div>
        </div>
      </div>
    </section>
  );
}
