import { intelligence, pillars, practice } from "../data/intelligence.js";
import { documents } from "../data/contact.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/intelligence.css";

const positions = [[170,100],[650,100],[650,390],[170,390]];
const short = ["Remove delivery friction.", "Keep engineering accountable.", "Make adoption repeatable.", "Measure stakeholder-visible results."];

export function Intelligence() {
  const { ref, reduce, active, select } = useStory(5,4);
  const complete = active === 4;
  return <section id="intelligence" className="chapter intelligence" aria-labelledby="intelligence-title">
    <Horizon />
    <div ref={ref} className="story-run assembly" data-reduced={reduce}>
      <div className="story-sticky wrap">
        <h2 id="intelligence-title" className="scene-heading">AI moves. Judgment stays.</h2>
        <div className="assembly__model" data-complete={complete}>
          <svg viewBox="0 0 820 490" role="img" aria-labelledby="assembly-title">
            <title id="assembly-title">AI Engineering Leadership Framework. Four principles assemble around engineering judgment. Connections are a conceptual presentation of the framework.</title>
            <path className="assembly__ground" d="M40 245 L410 30 780 245 410 460Z" />
            {positions.map(([x,y],i)=> {const next=positions[(i+1)%4];return <g key={i} data-present={i<=active} className="assembly__connection"><path d={`M${x},${y} L410,245`} /><path className="assembly__join" data-present={complete || i<active} d={`M${x},${y} L${next}`} pathLength="1" /></g>;})}
            <path className="assembly__anchor" d="M410 203 L452 245 410 287 368 245Z" />
            <text className="assembly__centre" x="410" y="320" textAnchor="middle">Engineering judgment</text>
          </svg>
          {pillars.map((p,i)=><div key={p.title} className={`assembly__pillar assembly__pillar--${i}`} data-present={i<=active} data-current={i===active}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span><p>{p.title}</p></div>)}
        </div>
        <div className="assembly__caption" aria-live="polite" aria-atomic="true"><div key={active} className="beat"><h3>{complete ? "One coherent model." : pillars[active].title}</h3><p>{complete ? "AI Engineering Leadership Framework" : short[active]}</p></div></div>
        <div className="scene-footer"><StoryControls labels={["Leverage","Judgment","Adoption","Outcomes","Full model"]} active={active} onSelect={select} label="Framework principles" /><DetailLayer title="AI Engineering Leadership Framework" label="Framework and practice"><blockquote><p>“{intelligence.quote}”</p></blockquote><p>{intelligence.standfirst}</p>{pillars.map(p=><article key={p.title}><h3>{p.title}</h3><p>{p.detail}</p></article>)}<article><h3>In practice</h3><ul>{practice.map(p=><li key={p.what}><strong>{p.when} · {p.kind}</strong><p>{p.what}</p></li>)}</ul></article><a className="action action--ghost" href={documents.framework.href} download={documents.framework.filename}>{documents.framework.label}</a></DetailLayer></div>
        <a className="assembly__download text-link" href={documents.framework.href} download={documents.framework.filename}>Download the framework</a>
      </div>
    </div>
  </section>;
}
