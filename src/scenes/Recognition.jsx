import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { awards, awardsIssuer, credentials, learningArchive, recommendations, recommendationsSource, appearances, publication } from "../data/recognition.js";
import { awardImage } from "../lib/media.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/recognition.css";

function AwardImage({ award, eager = false }) {
  const img = awardImage(award.image);
  return <picture><source type="image/avif" srcSet={img.avif}/><img src={img.webp} alt={`${award.title}, ${award.date}`} loading={eager ? "eager" : "lazy"} decoding="async" width="600" height="450" /></picture>;
}
function Exhibition() {
  const { ref, reduce, active, select } = useStory(awards.length);
  const award = awards[active];
  return <div ref={ref} className="story-run exhibition" data-reduced={reduce}>
    <div className="story-sticky wrap">
      <h2 id="recognition-title" className="scene-heading">Recognition, earned over time.</h2>
      <div className="exhibition__room">
        {awards.map((a,i)=><figure key={a.image} className="exhibition__piece" data-selected={i===active} aria-hidden={i!==active} style={{"--offset":i-active,"--away":Math.abs(i-active)}}><AwardImage award={a} /></figure>)}
      </div>
      <div className="exhibition__caption" aria-live="polite" aria-atomic="true"><div key={active} className="beat"><h3>{award.title}</h3><p>{award.date} · {awardsIssuer}</p></div></div>
      <div className="scene-footer"><div className="gallery-controls"><button type="button" onClick={()=>select(active-1)} disabled={active===0} aria-label="Previous award"><ArrowLeft size={20}/></button><span>{active+1} / {awards.length}</span><button type="button" onClick={()=>select(active+1)} disabled={active===awards.length-1} aria-label="Next award"><ArrowRight size={20}/></button></div><DetailLayer title="The awards archive" label="Awards and their stories">{awards.map(a=><article key={a.image}><h3>{a.title}</h3><p>{a.date} · {awardsIssuer}</p><AwardImage award={a}/><p>{a.note}</p></article>)}</DetailLayer></div>
    </div>
  </div>;
}
function Voices() {
  const [current,setCurrent] = useState(0);
  const voice = recommendations[current];
  return <section className="voices wrap" aria-labelledby="voices-title"><h3 id="voices-title" className="scene-heading">In their words.</h3>
    <figure className="voices__quote" aria-live="polite" aria-atomic="true"><blockquote key={voice.name}>“{voice.quote}”</blockquote><figcaption key={`${voice.name}-by`} className="beat beat--late"><strong>{voice.name}</strong><span>{voice.role} · {voice.date}</span></figcaption></figure>
    <div className="scene-footer"><div className="voices__controls"><button type="button" disabled={current===0} onClick={()=>setCurrent(current-1)}>Previous voice</button><button type="button" disabled={current===recommendations.length-1} onClick={()=>setCurrent(current+1)}>Next voice <ArrowRight size={18}/></button></div><DetailLayer title="Professional recommendations" label="All 12 voices">{recommendations.map(r=><article key={r.name}><h3>{r.name}</h3><p className="label">{r.role} · {r.date}</p><blockquote><p>“{r.quote}”</p></blockquote></article>)}<p><a href={recommendationsSource.href} target="_blank" rel="noreferrer">{recommendationsSource.label} (opens in a new tab)</a></p></DetailLayer></div>
  </section>;
}
function Archive() {
  return <section className="archive wrap" aria-labelledby="archive-title">
    <h3 id="archive-title" className="scene-heading">The continuing practice.</h3>
    <div className="archive__shelves">
      <div className="archive__shelf"><span className="archive__subject">Cloud & AI</span><p>AWS, Google Cloud, Microsoft</p><DetailLayer title="Certifications and learning" label="Open the certification archive">{credentials.map(c=><article key={c.title}><h3>{c.title}</h3><p>{c.issuer}</p></article>)}{learningArchive.map(g=><article key={g.group}><h3>{g.group}</h3><ul>{g.items.map(i=><li key={i}>{i}</li>)}</ul></article>)}</DetailLayer></div>
      <div className="archive__shelf"><span className="archive__subject">2023 to 2026</span><p>Conferences, conversations, contribution</p><DetailLayer title="Events and publication" label="Open events and publication">{appearances.map(a=><article key={a.title+a.year}><h3>{a.title}</h3><p>{a.year} · {a.kind}</p></article>)}<article><h3>{publication.title}</h3><p>{publication.role}. {publication.detail}</p><p><a href={publication.href} target="_blank" rel="noreferrer">View on Amazon (opens in a new tab)</a></p></article></DetailLayer></div>
    </div>
  </section>;
}
export function Recognition() {
  return <section id="recognition" className="chapter recognition" aria-labelledby="recognition-title"><Horizon/><Exhibition/><Archive/><Voices/></section>;
}
