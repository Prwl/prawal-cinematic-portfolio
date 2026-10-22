import { identity } from "../data/profile.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import "../styles/identity.css";

const principles = [
  { word: "Clarity", mark: "slit", line: "Give teams clarity before adding process." },
  { word: "Structure", mark: "module", line: "Build for maintainability before scale." },
  { word: "Trust", mark: "courses", line: "Make reliable delivery repeatable." },
  { word: "Judgment", mark: "plumb", line: "Let AI remove friction. Keep judgment human." }
];

// One opening: light, measured reveals, seated supports, an inward decision.
export function Identity() {
  const compact = useMediaQuery("(max-width: 699px)");
  const { ref, reduce, active, confirmed, select } = useStory(principles.length, 3);
  const current = principles[confirmed];
  return (
    <section id="identity" className="chapter identity bleed" aria-labelledby="identity-title">
      <Horizon variant="handoff" />
      <div ref={ref} className="story-run hall" data-reduced={reduce} data-playback-rate={compact ? 1.3 : 1}>
        <div className="story-sticky wrap">
          <h2 id="identity-title" className="scene-heading">How I think.</h2>
          <div className="scene-band">
          <div className="identity-room" data-beat={active}>
            <div className="identity-room__world" aria-hidden="true">
              <div className="identity-room__contact" />
              <div className="identity-room__opening">
                <span className="identity-room__return" />
                <span className="identity-room__daylight" />
                <span className="identity-room__reveal identity-room__reveal--outer" />
                <span className="identity-room__reveal identity-room__reveal--middle" />
                <span className="identity-room__reveal identity-room__reveal--inner" />
                <span className="identity-room__span" />
                <span className="identity-room__seam" />
              </div>
            </div>
            <div className="identity-room__thought" aria-live="polite" aria-atomic="true">
              <p className="identity-room__word" key={`word-${confirmed}`}>{current.word}</p>
              <p className="identity-room__line" key={`line-${confirmed}`}>
                {confirmed === 3 ? <><span>Let AI remove friction.</span><strong>Keep judgment human.</strong></> : current.line}
              </p>
            </div>
          </div>
          </div>
          <div className="scene-footer">
            <details className="identity-explore">
              <summary>Explore the principles</summary>
              <StoryControls labels={principles.map((p) => p.word)} active={confirmed} onSelect={select} label="Leadership principles" />
            </details>
            <DetailLayer title="Leadership and background" label="Leadership, education and background" chapter="I">
              <div className="evidence-principles">{principles.map(p => <div key={p.word}><strong>{p.word}</strong><p>{p.line}</p></div>)}</div>
              <p className="detail-lede">{identity.heading}</p>
              {identity.paragraphs.map((p) => <p key={p}>{p}</p>)}
              <dl>{identity.credits.map((c) => <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl>
              {identity.notes.map((n) => <article key={n.topic}><h3>{n.topic}</h3><p>{n.note}</p></article>)}
            </DetailLayer>
          </div>
        </div>
      </div>
    </section>
  );
}
