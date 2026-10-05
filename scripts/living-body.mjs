// The living portrait's figure: he stands in the page's hall, not in front of
// a photograph of a wall. From the upscaled rest pose this writes
// - the body map: where he is, softened, so the page can move him (a slight
//   turn with the head, a lift or settle with a nod, breathing) while
//   everything around him stays still;
// - the figure mask: his silhouette grown by a halo wide enough for every
//   head pose and body move, then feathered;
// - the poster, cut out by that mask, with the photograph's wall inside the
//   halo graded to the page's stone (--stone), so the halo cannot be seen.
// The page's WebGL stage applies the same wall grade to the moving head
// (livingStage.js, WALL_KEY), so poster and head agree.
// Called by scripts/prepare-video.mjs.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const out = (...p) => path.join(root, "src", "assets", "media", "living", ...p);

// An eighth of the plate is plenty for maps this soft.
const MAP = { width: 190, height: 180 };
// Body map softening, in map pixels (8 plate pixels each at 1520).
const SOFTEN = 5;
// Figure mask: grown 7 map pixels (56 plate pixels, past the widest head pose
// plus the body's turn), feathered over about as much again.
const HALO = 7;
const FEATHER = 6;
// The page's stone, src/styles/tokens.css --stone.
export const STONE = [0xd4, 0xd1, 0xca];

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Light, colourless pixels outside his body are the photograph's wall. The
// wall is 0.72 luma and up even in the head's shadow, so it is keyed fully
// from 0.7 (keyed only in part, a shade's difference drew rings on it); his
// hair's highlights stay under 0.5, and keyed from 0.55 they turned to stone.
// Mirrors wallKey() in src/hooks/livingStage.js.
export function wallKey(r, g, b, body) {
  const max = Math.max(r, g, b);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const sat = max ? (max - Math.min(r, g, b)) / max : 0;
  return smooth(0.6, 0.7, luma) * (1 - smooth(0.07, 0.14, sat)) * (1 - smooth(0.6, 0.95, body));
}

// Below and beside the head box nothing moves out of his rest silhouette, so
// there everything past it is wall, however dark (the photograph's pillar edge
// beside his arm is), and goes to stone. `headBox` is in plate fractions;
// `reach`, if given, is a grey image of everywhere the head goes in any pose,
// which the figure mask then covers too. `dir` is where the maps and poster
// are written; production's living/ unless an experiment says otherwise.
export async function makeFigure(still, headBox, reach, dir = out()) {
  const dest = (file) => path.join(dir, file);
  const work = await mkdtemp(path.join(os.tmpdir(), "living-figure-"));
  try {
    const bin = path.join(work, "cutout");
    const cut = path.join(work, "cut.png");
    execFileSync("xcrun", ["swiftc", "-O", path.join(root, "scripts", "cutout.swift"), "-o", bin], { stdio: "inherit" });
    execFileSync(bin, [still, cut], { stdio: "inherit" });
    const { data: small } = await sharp(cut)
      .extractChannel("alpha")
      .resize(MAP.width, MAP.height, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // sharp's dilate erodes single-channel images, so the matte is grown here.
    const grow = (src, radius) => {
      const dst = Buffer.alloc(src.length);
      for (let y = 0; y < MAP.height; y++) {
        for (let x = 0; x < MAP.width; x++) {
          let m = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx * dx + dy * dy > radius * radius) continue;
              const xx = x + dx;
              const yy = y + dy;
              if (xx >= 0 && yy >= 0 && xx < MAP.width && yy < MAP.height) m = Math.max(m, src[yy * MAP.width + xx]);
            }
          }
          dst[y * MAP.width + x] = m;
        }
      }
      return dst;
    };
    const map = (buf, sigma, file) =>
      sharp(buf, { raw: { ...MAP, channels: 1 } }).blur(sigma).extractChannel(0).png({ compressionLevel: 9 }).toFile(dest(file));
    await map(grow(small, 1), SOFTEN, "prawal-living-body.png");
    let matte = small;
    if (reach) {
      const { data: reachSmall } = await sharp(reach).extractChannel(0).resize(MAP.width, MAP.height, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
      matte = Buffer.from(small.map((v, i) => Math.max(v, reachSmall[i])));
    }
    await map(grow(matte, HALO), FEATHER, "prawal-living-alpha.png");

    // The poster: graded wall, cut out.
    const { data, info } = await sharp(still).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const full = async (file) => (await sharp(file).resize(width, height, { fit: "fill", kernel: "cubic" }).extractChannel(0).raw().toBuffer());
    const body = await full(dest("prawal-living-body.png"));
    // His outline at full resolution, barely softened, for the wall past it.
    // (sharp orders operations itself: a second extractChannel in one pipeline
    // replaces the first, so the alpha is taken out before it is blurred.)
    const outlineRaw = await sharp(cut).extractChannel("alpha").raw().toBuffer();
    const outline = await sharp(outlineRaw, { raw: { width, height, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();
    const alpha = await full(dest("prawal-living-alpha.png"));
    const rgba = Buffer.alloc(width * height * 4);
    const hx0 = headBox.left * width;
    const hx1 = (headBox.left + headBox.width) * width;
    const hy1 = (headBox.top + headBox.height) * height;
    for (let p = 0; p < width * height; p++) {
      const [r, g, b] = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
      const x = p % width;
      const y = (p - x) / width;
      // Distance outside the head box, in plate pixels, fading the override in.
      const out = Math.max(hx0 - x, x - hx1, y - hy1);
      const beyond = smooth(0, 24, out) * (1 - smooth(0.25, 0.75, outline[p] / 255));
      const k = Math.max(wallKey(r, g, b, body[p] / 255), beyond);
      rgba[p * 4] = Math.round(r + (STONE[0] - r) * k);
      rgba[p * 4 + 1] = Math.round(g + (STONE[1] - g) * k);
      rgba[p * 4 + 2] = Math.round(b + (STONE[2] - b) * k);
      rgba[p * 4 + 3] = alpha[p];
    }
    const poster = sharp(rgba, { raw: { width, height, channels: 4 } });
    await poster.clone().avif({ quality: 62, effort: 6 }).toFile(dest("prawal-living-poster.avif"));
    await poster.clone().webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(dest("prawal-living-poster.webp"));
  } finally {
    await rm(work, { recursive: true });
  }
}
