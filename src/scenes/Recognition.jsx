import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  recognition,
  awards,
  awardsIssuer,
  credentials,
  learningArchive,
  recommendations,
  recommendationsSource,
  appearances,
  publication
} from "../data/recognition.js";
import { awardImage } from "../lib/media.js";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useCueFocus, cueState } from "../hooks/useCueFocus.js";
import { Horizon } from "../components/Horizon.jsx";
import "../styles/recognition.css";

/** The exhibition wall. The exhibit nearest the centre of the wall is under the pinspot. */
function Exhibition() {
  const wallRef = useRef(null);
  const [spot, setSpot] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const wall = wallRef.current;
    const items = [...wall.querySelectorAll(".exhibit")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSpot(items.indexOf(e.target));
      },
      { root: wall, rootMargin: "0px -70% 0px -16%", threshold: 0 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function step(dir) {
    const wall = wallRef.current;
    const items = wall.querySelectorAll(".exhibit");
    const next = items[Math.max(0, Math.min(items.length - 1, spot + dir))];
    const inset = parseFloat(getComputedStyle(wall).scrollPaddingLeft) || 0;
    wall.scrollTo({ left: next.offsetLeft - inset, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="exhibition">
      <div className="exhibition__controls">
        <button type="button" className="exhibition__btn" onClick={() => step(-1)} disabled={spot === 0} aria-label="Previous award">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="exhibition__btn"
          onClick={() => step(1)}
          disabled={spot === awards.length - 1}
          aria-label="Next award"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <ul ref={wallRef} className="exhibition__wall" tabIndex={0} aria-label={`Ten awards from ${awardsIssuer}, newest first. Scroll sideways.`}>
        {awards.map((a, i) => {
          const img = awardImage(a.image);
          return (
            <li key={a.image} className="exhibit" data-spot={i === spot ? "" : undefined}>
              <figure>
                <picture className="exhibit__frame">
                  <source type="image/avif" srcSet={img.avif} />
                  <img src={img.webp} alt={`${a.title}, ${a.date}`} loading="lazy" decoding="async" />
                </picture>
                <figcaption className="exhibit__label">
                  <span className="exhibit__title">{a.title}</span>
                  <span className="exhibit__date num">{a.date}</span>
                  <span className="exhibit__note">{a.note}</span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Voices() {
  const [current, setCurrent] = useState(0);
  const r = recommendations[current];
  return (
    <section className="voices" aria-labelledby="voices-title">
      <h3 id="voices-title" className="h3" data-lamp>
        Recommendations
      </h3>
      <div className="voices__grid">
        <ul className="voices__names" aria-label="Choose a recommendation">
          {recommendations.map((v, i) => (
            <li key={v.name}>
              <button type="button" className="voices__name" aria-pressed={i === current} onClick={() => setCurrent(i)}>
                <span>{v.name}</span>
                <span className="voices__role">{v.role}</span>
              </button>
            </li>
          ))}
        </ul>
        <figure className="voices__quote" aria-live="polite">
          <blockquote key={r.name}>
            <p>“{r.quote}”</p>
          </blockquote>
          <figcaption>
            <span className="voices__who">{r.name}</span>
            <span className="voices__meta">
              {r.role}, {r.date}
            </span>
          </figcaption>
          <a className="text-link voices__source" href={recommendationsSource.href} target="_blank" rel="noreferrer">
            {recommendationsSource.label}
            <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            <span className="visually-hidden"> (opens LinkedIn in a new tab)</span>
          </a>
        </figure>
      </div>
    </section>
  );
}

// Group records by a key, keeping first-seen order.
function groupBy(list, key) {
  const groups = new Map();
  for (const item of list) {
    const k = item[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(item);
  }
  return [...groups];
}

/**
 * Certifications as a catalogue: each issuer is a drawer of the archive,
 * named wide, with its certificates set beside it. The drawer at the middle
 * of the screen is under the light; ones already read stay up.
 */
function Register() {
  const listRef = useRef(null);
  const reduce = useReducedMotion();
  const byIssuer = useMemo(() => groupBy(credentials, "issuer"), []);
  const focus = useCueFocus(listRef, ".catalogue__drawer", { band: "-40% 0px -48% 0px", enabled: !reduce });
  const archiveCount = learningArchive.reduce((n, g) => n + g.items.length, 0);
  return (
    <section className="register" aria-labelledby="register-title">
      <h3 id="register-title" className="h3" data-lamp>
        Certifications
      </h3>
      <ul ref={listRef} className="catalogue">
        {byIssuer.map(([issuer, items], i) => (
          <li key={issuer} className="catalogue__drawer" data-state={cueState(i, focus, reduce)}>
            <p className="catalogue__issuer">
              {issuer}
              <span className="catalogue__count num" aria-hidden="true">
                {items.length}
              </span>
            </p>
            <ul className="catalogue__items">
              {items.map((c) => (
                <li key={c.title} className="catalogue__item">
                  <span className="visually-hidden">{issuer}: </span>
                  {c.title}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <details className="fineprint register__archive">
        <summary>Full learning archive, {archiveCount} more</summary>
        <div className="register__groups">
          {learningArchive.map((g) => (
            <div key={g.group}>
              <h4 className="label">{g.group}</h4>
              <ul>
                {g.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

/** Appearances by year, with the book set apart as the one publication. */
function Appearances() {
  const byYear = useMemo(() => groupBy(appearances, "year"), []);
  return (
    <section className="appearances" aria-labelledby="appearances-title">
      <h3 id="appearances-title" className="h3" data-lamp>
        Events and publications
      </h3>
      <div className="appearances__grid">
        <ol className="appearances__years">
          {byYear.map(([year, items], i) => (
            <li key={year} className="appearances__year" data-lamp style={{ "--cue": i }}>
              <p className="appearances__when title-wide num">{year}</p>
              <ul className="appearances__list">
                {items.map((a) => (
                  <li key={a.title} className="appearances__row">
                    <span className="appearances__title">{a.title}</span>
                    <span className="appearances__kind">{a.kind}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <div className="publication" data-lamp style={{ "--cue": 1 }}>
          <p className="publication__title">{publication.title}</p>
          <p className="publication__detail">
            {publication.role}. {publication.detail}
          </p>
          <a className="text-link publication__link" href={publication.href} target="_blank" rel="noreferrer">
            View on Amazon
            <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function Recognition() {
  return (
    <section id="recognition" className="chapter recognition" aria-labelledby="recognition-title">
      <Horizon />
      <div className="wrap">
        <h2 id="recognition-title" className="h2" data-lamp>
          {recognition.heading}
        </h2>
      </div>

      <Exhibition />

      {/* The light leaves the award wall and comes down on the archive. */}
      <div className="archive">
        <Horizon />
        <div className="wrap">
          <Register />
          <Voices />
          <Appearances />
        </div>
      </div>
    </section>
  );
}
