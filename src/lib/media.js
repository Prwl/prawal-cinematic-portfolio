import livingGrid from "../assets/media/living/prawal-living.json";

// Resolves image keys to hashed build URLs. Files are produced by
// scripts/prepare-assets.mjs into src/assets/media.

const files = import.meta.glob("../assets/media/**/*.{avif,webp,mp4,png}", {
  eager: true,
  query: "?url",
  import: "default"
});

function url(path) {
  const found = files[`../assets/media/${path}`];
  if (!found) throw new Error(`Missing media asset: ${path}`);
  return found;
}

function srcset(base, widths, ext) {
  return widths.map((w) => `${url(`${base}-${w}.${ext}`)} ${w}w`).join(", ");
}

export const portraits = {
  close: {
    widths: [640, 1100],
    avif: srcset("prawal-close-finish", [640, 1100], "avif"),
    webp: srcset("prawal-close-finish", [640, 1100], "webp"),
    fallback: url("prawal-close-finish-640.webp"),
    width: 1980,
    height: 2240
  }
};

// The living portrait: a grid of head poses as a clip of the head box, the
// grid's layout, the rest pose as the poster, and the body map the page moves
// him by (scripts/prepare-video.mjs).
export const living = {
  video: url("living/prawal-living.mp4"),
  avif: url("living/prawal-living-poster.avif"),
  webp: url("living/prawal-living-poster.webp"),
  body: url("living/prawal-living-body.png"),
  alpha: url("living/prawal-living-alpha.png"),
  width: 1520,
  height: 1440,
  grid: livingGrid
};

export function awardImage(key) {
  return { avif: url(`awards/${key}.avif`), webp: url(`awards/${key}.webp`), avifSet: srcset(`awards/${key}`, [640, 1200], "avif"), webpSet: srcset(`awards/${key}`, [640, 1200], "webp") };
}

// Archive material (scripts/prepare-archive.mjs): event photographs,
// credential documents, the book and the portraits of recommenders.
export function archiveImage(set, key) {
  return { avif: url(`${set}/${key}.avif`), webp: url(`${set}/${key}.webp`), ...(set === "events" ? { avifSet: srcset(`${set}/${key}`, [640, 1200], "avif"), webpSet: srcset(`${set}/${key}`, [640, 1200], "webp") } : {}) };
}
