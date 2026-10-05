import manifest from "../assets/sequence/sequence.json";

// The hero image sequence: one continuous head turn from one generation,
// built by scripts/prepare-sequence.mjs. Kept out of src/assets/media so
// that media glob never sees it, and loaded only by a dynamic import from
// useSequencePortrait, so phones, touch and reduced motion (which get the
// static poster) never fetch this module or its frames.
const files = import.meta.glob("../assets/sequence/*.{webp,avif,png}", { eager: true, query: "?url", import: "default" });
const url = (name) => files[`../assets/sequence/${name}`];

export const sequence = {
  manifest,
  frames: manifest.frames.map((f) => url(f.file)),
  poster: url("prawal-living-poster.webp"),
  body: url("prawal-living-body.png"),
  alpha: url("prawal-living-alpha.png"),
};
