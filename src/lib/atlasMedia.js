import manifest from "../assets/atlas/atlas.json";
export { living } from "./media.js";

// Experiment (?hero=atlas): the directional atlas built by
// scripts/atlas_build.py. Kept out of src/assets/media so production's media
// glob never sees it; the files are only fetched when the flag is on.
const files = import.meta.glob("../assets/atlas/*.webp", { eager: true, query: "?url", import: "default" });
const url = (name) => files[`../assets/atlas/${name}`];

export const atlas = {
  manifest,
  centre: url(manifest.centre),
  files: Object.fromEntries(manifest.spokes.flatMap((s) => Object.values(s.files ?? {})).map((f) => [f, url(f)]))
};

// The hero variant for this page load: ?hero=atlas opts into the experiment.
export const heroVariant = () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("hero") === "atlas" ? "atlas" : "living");
