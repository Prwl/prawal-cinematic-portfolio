// Content integrity: the data layer is the only source of facts on the page.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { profile, identity } from "../src/data/profile.js";
import { contact, documents } from "../src/data/contact.js";
import { chapters } from "../src/data/chapters.js";
import { risers } from "../src/data/experience.js";
import { caseStudies, workIndex } from "../src/data/systems.js";
import { figures } from "../src/data/scale.js";
import { pillars, practice } from "../src/data/intelligence.js";
import { awards, credentials, recommendations, appearances, publication } from "../src/data/recognition.js";
import { capabilityGroups, contexts } from "../src/data/capabilities.js";
import { REST_FRAME, frameAt, gridPosition } from "../src/hooks/useLivingPortrait.js";
import livingGrid from "../src/assets/media/living/prawal-living.json";

const root = path.resolve(import.meta.dirname, "..");
const all = { profile, identity, contact, documents, chapters, risers, caseStudies, workIndex, figures, pillars, practice, awards, credentials, recommendations, appearances, capabilityGroups, contexts };

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("content", () => {
  const text = strings(all);

  it("uses no em or en dashes in visible copy", () => {
    const offenders = text.filter((s) => /[–—]/.test(s));
    expect(offenders).toEqual([]);
  });

  it("has one chapter section per cue, in story order", () => {
    const app = readFileSync(path.join(root, "src/App.jsx"), "utf8");
    const sceneFiles = readdirSync(path.join(root, "src/scenes")).map((f) => readFileSync(path.join(root, "src/scenes", f), "utf8"));
    for (const c of chapters) {
      expect(sceneFiles.some((src) => src.includes(`id="${c.id}"`))).toBe(true);
    }
    expect(app.indexOf("<Identity")).toBeLessThan(app.indexOf("<Epilogue"));
  });

  it("links every capability only to contexts that exist", () => {
    const ids = new Set(contexts.map((c) => c.id));
    for (const g of capabilityGroups) for (const item of g.items) for (const id of item.usedIn) expect(ids.has(id)).toBe(true);
  });

  it("ships every award image and document the page references", () => {
    for (const a of awards) {
      expect(existsSync(path.join(root, "src/assets/media/awards", `${a.image}.webp`))).toBe(true);
      expect(existsSync(path.join(root, "src/assets/media/awards", `${a.image}.avif`))).toBe(true);
    }
    for (const d of Object.values(documents)) expect(existsSync(path.join(root, "public", d.href))).toBe(true);
  });

  it("ships every archive image the scenes stage", () => {
    const sets = [["credentials", credentials.map((c) => c.image)], ["events", appearances.map((a) => a.image)], ["voices", recommendations.map((r) => r.image)], ["book", [publication.cover, publication.stage]]];
    for (const [set, keys] of sets) {
      expect(keys.every(Boolean)).toBe(true);
      for (const k of keys) for (const ext of ["webp", "avif"]) expect(existsSync(path.join(root, "src/assets/media", set, `${k}.${ext}`))).toBe(true);
    }
  });

  it("uses https for every external link", () => {
    const links = [contact.linkedin, ...workIndex.flatMap((g) => g.items.map((i) => i.href)).filter(Boolean)];
    for (const l of links) expect(l.startsWith("https://")).toBe(true);
  });

  it("keeps figures that the source material supports", () => {
    // Guard against drift: every scale figure must appear verbatim in the source-derived data.
    const sourceBacked = ["160K+", "200+", "1-2", "20-30%", "0", "10"];
    expect(figures.map((f) => f.figure)).toEqual(sourceBacked);
    expect(caseStudies.find((c) => c.id === "enrollment-transactions").outcomes.map((o) => o.figure)).toEqual(["160K+", "99.9%"]);
  });

  it("orders the career from oldest to newest and ends at the current role", () => {
    expect(risers.at(-1).title).toBe(profile.role);
    const years = risers.map((r) => Number(r.years));
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it("maps the living portrait's pointer poses onto its pose grid, resting on the level frontal frame", () => {
    const { nx, ny, centre, yaw, pitch, box } = livingGrid;
    expect(yaw).toHaveLength(nx);
    expect(pitch).toHaveLength(ny);
    for (let i = 1; i < nx; i++) expect(yaw[i]).toBeGreaterThan(yaw[i - 1]);
    for (let i = 1; i < ny; i++) expect(pitch[i]).toBeGreaterThan(pitch[i - 1]);
    // Rest is the level, frontal pose, and an exact frame.
    expect(yaw[centre[0]]).toBe(0);
    expect(pitch[centre[1]]).toBe(0);
    expect(REST_FRAME).toBe(frameAt(centre[0], centre[1]));
    // Serpentine: rows alternate direction, so row ends meet.
    expect(frameAt(nx - 1, 0) + 1).toBe(frameAt(nx - 1, 1));
    expect(frameAt(0, ny - 1)).toBeLessThan(nx * ny);
    expect(gridPosition(0, 0)).toEqual(centre);
    // The pointer's extremes reach the grid's corners. Up is the first row,
    // down the last; the columns turn him from the viewer's right to the
    // viewer's left, so a pointer on the left takes the last column.
    expect(gridPosition(-1, -1)).toEqual([nx - 1, 0]);
    expect(gridPosition(1, 1)).toEqual([0, ny - 1]);
    // The head box lies within the plate.
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(1);
    expect(box.top + box.height).toBeLessThanOrEqual(1);
    for (const f of ["prawal-living.mp4", "prawal-living-poster.avif", "prawal-living-poster.webp"]) {
      expect(existsSync(path.join(root, "src/assets/media/living", f))).toBe(true);
    }
  });
});
