// Archive pipeline: the real material from the source portfolio that the
// scenes stage (event photographs, credential documents, the book, and the
// portraits of the people who wrote recommendations). Reads assets-src/ and
// writes web-ready AVIF and WebP into src/assets/media.
//   node scripts/prepare-archive.mjs
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = (...p) => path.join(root, "assets-src", ...p);
const media = (...p) => path.join(root, "src", "assets", "media", ...p);

// folder, bounding box, fit, quality. Voices are cropped to the face as
// small portrait frames; everything else keeps its whole composition.
const sets = [
  { dir: "events", width: 900, height: 900, fit: "inside" },
  { dir: "credentials", width: 1100, height: 900, fit: "inside" },
  { dir: "book", width: 760, height: 900, fit: "inside" },
  { dir: "voices", width: 280, height: 350, fit: "cover", position: "attention" }
];

for (const set of sets) {
  await mkdir(media(set.dir), { recursive: true });
  for (const file of await readdir(src(set.dir))) {
    if (file.startsWith(".")) continue;
    const name = file.replace(/\.(png|jpe?g|webp)$/i, "");
    const base = sharp(src(set.dir, file))
      .rotate()
      .resize({ width: set.width, height: set.height, fit: set.fit, position: set.position, withoutEnlargement: true })
      .flatten({ background: "#e9e4dd" });
    await base.clone().webp({ quality: 78, effort: 6 }).toFile(media(set.dir, `${name}.webp`));
    await base.clone().avif({ quality: 50, effort: 6 }).toFile(media(set.dir, `${name}.avif`));
    const { info } = await base.clone().toBuffer({ resolveWithObject: true });
    console.log(`${set.dir}/${name}: ${info.width}x${info.height}`);
  }
}
