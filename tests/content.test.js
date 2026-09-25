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
import { awards, credentials, recommendations, appearances } from "../src/data/recognition.js";
import { capabilityGroups, contexts } from "../src/data/capabilities.js";

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
});
