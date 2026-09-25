import { useEffect, useRef, useState } from "react";
import { EnvelopeSimple, LinkedinLogo, DownloadSimple, Copy, Check } from "@phosphor-icons/react";
import { contact, documents } from "../data/contact.js";
import { profile } from "../data/profile.js";
import { email, phone, phoneHref } from "../lib/contact.js";
import { Portrait } from "../components/Portrait.jsx";
import { CanvasStage } from "../experience/CanvasStage.jsx";
import { topologyScene } from "../experience/topology.js";
import { Horizon } from "../components/Horizon.jsx";
import { prefersReducedMotion } from "../hooks/useReducedMotion.js";
import "../styles/epilogue.css";

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(email());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className="epilogue__copy-btn" onClick={copy} aria-live="polite">
      {copied ? <Check size={15} weight="bold" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}

// How long after the close is on stage before it settles: long enough for
// its lamps to come up (1100ms plus the cue stagger).
const SETTLE_AFTER = 1600;
const topologyOptions = { awake: true, focusX: 0.72, focusY: 0.4, reach: 0.7, seed: 19, density: 0.8 };

/**
 * The close. The camera has moved in; for the first time the page speaks in
 * his voice. The topology from the opening returns, quieter.
 *
 * It ends the way the film began, in reverse: once the close is on stage and
 * lit, the horizon draws out behind him, and then the set comes to rest.
 * Signals stop, nodes stop breathing, and the canvas stops drawing.
 */
export function Epilogue() {
  const address = email();
  const ref = useRef(null);
  const topology = useRef(null);

  useEffect(() => {
    const section = ref.current;
    const copy = section.querySelector(".epilogue__copy");
    let timer = 0;
    const settle = () => {
      section.dataset.settled = "";
      topology.current?.settle?.();
    };
    if (prefersReducedMotion()) {
      settle();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer = setTimeout(() => {
          settle();
          observer.disconnect();
        }, SETTLE_AFTER);
      },
      { threshold: 0.6 }
    );
    observer.observe(copy);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={ref} id="contact" className="chapter epilogue" aria-labelledby="contact-title">
      <div className="epilogue__stage" aria-hidden="true">
        <div className="epilogue__topology">
          <CanvasStage scene={topologyScene} sceneRef={topology} className="epilogue__canvas" options={topologyOptions} />
        </div>
        <span className="epilogue__backlight" />
        <div className="epilogue__floor">
          <span className="epilogue__horizon" />
        </div>
        <Portrait variant="close" className="epilogue__figure" alt="" sizes="(orientation: portrait) 90vw, 44vw" />
        <span className="epilogue__vignette" />
      </div>
      <Horizon />

      <div className="wrap epilogue__copy">
        <h2 id="contact-title" className="epilogue__title" data-lamp>
          Tell me what you’re building.
        </h2>
        <p className="lede epilogue__lede" data-lamp style={{ "--cue": 1 }}>
          {contact.availability.split("AI-led").flatMap((part, i) =>
            i === 0 ? [part] : [<span key={i} className="nowrap">AI-led</span>, part]
          )}
        </p>

        <div className="epilogue__actions" data-lamp style={{ "--cue": 2 }}>
          <a className="action" href={`mailto:${address}`}>
            <EnvelopeSimple size={16} weight="bold" aria-hidden="true" />
            Email Prawal
          </a>
          <a className="action action--ghost" href={contact.linkedin} target="_blank" rel="noreferrer">
            <LinkedinLogo size={16} weight="bold" aria-hidden="true" />
            LinkedIn
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <a className="action action--ghost" href={documents.resume.href} download={documents.resume.filename}>
            <DownloadSimple size={16} weight="bold" aria-hidden="true" />
            {documents.resume.label}
          </a>
        </div>

        <dl className="epilogue__direct" data-lamp style={{ "--cue": 3 }}>
          <div>
            <dt className="label">Email</dt>
            <dd>
              <a className="text-link" href={`mailto:${address}`}>
                {address}
              </a>
              <CopyEmail />
            </dd>
          </div>
          <div>
            <dt className="label">Phone</dt>
            <dd>
              <a className="text-link num" href={phoneHref()}>
                {phone()}
              </a>
            </dd>
          </div>
          <div>
            <dt className="label">Based in</dt>
            <dd>{profile.location}</dd>
          </div>
        </dl>
      </div>

      <footer className="wrap site-footer">
        <p>
          {profile.name}. {profile.role}, {profile.company}.
        </p>
        <p className="num">© {new Date().getFullYear()}</p>
        <a className="text-link" href="#top">
          Back to the opening
        </a>
      </footer>
    </section>
  );
}
