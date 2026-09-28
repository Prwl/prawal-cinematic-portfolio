import { useLayoutEffect, useRef } from "react";
import { ArrowDown, DownloadSimple } from "@phosphor-icons/react";
import { profile } from "../data/profile.js";
import { documents } from "../data/contact.js";
import { LivingPortrait } from "../components/LivingPortrait.jsx";
import { AtlasPortrait } from "../components/AtlasPortrait.jsx";
import { heroVariant } from "../lib/atlasMedia.js";
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

// Experiment: ?hero=atlas swaps in the directional-atlas portrait. Without the
// flag the page is exactly production.
const HeroPortrait = heroVariant() === "atlas" ? AtlasPortrait : LivingPortrait;

export function Prologue() {
  const scope = useRef(null);
  const { settled, skip } = useTitleSequence(scope);

  // Leaving the opening: the camera keeps pushing in while the hall gives way
  // to the next room's light. The horizon does not leave with it. It holds its
  // place on screen and becomes chapter I's horizon (Horizon, "handoff").
  useLayoutEffect(() => {
    if (!settled || prefersReducedMotion()) return;
    const section = scope.current;
    const camera = section.querySelector(".prologue__camera");
    const floor = section.querySelector(".prologue__floor");
    const ctx = gsap.context(() => {
      const trigger = { trigger: section, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".prologue__camera", { yPercent: 8, scale: 1.07, ease: "none", scrollTrigger: trigger });
      gsap.to(".prologue__copy", { y: -90, opacity: 0, ease: "none", scrollTrigger: { ...trigger, end: "60% top" } });
      gsap.to(".prologue__camera", { opacity: 0, ease: "none", scrollTrigger: { trigger: section, start: "35% top", end: "bottom top", scrub: true } });
      // The section's bottom edge would slice through him as it rises; the
      // camera's lower edge dissolves into the next room's light instead.
      gsap.fromTo(
        camera,
        { "--exit": "0%" },
        {
          "--exit": "60%",
          ease: "none",
          immediateRender: true,
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "55% top",
            scrub: true,
            onToggle: (self) => section.toggleAttribute("data-leaving", self.isActive || self.progress > 0)
          }
        }
      );

      const horizonTop = () => {
        const scale = Number(gsap.getProperty(camera, "scale")) || 1;
        const originY = parseFloat(getComputedStyle(camera).transformOrigin.split(" ")[1]) || 0;
        return originY + (floor.offsetTop - originY) * scale;
      };
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
        <div className="prologue__hall">
          <span className="prologue__recess" />
          <span className="prologue__pilaster prologue__pilaster--1" />
          <span className="prologue__pilaster prologue__pilaster--2" />
          <span className="prologue__shaft" />
        </div>
        <div className="prologue__floor">
          <span className="prologue__sunpatch" />
          <span className="prologue__horizon" />
        </div>
        <HeroPortrait className="prologue__figure" settled={settled} />
        <span className="prologue__exposure" />
      </div>
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
