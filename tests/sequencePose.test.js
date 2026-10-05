import { describe, expect, it } from "vitest";
import { chooseFrame, chooseView, frameCost, joinAt, NEAR_UP, pitchFor, reachOf, reachable, shape, spring, tiltFor, yawFor } from "../src/hooks/sequencePose.js";
import manifest from "../src/assets/sequence/sequence.json";

const TILT = { up: 5, down: 3 };

describe("calibration", () => {
  it("keeps production's dead zone and reach", () => {
    expect(shape(0.05)).toBe(0);
    expect(shape(1)).toBe(1);
    expect(shape(-1)).toBe(-1);
    expect(yawFor(1)).toBeCloseTo(-15.84);
    expect(yawFor(-1)).toBeCloseTo(15.84);
    expect(pitchFor(-1)).toBeCloseTo(-9.3);
    expect(pitchFor(1)).toBeCloseTo(6.3);
    expect(pitchFor(0)).toBe(0);
  });
});

describe("the built frames", () => {
  const frames = manifest.frames;
  it("rest is the rest frame, at zero", () => {
    expect(frames[manifest.rest].yaw).toBe(0);
    expect(frames[manifest.rest].pitch).toBe(0);
    expect(chooseFrame(frames, { yaw: 0, pitch: 0 }, -1, TILT)).toBe(manifest.rest);
  });

  it("covers production's level reach on both sides with filmed frames", () => {
    const level = frames.filter((f) => Math.abs(f.pitch) <= 3);
    expect(Math.max(...level.map((f) => f.yaw))).toBeGreaterThan(15.84);
    expect(Math.min(...level.map((f) => f.yaw))).toBeLessThan(-15.84);
  });

  it("turns toward the pointer", () => {
    const right = frames[chooseFrame(frames, { yaw: yawFor(1), pitch: 0 }, -1, TILT)];
    const up = frames[chooseFrame(frames, { yaw: 0, pitch: pitchFor(-1) }, -1, TILT)];
    expect(right.yaw).toBeLessThan(-12);
    expect(up.pitch).toBeLessThan(-6);
  });
});

describe("choosing a frame", () => {
  const frames = [
    { yaw: 0, pitch: 0 },
    { yaw: 1, pitch: 0 },
    { yaw: 2, pitch: 0 },
    { yaw: 0, pitch: -8 },
  ];
  it("prefers a filmed pitch over a tilted one", () => {
    expect(chooseFrame(frames, { yaw: 0, pitch: -8 }, -1, TILT)).toBe(3);
    expect(frameCost(frames[3], { yaw: 0, pitch: -8 }, TILT)).toBeLessThan(frameCost(frames[0], { yaw: 0, pitch: -8 }, TILT));
  });
  it("tilts only as far as reads without stretching", () => {
    expect(tiltFor(frames[0], { yaw: 0, pitch: -8 }, TILT)).toBe(5);
    expect(tiltFor(frames[0], { yaw: 0, pitch: 2 }, TILT)).toBe(-2);
    expect(tiltFor(frames[0], { yaw: 0, pitch: 9 }, TILT)).toBe(-3);
  });
  it("holds the shown frame until another is clearly better", () => {
    expect(chooseFrame(frames, { yaw: 0.6, pitch: 0 }, 0, TILT)).toBe(0);
    expect(chooseFrame(frames, { yaw: 1.4, pitch: 0 }, 0, TILT)).toBe(1);
  });
  it("settles on the best frame once close", () => {
    expect(chooseFrame(frames, { yaw: 1, pitch: 0 }, 0, TILT)).toBe(1);
    expect(chooseFrame(frames, { yaw: 0, pitch: 0 }, 1, TILT)).toBe(0);
  });
  it("uses only frames that are ready", () => {
    expect(chooseFrame(frames, { yaw: 2, pitch: 0 }, 0, TILT, { usable: (k) => k !== 2 })).toBe(1);
  });
});

describe("takes", () => {
  const frames = [
    { yaw: 0, pitch: 0, take: 0 },
    { yaw: 0, pitch: -3, take: 1 },
    { yaw: 0, pitch: -9, take: 1 },
  ];
  it("keep the primary take wherever it and the tilt reach", () => {
    expect(chooseFrame(frames, { yaw: 0, pitch: -3 }, 0, TILT, { primary: 0 })).toBe(0);
    expect(chooseFrame(frames, { yaw: 0, pitch: -3 }, 0, TILT)).toBe(1);
  });
  it("hand over to another take only beyond that", () => {
    expect(chooseFrame(frames, { yaw: 0, pitch: -9 }, 0, TILT, { primary: 0 })).toBe(2);
  });
  it("in the built frames, the centre and the level sweep use the primary take only", () => {
    const f = manifest.frames;
    const primary = f[manifest.rest].take;
    let shown = manifest.rest;
    for (let k = 0; k <= 400; k++) {
      const x = Math.sin((k / 400) * 2 * Math.PI);
      shown = chooseFrame(f, reachable({ yaw: yawFor(x), pitch: pitchFor(0.15 * Math.cos((k / 400) * 6 * Math.PI)) }), shown, TILT, { primary });
      expect(f[shown].take).toBe(primary);
    }
  });
});

describe("joins", () => {
  const frames = [{ yaw: 0.6 }, { yaw: 0 }];
  it("crossfade by position, only strictly between the two frames", () => {
    expect(joinAt(frames, [[0, 1]], 0, { yaw: 0.45 }).mix).toBeCloseTo(0.25);
    expect(joinAt(frames, [[0, 1]], 1, { yaw: 0.15 }).mix).toBeCloseTo(0.75);
    expect(joinAt(frames, [[0, 1]], 0, { yaw: 0 })).toBeNull();
    expect(joinAt(frames, [[0, 1]], 0, { yaw: 0.6 })).toBeNull();
    expect(joinAt(frames, [[0, 1]], 0, { yaw: 2 })).toBeNull();
  });
  it("only while one of the pair is shown", () => {
    expect(joinAt(frames, [[0, 1]], 5, { yaw: 0.3 })).toBeNull();
  });
  it("leave rest to the rest frame alone", () => {
    const f = manifest.frames;
    expect(joinAt(f, manifest.joins, manifest.rest, { yaw: 0, pitch: 0 })).toBeNull();
  });
});

describe("reach", () => {
  const frames = manifest.frames;
  const reach = reachOf(frames, TILT);
  const at = (yaw, pitch) => reachable({ yaw, pitch }, reach).pitch;
  it("never asks for more than was filmed plus the tilt", () => {
    const up = (yaw) => Math.max(0, ...frames.filter((f) => Math.abs(f.yaw - yaw) <= NEAR_UP).map((f) => TILT.up - f.pitch));
    for (const yaw of [-12, -6, 0, 6, 12]) expect(-at(yaw, -30)).toBeLessThanOrEqual(up(yaw) + 1e-9);
  });
  // D8, the lower arc, filmed the whole row 3 to 7 degrees down, so the
  // lower corners reach as far down as the centre.
  it("reaches the full down across the lower row, corners included", () => {
    for (const yaw of [-15, -12, -6, 1.5, 6, 12, 15]) expect(at(yaw, 6.3)).toBeGreaterThan(6);
  });
  it("leaves poses inside the reach alone", () => {
    expect(reachable({ yaw: 3, pitch: -2 }, reach)).toEqual({ yaw: 3, pitch: -2 });
  });

  // The page's own view, replayed: takes, blends, joins, reach, tilts.
  const primary = frames[manifest.rest].take;
  const shownPose = (k, t) => ({ yaw: frames[k].yaw, pitch: frames[k].pitch - tiltFor(frames[k], t, TILT) });
  const replay = (path, n) => {
    const memory = {};
    let prev = null, worst = 0, last = null, cuts = 0, widest = 0;
    const takes = new Set();
    for (let k = 0; k <= n; k++) {
      const [x, y] = path(k / n);
      const t = reachable({ yaw: yawFor(x), pitch: pitchFor(y) }, reach);
      const v = chooseView(frames, t, memory, TILT, { primary, joins: manifest.joins });
      takes.add(frames[v.a].take);
      if (v.mix > 0) takes.add(frames[v.b].take);
      let p = shownPose(v.a, t);
      if (v.mix > 0) {
        const q = shownPose(v.b, t);
        widest = Math.max(widest, Math.hypot(p.yaw - q.yaw, p.pitch - q.pitch));
        p = { yaw: p.yaw + (q.yaw - p.yaw) * v.mix, pitch: p.pitch + (q.pitch - p.pitch) * v.mix };
      }
      if (last && last.mix === 0 && v.mix === 0 && frames[last.a].take !== frames[v.a].take) cuts++;
      if (prev) worst = Math.max(worst, Math.hypot(p.yaw - prev.yaw, p.pitch - prev.pitch));
      prev = p;
      last = v;
    }
    return { worst, takes, cuts, widest, end: last };
  };
  const corners = [[1, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
  const diag = (u) => { const s = u * 4, i = Math.min(3, Math.floor(s)), f = s - i; return [corners[i][0] + (corners[i + 1][0] - corners[i][0]) * f, corners[i][1] + (corners[i + 1][1] - corners[i][1]) * f]; };
  const circle = (u) => [Math.cos(u * 2 * Math.PI) * 0.95, -Math.sin(u * 2 * Math.PI) * 0.95];
  // Two bands were never filmed: below-left of centre, between the nod's (N4)
  // down columns at centre and 5 degrees left, and the top edge at the
  // up-right corner, between R7's rise (17 degrees right) and its return
  // (12 right). Crossing either is one step of up to about 4.6 degrees, which
  // the page dissolves (useSequencePortrait.js, FADE_STEP). R7 replaced
  // R-up-2, whose frames filled that corner (4.2) with hooded eyes.
  it("moves smoothly on a circle and on the diagonals", () => {
    expect(replay(circle, 720).worst).toBeLessThan(4.7);
    expect(replay(diag, 720).worst).toBeLessThan(4.7);
  });
  it("blends only across a join within one take, and never flickers between takes", () => {
    for (const path of [circle, diag, (u) => [0, Math.sin(u * 2 * Math.PI)]]) {
      const memory = {};
      let last = null, lastCut = -99;
      for (let k = 0; k <= 720; k++) {
        const [x, y] = path(k / 720);
        const t = reachable({ yaw: yawFor(x), pitch: pitchFor(y) }, reach);
        const v = chooseView(frames, t, memory, TILT, { primary, joins: manifest.joins });
        if (v.mix > 0) expect(frames[v.b].take).toBe(frames[v.a].take);
        if (last && last.mix === 0 && v.mix === 0 && frames[last.a].take !== frames[v.a].take) {
          expect(k - lastCut).toBeGreaterThan(10);
          lastCut = k;
        }
        last = v;
      }
    }
  });
  it("keeps the centre and the level sweep on the primary take alone", () => {
    expect([...replay((u) => [Math.sin(u * 4 * Math.PI), 0], 1440).takes]).toEqual([primary]);
    expect([...replay((u) => [0.25 * Math.cos(u * 6 * Math.PI), 0.25 * Math.sin(u * 7.8 * Math.PI)], 720).takes]).toEqual([primary]);
  });
  it("returns to the rest frame alone from every edge", () => {
    for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
      const { end } = replay((u) => (u < 0.5 ? [x * u * 2, y * u * 2] : [x * (2 - u * 2), y * (2 - u * 2)]), 240);
      expect(end.a).toBe(manifest.rest);
      expect(end.mix).toBe(0);
    }
  });
});

describe("between takes", () => {
  it("cuts between takes, once, even where their poses nearly match", () => {
    const frames = [
      { yaw: 0, pitch: 0, take: 0 },
      { yaw: 0, pitch: -2, take: 1 },
    ];
    const memory = {};
    const shown = [];
    for (let p = 0; p >= -8; p -= 0.05) {
      const v = chooseView(frames, { yaw: 0, pitch: p }, memory, TILT, { primary: 0 });
      expect(v.mix).toBe(0);
      shown.push(frames[v.a].take);
    }
    expect(shown.filter((t, i) => i && t !== shown[i - 1]).length).toBe(1);
  });
  it("cuts once across a hole, and holds the take it cut to", () => {
    const frames = [
      { yaw: 0, pitch: 0, take: 0 },
      { yaw: 0, pitch: -9, take: 1 },
    ];
    const memory = {};
    const shown = [];
    for (const p of [-3, -5, -6, -6.5, -7, -7.5, -8, -7.5, -7, -6.8, -6.5, -6, -5]) shown.push(frames[chooseView(frames, { yaw: 0, pitch: p }, memory, TILT, { primary: 0 }).a].take);
    const cuts = shown.filter((t, i) => i && t !== shown[i - 1]).length;
    expect(cuts).toBeLessThanOrEqual(2);
    expect(shown.at(-1)).toBe(0);
    expect(shown).toContain(1);
  });
});

describe("spring", () => {
  const run = (hz, seconds) => {
    let x = 0, v = 0;
    for (let k = 0, n = Math.round(hz * seconds); k < n; k++) [x, v] = spring(x, v, 1, 10, 1 / hz);
    return x;
  };
  it("is independent of frame rate", () => {
    expect(run(30, 0.3)).toBeCloseTo(run(120, 0.3), 6);
    expect(run(60, 0.3)).toBeCloseTo(run(150, 0.3), 6);
  });
  it("never overshoots, even across a long hitch", () => {
    const [x0, v0] = spring(0, 0, 1, 10, 0.05);
    const [x] = spring(x0, v0, 1, 10, 0.5);
    expect(x).toBeLessThanOrEqual(1);
    expect(x).toBeGreaterThan(0.95);
  });
});
