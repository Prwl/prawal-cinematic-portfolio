// Reads a story run's state from the DOM the scenes already render, so QA
// needs no diagnostics in the shipped page. Installed with addInitScript;
// defines window.__story(runElement) -> { active, confirmed, moving }.
export const storyStateScript = `
window.__story = (el) => {
  const index = (list, test) => [...list].findIndex(test);
  const q = (s) => el.querySelectorAll(s);
  let active = -1;
  if (el.matches(".hall")) active = index(q(".hall__flat"), (n) => n.dataset.state === "current");
  else if (el.matches(".ascent")) active = index(q(".ascent__step"), (n) => n.dataset.state === "current");
  else if (el.matches(".system-story")) active = +el.dataset.beat;
  else if (el.matches(".scale-scene")) active = index(q(".scale-scene__event svg"), (n) => n.dataset.current === "true");
  else if (el.matches(".assembly")) {
    // Blocks are drawn back to front: principles 1, 0, then 2, 3.
    const i = index(q(".assembly__block"), (n) => n.dataset.state === "arriving");
    active = el.dataset.complete === "true" ? 4 : i < 0 ? -1 : [1, 0, 2, 3][i];
  }
  else if (el.matches(".exhibition")) active = index(q(".exhibition__print"), (n) => n.dataset.state === "current");
  else if (el.matches(".study")) active = index(q(".study__station"), (n) => n.dataset.current === "true");
  else if (el.matches(".voices")) active = index(q(".voices__row button"), (n) => n.getAttribute("aria-pressed") === "true");
  let confirmed = index(q(".story-controls button"), (n) => n.getAttribute("aria-pressed") === "true");
  if (el.matches(".exhibition")) confirmed = parseInt(el.querySelector(".gallery-controls .num").textContent, 10) - 1;
  if (el.matches(".voices")) confirmed = active;
  return { active, confirmed, moving: el.dataset.moving === "true", follow: el.dataset.follow === "true" };
};
`;
