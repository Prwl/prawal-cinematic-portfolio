import { describe, expect, it } from "vitest";
import { nearestFrame, pickSpoke, pickStop, reach, usableSpoke } from "../src/hooks/atlasPose.js";
import manifest from "../src/assets/atlas/atlas.json";

describe("atlas pose rules", () => {
  it("maps the pointer to the eight screen directions (y is down)", () => {
    expect(pickSpoke(1, 0, -1)).toBe(0); // right
    expect(pickSpoke(1, -1, -1)).toBe(1); // up-right
    expect(pickSpoke(0, -1, -1)).toBe(2); // up
    expect(pickSpoke(-1, 0, -1)).toBe(4); // left
    expect(pickSpoke(0, 1, -1)).toBe(6); // down
    expect(pickSpoke(1, 1, -1)).toBe(7); // down-right
  });

  it("holds a direction across its boundary until the pose is clearly past it", () => {
    const edge = Math.tan(Math.PI / 8); // exactly between right and up-right
    expect(pickSpoke(1, -edge * 1.05, 0)).toBe(0);
    expect(pickSpoke(1, -1, 0)).toBe(1);
  });

  it("reaches full turn at the screen's edges and corners alike", () => {
    expect(reach(1, 0)).toBe(1);
    expect(reach(1, 1)).toBe(1);
    expect(reach(0.5, 0.2)).toBe(0.5);
  });

  it("only ever targets stops, and does not dither between two", () => {
    const stops = [[0, 0], [3, 0.4], [6, 0.8], [8, 1.3]];
    expect(pickStop(stops, 0.05)).toBe(0);
    expect(pickStop(stops, 0.95)).toBe(3); // a stop past full reach counts as 1
    expect(pickStop(stops, 0.62, 1)).toBe(1); // halfway: keep the current one
    expect(pickStop(stops, 0.75, 1)).toBe(2);
  });

  it("serves an unfilmed direction from its nearer usable neighbour", () => {
    const usable = [true, true, true, true, true, false, true, true];
    expect(usableSpoke(5, (5 * Math.PI) / 4 - 0.2, usable)).toBe(4);
    expect(usableSpoke(5, (5 * Math.PI) / 4 + 0.2, usable)).toBe(6);
    expect(usableSpoke(2, 0, usable)).toBe(2);
  });

  it("finds the frame at a turn", () => {
    expect(nearestFrame([0, 0.2, 0.5, 0.9], 0.6)).toBe(2);
  });
});

describe("atlas manifest", () => {
  it("has a centre and at least seven usable directions, each ending on a clean stop", () => {
    const usable = manifest.spokes.filter((s) => s.usable);
    expect(manifest.spokes).toHaveLength(8);
    expect(usable.length).toBeGreaterThanOrEqual(7);
    for (const s of usable) {
      expect(s.frames.at(-1).stop).toBe(true);
      // Radii rise, so a radius names one frame.
      s.frames.forEach((f, k) => k && expect(f.r).toBeGreaterThan(s.frames[k - 1].r));
      // No stop is ever a blink.
      expect(s.frames.some((f) => f.stop && f.blink)).toBe(false);
    }
  });
});
