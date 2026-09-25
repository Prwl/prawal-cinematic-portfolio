import { useLayoutEffect, useRef } from "react";
import { ArrowDown, DownloadSimple } from "@phosphor-icons/react";
import { profile } from "../data/profile.js";
import { documents } from "../data/contact.js";
import { Portrait } from "../components/Portrait.jsx";
import { CanvasStage } from "../experience/CanvasStage.jsx";
import { topologyScene } from "../experience/topology.js";
import { useTitleSequence } from "../motion/useTitleSequence.js";
import { gsap, ScrollTrigger } from "../motion/gsap.js";
import { prefersReducedMotion } from "../hooks/useReducedMotion.js";
import "../styles/prologue.css";

// Letters close up from wide tracking. Offsets grow toward the word's edges.
function TrackedWord({ word, spread }) {
  const letters = [...word];
  const mid = (letters.length - 1) / 2;
  return (
    <span className="prologue__word" aria-hidden="true">
      {letters.map((ch, i) => (
        <span key={i} className="prologue__letter" data-spread={Math.round((i - mid) * spread)}>
          {ch}
        </span>
      ))}
    </span>
  );
}

export function Prologue() {
  const scope = useRef(null);
  const topology = useRef(null);
  const { settled, skip } = useTitleSequence(scope, topology);
  const startAwake = typeof document !== "undefined" && !document.documentElement.classList.contains("intro");

  // Leaving the opening: the stage drifts away and dims while the camera keeps
  // pushing in. The horizon does not leave with it. It holds its place on
  // screen while the set recedes, and the next chapter arrives on it: the
  // same line becomes chapter I's horizon (see Horizon, variant "handoff").
  useLayoutEffect(() => {
    if (!settled || prefersReducedMotion()) return;
    const section = scope.current;
    const camera = section.querySelector(".prologue__camera");
    const floor = section.querySelector(".prologue__floor");
    const ctx = gsap.context(() => {
      const trigger = { trigger: section, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".prologue__camera", { yPercent: 10, scale: 1.09, ease: "none", scrollTrigger: trigger });
      gsap.to(".prologue__topology", { yPercent: -8, ease: "none", scrollTrigger: trigger });
      gsap.to(".prologue__copy", { y: -90, opacity: 0, ease: "none", scrollTrigger: { ...trigger, end: "60% top" } });
      gsap.to(".prologue__dim", { opacity: 1, ease: "none", scrollTrigger: trigger });

      // Where the camera's horizon sits right now, in the section's own space:
      // the floor line scaled about the camera's transform origin.
      const horizonTop = () => {
        const scale = Number(gsap.getProperty(camera, "scale")) || 1;
        const originY = (parseFloat(getComputedStyle(camera).transformOrigin.split(" ")[1]) || 0);
        return originY + (floor.offsetTop - originY) * scale;
      };
      // The handoff line starts on the camera's horizon and travels, in the
      // section's space, to its bottom edge: the top of chapter I. Measured
      // against the viewport it barely moves.
      gsap.fromTo(
        ".prologue__handoff",
        { y: () => horizonTop() },
        {
          y: () => section.offsetHeight,
          ease: "none",
          immediateRender: true,
          scrollTrigger: { trigger: section, start: "top top", end: "bottom 75%", scrub: true, invalidateOnRefresh: true }
        }
      );
      const early = { trigger: section, start: "top top", end: "12% top", scrub: true };
      gsap.to(".prologue__horizon", { opacity: 0, ease: "none", scrollTrigger: early });
      gsap.fromTo(".prologue__handoff", { opacity: 0 }, { opacity: 1, ease: "none", immediateRender: true, scrollTrigger: early });
      // Once it lies on chapter I's horizon, that horizon takes over.
      gsap.to(".prologue__handoff-line", {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: section, start: "bottom 75%", end: "bottom 62%", scrub: true }
      });
    }, scope);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [settled]);

  return (
    <section ref={scope} className="prologue" aria-labelledby="prologue-title">
      <div className="prologue__camera" aria-hidden="true">
        <div className="prologue__wall">
          <span className="prologue__beam prologue__beam--1" />
          <span className="prologue__beam prologue__beam--2" />
          <span className="prologue__beam prologue__beam--3" />
          <span className="prologue__backlight" />
          <span className="prologue__key" />
        </div>
        <div className="prologue__topology">
          <CanvasStage
            scene={topologyScene}
            sceneRef={topology}
            className="prologue__canvas"
            label=""
            options={{ awake: startAwake, focusX: 0.7, focusY: 0.34, reach: 0.78 }}
          />
        </div>
        <div className="prologue__floor">
          <span className="prologue__horizon" />
        </div>
        <Portrait
          className="prologue__figure"
          priority
          alt=""
          sizes="(orientation: portrait) 90vw, 40vw"
        />
        <span className="prologue__sweep" />
        <span className="prologue__haze" />
        <span className="prologue__vignette" />
      </div>
      <span className="prologue__dim" aria-hidden="true" />
      <span className="prologue__handoff" aria-hidden="true">
        <span className="prologue__handoff-line" />
      </span>

      <div className="prologue__copy">
        <h1 id="prologue-title" className="prologue__name title-wide" tabIndex={-1}>
          <span className="visually-hidden">{profile.name}</span>
          <TrackedWord word={profile.givenName} spread={34} />
          <TrackedWord word={profile.familyName} spread={34} />
        </h1>
        <p className="prologue__arc">
          {profile.arc.map((word, i) => (
            <span key={word} className={`prologue__cue${i === profile.arc.length - 1 ? " is-current" : ""}`}>
              {word}
              {i < profile.arc.length - 1 ? <span className="visually-hidden">, </span> : "."}
            </span>
          ))}
        </p>
        <p className="prologue__standfirst prologue__after">{profile.standfirst}</p>
        <div className="prologue__actions prologue__after">
          <a className="action" href="#systems">
            See the work
            <ArrowDown size={16} weight="bold" aria-hidden="true" />
          </a>
          <a className="action action--ghost" href={documents.resume.href} download={documents.resume.filename}>
            {documents.resume.label}
            <DownloadSimple size={16} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </div>

      {!settled && (
        <button type="button" className="prologue__skip" onClick={skip}>
          Skip intro
        </button>
      )}
    </section>
  );
}
