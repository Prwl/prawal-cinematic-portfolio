import { identity } from "../data/profile.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/identity.css";

// Four principles, each carved into a stone flat standing in a long hall.
// Each flat carries the mark of its idea: a slit of light (clarity), a
// measured module (structure), laid courses (trust), a plumb line (judgment).
// Clarity is also on stage while the hall arrives; Judgment closes the hall
// and leads into the framework, so it holds as long.
const IDENTITY_CUT = [0, 0, 1, 2, 3];

const principles = [
  { word: "Clarity", mark: "slit", line: "Give teams clarity before adding process." },
  { word: "Structure", mark: "module", line: "Build for maintainability before scale." },
  { word: "Trust", mark: "courses", line: "Make reliable delivery repeatable." },
  { word: "Judgment", mark: "plumb", line: "Let AI remove friction. Keep judgment human." }
];

/**
 * A walk through a hall of principles. The camera dollies forward one flat at
 * a time: the one on stage takes the window's light, the passed one slides
 * past the lens, the ones ahead wait in haze.
 */
export function Identity() {
  const { ref, reduce, active, confirmed, select } = useStory(principles.length, 0, IDENTITY_CUT, 1300);
  const current = principles[confirmed];
  return (
    <section id="identity" className="chapter identity bleed" aria-labelledby="identity-title">
      <Horizon variant="handoff" />
      <div ref={ref} className="story-run hall" data-reduced={reduce}>
        <div className="story-sticky wrap">
          <h2 id="identity-title" className="scene-heading">How I think.</h2>
          <div className="scene-band">
          <div className="hall__space stage-bleed" aria-hidden="true" data-idea={principles[active].mark} data-side={active % 2 ? "right" : "left"} style={{ "--at": active }}>
            <span className="hall__floor" />
            <span className="hall__shaft" />
            <div className="hall__depth">
              {principles.map((p, i) => (
                <div key={p.word} className="hall__flat" data-mark={p.mark} data-side={i % 2 ? "right" : "left"} data-state={i < active ? "passed" : i === active ? "current" : "ahead"} style={{ "--i": i, "--d": i - active }}>
                  <span className="hall__mark" />
                  <span className="hall__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="hall__word">{p.word}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
          <p className="hall__line" aria-live="polite" aria-atomic="true">
            <span className="visually-hidden">{current.word}. </span>
            <span key={confirmed} className="beat beat--late">{current.line}</span>
          </p>
          <div className="scene-footer">
            <StoryControls labels={principles.map((p) => p.word)} active={confirmed} onSelect={select} label="Leadership principles" />
            <DetailLayer title="Leadership and background" label="Leadership, education and background" chapter="I">
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
