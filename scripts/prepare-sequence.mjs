// Hero image-sequence experiment (?hero=sequence). Builds the head frames,
// poster and figure maps from ONE generation: every pixel of the head, the
// poster and the figure comes from a single take, frames are never blended
// with each other, and no other generation is used.
// Requires ffmpeg, Xcode command line tools and LivePortrait (measuring only),
// as scripts/prepare-video.mjs does.
//   node scripts/prepare-sequence.mjs                  the 1080p Flow take (default)
//   SEQUENCE_SOURCE=rotating node scripts/prepare-sequence.mjs
//
// A source is one take and, in the order the page sweeps them (the viewer's
// left to the viewer's right, falling yaw), the runs of frames it uses. The
// rest frame is the poster; every head is laid into it by production's own
// mask (scripts/sequence_heads.py), so collar, lapels and wall never move.
//
// flow: reference-video/new/Man_slowly_turning_head_1080p_20260930134133.mp4,
//   round 2's A1 (experiments/hero-sequence/NEW-TAKES-AUDIT.md), the only one
//   of 46 generations that turns level to 16 degrees on both sides. 1080p in
//   the hero framing, so production's crop (1140x1080 at 705), grade and 4/3
//   Lanczos scale, as the MP4 hero. Its clean level frames come in two legs:
//   173-204, coming back from the viewer's left (+21 to 0 degrees, 0.5-1.3
//   degrees a frame), and 16-35, the first turn to the viewer's right (0 to
//   -20). The middle sweep between them blinks at 80-84, inside the range.
//   The legs meet at rest, 190 frames apart, where his head leans 7.9px
//   further right and 1.7px higher in the late leg (face aligned by ECC; the
//   camera and torso still to under 1px, colour within 1%); that leg is moved
//   back by that much, a rigid shift of the whole frame, so the two meet on
//   the same spot.
//   Rest: frame 16, the first frame of the turn, the sharpest.
// rotating: reference-video/Man_rotating_head_horizontally…133109.mp4, the
//   720p original of the hero framing (760x720 at 470): frames 96-156, one
//   continuous turn, +20 to -20 degrees, rest 131. Brought to the plate with
//   Apple's super resolution (scripts/upscale.swift) in video mode, each frame
//   fed its predecessor; graded after, as production grades. SEQUENCE_SR=0
//   builds it with Lanczos instead.
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { makeFigure } from "./living-body.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "src", "assets", "sequence");
const liveportrait = path.resolve(process.env.LIVEPORTRAIT_DIR ?? path.join(root, "..", "LivePortrait"));
const python = path.join(liveportrait, ".venv", "bin", "python");
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

// Frames of a later run or take are named take*1000+frame, so takes never
// collide; take 0's frames keep their own numbers.
const TAKES = JSON.parse(await readFile(path.join(root, "scripts", "sequence-takes.json"), "utf8"));
const SOURCES = {
  // flow2d: clip 2 (the level sweep) with the takes that add real up and
  // down (experiments/hero-sequence/NEW-TAKES-AUDIT.md, rounds 3 and 4):
  // R-up-1 and R-up-2 (up, and the upper diagonals) and N4 (round 4's nod:
  // down at centre, up and up-left). The generations render the face alike at
  // matched poses (aligned fine detail about 3, the same as clip 2's own
  // neighbours), skin within 1%. Frames, runs and rigid shifts are in
  // scripts/sequence-takes.json. A placement trend over pose was tried and
  // made clip 2's join worse (a drift over time is not a function of pose),
  // so each run is moved by its own measured shift. Clip 2's two legs meet at
  // rest: the page crossfades them by position (manifest `joins`).
  flow2d: {
    takes: TAKES.takes,
    crop: "1140:1080:705:0",
    superResolution: false,
    rest: 16,
    joins: [[204, 16]],
  },
  flow: {
    takes: [{ file: "new/Man_slowly_turning_head_1080p_20260930134133.mp4", runs: [{ frames: range(173, 204), shift: [-7.9, 1.7] }, { frames: range(16, 35) }] }],
    crop: "1140:1080:705:0",
    superResolution: false,
    rest: 16,
  },
  rotating: {
    takes: [{ file: (await readdir(path.join(root, "reference-video"))).find((f) => f.startsWith("Man_rotating_head_horizontally") && f.endsWith(".mp4")), runs: [{ frames: range(96, 156) }] }],
    crop: "760:720:470:0",
    superResolution: process.env.SEQUENCE_SR !== "0",
    rest: 131,
  },
};
const SOURCE = SOURCES[process.env.SEQUENCE_SOURCE ?? "flow2d"];
if (!SOURCE?.takes.every((t) => t.file)) throw new Error(`Unknown or missing source: ${process.env.SEQUENCE_SOURCE}`);
const source = SOURCE.takes.map((t) => path.basename(t.file)).join(", ");
const id = (take, frame) => take * 1000 + frame;
// Every frame, in order, with the run it belongs to: the page crossfades when
// it moves between runs (a far-apart part of a take, or another take).
const entries = SOURCE.takes.flatMap((t, k) => t.runs.flatMap((r, j) => r.frames.map((frame) => ({ id: id(k, frame), take: k, frame, run: `${k}:${j}` }))));
const REST = SOURCE.rest;

const GRADE = "curves=all='0/0 0.2/0.2 0.55/0.7 0.75/0.86 1/1'";
const PLATE = { width: 1520, height: 1440 };
const MARGIN = 24;
// WebP quality for the head frames: chosen so every frame stays above 44 dB
// against the lossless composite (printed below), where no block or ringing
// shows at 2x zoom.
const QUALITY = 94;

const work = await mkdtemp(path.join(os.tmpdir(), "sequence-"));
const dir = (...p) => path.join(work, ...p);
await mkdir(dir("frames"), { recursive: true });
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// 1. Every frame used: crop, bring to the plate, grade. Frames are named by
//    id (take*1000+frame).
const ff = (...args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const scalePlate = `scale=${PLATE.width}:${PLATE.height}:flags=lanczos+accurate_rnd+full_chroma_int`;
for (const [k, take] of SOURCE.takes.entries()) {
  const input = path.join(root, "reference-video", take.file);
  const wanted = [...new Set(take.runs.flatMap((r) => r.frames))].sort((x, y) => x - y);
  const select = `select='${wanted.map((n) => `eq(n\\,${n})`).join("+")}',crop=${SOURCE.crop}`;
  const tmp = dir(`take${k}`);
  await mkdir(tmp, { recursive: true });
  if (!SOURCE.superResolution) {
    ff("-i", input, "-vf", `${select},${GRADE},${scalePlate}`, "-fps_mode", "passthrough", "-start_number", "0", path.join(tmp, "%05d.png"));
  } else {
    for (const d of ["crop", "sr"]) await rm(dir(d), { recursive: true, force: true }), await mkdir(dir(d), { recursive: true });
    ff("-i", input, "-vf", select, "-fps_mode", "passthrough", "-start_number", "0", dir("crop", "%05d.png"));
    const bin = dir("upscale");
    execFileSync("xcrun", ["swiftc", "-O", path.join(root, "scripts", "upscale.swift"), "-o", bin], { stdio: "inherit" });
    execFileSync(bin, [dir("crop"), dir("sr"), String(PLATE.width), "0"], { stdio: "inherit" });
    ff("-start_number", "0", "-i", dir("sr", "%05d.png"), "-vf", `${GRADE},format=rgb24`, "-start_number", "0", path.join(tmp, "%05d.png"));
  }
  // ffmpeg numbers selected frames in order; name them by id.
  for (const [n, frame] of wanted.entries()) await rename(path.join(tmp, `${String(n).padStart(5, "0")}.png`), dir("frames", `${String(id(k, frame)).padStart(5, "0")}.png`));
}
// A run's rigid shift, in plate pixels, and the placement trend switch, for
// sequence_heads.py.
const cropScale = PLATE.width / Number(SOURCE.crop.split(":")[0]);
const shifts = Object.fromEntries(
  SOURCE.takes.flatMap((t, k) => t.runs.flatMap((r) => (r.shift ? r.frames.map((frame) => [id(k, frame), r.shift.map((v) => v * cropScale)]) : [])))
);
await writeFile(dir("frames", "shifts.json"), JSON.stringify(shifts));
// A run's colour gain (B, G, R), onto the rest take's skin tone.
const gains = Object.fromEntries(SOURCE.takes.flatMap((t, k) => t.runs.flatMap((r) => (r.gain ? r.frames.map((frame) => [id(k, frame), r.gain]) : []))));
await writeFile(dir("frames", "gains.json"), JSON.stringify(gains));
if (SOURCE.trend) await writeFile(dir("frames", "trend"), "");

// 2. Heads laid into the rest frame, the head box, and each frame's pose.
const box = JSON.parse(
  execFileSync(python, [path.join(root, "scripts", "sequence_heads.py"), liveportrait, dir("frames"), String(REST), String(MARGIN), dir("composed")], {
    stdio: ["ignore", "pipe", "inherit"],
  })
    .toString()
    .trim()
    .split("\n")
    .pop()
);
const measured = new Map(JSON.parse(await readFile(dir("composed", "poses.json"), "utf8")).map((p) => [p.i, p]));
const poses = entries.map((e) => ({ ...measured.get(e.id), ...e }));

// 3. Poster and figure maps, from this take's rest frame.
const headBox = { left: box.x / PLATE.width, top: box.y / PLATE.height, width: box.w / PLATE.width, height: box.h / PLATE.height };
await makeFigure(dir("composed", "still.png"), headBox, dir("composed", "reach.png"), outDir);
// The experiment only runs on desktops, where the stage draws the WebP poster.
await rm(path.join(outDir, "prawal-living-poster.avif"));

// 4. The head frames as WebP, and how faithful each is.
const psnr = async (a, b) => {
  const [x, y] = await Promise.all([a, b].map((s) => sharp(s).removeAlpha().raw().toBuffer()));
  let se = 0;
  for (let i = 0; i < x.length; i++) se += (x[i] - y[i]) ** 2;
  return 10 * Math.log10((255 * 255) / (se / x.length));
};
const round4 = (v) => Math.round(v * 1e4) / 1e4;
const round3 = (v) => Math.round(v * 1e3) / 1e3;
const restPose = poses.find((p) => p.id === REST);
const frames = [];
let bytes = 0;
let worst = Infinity;
for (const p of poses) {
  const png = dir("composed", "heads", `${String(p.id).padStart(4, "0")}.png`);
  const file = `head-${String(p.id).padStart(4, "0")}.webp`;
  const webp = await sharp(png).webp({ quality: QUALITY, smartSubsample: true, effort: 6 }).toBuffer();
  await writeFile(path.join(outDir, file), webp);
  bytes += webp.length;
  worst = Math.min(worst, await psnr(png, webp));
  frames.push({
    id: p.id,
    take: p.take,
    frame: p.frame,
    run: p.run,
    file,
    // Pose relative to the rest frame, degrees, in LivePortrait's
    // convention: negative yaw turns him to the viewer's right, negative
    // pitch is up. `yawFit` is the same yaw, for scripts/qa-hero-sequence.mjs.
    yaw: round3(p.yaw - restPose.yaw),
    pitch: round3(p.pitch - restPose.pitch),
    yawFit: round3(p.yaw - restPose.yaw),
    roll: p.roll,
    eye: p.eye,
    face: [round4(p.fx / PLATE.width), round4(p.fy / PLATE.height)],
  });
}
const rest = frames.findIndex((f) => f.id === REST);

await writeFile(
  path.join(outDir, "sequence.json"),
  JSON.stringify(
    {
      source,
      takes: SOURCE.takes,
      rest,
      // Pairs of frames (indices) that are the same pose filmed far apart in
      // time: the page crossfades between them by position, not by cutting.
      joins: (SOURCE.joins ?? []).map((pair) => pair.map((i) => frames.findIndex((f) => f.id === i))),
      plate: PLATE,
      box: { ...headBox, feather: MARGIN / box.w },
      // The head's ellipse at rest, in plate fractions, for the page's tilt.
      head: { cx: box.head.cx / PLATE.width, cy: box.head.cy / PLATE.height, rx: box.head.rx / PLATE.width, ry: box.head.ry / PLATE.height },
      superResolution: SOURCE.superResolution,
      frames,
    },
    null,
    1
  ) + "\n"
);
await rm(work, { recursive: true });
const eyes = frames.map((f) => f.eye);
const span = (key) => `${Math.min(...frames.map((f) => f[key])).toFixed(1)} to ${Math.max(...frames.map((f) => f[key])).toFixed(1)}`;
console.log(
  `sequence: ${frames.length} frames from ${SOURCE.takes.length} take(s), head box ${box.w}x${box.h} at ${box.x},${box.y}; ` +
    `yaw ${span("yaw")}, pitch ${span("pitch")}; eye openness ${Math.min(...eyes).toFixed(2)}-${Math.max(...eyes).toFixed(2)}; ` +
    `WebP q${QUALITY}: ${(bytes / 1e6).toFixed(2)} MB, worst frame ${worst.toFixed(1)} dB`
);
