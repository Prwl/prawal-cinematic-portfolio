import { describe, expect, it } from "vitest";
import { FOLLOW, FRAMED, boundaryBand, createConfirmer, hurried, slotAt } from "../src/lib/storyBeats.js";

// A system scene's cut: dormant, three primary moments, impact.
const CUT = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4];
const beatAt = (progress, previous = -1, band = 0) => CUT[slotAt(progress, CUT.length, previous, band)];

/** A clock and timer queue under the test's control. */
function fakeTime() {
  let now = 0;
  let id = 0;
  const queue = new Map();
  return {
    now: () => now,
    schedule: (fn, ms) => { queue.set(++id, { fn, at: now + ms }); return id; },
    cancel: (handle) => queue.delete(handle),
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...queue].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        queue.delete(next[0]);
        now = next[1].at;
        next[1].fn();
      }
      now = until;
    },
    get pending() { return queue.size; }
  };
}

function story(arrival = 1000) {
  const time = fakeTime();
  const log = [];
  const confirmer = createConfirmer({
    arrival,
    onMove: (follow) => log.push(follow ? "follow" : "rest"),
    onConfirm: (beat) => log.push(`confirm ${beat}`),
    schedule: time.schedule,
    cancel: time.cancel,
    now: time.now
  });
  return { time, log, confirmer };
}

describe("scroll progress to beat", () => {
  it("lands on the right beat after a large forward jump across several boundaries", () => {
    expect(beatAt(0.02, 0)).toBe(0);
    // One frame, scrollbar drag or anchor jump: dormant straight to output.
    expect(beatAt(0.7, 0)).toBe(3);
    expect(beatAt(1, 0)).toBe(4);
  });

  it("lands on the right beat after a large reverse jump", () => {
    expect(beatAt(0.1, CUT.length - 1)).toBe(1);
    expect(beatAt(0, CUT.length - 1)).toBe(0);
  });

  it("maps the same position to the same beat from either direction", () => {
    for (const p of [0.05, 0.31, 0.5, 0.66, 0.9]) {
      expect(beatAt(p, 0)).toBe(beatAt(p, CUT.length - 1));
    }
  });

  it("clamps progress outside the run", () => {
    expect(beatAt(-0.3)).toBe(0);
    expect(beatAt(1.4)).toBe(4);
  });

  it("holds the current slot within the band at its edge, so a resting hand cannot flicker it", () => {
    const slots = CUT.length;
    const band = boundaryBand(slots, 1200);
    const edge = 4 / slots; // processing begins
    expect(slotAt(edge + band / 2, slots, 3, band)).toBe(3); // just past, still held
    expect(slotAt(edge - band / 2, slots, 4, band)).toBe(4); // and back again
    expect(slotAt(edge + band * 1.5, slots, 3, band)).toBe(4); // clearly past
    expect(slotAt(edge - band * 1.5, slots, 4, band)).toBe(3);
  });

  it("never lets the band hold a slot across a jump", () => {
    const slots = CUT.length;
    const band = boundaryBand(slots, 1200);
    expect(slotAt(0.95, slots, 0, band)).toBe(slots - 1);
  });

  it("keeps the band small: a quarter slot at most, about 24px", () => {
    expect(boundaryBand(13, 1000)).toBeCloseTo(0.024);
    expect(boundaryBand(13, 100000)).toBeCloseTo(0.00024);
    expect(boundaryBand(4, 50)).toBeCloseTo(0.0625);
  });
});

describe("confirmation after the shot arrives", () => {
  it("confirms a single move from rest once the subject is framed", () => {
    const { time, log, confirmer } = story(1000);
    expect(confirmer.target(2)).toBe(false);
    time.advance(1000 * FRAMED - 1);
    expect(log).toEqual(["rest"]);
    time.advance(1);
    expect(log).toEqual(["rest", "confirm 2"]);
  });

  it("cancels a stale confirmation when the reader moves on, and confirms the destination", () => {
    const { time, log, confirmer } = story(1000);
    confirmer.target(1);
    time.advance(300);
    confirmer.target(2);
    time.advance(300);
    confirmer.target(3);
    time.advance(5000);
    expect(log.filter((e) => e.startsWith("confirm"))).toEqual(["confirm 3"]);
    expect(time.pending).toBe(0);
  });

  it("follows on when a move interrupts a camera still travelling, and frames sooner", () => {
    const { time, log, confirmer } = story(1000);
    confirmer.target(1);
    time.advance(200);
    expect(confirmer.target(2)).toBe(true);
    time.advance(1000 * FOLLOW);
    expect(log).toEqual(["rest", "follow", "confirm 2"]);
  });

  it("still follows on after the words confirmed while the camera finishes its move", () => {
    const { time, confirmer } = story(1000);
    confirmer.target(1);
    time.advance(1000 * FRAMED + 10); // words up, camera in its last few percent
    expect(confirmer.target(2)).toBe(true);
  });

  it("moves from rest again once the camera has stopped", () => {
    const { time, confirmer } = story(1000);
    confirmer.target(1);
    time.advance(1500);
    expect(confirmer.target(2)).toBe(false);
  });

  it("follows on for a hurried reader even from rest", () => {
    const { time, log, confirmer } = story(1000);
    expect(confirmer.target(1, true)).toBe(true);
    time.advance(1000 * FOLLOW);
    expect(log).toEqual(["follow", "confirm 1"]);
  });

  it("needs a fresh arrival when reversing back to the beat already confirmed", () => {
    const { time, log, confirmer } = story(1000);
    confirmer.target(1);
    time.advance(2000);
    confirmer.target(2);
    time.advance(100);
    confirmer.target(1);
    expect(confirmer.pending).toBe(true);
    time.advance(2000);
    expect(log.filter((e) => e.startsWith("confirm"))).toEqual(["confirm 1", "confirm 1"]);
  });

  it("confirms nothing after disposal", () => {
    const { time, log, confirmer } = story(1000);
    confirmer.target(1);
    confirmer.dispose();
    time.advance(5000);
    expect(log).toEqual(["rest"]);
  });

  it("settles on the final beat after a fast run through every boundary", () => {
    const { time, log, confirmer } = story(940);
    let previous = -1;
    // A fling: 60 frames from the top of the run to the bottom.
    for (let f = 0; f <= 60; f++) {
      const beat = beatAt(f / 60);
      if (beat !== previous) confirmer.target(beat);
      previous = beat;
      time.advance(16);
    }
    time.advance(2000);
    expect(log.filter((e) => e.startsWith("confirm"))).toEqual(["confirm 4"]);
  });
});

describe("hurried readers", () => {
  const distance = 1300; // px of pinned scroll
  const framed = 940 * FRAMED;

  it("hurries when the next boundary arrives before a shot from rest would frame", () => {
    // Entering input (slot 1) at 1500px/s: 300px of input left, 200ms.
    expect(hurried(CUT, 1, 1 / CUT.length, 1500, distance, framed)).toBe(true);
    expect(hurried(CUT, 1, 1 / CUT.length, 150, distance, framed)).toBe(false);
  });

  it("measures toward the boundary in the direction of travel", () => {
    // Entering processing from below, scrolling up: its lower edge is far.
    expect(hurried(CUT, 7, 8 / CUT.length - 0.001, -400, distance, framed)).toBe(false);
    expect(hurried(CUT, 7, 8 / CUT.length - 0.001, -2000, distance, framed)).toBe(true);
  });

  it("never hurries past the ends of the run, or at rest", () => {
    expect(hurried(CUT, CUT.length - 1, 0.95, 5000, distance, framed)).toBe(false);
    expect(hurried(CUT, 0, 0.01, -5000, distance, framed)).toBe(false);
    expect(hurried(CUT, 4, 0.33, 0, distance, framed)).toBe(false);
  });
});
