import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { gsap, EASE_OUT, EASE_IN_OUT } from "./gsap.js";

const root = () => document.documentElement;

// Only a deliberate gesture ends the sequence. A resting hand on a trackpad,
// a pinch, or a sideways back-swipe produces wheel events too, so the wheel
// has to travel this far vertically, within a short window, to count.
const WHEEL_DISTANCE = 90;
const WHEEL_WINDOW = 450;
const SWIPE_DISTANCE = 44;

// Everything that is still in the dark while the sequence runs. It is inert
// until it is lit, so Tab moves only between controls the visitor can see:
// the skip link and "Skip intro".
const DARK_WHILE_RUNNING = [".site-header", ".cue-rail", ".prologue__actions", "main .page"];

function wheelPixels(e) {
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  return { x: e.deltaX * unit, y: e.deltaY * unit };
}

/**
 * The opening title sequence. Plays only when index.html decided it should
 * (html.intro): no reduced motion, no deep link, page at the top.
 *
 * It ends early only on an intentional request: the Skip intro control, the
 * skip link, Escape, a real scroll of the wheel or trackpad, or a vertical
 * swipe. Ordinary keys, Tab, modifiers and shortcuts (a screen recorder's
 * Cmd+Shift+5, for example) leave it playing.
 *
 * Returns { settled, skip }.
 */
export function useTitleSequence(scope, topologyRef) {
  const [settled, setSettled] = useState(() => typeof document !== "undefined" && !root().classList.contains("intro"));
  const skipRef = useRef(() => {});
  const skip = useCallback(() => skipRef.current(), []);

  useLayoutEffect(() => {
    const html = root();
    // Without the sequence the topology is created already awake.
    if (!html.classList.contains("intro")) return;
    html.classList.add("intro-started", "intro-running");
    const q = gsap.utils.selector(scope);
    const dark = DARK_WHILE_RUNNING.map((s) => document.querySelector(s)).filter(Boolean);
    dark.forEach((el) => (el.inert = true));
    const actions = q(".prologue__actions")[0];

    const tl = gsap.timeline({
      defaults: { ease: EASE_OUT },
      onComplete: finish
    });

    // Darkness. Then a horizon line: the first sign of a stage.
    tl.fromTo(q(".prologue__horizon"), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1.6, ease: EASE_IN_OUT }, 0.5)
      // The back wall and its light come up; the topology starts to glow.
      .fromTo(q(".prologue__wall"), { opacity: 0 }, { opacity: 1, duration: 2.4 }, 1.3)
      .add(() => topologyRef.current?.setLevel(0.4), 1.6)
      // Prawal resolves out of the dark as the key light finds him. He becomes
      // solid first, as a silhouette, and the light does the rest: a plain
      // crossfade would show the wall through him while he is half there.
      .fromTo(q(".prologue__figure"), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power1.out" }, 2.3)
      .fromTo(q(".prologue__figure"), { filter: "brightness(0.06)" }, { filter: "brightness(1)", duration: 2.8, ease: "power2.out" }, 2.3)
      .fromTo(q(".prologue__sweep"), { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: 1, duration: 2.8, ease: EASE_IN_OUT }, 2.4)
      // The virtual camera eases in toward him for the whole sequence.
      .fromTo(q(".prologue__camera"), { scale: 1 }, { scale: 1.035, duration: 7.5, ease: "power2.out" }, 0.5)
      // Title: letters close up from wide tracking, with a focus pull.
      .fromTo(
        q(".prologue__letter"),
        { x: (i, el) => Number(el.dataset.spread || 0), opacity: 0, filter: "blur(10px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.9, stagger: 0.02 },
        3.7
      )
      // The arc lights word by word, like cues called in sequence.
      .fromTo(q(".prologue__cue"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out", stagger: 0.45 }, 4.8)
      // With "Intelligence", the system behind him wakes.
      .add(() => topologyRef.current?.wake(), 6.1)
      // The actions become reachable the moment they start to come up.
      .add(() => actions && (actions.inert = false), 6.4)
      .fromTo(q(".prologue__after"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12 }, 6.4);

    function skip() {
      if (tl.progress() < 1) tl.progress(1);
    }

    function finish() {
      // If the visitor pressed Skip intro, the control is about to leave the
      // page; keep their place by moving focus to the title it revealed.
      const hadFocus = document.activeElement?.classList.contains("prologue__skip");
      topologyRef.current?.wake(-10);
      gsap.set(q(".prologue__letter, .prologue__cue, .prologue__after, .prologue__figure, .prologue__wall, .prologue__horizon"), {
        clearProps: "all"
      });
      gsap.set(q(".prologue__sweep"), { opacity: 0 });
      dark.forEach((el) => (el.inert = false));
      html.classList.remove("intro", "intro-running");
      setSettled(true);
      removeListeners();
      if (hadFocus) q(".prologue__name")[0]?.focus({ preventScroll: true });
    }

    // Escape is the one key that means "skip". Everything else, including
    // Tab and any combination with Cmd, Ctrl, Option or Shift, is ignored.
    function onKey(e) {
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey) skip();
    }

    let wheelTravel = 0;
    let wheelSince = 0;
    function onWheel(e) {
      // ctrlKey marks a trackpad pinch; a mostly sideways gesture is a
      // back/forward swipe. Neither is a request to scroll the page.
      if (e.ctrlKey) return;
      const { x, y } = wheelPixels(e);
      if (Math.abs(y) <= Math.abs(x)) return;
      if (e.timeStamp - wheelSince > WHEEL_WINDOW) wheelTravel = 0;
      wheelSince = e.timeStamp;
      wheelTravel += Math.abs(y);
      if (wheelTravel >= WHEEL_DISTANCE) skip();
    }

    let touchStart = null;
    function onTouchStart(e) {
      touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }
    function onTouchMove(e) {
      // A second finger means a pinch, not a swipe.
      if (!touchStart || e.touches.length !== 1) return (touchStart = null);
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (Math.abs(dy) >= SWIPE_DISTANCE && Math.abs(dy) > Math.abs(dx) * 1.2) skip();
    }

    // The skip link jumps into the page, so it has to bring the stage up first.
    const skipLink = document.querySelector(".skip-link");
    skipLink?.addEventListener("click", skip);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    function removeListeners() {
      skipLink?.removeEventListener("click", skip);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    }

    skipRef.current = skip;

    return () => {
      removeListeners();
      tl.kill();
      dark.forEach((el) => (el.inert = false));
      html.classList.remove("intro-running");
    };
  }, [scope, topologyRef]);

  return { settled, skip };
}
