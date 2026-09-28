import { identity } from "../data/profile.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/identity.css";

const words = ["Clarity", "Structure", "Trust", "Judgment"];
const captions = ["Give teams clarity before adding process.", "Build for maintainability before scale.", "Make reliable delivery repeatable.", "Let AI remove friction. Keep judgment human."];
export function Identity() {
  const { ref, reduce, active, select } = useStory(4);
  return <section id="identity" className="chapter identity" aria-labelledby="identity-title"><Horizon variant="handoff" />
    <div ref={ref} className="story-run identity-scene" data-reduced={reduce}><div className="story-sticky wrap">
      <h2 id="identity-title" className="scene-heading">How I think.</h2>
      <div className="identity-scene__room" aria-hidden="true" data-idea={active}>
        <div className="identity-scene__light" />
        {words.map((word,i)=><div key={word} className="identity-scene__plane" data-current={i===active} style={{"--plane":i}} />)}
        <span key={active} className="identity-scene__word beat">{words[active]}</span>
      </div>
      <p className="identity-scene__caption" aria-live="polite"><span key={active} className="beat beat--late">{captions[active]}</span></p>
      <div className="scene-footer"><StoryControls labels={words} active={active} onSelect={select} label="Leadership ideas" /><DetailLayer title="Leadership and background" label="Leadership, education and background"><h3>{identity.heading}</h3>{identity.paragraphs.map(p=><p key={p}>{p}</p>)}<dl>{identity.credits.map(c=><div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl>{identity.notes.map(n=><article key={n.topic}><h3>{n.topic}</h3><p>{n.note}</p></article>)}</DetailLayer></div>
    </div></div>
  </section>;
}
