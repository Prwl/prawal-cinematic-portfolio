// Asset pipeline. Reads originals from assets-src/ and writes web-ready files.
//   node scripts/prepare-assets.mjs
// The portrait cutout itself is produced once by scripts/cutout.swift (Apple Vision).
import sharp from "sharp";
import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = (...p) => path.join(root, "assets-src", ...p);
const media = (...p) => path.join(root, "src", "assets", "media", ...p);
const pub = (...p) => path.join(root, "public", ...p);

await mkdir(media("awards"), { recursive: true });
await mkdir(pub("documents"), { recursive: true });

/**
 * Stage-grades the cutout: erodes the fringe left by the original white wall,
 * softens the matte, lets the key light fall off across the body and fades the
 * figure out below the waist so he stands in a pool of light.
 */
async function gradePortrait({ crop, fadeStart, fadeEnd, keyFalloff, out, widths }) {
  const cutout = sharp(src("portrait-cutout.png")).extract(crop);
  const alpha = await cutout.clone().extractChannel("alpha").erode(4).blur(1.2).raw().toBuffer();
  const { data, info } = await cutout.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const fade = v < fadeStart ? 1 : v > fadeEnd ? 0 : 1 - smooth((v - fadeStart) / (fadeEnd - fadeStart));
    for (let x = 0; x < width; x++) {
      const h = x / width;
      // Key light from frame-left (the typography side), falling off to the right.
      const key = 1 - keyFalloff * smooth(h);
      const i = y * width + x;
      const r = data[i * 3];
      const g = data[i * 3 + 1];
      const b = data[i * 3 + 2];
      // Defringe: semi-transparent edge pixels still carry the white wall they
      // were cut from, so pull them toward the stage as coverage drops.
      const edge = alpha[i] < 250 ? Math.pow(alpha[i] / 255, 1.6) : 1;
      // Gentle grade: slightly lower exposure, a touch of warmth from a tungsten key.
      rgba[i * 4] = clamp(r * 0.88 * key * edge);
      rgba[i * 4 + 1] = clamp(g * 0.85 * key * edge);
      rgba[i * 4 + 2] = clamp(b * 0.8 * key * edge);
      rgba[i * 4 + 3] = clamp(alpha[i] * fade);
    }
  }

  const graded = sharp(rgba, { raw: { width, height, channels: 4 } });
  for (const w of widths) {
    const resized = graded.clone().resize({ width: w });
    await resized.clone().webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(media(`${out}-${w}.webp`));
    await resized.clone().avif({ quality: 58, effort: 6 }).toFile(media(`${out}-${w}.avif`));
  }
  const meta = await graded.metadata();
  console.log(`portrait ${out}: ${meta.width}x${meta.height} -> ${widths.join(", ")}`);
}

function smooth(t) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// Full-height figure for the opening. Crop keeps generous air above the head.
await gradePortrait({
  crop: { left: 380, top: 170, width: 2060, height: 3862 },
  fadeStart: 0.56,
  fadeEnd: 0.97,
  keyFalloff: 0.42,
  out: "prawal-stage",
  widths: [560, 900, 1300]
});

// Closer framing for the epilogue: the camera has moved in by the end.
await gradePortrait({
  crop: { left: 420, top: 200, width: 1980, height: 2240 },
  fadeStart: 0.62,
  fadeEnd: 0.99,
  keyFalloff: 0.4,
  out: "prawal-close",
  widths: [640, 1100]
});

// Award exhibits: one photograph per award, resized for the archive wall.
for (const file of await readdir(src("awards"))) {
  const name = file.replace(/\.(png|jpe?g)$/i, "");
  const base = sharp(src("awards", file)).rotate().resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true });
  await base.clone().webp({ quality: 78, effort: 6 }).toFile(media("awards", `${name}.webp`));
  await base.clone().avif({ quality: 52, effort: 6 }).toFile(media("awards", `${name}.avif`));
  const meta = await base.clone().toBuffer({ resolveWithObject: true });
  console.log(`award ${name}: ${meta.info.width}x${meta.info.height}`);
}

// Documents are served as-is.
await copyFile(src("docs", "prawal-sharma-resume.pdf"), pub("documents", "prawal-sharma-resume.pdf"));
await copyFile(src("docs", "ai-engineering-leadership-framework.pdf"), pub("documents", "ai-engineering-leadership-framework.pdf"));
console.log("documents copied");
