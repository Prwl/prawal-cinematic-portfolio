# Hero atlas experiment, step 3: builds the directional atlas the page's
# ?hero=atlas portrait draws from, out of the clean frames that
# scripts/atlas_score.py marked, in the takes it selected.
#   <LivePortrait>/.venv/bin/python scripts/atlas_build.py artifacts/atlas/audit.json <workDir>
#
# The atlas is a centre and eight spokes. A spoke is one take's own run of
# consecutive frames walking out from the shared rest frame toward its
# direction (right, up-right, up, up-left, left, down-left, down, down-right),
# sampled at a few radii. Nothing is warped, morphed or synthesised: every
# picture is a real frame, so its face is the take's own, and neighbouring
# pictures on a spoke are neighbouring frames of one performance.
#
# Normalisation, so every frame lands on the production plate exactly:
# - the production crop (1140x1080 at x 705), grade and 4/3 Lanczos scale
#   (scripts/prepare-video.mjs), run through the same ffmpeg filters
# - camera drift undone against the rest frame's wall (sub-pixel)
# - exposure matched to the rest frame on the wall, per channel
# - laid into the production rest head (decoded from the production clip)
#   through one feathered mask, so the collar, lapels and wall are the
#   poster's own pixels in every picture and only the head changes.
import json
import os
import subprocess
import sys

import cv2
import numpy as np

audit_path, work = sys.argv[1:3]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
video_dir = os.path.join(root, "reference-video")
out_dir = os.path.join(root, "src", "assets", "atlas")
os.makedirs(work, exist_ok=True)
os.makedirs(out_dir, exist_ok=True)
audit = json.load(open(audit_path))
frames = audit["frames"]
selected = audit["selected"]

CROP_X, CROP_W, CROP_H = 705, 1140, 1080
GRADE = "curves=all='0/0 0.2/0.2 0.55/0.7 0.75/0.86 1/1'"
SCALE = "scale=iw*4/3:ih*4/3:flags=lanczos+accurate_rnd+full_chroma_int"
PLATE_W, PLATE_H = 1520, 1440

# Pose space the pointer maps onto, degrees at full reach. Set from what the
# selected takes film cleanly (atlas_score.py reach), not from what was asked.
EXT = dict(yaw=float(os.environ.get("ATLAS_YAW", 15)), up=float(os.environ.get("ATLAS_UP", 10)), down=float(os.environ.get("ATLAS_DOWN", 6)))
STEPS = int(os.environ.get("ATLAS_STEPS", 6))
# A frame serves a spoke if its direction is within this of the spoke's.
MAX_OFF = np.radians(float(os.environ.get("ATLAS_OFF", 16)))
DIRECTIONS = ["right", "upright", "up", "upleft", "left", "downleft", "down", "downright"]
ANGLES = [k * np.pi / 4 for k in range(8)]


def screen(yaw, pitch):
    """Measured pose to pointer space: x toward the viewer's right, y up,
    each axis 1 at full reach. LivePortrait yaw is positive toward the
    viewer's left; pitch is positive looking down."""
    x = -yaw / EXT["yaw"]
    y = -pitch / (EXT["up"] if pitch < 0 else EXT["down"])
    return x, y


def polar(x, y):
    return max(abs(x), abs(y)), np.arctan2(y, x) % (2 * np.pi)


def ang_diff(a, b):
    d = (b - a) % (2 * np.pi)
    return d - 2 * np.pi if d > np.pi else d


# ---------------------------------------------------------------- spokes
by_take = {}
for key, rec in frames.items():
    take, i = key.rsplit("#", 1)
    if take in selected:
        by_take.setdefault(take, {})[int(i)] = rec


def legs(take):
    """Each excursion of a take from rest: the frames out to its furthest
    point, and the frames back, reversed (both run from rest outward)."""
    seq = by_take[take]
    n = max(seq) + 1
    r = np.zeros(n)
    for i in range(n):
        rec = seq.get(i)
        if rec and "yaw" in rec:
            r[i] = polar(*screen(rec["yaw"], rec["pitch"]))[0]
        elif i:
            r[i] = r[i - 1]
    out, i = [], 0
    while i < n:
        if r[i] > 0.1:
            i += 1
            continue
        j = i
        while j + 1 < n and r[j + 1] <= 0.1:
            j += 1
        k = j + 1
        while k < n and r[k] > 0.1:
            k += 1
        if k > j + 1:
            seg = list(range(j, min(k + 1, n)))
            peak = seg[int(np.argmax(r[seg]))]
            out.append(list(range(j, peak + 1)))
            out.append(list(range(min(k, n - 1), peak - 1, -1)))
        i = k
    return out


# A spoke is played, not scrubbed: the head comes to rest only on "stops"
# (frames that pass every check and sit on the spoke's axis), and between
# stops the page plays the take's own consecutive frames at their native
# cadence. So a spoke may pass through frames that are soft with motion or
# caught in the blink Veo puts at the start of nearly every turn (people
# blink as they turn their heads too); it is never held on one. What a spoke
# may never contain, even in passing:
HARD = {"mouth open", "body moved", "background drift", "likeness drift", "no face"}
BLINK = {"eyes closed", "lids down"}
MAX_ROLL_PASSING = 10.0
MAX_REACH = 1.6
MAX_STOP_R = 1.6


def leg_for_spoke(take, leg, s):
    """The run of a leg that serves spoke s, from rest out to its furthest
    stop, or None."""
    seq = by_take[take]
    run = []
    for i in leg:
        rec = seq.get(i)
        if not rec or "yaw" not in rec or HARD & set(rec["why"]) or abs(rec.get("roll", 0)) > MAX_ROLL_PASSING:
            break
        rr, a = polar(*screen(rec["yaw"], rec["pitch"]))
        if rr > MAX_REACH:
            break
        dev = abs(ang_diff(ANGLES[s], a))
        if rr > 0.3 and dev > MAX_OFF * 1.6:
            break
        if run and rr < run[-1]["r"] - 0.05:
            break  # turning back
        # Stops only within reach of the pointer (a stop past it is never chosen).
        run.append(dict(i=i, r=rr, dev=dev, stop=bool(rec["ok"] and dev <= MAX_OFF and 0.1 <= rr <= MAX_STOP_R), blink=bool(BLINK & set(rec["why"]))))
    stops = [k for k, f in enumerate(run) if f["stop"]]
    if not stops:
        return None
    # The spoke ends at its first stop at or past full reach: the pointer can
    # ask for nothing further.
    far = [k for k in stops if run[k]["r"] >= 1.0]
    end = far[0] if far else stops[-1]
    run = [f for f in run[: end + 1] if f["r"] >= 0.04]
    mono = []
    for f in run:
        if not mono or f["r"] > mono[-1]["r"] + 0.005 or f["stop"] and not mono[-1]["stop"] and f["r"] >= mono[-1]["r"]:
            if mono and f["r"] <= mono[-1]["r"] + 0.005:
                mono[-1] = f
            else:
                mono.append(f)
    stop_r = [0.0] + [f["r"] for f in mono if f["stop"]]
    top = min(1.0, stop_r[-1])
    gap = float(max(np.diff(stop_r)))
    dev = float(np.mean([f["dev"] for f in mono if f["r"] > 0.3] or [mono[-1]["dev"]]))
    blinks = sum(f["blink"] for f in mono)
    score = top - 0.8 * dev - 0.04 * blinks - 0.3 * max(0.0, gap - 0.5) + 0.03 * (len(stop_r) - 1)
    return dict(take=take, run=mono, score=score, top=top, dev=float(np.degrees(dev)), gap=gap, stops=len(stop_r) - 1, blinks=blinks)


MAX_STOPS = int(os.environ.get("ATLAS_MAX_STOPS", 4))
MAX_PASSING = int(os.environ.get("ATLAS_MAX_PASSING", 7))
# Passing frames are only ever seen in motion: stored smaller.
PASS_SCALE = float(os.environ.get("ATLAS_PASS_SCALE", 0.55))
# A direction the archive barely films is left out and served by its
# neighbours, rather than faked.
MIN_REACH = 0.5
spokes = []
for s, name in enumerate(DIRECTIONS):
    best = None
    for take in by_take:
        for leg in legs(take):
            cand = leg_for_spoke(take, leg, s)
            if cand and (best is None or cand["score"] > best["score"]):
                best = cand
    if best is None:
        best = dict(take=None, run=[], top=0.0, dev=0.0, gap=1.0, stops=0, blinks=0)
    run = best["run"]
    # At most MAX_STOPS stops (the furthest always, the rest spread evenly
    # by radius); every other frame is passing, thinned to MAX_PASSING.
    stops = [k for k, f in enumerate(run) if f["stop"]]
    if len(stops) > MAX_STOPS:
        want = np.linspace(run[stops[-1]]["r"] / MAX_STOPS, run[stops[-1]]["r"], MAX_STOPS)
        kept = {min(stops, key=lambda k: abs(run[k]["r"] - t)) for t in want}
        for k in stops:
            if k not in kept:
                run[k] = dict(run[k], stop=False)
        stops = sorted(kept)
    passing = [k for k in range(len(run)) if k not in stops]
    if len(passing) > MAX_PASSING:
        passing = [passing[int(round(j))] for j in np.linspace(0, len(passing) - 1, MAX_PASSING)]
    run = [run[k] for k in sorted(set(stops) | set(passing))]
    if best["top"] < MIN_REACH:
        best.update(chosen=[], settle=[], usable=False)
        spokes.append(best)
        print(f"{name:10s} not filmed cleanly (reach {best['top']:.2f}): served by its neighbours", flush=True)
        continue
    best["usable"] = True
    best["chosen"] = [(f["i"], f["r"]) for f in run]
    best["settle"] = [f["stop"] for f in run]
    spokes.append(best)
    print(
        f"{name:10s} {best['take']:24s} frames {[c[0] for c in best['chosen']]} reach {best['top']:.2f} off-axis {best['dev']:.1f} deg, "
        f"{best['stops']} stops (widest gap {best['gap']:.2f}), {best['blinks']} blink frames in passing",
        flush=True,
    )

# ---------------------------------------------------------------- frames
metrics = {(m["take"], m["i"]): m for m in json.load(open(os.path.join(os.path.dirname(audit_path), "metrics.json")))}
REF_TAKE = "hero-right.mp4"


def read_frame(take, i):
    cap = cv2.VideoCapture(os.path.join(video_dir, take))
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ok, img = cap.read()
    if not ok or int(cap.get(cv2.CAP_PROP_POS_FRAMES)) != i + 1:
        # Seeking is unreliable in some containers: walk instead.
        cap = cv2.VideoCapture(os.path.join(video_dir, take))
        for _ in range(i + 1):
            ok, img = cap.read()
    return img.astype(np.float32)


ref = read_frame(REF_TAKE, 0)
wall = np.zeros(ref.shape[:2], bool)
wall[60:880, 720:880] = True
wall[60:880, 1700:1860] = True


def normalise(take, i):
    img = read_frame(take, i)
    m = metrics[(take, i)]
    # phaseCorrelate(ref, img) is img's shift from ref; move it back.
    M = np.float32([[1, 0, -m["dx"]], [0, 1, -m["dy"]]])
    img = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    gain = ref[wall].mean(0) / img[wall].mean(0)
    return (img * gain)[:, CROP_X : CROP_X + CROP_W]


raw = os.path.join(work, "raw")
graded = os.path.join(work, "graded")
os.makedirs(raw, exist_ok=True)
os.makedirs(graded, exist_ok=True)
used_takes = sorted({sp["take"] for sp in spokes if sp["usable"]})
jobs = [(f"rest-{t}", t, 0) for t in used_takes] + [(f"{DIRECTIONS[s]}-{k}", sp["take"], i) for s, sp in enumerate(spokes) for k, (i, _) in enumerate(sp["chosen"])]
for name, take, i in jobs:
    cv2.imwrite(os.path.join(raw, f"{name}.png"), normalise(take, i).clip(0, 255).round().astype(np.uint8))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(raw, f"{name}.png"), "-vf", f"{GRADE},{SCALE}", os.path.join(graded, f"{name}.png")], check=True)

# ---------------------------------------------------------------- compose
living = json.load(open(os.path.join(root, "src", "assets", "media", "living", "prawal-living.json")))
nx, cx, cy = living["nx"], *living["centre"]
rest_index = cy * nx + (nx - 1 - cx if cy % 2 else cx)
pb = living["box"]
PX, PY = round(pb["left"] * PLATE_W), round(pb["top"] * PLATE_H)
PW, PH = round(pb["width"] * PLATE_W), round(pb["height"] * PLATE_H)
base_png = os.path.join(work, "base.png")
subprocess.run(
    [
        "ffmpeg", "-v", "error", "-y", "-i", os.path.join(root, "src", "assets", "media", "living", "prawal-living.mp4"),
        "-vf", f"select=eq(n\\,{rest_index}),scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24", "-frames:v", "1", base_png,
    ],
    check=True,
)
base = cv2.imread(base_png).astype(np.float32)
assert base.shape[:2] == (PH, PW), (base.shape, PW, PH)

load = lambda n: cv2.imread(os.path.join(graded, f"{n}.png")).astype(np.float32)[PY : PY + PH, PX : PX + PW]  # noqa: E731
names = [n for n, _, _ in jobs if not n.startswith("rest-")]
poses = {n: load(n) for n in names}
take_of = {f"{DIRECTIONS[s]}-{k}": sp["take"] for s, sp in enumerate(spokes) for k in range(len(sp["chosen"]))}

# Veo re-renders the face in every take, rest frame included: same pose, but
# its own skin detail and exposure. Each take is brought to the production
# rest head's exposure on the head (per channel), and what is left (detail,
# not light) is reported: it is the likeness change a viewer sees when the
# head leaves rest along that take.
head = np.zeros((PH, PW), bool)
head[round(60 - PY) : round(520 - PY), round(720 - PX - 200) : round(720 - PX + 200)] = True
take_gain, rest_mismatch = {}, {}
for t in used_takes:
    r0 = load(f"rest-{t}")
    g = base[head].mean(0) / r0[head].mean(0)
    take_gain[t] = g
    rest_mismatch[t] = round(float(np.abs(r0 * g - base)[head].mean()), 2)
    print(f"rest of {t:24s} exposure x{np.round(g, 3).tolist()}, detail difference from the production rest head {rest_mismatch[t]:.2f} levels", flush=True)
for n in names:
    poses[n] *= take_gain[take_of[n]]
rest = base

# Everywhere any picture differs from rest, above the collar; below the jaw
# only a narrow column for the chin and beard, so the collar and lapels stay
# the poster's.
blur = lambda a: cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), (0, 0), 3)  # noqa: E731
rb = blur(rest)
reach = np.zeros((PH, PW), np.float32)
for img in poses.values():
    reach = np.maximum(reach, (np.abs(blur(img) - rb) > 10).astype(np.float32))
FACE_X = round(720 - PX)
JAW = round(507 - PY)
zone = np.zeros((PH, PW), np.uint8)
zone[: round(427 - PY), max(0, FACE_X - 400) : FACE_X + 400] = 1
zone[round(427 - PY) : JAW + 60, FACE_X - 150 : FACE_X + 150] = 1
reach = (reach * zone).astype(np.uint8)
n, labels, stats, _ = cv2.connectedComponentsWithStats(reach)
reach = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
ell = lambda k: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))  # noqa: E731
reach = cv2.morphologyEx(reach, cv2.MORPH_CLOSE, ell(61))
reach = cv2.dilate(reach, ell(31)) * zone
mask = cv2.GaussianBlur(reach.astype(np.float32), (0, 0), 8)[..., None]

# The tile: the mask's extent plus the margin the page feathers over, inside
# the production head box.
MARGIN = 24
ys, xs = np.nonzero(mask[..., 0] > 0.002)
even = lambda v: int(round(v / 2) * 2)  # noqa: E731
x0, y0 = max(0, even(xs.min() - MARGIN)), max(0, even(ys.min() - MARGIN))
x1, y1 = min(PW, even(xs.max() + MARGIN)), min(PH, even(ys.max() + MARGIN))
TW, TH = x1 - x0, y1 - y0
PW2, PH2 = even(TW * PASS_SCALE), even(TH * PASS_SCALE)
print(f"tile {TW}x{TH}, passing {PW2}x{PH2} (production head box {PW}x{PH})", flush=True)
cv2.imwrite(os.path.join(work, "mask.png"), (mask[..., 0] * 255).astype(np.uint8))

for f in os.listdir(out_dir):
    if f.startswith("atlas-") and f.endswith(".webp"):
        os.remove(os.path.join(out_dir, f))
Q = [cv2.IMWRITE_WEBP_QUALITY, int(os.environ.get("ATLAS_QUALITY", 90))]
u8 = lambda a: a.clip(0, 255).round().astype(np.uint8)  # noqa: E731
cv2.imwrite(os.path.join(out_dir, "atlas-centre.webp"), u8(base[y0:y1, x0:x1]), Q)
manifest_spokes = []
decoded = TW * TH * 4
for s, sp in enumerate(spokes):
    if not sp["usable"]:
        manifest_spokes.append(dict(direction=DIRECTIONS[s], usable=False, frames=[]))
        continue
    stop_tiles, pass_tiles, frames_out = [], [], []
    for k, ((i, rr), stop) in enumerate(zip(sp["chosen"], sp["settle"])):
        tile = (base * (1 - mask) + poses[f"{DIRECTIONS[s]}-{k}"] * mask)[y0:y1, x0:x1]
        rec = by_take[sp["take"]][i]
        entry = dict(frame=i, r=round(rr, 4), yaw=rec["yaw"], pitch=rec["pitch"], stop=stop, blink=bool(BLINK & set(rec["why"])))
        if stop:
            entry.update(strip="stops", k=len(stop_tiles))
            stop_tiles.append(tile)
        else:
            entry.update(strip="passing", k=len(pass_tiles))
            pass_tiles.append(cv2.resize(tile, (PW2, PH2), interpolation=cv2.INTER_AREA))
        frames_out.append(entry)
    files = {}
    for kind, tiles in (("stops", stop_tiles), ("passing", pass_tiles)):
        if tiles:
            fname = f"atlas-{DIRECTIONS[s]}-{kind}.webp"
            cv2.imwrite(os.path.join(out_dir, fname), u8(np.concatenate(tiles, axis=0)), Q)
            files[kind] = fname
            decoded += sum(t.shape[0] * t.shape[1] * 4 for t in tiles)
    manifest_spokes.append(
        dict(direction=DIRECTIONS[s], usable=True, take=sp["take"], files=files, frames=frames_out, offAxisDeg=round(sp["dev"], 1), restMismatch=rest_mismatch[sp["take"]])
    )

manifest = dict(
    version=2,
    extents=EXT,
    tile=dict(width=TW, height=TH),
    passing=dict(width=PW2, height=PH2),
    box=dict(left=(PX + x0) / PLATE_W, top=(PY + y0) / PLATE_H, width=TW / PLATE_W, height=TH / PLATE_H, feather=MARGIN / TW),
    centre="atlas-centre.webp",
    spokes=manifest_spokes,
)
json.dump(manifest, open(os.path.join(out_dir, "atlas.json"), "w"), indent=1)
size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir) if f.endswith(".webp"))
count = 1 + sum(len(s["frames"]) for s in manifest_spokes)
print(f"atlas: {count} pictures, {size / 1e6:.2f} MB on disk, {decoded / 1e6:.0f} MB decoded", flush=True)
