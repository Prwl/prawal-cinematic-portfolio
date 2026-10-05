import { describe, it, expect } from "vitest";
import { createScenePlayback, sceneScores } from "../src/lib/scenePlayback.js";
function setup() {
  let time = 0; const states = [], beats = [];
  const scene = createScenePlayback({ finalBeat: 4, now: () => time, onState: s => states.push(s), onBeat: b => beats.push(b) });
  return { scene, states, beats, advance: n => { time += n; } };
}
describe("directed scene lifecycle", () => {
  it("enters, autoplays, resolves and releases", () => {
    const {scene, states, beats} = setup(); scene.enter(); scene.resolve(); scene.release();
    expect(states).toEqual(["entering", "playing", "resolved", "released"]); expect(beats).toEqual([4]);
  });
  it("absorbs a single aggressive wheel gesture", () => {
    const {scene, advance} = setup(); scene.enter(); advance(400);
    expect(scene.input(3000)).toBe("hold"); expect(scene.state).toBe("playing");
  });
  it("resolves sustained additional intent after 320ms", () => {
    const {scene, advance} = setup(); scene.enter(); scene.input(160); scene.input(160);
    advance(319); expect(scene.input(160)).toBe("hold"); advance(1);
    expect(scene.input(160)).toBe("skip"); expect(scene.state).toBe("resolved");
  });
  it("resolves direction reversal immediately and never replays on reentry", () => {
    const {scene, states} = setup(); scene.enter(); expect(scene.input(-1)).toBe("reverse"); scene.release(); scene.enter();
    expect(states.filter(s => s === "playing")).toHaveLength(1);
  });
  it("reduced motion and anchor navigation resolve without playing", () => {
    const {scene, states, beats} = setup(); scene.enter({immediate:true});
    expect(states).toEqual(["entering", "resolved"]); expect(beats).toEqual([4]);
  });
  it("cleanup ignores late completions", () => {
    const {scene, beats} = setup(); scene.enter(); scene.dispose(); scene.resolve();
    expect(scene.state).toBe("disposed"); expect(beats).toEqual([]);
  });
  it("manual exploration chooses a coherent frame", () => {
    const {scene, beats} = setup(); scene.enter(); scene.resolve(2); scene.release(); expect(beats).toEqual([2]);
  });
  it("every score leaves room for its final camera arrival", () => {
    for (const score of Object.values(sceneScores)) {
      expect(score.duration - score.beats.at(-1)[0]).toBeGreaterThanOrEqual(.8);
      expect(score.beats.at(-1)[1]).toBe(score.final);
    }
  });
});
