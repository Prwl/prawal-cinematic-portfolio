// Resolves image keys to hashed build URLs. Files are produced by
// scripts/prepare-assets.mjs into src/assets/media.

const files = import.meta.glob("../assets/media/**/*.{avif,webp}", {
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
  stage: {
    widths: [560, 900, 1300],
    avif: srcset("prawal-stage", [560, 900, 1300], "avif"),
    webp: srcset("prawal-stage", [560, 900, 1300], "webp"),
    fallback: url("prawal-stage-900.webp"),
    width: 2060,
    height: 3862
  },
  close: {
    widths: [640, 1100],
    avif: srcset("prawal-close", [640, 1100], "avif"),
    webp: srcset("prawal-close", [640, 1100], "webp"),
    fallback: url("prawal-close-640.webp"),
    width: 1980,
    height: 2240
  }
};

export function awardImage(key) {
  return { avif: url(`awards/${key}.avif`), webp: url(`awards/${key}.webp`) };
}
