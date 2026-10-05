/** Small deterministic lifecycle; the adapter supplies a GSAP clock and DOM gate. */
export function createScenePlayback({ onState, onBeat, finalBeat, now = () => performance.now() }) {
  let state = "unseen", started = 0, distance = 0, inputs = 0;
  const change = next => { state = next; onState(next); };
  return {
    get state() { return state; },
    enter({ immediate = false } = {}) {
      if (state !== "unseen") return;
      change("entering"); started = now();
      if (immediate) this.resolve(); else change("playing");
    },
    input(delta) {
      if (state !== "playing") return "native";
      if (delta < 0) { this.resolve(); return "reverse"; }
      inputs++; distance += Math.min(Math.abs(delta), 160);
      if (now() - started >= 320 && inputs >= 3 && distance >= 240) {
        this.resolve(); return "skip";
      }
      return "hold";
    },
    resolve(beat = finalBeat) {
      if (state === "disposed") return;
      onBeat(beat); change("resolved");
    },
    release() { if (state === "resolved") change("released"); },
    dispose() { change("disposed"); }
  };
}

// Seconds, deliberately unequal: camera travel, consequence, then a settled hold.
export const sceneScores = {
  taxonomy: { beats: [[0, 0], [.3, 1], [.85, 2], [2, 3], [3.05, 4]], duration: 3.9, final: 4 },
  assembly: { beats: [[0, 0], [.45, 1], [.95, 2], [1.45, 3], [2.1, 4]], duration: 3.5, final: 4 },
  transactions: { beats: [[0, 1], [.7, 2], [2.05, 3], [2.95, 4]], duration: 3.9, final: 4 },
  pipeline: { beats: [[0, 1], [.75, 2], [1.75, 3], [2.75, 4]], duration: 3.6, final: 4 },
  ascent: { beats: [[0, 0], [.5, 1], [.75, 2], [1.05, 3], [1.6, 4], [2.45, 5]], duration: 3.7, final: 5 },
  'scale-scene': { beats: [[0, 0], [1.1, 1], [1.45, 2], [1.85, 3]], duration: 3.5, final: 3 },
  hall: { beats: [[0, 0], [.55, 1], [1.15, 2], [1.85, 3]], duration: 3.5, final: 3 },
  exhibition: { beats: [[0, 0], [.9, 2], [1.85, 4]], duration: 3.2, final: 4 },
  study: { beats: [[0, 0]], duration: 1.2, final: 0, gate: false },
  voices: { beats: [[0, 0]], duration: 1.2, final: 0, gate: false }
};
