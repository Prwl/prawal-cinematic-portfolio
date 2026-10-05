import { useEffect, useRef } from "react";
import { scale, figures } from "../data/scale.js";
import { useStory } from "../hooks/useStory.js";
import { StoryControls } from "../components/StoryControls.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/scale.css";

const TAU = Math.PI * 2;
const r1 = (n) => Math.round(n * 10) / 10;

// Each figure is drawn as the thing it counts. Every mark switches on in
// sequence (its --k sets the order); nothing counts up.
function Dial() {
  // A day, in five-minute marks: every one of them carries transactions.
  return Array.from({ length: 288 }, (_, k) => {
    const a = (k / 288) * TAU - Math.PI / 2;
    const hour = k % 12 === 0;
    const [ri, ro] = hour ? [196, 246] : [206, 232];
    return <line key={k} className={hour ? "mark mark--key" : "mark"} style={{ "--k": k * 0.8 }} x1={r1(300 + Math.cos(a) * ri)} y1={r1(300 + Math.sin(a) * ri)} x2={r1(300 + Math.cos(a) * ro)} y2={r1(300 + Math.sin(a) * ro)} />;
  });
}
function Sources() {
  // Two hundred sources, gathered toward one platform.
  const golden = Math.PI * (3 - Math.sqrt(5));
  return (
    <>
      {Array.from({ length: 200 }, (_, k) => {
        const r = 17 * Math.sqrt(k + 1.5), a = k * golden;
        const x = r1(300 + Math.cos(a) * r), y = r1(300 + Math.sin(a) * r);
        return (
          <g key={k} className="mark" style={{ "--k": k * 1.1 }}>
            <line className="mark__thread" x1={x} y1={y} x2="300" y2="300" />
            <rect x={x - 2.5} y={y - 2.5} width="5" height="5" />
          </g>
        );
      })}
      <rect className="mark mark--key" style={{ "--k": 240 }} x="291" y="291" width="18" height="18" />
    </>
  );
}
function Days() {
  // Two weeks. Onboarding a source takes the first one or two of them; the
  // eighty-seven sources already live sit below.
  return (
    <>
      {Array.from({ length: 14 }, (_, k) => {
        const x = 62 + (k % 7) * 70, y = 70 + Math.floor(k / 7) * 70;
        return <rect key={k} className={k === 0 ? "mark mark--key" : k === 1 ? "mark mark--half" : "mark mark--ghost"} style={{ "--k": k * 6 }} x={x} y={y} width="58" height="58" />;
      })}
      {Array.from({ length: 87 }, (_, k) => (
        <rect key={k} className="mark" style={{ "--k": 90 + k * 2.2 }} x={62 + (k % 15) * 32.5} y={290 + Math.floor(k / 15) * 32} width="18" height="18" />
      ))}
      <text className="mark__note" x="62" y="512">87+ sources live</text>
    </>
  );
}
function Lift() {
  // Throughput before, and with AI-assisted delivery: 20 to 30 percent more.
  return (
    <>
      <text className="mark__note" x="40" y="206">Before</text>
      <rect className="mark mark--ghost" style={{ "--k": 0 }} x="40" y="220" width="400" height="44" />
      <text className="mark__note" x="40" y="336">With AI-assisted delivery</text>
      <rect className="mark" style={{ "--k": 20 }} x="40" y="350" width="480" height="44" />
      <rect className="mark mark--key mark--hatch" style={{ "--k": 60 }} x="480" y="350" width="40" height="44" />
      <line className="mark mark--rule" style={{ "--k": 80 }} x1="440" y1="190" x2="440" y2="420" />
    </>
  );
}
function Level() {
  // Multi-year engagements across three regions, and a line that never breaks.
  return (
    <>
      <line className="mark mark--draw" style={{ "--k": 0 }} x1="20" y1="300" x2="580" y2="300" pathLength="1" />
      {[["United States", 120], ["United Kingdom", 300], ["South Africa", 480]].map(([name, x], i) => (
        <g key={name} className="mark mark--region" style={{ "--k": 120 + i * 30 }}>
          <rect x={x - 5} y="295" width="10" height="10" />
          <text className="mark__note" x={x} y="340" textAnchor="middle">{name}</text>
        </g>
      ))}
    </>
  );
}
function Columns() {
  // Ten years: a colonnade, one column a year.
  return Array.from({ length: 10 }, (_, k) => (
    <g key={k} className="mark mark--column" style={{ "--k": k * 14 }}>
      <rect x={48 + k * 52} y={130 + (9 - k) * 6} width="30" height={340 - (9 - k) * 6} />
      <rect className="mark__return" x={78 + k * 52} y={130 + (9 - k) * 6} width="8" height={340 - (9 - k) * 6} />
    </g>
  ));
}
const events = [Dial, Sources, Days, Lift, Level, Columns];

/**
 * The one darker passage. Each figure has its moment: the room goes dark
 * around it, the thing it counts switches on mark by mark, and then the
 * figure itself is lit.
 */
export function Scale() {
  const { ref, reduce, active, confirmed, select } = useStory(figures.length, 0);
  const metric = figures[confirmed];
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
      <div ref={ref} className="story-run scale-scene" data-weight={active === 0 || active === 3 ? "primary" : active === 4 ? "quiet" : "supporting"} data-reduced={reduce}>
        <div className="story-sticky wrap">
          <h2 id="scale-title" className="scene-heading">{scale.heading}</h2>
          <div className="scale-scene__event" aria-hidden="true">
            {events.map((Event, i) => (
              <svg key={i} viewBox="0 0 600 600" data-current={i === active} data-kind={i}>
                <Event />
              </svg>
            ))}
          </div>
          <div className="scale-scene__metric" aria-live="polite" aria-atomic="true">
            <span key={confirmed} className="title-wide num beat scale-scene__figure">{metric.figure}</span>
            <p key={`${confirmed}-lead`} className="beat beat--late">{metric.lead.replace(/,$/, "")}</p>
          </div>
          <div className="scene-footer">
            <StoryControls labels={["Payments", "Sources", "Onboarding", "AI delivery", "Trust", "Experience"]} active={confirmed} onSelect={select} label="Scale metrics" />
            <DetailLayer title="Scale, with context" label="Evidence behind the figures" chapter="IV">
              <div className="evidence-scale"><strong>{figures[0].figure}</strong><p>{figures[0].lead}</p><span>{figures[0].rest}</span></div>
              {figures.map((f) => <article key={f.figure} className="detail-figure"><p className="detail-figure__num num">{f.figure}</p><p><strong>{f.lead}</strong> {f.rest}</p></article>)}
            </DetailLayer>
          </div>
        </div>
      </div>
    </section>
  );
}
