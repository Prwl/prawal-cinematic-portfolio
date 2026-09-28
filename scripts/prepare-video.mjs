// Living portrait pipeline. Builds the pointer-driven pose grid and its
// poster from the real generations in reference-video/hero-*.mp4.
// Requires ffmpeg, Xcode command line tools and LivePortrait
// (https://github.com/KwaiVGI/LivePortrait) installed with its weights and a
// .venv, by default next to this project (LIVEPORTRAIT_DIR overrides);
// LivePortrait only measures head pose here, it draws nothing.
//   node scripts/prepare-video.mjs
//
// Decisions (see README):
// - Real frames, not re-posed ones. Every take is a 1080p Veo generation that
//   starts and ends on the same rest image, so the takes agree to the pixel
//   at rest and differ only in where he looks in between. Re-posing one image
//   with LivePortrait was used before and read soft and unreal in motion.
// - A grid, not a path: 33 yaws (-22 to 22 degrees) by 19 pitches (-15 up to
//   +7 down, about 1.2 apart), so diagonals are real poses. The page blends
//   the four neighbouring poses. Each pose is the nearest filmed frames,
//   moved the last few degrees along optical flow and onto one smooth trend
//   of head placement and skin tone (scripts/real_grid.py), so the picture is
//   always the video's own and neighbouring poses line up.
// - Crop 1140x1080 around the figure (the earlier 720p crop at 1.5x), graded
//   so the recorded mid-grey stone lifts to the page's own stone ground while
//   the charcoal blazer stays deep.
// - Every pose is scaled to the 1520x1440 plate (4/3 of the crop) with
//   Lanczos, and nothing else: Apple's super resolution, used when the source
//   was 720p, over-processes 1080p video (harder contrast, painted skin,
//   halos at the jaw), and an unsharp mask drew light rims along his outline
//   and the neckline. The poster is the scaled rest frame.
// - Only the head moves: each pose is laid into the rest frame through its
//   own feathered mask (the head's reach above the jaw, its face and beard
//   below), so the collar, neckline and lapels are always the rest frame's.
//   The clip carries only the head box (plus a margin the page feathers
//   over); the poster carries the rest.
// - H.264 in the serpentine order, so each frame follows a neighbour, with a
//   keyframe every 8 frames: four copies still seek inside one display frame
//   (measured in Chrome). No B-frames, no audio track.
import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { makeFigure } from "./living-body.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = (...p) => path.join(root, "src", "assets", "media", "living", ...p);
const sourceDir = path.join(root, "reference-video");
const takes = (await readdir(sourceDir)).filter((f) => /^hero-.*\.mp4$/.test(f)).sort().map((f) => path.join(sourceDir, f));
if (!takes.length) throw new Error("Missing the hero-*.mp4 generations in reference-video/");
const liveportrait = path.resolve(process.env.LIVEPORTRAIT_DIR ?? path.join(root, "..", "LivePortrait"));
const python = path.join(liveportrait, ".venv", "bin", "python");

const GRADE = "curves=all='0/0 0.2/0.2 0.55/0.7 0.75/0.86 1/1'";
const SCALE = "scale=iw*4/3:ih*4/3:flags=lanczos+accurate_rnd+full_chroma_int";
const PLATE = { width: 1520, height: 1440 };
const CRF = 20;
const GOP = 8;
// Margin around the head box, in plate pixels: the page feathers the clip
// into the poster across it, over pixels that never change.
const MARGIN = 24;

await mkdir(out(), { recursive: true });
const clip = out("prawal-living.mp4");
const ff = (...args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
// LIVING_WORK=<dir> resumes an interrupted run in its kept work directory:
// the pose grid is reused.
const work = process.env.LIVING_WORK ?? (await mkdtemp(path.join(os.tmpdir(), "living-")));
const dir = (name) => path.join(work, name);
for (const d of ["walk", "walked"]) await mkdir(dir(d), { recursive: true });
const done = (f) => access(f).then(() => true, () => false);

// 1. The pose grid, from the takes (scripts/real_grid.py).
if (!(await done(dir("real/grid.json")))) {
  execFileSync(python, [path.join(root, "scripts", "real_grid.py"), liveportrait, dir("real"), ...takes], { stdio: ["ignore", "inherit", "ignore"] });
}
const grid = JSON.parse(await readFile(dir("real/grid.json"), "utf8"));
const { nx, ny, centre } = grid;
const [rx, ry, rw, rh] = grid.roi;
const name = (i) => `${String(i).padStart(4, "0")}.png`;

// 2. The rest frame, graded and scaled: the plate.
const plate = dir("plate.png");
ff("-i", dir("real/rest.png"), "-vf", `${GRADE},${SCALE}`, plate);

// 3. Every pose, graded and scaled, in a serpentine walk of the grid, which is
//    also the clip's frame order.
const walk = [];
for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) walk.push(r * nx + (r % 2 ? nx - 1 - c : c));
for (let i = 0; i < walk.length; i++) {
  const link = path.join(dir("walk"), name(i));
  if (!(await done(link))) await symlink(dir(`real/grid/${name(walk[i])}`), link);
}
ff("-i", path.join(dir("walk"), "%04d.png"), "-vf", `${GRADE},${SCALE}`, "-start_number", "0", path.join(dir("walked"), "%04d.png"));

// 4. Every pose laid into the plate, and its head box cut out.
const rest = walk.indexOf(centre[1] * nx + centre[0]);
const box = JSON.parse(
  execFileSync(python, [path.join(root, "scripts", "heads.py"), plate, dir("real/mask.png"), `${rx},${ry},${rw},${rh}`, dir("walked"), String(rest), String(MARGIN), dir("composed")]).toString()
);

// 5. The clip: the head boxes, in walk order.
ff(
  "-framerate", "24",
  "-i", path.join(dir("composed/heads"), "%04d.png"),
  // Converted with the BT.709 matrix and tagged throughout. Untagged, the
  // browser guessed the matrix, and at this size a guess can differ between
  // decode paths: his skin flicked between warm and pale as the copies sought.
  "-vf", "scale=out_color_matrix=bt709:out_range=tv",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-color_range", "tv",
  "-an",
  "-c:v", "libx264", "-preset", "slow", "-tune", "film", "-crf", String(CRF),
  "-g", String(GOP), "-keyint_min", String(GOP), "-bf", "0", "-x264-params", "scenecut=0:colorprim=bt709:transfer=iec61966-2-1:colormatrix=bt709:range=tv",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  clip
);

// 6. The poster, cut out, and the figure maps (scripts/living-body.mjs).
const headBox = { left: box.x / PLATE.width, top: box.y / PLATE.height, width: box.w / PLATE.width, height: box.h / PLATE.height };
await makeFigure(dir("composed/still.png"), headBox, dir("composed/reach.png"));

// 7. What the page needs to drive it: the grid, and the box as fractions of
//    the plate.
await writeFile(
  out("prawal-living.json"),
  JSON.stringify({ nx, ny, order: "serpentine", centre, yaw: grid.yaw, pitch: grid.pitch, box: { ...headBox, feather: MARGIN / box.w } }, null, 2) + "\n"
);

// LIVING_KEEP=1 keeps the intermediate frames for inspection.
if (process.env.LIVING_KEEP || process.env.LIVING_WORK) console.log(`frames kept in ${work}`);
else await rm(work, { recursive: true });

const frames = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", clip]).toString().trim();
console.log(`living portrait: ${frames} poses (${nx}x${ny}) from ${grid.anchors.length} filmed frames, head box ${box.w}x${box.h} at ${box.x},${box.y}, rest frame ${rest}`);
