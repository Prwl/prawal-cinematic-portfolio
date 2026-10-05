// Public derivatives of the credential documents. Validation numbers,
// certification numbers, candidate IDs and QR codes are painted out in the
// pixels themselves (never masked in CSS), each box filled with the
// certificate's own local background so the document still reads whole.
// Titles, names, issuers and dates are untouched.
//   node scripts/sanitize-credentials.mjs
// Reads assets-src/credentials (originals, never modified) and writes
// assets-src/credentials-public, which scripts/prepare-archive.mjs publishes.
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const from = (f) => path.join(root, "assets-src/credentials", f);
const to = (f) => path.join(root, "assets-src/credentials-public", f);

// Boxes in source pixels (x, y, w, h), located by OCR of each original.
const REDACT = {
  "aws-ai-practitioner.png": [[900, 1236, 1180, 72]], // validation number
  "aws-developer.png": [[935, 1206, 600, 70]], // validation number
  "aws-solutions-architect.png": [[2004, 1960, 410, 44]], // validation number
  "azure-ai.png": [[1968, 1690, 440, 42]], // certification number
  "azure-data.png": [[2332, 2004, 525, 50]], // certification number
  "azure-fundamentals.png": [[2316, 2010, 535, 50]], // certification number
  "azure-security.png": [[1590, 1388, 400, 44]], // certification number
  "gcp-digital-leader.png": [[92, 1364, 330, 48], [92, 1526, 430, 52]], // series ID, certification ID
  "ictrd-ai-ml.png": [[212, 1452, 350, 54], [212, 1527, 770, 56], [1668, 1388, 210, 212]], // TID, document identifier, QR code
  "scrum-cal-e.png": [[750, 1418, 376, 40]], // certificant ID
  "apollo-associate.png": [],
  "apollo-professional.png": []
};

// The background around a box: the per-channel median of a ring of pixels
// just outside it. Text is a minority of that ring, so the median is paper.
function ringColour(data, width, height, channels, [x, y, w, h]) {
  const samples = [[], [], []];
  const take = (px, py) => {
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const i = (py * width + px) * channels;
    for (let c = 0; c < 3; c++) samples[c].push(data[i + c]);
  };
  for (let d = 3; d <= 7; d += 2) {
    for (let px = x - d; px <= x + w + d; px += 2) { take(px, y - d); take(px, y + h + d); }
    for (let py = y - d; py <= y + h + d; py += 2) { take(x - d, py); take(x + w + d, py); }
  }
  return samples.map((s) => s.sort((a, b) => a - b)[s.length >> 1]);
}

await mkdir(to(""), { recursive: true });
for (const file of await readdir(from(""))) {
  if (!(file in REDACT)) throw new Error(`No redaction map for ${file}: review it before publishing.`);
  const img = sharp(from(file)).removeAlpha();
  const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const layers = REDACT[file].map((box) => {
    const [r, g, b] = ringColour(data, info.width, info.height, info.channels, box);
    const [x, y, w, h] = box;
    return { input: { create: { width: w, height: h, channels: 3, background: { r, g, b } } }, left: x, top: y };
  });
  await img.composite(layers).png().toFile(to(file));
  console.log(`${file}: ${layers.length} region(s) painted out`);
}
