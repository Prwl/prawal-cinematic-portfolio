import { useId } from "react";
import { useStory } from "../hooks/useStory.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { DetailLayer } from "./DetailLayer.jsx";
import { StoryControls } from "./StoryControls.jsx";
import "../styles/system-story.css";

const beats = ["Dormant", "Input", "Processing", "Output", "Impact"];
const narratives = {
  pipeline: ["A fragmented starting point.", "200+ sources enter through Connectors.", "Trifacta recipes cleanse and enrich.", "Data Serve distributes to cloud and analytics.", "87+ sources live. Onboarded in 1-2 days."],
  transactions: ["Payment rails, ready for a transaction.", "A merchant enters through enrollment APIs.", "Identity verification, scoring and fraud screening.", "Screened transactions reach ACH processing and reporting.", "160K+ daily transactions. 99.9% uptime."],
  taxonomy: ["Campaign fields form a dependency graph.", "One field changes.", "Dependent fields respond to the edit.", "The sheet composes a unique campaign identifier.", "Naming stays consistent as dependencies change."]
};
const diagramNames = { pipeline: ["Connectors", "Trifacta", "Data Serve"], transactions: ["Enroll", "Verify", "Screen", "Settle"], taxonomy: ["Field", "Depends on", "Identifier"] };

/** Published system concepts only; positions express a narrative, not architecture. */
function SystemDrawing({ kind, active, compact }) {
  const uid = useId();
  const names = diagramNames[kind];
  const vertical = compact;
  const w = vertical ? 360 : 1000, h = vertical ? 420 : 460;
  const point = (i) => vertical ? [180, 95 + i * (235 / (names.length - 1))] : [290 + i * (430 / (names.length - 1)), 230];
  const lit = active > 0;
  if (kind === "taxonomy") {
    const cells = vertical ? [[55,55],[180,55],[305,55],[55,160],[180,160],[305,160],[55,265],[180,265],[305,265]] : [[160,100],[390,100],[620,100],[160,220],[390,220],[620,220],[160,340],[390,340],[620,340]];
    const edges = [[0,1],[0,3],[1,4],[3,4],[4,5],[4,7],[5,8]];
    const labels = ["Edit", "Field", "Field", "Field", "Rule", "Field", "Field", "Field", "Result"];
    return <svg className="system-drawing taxonomy-drawing" viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={uid}><title id={uid}>Conceptual dependency graph: one campaign field is edited, dependent fields update, and a campaign identifier resolves.</title>
      {edges.map(([a,b],i)=><path key={i} className="taxonomy-edge" data-lit={active>=2} d={`M${cells[a]} L${cells[b]}`} pathLength="1"/>)}
      {cells.map(([x,y],i)=><g key={i} className="taxonomy-cell" data-lit={i===0 ? active>=1 : active>=2 && i!==2 && i!==6} data-edited={i===0}><rect x={x-(vertical?40:70)} y={y-28} width={vertical?80:140} height="56"/><text x={x} y={y+5} textAnchor="middle">{labels[i]}</text>{active>=2 && i!==2 && i!==6 && <path d={`M${x-24},${y+17} h48`} />}</g>)}
      <g className="taxonomy-output" data-lit={active>=3}><path d={vertical ? "M305,293 V350 H180" : "M690,340 H820 V230"}/><rect x={vertical?70:750} y={vertical?350:190} width={vertical?220:190} height="55"/><text x={vertical?180:845} y={vertical?383:224} textAnchor="middle">Campaign identifier</text></g>
    </svg>;
  }
  return <svg className="system-drawing" viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={uid} data-kind={kind} data-beat={active}>
    <title id={uid}>{kind === "pipeline" ? "Sources converge through Connectors and Trifacta recipes, then Data Serve distributes to destinations." : kind === "transactions" ? "Enrollment, identity verification, fraud screening, ACH settlement. A flagged path is held at screening." : "An edited field activates its dependent fields and resolves a campaign identifier."} Conceptual abstraction.</title>
    <defs><linearGradient id={`${uid}-plane`} x2="1" y2="1"><stop stopColor="#e5ecee"/><stop offset="1" stopColor="#a7b6bd"/></linearGradient></defs>
    {kind === "pipeline" && Array.from({length: 17}, (_, i) => {
      const x = vertical ? 30 + i * 18 : 40 + (i % 3) * 28;
      const y = vertical ? 20 + (i % 3) * 9 : 50 + i * 22;
      const [tx,ty] = point(0);
      return <g key={i} className="system-source" data-lit={lit}><path d={vertical ? `M${x},${y} C${x},65 ${tx},45 ${tx},${ty}` : `M${x},${y} C180,${y} 180,${ty} ${tx},${ty}`} /><rect x={x-3} y={y-3} width="6" height="6" /></g>;
    })}
    {kind === "transactions" && Array.from({length: 6}, (_, i) => <rect key={i} className="system-packet" data-lit={lit} x={vertical ? 133+i*17 : 65+i*24} y={vertical ? 28 : 223} width="10" height="14" />)}
    {names.slice(1).map((_, i) => { const a=point(i),b=point(i+1); return <path key={i} className="system-route" data-lit={active >= (i === names.length-2 ? 3 : 2)} pathLength="1" d={`M${a} L${b}`} />; })}
    {names.map((name,i) => { const [x,y]=point(i); return <g key={name} className="system-gate" data-lit={active >= (kind === "transactions" ? [1,2,2,3][i] : i+1)}>
      <path className="system-gate__shadow" d={`M${x-35},${y-46} l68,0 48,43 0,94 -68,0 -48,-43 Z`} />
      <path style={{ fill: `url(#${uid}-plane)` }} d={`M${x-35},${y-46} l68,0 0,94 -68,0 Z`} />
      <path className="system-gate__edge" d={`M${x-35},${y-46} l68,0 0,94`} />
      <rect className="system-gate__core" x={x-5} y={y-5} width="10" height="10" />
      <text x={vertical ? x-55 : x} y={vertical ? y+4 : y-66} textAnchor={vertical ? "end" : "middle"}>{name}</text>
    </g>; })}
    {kind === "pipeline" && ["AWS S3","GCP","Azure ADLS","Snowflake","SFTP","Analytics"].map((name,i) => { const [x,y]=point(2); const dx=vertical ? 30+i*58 : 865,dy=vertical ? 398 : 78+i*58; return <g key={name} className="system-destination" data-lit={active>=3}><path d={vertical ? `M${x},${y} C${x},360 ${dx},360 ${dx},${dy-15}` : `M${x},${y} C800,${y} 790,${dy} ${dx},${dy}`} /><rect x={dx-3} y={dy-3} width="6" height="6" />{!vertical && <text x={vertical ? dx : dx+14} y={vertical ? dy+18 : dy+5} textAnchor={vertical ? "middle" : "start"}>{name}</text>}</g>; })}
    {kind === "transactions" && <g className="system-held" data-lit={active>=2}>{(() => {const [x,y]=point(2);return <><path d={vertical ? `M${x},${y} H290 V${y+30}` : `M${x},${y} V355 H${x+75}`} /><text x={vertical ? 290 : x+85} y={vertical ? y+48 : 360} textAnchor={vertical ? "middle":"start"}>Held for review</text><rect x={vertical ? 285 : x+65} y={vertical ? y+25 : 350} width="10" height="10" /></>;})()}</g>}
    {kind === "taxonomy" && [0,1,2,3].map(i => { const [x,y]=point(1); const dx=vertical ? 290 : 500+(i-1.5)*90,dy=vertical ? 125+i*60 : 360; return <g key={i} className="system-destination" data-lit={active>=2}><path d={`M${x},${y} L${dx},${dy}`} /><rect x={dx-15} y={dy-10} width="30" height="20" /></g>; })}
  </svg>;
}

export function SystemStory({ study }) {
  const { ref, reduce, active, select } = useStory(5,4);
  const compact = useMediaQuery("(max-width: 699px)");
  return <article ref={ref} className="story-run system-story" data-reduced={reduce} aria-labelledby={`case-${study.id}`}>
    <div className="story-sticky">
      <header><h3 id={`case-${study.id}`} className="scene-heading">{study.name}</h3><p className="system-story__tagline">{study.title}</p></header>
      <figure className="system-story__visual"><SystemDrawing kind={study.diagram} active={active} compact={compact} /><figcaption>{compact && study.diagram === "pipeline" && <span className="system-story__destinations">AWS S3 · GCP · Azure ADLS · Snowflake · SFTP · Analytics<br /></span>}Conceptual abstraction of the published system.</figcaption></figure>
      <p className="system-story__narrative" aria-live="polite" aria-atomic="true"><span key={active} className="beat">{narratives[study.diagram][active]}</span></p>
      <div className="scene-footer"><StoryControls labels={beats} active={active} onSelect={select} label={`${study.name} story`} />
        <DetailLayer title={study.name} label="Case study and technology"><p>{study.summary}</p><dl>{[["Domain",study.domain],["Role",study.role],["Tenure",study.tenure],["Team",study.team]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>{study.stages.map(s=><article key={s.name}><h3>{s.name}</h3><p>{s.detail}</p></article>)}<ul>{study.outcomes.map(o=><li key={o.label}><strong>{o.figure}</strong> {o.label}</li>)}</ul><h3>Technology</h3><p>{study.stack.join(", ")}</p><p>{study.diagramLabel}</p><p>Client work under NDA. No client screens are shown.</p></DetailLayer>
      </div>
    </div>
  </article>;
}
