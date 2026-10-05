/** One page-level navigation observer. Wheel interception exists only during a gate. */
const scenes = new Set();
let locked = null, previousY = 0, bypassUntil = 0, overflow = "", listening = false, initialAnchor = null;
const desktop = () => matchMedia("(min-width: 700px) and (min-height: 700px) and (pointer: fine)").matches;
export function releaseScene(scene) {
  if (locked !== scene) return;
  locked = null;
  document.documentElement.style.overflow = overflow;
  window.removeEventListener("wheel", wheel);
}
function wheel(e) {
  if (!locked || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.target.closest?.("dialog")) return;
  const scene = locked;
  const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
  const action = scene.input(delta);
  if (action === "hold") e.preventDefault();
  else scene.finish();
}
function bypass() {
  bypassUntil = performance.now() + 1000;
  locked?.finish();
}
function key(e) {
  if (!e.metaKey && !e.ctrlKey && !e.altKey && ["Tab", "Escape", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) bypass();
}
function resolveAnchor(hash) {
  let target;
  try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
  if (!target) return null;
  const scene = [...scenes].find(s => target === s.el || target.contains(s.el));
  if (scene) scene.finish();
  return target;
}
function click(e) {
  const anchor = e.target.closest?.("a[href^='#']");
  if (anchor || e.target.closest?.(".detail-link, .site-header__toggle")) bypass();
  if (anchor) resolveAnchor(anchor.hash);
}
function hashchange() { bypass(); resolveAnchor(location.hash); }
function measure() {
  bypass();
  for (const s of scenes) { const r = s.el.getBoundingClientRect(); s.top = r.top + scrollY; s.bottom = r.bottom + scrollY; }
  previousY = scrollY;
}
function scroll() {
  const y = scrollY, forward = y >= previousY;
  if (locked) {
    if (y < locked.top - 2) locked.finish();
    else if (Math.abs(y - locked.top) > 1) { window.scrollTo({ top: locked.top, behavior: "instant" }); return; }
  }
  const bypassing = performance.now() < bypassUntil;
  for (const s of [...scenes].sort((a, b) => a.top - b.top)) {
    if (s.state() !== "unseen") {
      if (!desktop() && s.state() === "playing" && (y > s.top + 80 || y + innerHeight < s.top)) s.finish();
      continue;
    }
    const reached = desktop() ? y >= s.top - 1 : y + innerHeight * .4 >= s.top;
    if (!reached) continue;
    if (y >= s.bottom && (bypassing || !forward || !desktop())) { s.enter(true); continue; }
    const gate = desktop() && forward && !bypassing && s.gate;
    s.enter(bypassing || !forward);
    if (gate && s.state() === "playing") {
      locked = s; overflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      window.scrollTo({ top: s.top, behavior: "instant" });
      window.addEventListener("wheel", wheel, { passive: false });
      previousY = s.top; return;
    }
  }
  previousY = y;
}
export function registerScene(scene) {
  const r = scene.el.getBoundingClientRect();
  scene.top = r.top + scrollY; scene.bottom = r.bottom + scrollY;
  scenes.add(scene);
  if (!listening) {
    listening = true; previousY = scrollY;
    if (location.hash) { bypassUntil = performance.now() + 1200; initialAnchor = location.hash; }
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("touchstart", bypass, { passive: true });
    window.addEventListener("click", click, true);
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", hashchange);
  }
  const frame = requestAnimationFrame(() => {
    if (initialAnchor) {
      const hash = initialAnchor; initialAnchor = null;
      resolveAnchor(hash)?.scrollIntoView({ behavior: "instant" });
    }
    scroll();
  });
  return () => {
    cancelAnimationFrame(frame); releaseScene(scene); scenes.delete(scene);
    if (scenes.size) return;
    listening = false;
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("keydown", key);
    window.removeEventListener("touchstart", bypass);
    window.removeEventListener("click", click, true);
    window.removeEventListener("resize", measure);
    window.removeEventListener("hashchange", hashchange);
  };
}
