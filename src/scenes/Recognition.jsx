import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { awards, awardsIssuer, credentials, learningArchive, recommendations, recommendationsSource, appearances, publication } from "../data/recognition.js";
import { Horizon } from "../components/Horizon.jsx";
import { DetailLayer } from "../components/DetailLayer.jsx";
import { StoryControls } from "../components/StoryControls.jsx";
import { Still } from "../components/Still.jsx";
import { useStory } from "../hooks/useStory.js";
import "../styles/recognition.css";

const year = (date) => date.slice(-4);

/**
 * The exhibition. Real award photographs hang along one long gallery wall
 * that recedes to the right under raking light. The visitor walks the wall:
 * the print on stage comes forward into its pool of light, the ones behind
 * slip past, the ones ahead wait further down the wall. The year is painted
 * on the wall behind the print, as exhibitions do.
 */
function Exhibition() {
  const { ref, reduce, active, select } = useStory(awards.length);
  const award = awards[active];
  return (
    <div ref={ref} className="story-run exhibition" data-reduced={reduce}>
      <div className="story-sticky wrap">
        <h2 id="recognition-title" className="scene-heading">Recognition, earned over time.</h2>
        <div className="exhibition__space stage-bleed" aria-hidden="true">
          <span className="exhibition__floor" />
          <div className="exhibition__wall">
            <div className="exhibition__track" style={{ "--at": active }}>
              <span className="exhibition__skirting" />
              {awards.map((a, i) => (
                <figure key={a.image} className="exhibition__print" data-state={i < active ? "passed" : i === active ? "current" : "ahead"} style={{ "--i": i, "--d": Math.abs(i - active), "--h": [1, 0.84, 0.92][i % 3] }}>
                  <span className="exhibition__year">{year(a.date)}</span>
                  <span className="exhibition__pool" />
                  <Still set="awards" name={a.image} width="960" height="720" />
                </figure>
              ))}
            </div>
          </div>
        </div>
        <div className="exhibition__label" aria-live="polite" aria-atomic="true">
          <div key={active} className="beat">
            <h3>{award.title}</h3>
            <p>{award.date} · {awardsIssuer}</p>
          </div>
        </div>
        <div className="scene-footer">
          <div className="gallery-controls">
            <button type="button" onClick={() => select(active - 1)} disabled={active === 0} aria-label="Previous award"><ArrowLeft size={20} /></button>
            <span className="num">{String(active + 1).padStart(2, "0")} / {awards.length}</span>
            <button type="button" onClick={() => select(active + 1)} disabled={active === awards.length - 1} aria-label="Next award"><ArrowRight size={20} /></button>
          </div>
          <DetailLayer title="The awards archive" label="All ten awards and their stories" chapter="VI">
            {awards.map((a) => (
              <article key={a.image} className="detail-plate">
                <Still set="awards" name={a.image} alt={`${a.title}, ${a.date}`} width="960" height="720" />
                <div><h3>{a.title}</h3><p className="label">{a.date} · {awardsIssuer}</p><p>{a.note}</p></div>
              </article>
            ))}
          </DetailLayer>
        </div>
      </div>
    </div>
  );
}

// The archive table: three bodies of record laid out along one long table.
// The camera tracks across it, one station per beat, and one piece at each
// station is lifted into the light to be read.
const stations = [
  { id: "credentials", title: "Twelve credentials.", line: "Cloud, data, AI and agile leadership, examined.", items: credentials, set: "credentials", name: (c) => c.title, meta: (c) => c.issuer },
  { id: "rooms", title: "In the room.", line: "Eight industry events, 2023 to 2026.", items: appearances, set: "events", name: (a) => a.title, meta: (a) => `${a.year} · ${a.kind}` },
  { id: "book", title: "On the page.", line: `${publication.role}, ${publication.title}.`, items: [{ image: publication.cover, title: publication.title }, { image: publication.stage, title: "The contributors, on stage at the launch" }], set: "book", name: (b) => b.title, meta: () => publication.detail }
];

function Study() {
  const { ref, reduce, active, select } = useStory(stations.length);
  const [lifted, setLifted] = useState({ credentials: 0, rooms: 0, book: 0 });
  const station = stations[active];
  const piece = station.items[lifted[station.id]];
  return (
    <div ref={ref} className="story-run study" data-reduced={reduce}>
      <div className="story-sticky wrap">
        <h3 id="archive-title" className="scene-heading">The continuing practice.</h3>
        <div className="study__space stage-bleed">
          <div className="study__table" style={{ "--at": active }}>
            {stations.map((s, si) => (
              <div key={s.id} className={`study__station study__station--${s.id}`} data-current={si === active} style={{ "--s": si }}>
                {s.items.map((item, i) => (
                  <button
                    key={item.image}
                    type="button"
                    className="study__piece"
                    tabIndex={si === active ? 0 : -1}
                    aria-hidden={si !== active}
                    aria-pressed={lifted[s.id] === i}
                    aria-label={`${s.name(item)}. ${s.meta(item)}`}
                    data-lifted={lifted[s.id] === i}
                    style={{ "--n": i, "--odd": i % 2, "--tri": (i % 3) - 1, "--col": i % 4, "--row": Math.floor(i / 4) }}
                    onClick={() => { setLifted((l) => ({ ...l, [s.id]: i })); select(si); }}
                  >
                    <Still set={s.set} name={item.image} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="study__caption" aria-live="polite" aria-atomic="true">
          <div key={active} className="beat"><p className="study__title">{station.title}</p><p className="study__line">{station.line}</p></div>
          <p key={`${active}-${lifted[station.id]}`} className="study__piece-name beat beat--late"><strong>{station.name(piece)}</strong> {station.meta(piece)}</p>
        </div>
        <div className="scene-footer">
          <StoryControls labels={["Credentials", "Events", "Publication"]} active={active} onSelect={select} label="Archive" />
          <div className="study__details">
            <DetailLayer title="Certifications and learning" label="Certification archive" chapter="VI">
              {credentials.map((c) => (
                <article key={c.title} className="detail-plate detail-plate--document">
                  <Still set="credentials" name={c.image} alt={`${c.title} certificate`} width="1100" height="780" />
                  <div><h3>{c.title}</h3><p className="label">{c.issuer}</p></div>
                </article>
              ))}
              {learningArchive.map((g) => <article key={g.group}><h3>{g.group}</h3><ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul></article>)}
            </DetailLayer>
            <DetailLayer title="Events and publication" label="Events and publication" chapter="VI">
              {appearances.map((a) => (
                <article key={a.title + a.year} className="detail-plate">
                  <Still set="events" name={a.image} alt={`Prawal at ${a.title} ${a.year}`} width="900" height="900" />
                  <div><h3>{a.title}</h3><p className="label">{a.year} · {a.kind}</p></div>
                </article>
              ))}
              <article className="detail-plate">
                <Still set="book" name={publication.cover} alt={`Cover of ${publication.title}`} width="582" height="900" />
                <div><h3>{publication.title}</h3><p className="label">{publication.role}</p><p>{publication.detail}</p><p><a href={publication.href} target="_blank" rel="noreferrer">View on Amazon (opens in a new tab)</a></p></div>
              </article>
            </DetailLayer>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Voices. One recommendation at a time holds the room; the people who wrote
 * them sit along the bottom of the frame, and the one speaking is developed
 * from the latent row into the light.
 */
function Voices() {
  const { ref, reduce, active, select } = useStory(recommendations.length);
  const voice = recommendations[active];
  return (
    <div ref={ref} className="story-run voices" data-reduced={reduce}>
      <div className="story-sticky wrap">
        <h3 id="voices-title" className="scene-heading">In their words.</h3>
        <span className="voices__light stage-bleed" aria-hidden="true" />
        <figure className="voices__stage" aria-live="polite" aria-atomic="true">
          <div key={`${active}-face`} className="voices__face beat" aria-hidden="true"><Still set="voices" name={voice.image} width="280" height="350" /></div>
          <blockquote key={active} className="voices__quote beat"><p>“{voice.quote}”</p></blockquote>
          <figcaption key={`${active}-by`} className="voices__by beat beat--late"><strong>{voice.name}</strong><span>{voice.role} · {voice.date}</span></figcaption>
        </figure>
        <div className="scene-footer">
          <nav className="voices__row" aria-label="Recommendations">
            {recommendations.map((r, i) => (
              <button key={r.name} type="button" aria-pressed={i === active} aria-label={r.name} onClick={() => select(i)}>
                <Still set="voices" name={r.image} width="280" height="350" />
              </button>
            ))}
          </nav>
          <DetailLayer title="Professional recommendations" label="All 12 voices" chapter="VI">
            {recommendations.map((r) => (
              <article key={r.name} className="detail-voice">
                <Still set="voices" name={r.image} width="280" height="350" />
                <div><h3>{r.name}</h3><p className="label">{r.role} · {r.date}</p><blockquote><p>“{r.quote}”</p></blockquote></div>
              </article>
            ))}
            <p><a href={recommendationsSource.href} target="_blank" rel="noreferrer">{recommendationsSource.label} (opens in a new tab)</a></p>
          </DetailLayer>
        </div>
      </div>
    </div>
  );
}

export function Recognition() {
  return (
    <section id="recognition" className="chapter recognition bleed" aria-labelledby="recognition-title">
      <Horizon />
      <Exhibition />
      <section className="archive" aria-labelledby="archive-title"><Study /></section>
      <section aria-labelledby="voices-title"><Voices /></section>
    </section>
  );
}
