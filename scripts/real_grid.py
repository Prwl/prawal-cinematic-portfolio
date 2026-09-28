# Builds the living portrait's pose grid from real video. Called by
# scripts/prepare-video.mjs with LivePortrait's own Python; not meant to be
# run by hand.
#   <LivePortrait>/.venv/bin/python scripts/real_grid.py <LivePortrait> <workDir> <take.mp4>...
#
# Every take is a Veo generation that starts and ends on the same rest image
# (reference-video/hero-*.mp4), so the takes agree to the pixel at rest and
# differ only in where the head goes in between. LivePortrait is used here to
# measure, never to draw: its motion extractor gives each frame's yaw and
# pitch, and its landmarks give eye and lip openness.
#
# 1. Measure every frame; keep the ones that are sharp, eyes open (lowered
#    lids allowed looking down), mouth closed, body and camera still.
# 2. Thin them to one anchor per small patch of pose space, preferring the
#    sharpest frame from the take the patch's neighbours come from, so
#    neighbouring anchors are near-identical pictures.
# 3. Every grid pose lies in a triangle of anchors (Delaunay in yaw/pitch).
#    Its picture is the triangle's dominant anchor, warped along dense optical
#    flow to the grid pose and blended with the other two warped the same way.
#    Weights are sharpened, so a grid pose is one real frame, moved slightly,
#    except in narrow bands between anchors. Warping moves pixels, it never
#    redraws them, so every pose keeps the video's own detail.
# 4. Only the head moves: each pose is laid into the rest frame through one
#    feathered mask, the union of everywhere any pose differs from rest.
#
# Writes <workDir>/rest.png (the rest frame, full crop), <workDir>/grid/NNNN.png
# (the head box of every pose, row-major, rows are pitch from up to down,
# columns are yaw from the viewer's right to the viewer's left) and
# <workDir>/grid.json.
import json
import os
import sys

lp_dir, work = sys.argv[1:3]
takes = sys.argv[3:]
sys.path.insert(0, lp_dir)
os.chdir(lp_dir)
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import cv2  # noqa: E402
import numpy as np  # noqa: E402

# The figure's crop in the 1920x1080 generations (the old 720p crop, 760x720
# at 470, scaled by 1.5).
CROP_X, CROP_W, CROP_H = 705, 1140, 1080
cv2.setNumThreads(os.cpu_count() or 8)


def frames(path):
    cap = cv2.VideoCapture(path)
    while True:
        ok, bgr = cap.read()
        if not ok:
            return
        yield bgr[:, CROP_X : CROP_X + CROP_W]


def grey(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


# ---------------------------------------------------------------- measure
def gaze(face, lmk):
    """Where the irises sit in the eyes: x along the corner-to-corner axis, y
    across it, as fractions of the eye's width, averaged over both eyes (0 is
    centred; positive x is toward the image's right, positive y is down). The
    iris is the darkest third of each eye's outline (landmarks 0-23 and
    24-47, corners 0/12 and 24/36)."""
    out = []
    for lo, a, b in ((0, 0, 12), (24, 24, 36)):
        poly = lmk[lo : lo + 24].astype(np.int32)
        m = np.zeros(face.shape, np.uint8)
        cv2.fillPoly(m, [poly], 1)
        vals = face[m > 0]
        if vals.size < 30:
            return {}
        ys, xs = np.nonzero((face <= np.percentile(vals, 33)) & (m > 0))
        c = np.array([xs.mean(), ys.mean()])
        p, q = lmk[a], lmk[b]
        axis = q - p
        width = float(np.linalg.norm(axis))
        u = axis / width
        d = c - (p + q) / 2
        out.append((float(d @ u) / width, float(d @ np.array([-u[1], u[0]])) / width))
    return dict(gx=float(np.mean([o[0] for o in out])), gy=float(np.mean([o[1] for o in out])))


def measure():
    from src.config.crop_config import CropConfig
    from src.config.inference_config import InferenceConfig
    from src.live_portrait_pipeline import LivePortraitPipeline
    from src.utils.retargeting_utils import calc_eye_close_ratio, calc_lip_close_ratio
    import torch

    pipe = LivePortraitPipeline(inference_cfg=InferenceConfig(), crop_cfg=CropConfig())
    wrapper, cropper = pipe.live_portrait_wrapper, pipe.cropper
    rows = []
    for t, path in enumerate(takes):
        first = None
        for i, img in enumerate(frames(path)):
            g = grey(img).astype(np.float32)
            if first is None:
                first = g
            # Camera drift: the wall left of him, which never moves.
            (dx, dy), _ = cv2.phaseCorrelate(first[:, :150], g[:, :150])
            # Body: the blazer below the head, against the first frame.
            torso = float(np.abs(g[800:, 150:1000] - first[800:, 150:1000]).mean())
            row = dict(take=t, i=i, dx=round(dx, 2), dy=round(dy, 2), torso=round(torso, 2))
            try:
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                crop = cropper.crop_source_image(rgb, cropper.crop_cfg)
                with torch.no_grad():
                    kp = wrapper.get_kp_info(wrapper.prepare_source(crop["img_crop_256x256"]))
                lmk = crop["lmk_crop"][None]
                face = cv2.cvtColor(crop["img_crop"], cv2.COLOR_RGB2GRAY)
                row.update(
                    yaw=float(kp["yaw"]),
                    pitch=float(kp["pitch"]),
                    roll=float(kp["roll"]),
                    eye=float(calc_eye_close_ratio(lmk).mean()),
                    lip=float(calc_lip_close_ratio(lmk).mean()),
                    sharp=float(cv2.Laplacian(face, cv2.CV_32F).var()),
                )
                row.update(gaze(grey(img), crop["lmk_crop"]))
            except Exception:
                pass
            rows.append(row)
        print(f"measured {os.path.basename(path)}", flush=True)
    return rows


os.makedirs(work, exist_ok=True)
metrics_path = os.path.join(work, "metrics.json")
if os.path.exists(metrics_path):
    metrics = json.load(open(metrics_path))
else:
    metrics = measure()
    json.dump(metrics, open(metrics_path, "w"))

if os.environ.get("REAL_GRID_MEASURE_ONLY"):
    sys.exit(0)

# ---------------------------------------------------------------- select
names = [os.path.basename(p) for p in takes]
has_pose = [m for m in metrics if "yaw" in m]
rest_rows = [m for m in has_pose if m["i"] < 6]
YAW0 = float(np.median([m["yaw"] for m in rest_rows]))
PITCH0 = float(np.median([m["pitch"] for m in rest_rows]))
ROLL0 = float(np.median([m["roll"] for m in rest_rows]))
sharp_median = {t: float(np.median([m["sharp"] for m in has_pose if m["take"] == t])) for t in range(len(takes))}

# The grid: yaw from the viewer's right (negative, LivePortrait's convention)
# to the viewer's left, pitch from up (negative) to down, relative to rest.
YAW_MAX = float(os.environ.get("REAL_GRID_YAW", 22))
PITCH_UP = float(os.environ.get("REAL_GRID_UP", 15))
# Down stops at 7 degrees: Veo dropped his head fast with his eyes shut in
# every take asked to look down, so past that the diagonals were barely filmed.
PITCH_DOWN = float(os.environ.get("REAL_GRID_DOWN", 7))
NX = 33
YAWS = np.linspace(-YAW_MAX, YAW_MAX, NX)
PITCHES = np.concatenate([np.linspace(-PITCH_UP, 0, 13), np.linspace(0, PITCH_DOWN, 7)[1:]])
NY = len(PITCHES)
CENTRE = [NX // 2, 12]


# How fast the head is moving at each frame, degrees per frame: Veo blurs
# fast moves, and a blurred frame read sharp enough by its face alone.
by_frame = {(m["take"], m["i"]): m for m in has_pose}
for m in has_pose:
    a, b = by_frame.get((m["take"], m["i"] - 1)), by_frame.get((m["take"], m["i"] + 1))
    ends = [e for e in (a, b) if e]
    m["speed"] = max(np.hypot(e["yaw"] - m["yaw"], e["pitch"] - m["pitch"]) for e in ends) if ends else 0.0
MAX_SPEED = 3.3


def usable(m):
    if "yaw" not in m:
        return False
    y, p = m["yaw"] - YAW0, m["pitch"] - PITCH0
    if abs(y) > YAW_MAX + 8 or p < -PITCH_UP - 8 or p > PITCH_DOWN + 8:
        return False
    if m["lip"] > 0.03 or m["torso"] > 8 or abs(m["roll"] - ROLL0) > 12:
        return False
    # Eyes open; looking down, lowered lids are natural (the ratio reads
    # wider the further he turns, so there is no upper bound).
    if not (m["eye"] >= 0.2 or (p > 8 and m["eye"] >= 0.09)):
        return False
    # Face sharpness varies with pose (looking up shows more texture), so only
    # clear blur is dropped by it; motion blur is dropped by speed.
    return m["sharp"] >= 0.6 * sharp_median[m["take"]] and m["speed"] <= MAX_SPEED


cands = [m for m in has_pose if usable(m)]
# The rest frame: the first frame of the take whose first frame is sharpest.
rest_m = max((m for m in has_pose if m["i"] == 0), key=lambda m: m["sharp"])

# Gaze. Veo's eyes lead the head on the way out of a turn and lag on the way
# back, so two frames at one head pose can look in different directions, and
# poses made from different takes then flick their eyes. Where the irises sit
# is fitted as one plane over head pose (the eyes lead a little, as people's
# do); frames far from it are dropped, and frames near it preferred.
GAZE0 = np.array([np.median([m["gx"] for m in rest_rows if "gx" in m]), np.median([m["gy"] for m in rest_rows if "gy" in m])])
cands = [m for m in cands if "gx" in m]
A = np.array([[m["yaw"] - YAW0, m["pitch"] - PITCH0, 1.0] for m in cands])
G = np.array([[m["gx"], m["gy"]] for m in cands]) - GAZE0
# Limits are fractions of the eye's width, wide enough that a region filmed
# by one take only (up and to the viewer's right) keeps its frames: there the
# gaze score only ranks frames, below. Looking down, lowered lids hide the
# iris, so its height is read loosely there.
keep = np.ones(len(cands), bool)
limit = np.where(A[:, 1:2] > 8, [0.2, 0.4], [0.2, 0.22])
for _ in range(2):
    coef = np.linalg.lstsq(A[keep], G[keep], rcond=None)[0]
    resid = G - A @ coef
    score = np.max(np.abs(resid) / limit, axis=1)
    keep = score < 1.0
gaze_score = {id(m): float(s) for m, s in zip(cands, score)}
cands = [m for m, k in zip(cands, keep) if k]

# One anchor per patch of pose space: the frame whose eyes best fit the gaze
# plane, sharper frames preferred. Near rest the patch is the rest frame.
BIN = float(os.environ.get("REAL_GRID_BIN", 1.6))
rank = lambda m: gaze_score[id(m)] - 0.5 * m["sharp"] / sharp_median[m["take"]] + 0.2 * m["speed"]  # noqa: E731
members = {}
for m in cands:
    y, p = m["yaw"] - YAW0, m["pitch"] - PITCH0
    if abs(y) < 1.2 and abs(p) < 1.2:
        continue
    members.setdefault((round(y / BIN), round(p / BIN)), []).append(m)
bins = {k: min(v, key=rank) for k, v in members.items()}
# Neighbouring patches from one take are near-identical pictures; where the
# take changes, the page's blend of neighbouring poses can double an eye. So
# a patch takes the take most of its neighbours use, when that take has a
# frame there nearly as good.
for _ in range(4):
    for k, v in members.items():
        near = [bins[(k[0] + dx, k[1] + dy)]["take"] for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (k[0] + dx, k[1] + dy) in bins]
        if not near:
            continue
        major = max(set(near), key=near.count)
        same = [m for m in v if m["take"] == major]
        if same and bins[k]["take"] != major and rank(min(same, key=rank)) <= rank(bins[k]) + 0.8:
            bins[k] = min(same, key=rank)
anchors = [rest_m] + list(bins.values())
pose = np.array([[m["yaw"] - YAW0, m["pitch"] - PITCH0] for m in anchors])
pose[0] = 0
print(f"{len(cands)} usable frames, {len(anchors)} anchors; rest {names[rest_m['take']]}", flush=True)

if os.environ.get("REAL_GRID_GAPS"):
    # How far apart the filmed frames a pose is made from are, per pose.
    from scipy.spatial import Delaunay

    tri = Delaunay(pose)
    for r in range(NY):
        line = []
        for c in range(NX):
            t = np.array([YAWS[c], PITCHES[r]])
            k = int(tri.find_simplex(t))
            if k < 0:
                line.append("  X")
                continue
            T = tri.transform[k]
            b = T[:2].dot(t - T[2])
            w = np.append(b, 1 - b.sum())
            v = tri.simplices[k]
            near = pose[v[np.argmax(w)]]
            line.append(f"{max(np.linalg.norm(pose[v[i]] - near) for i in range(3) if w[i] > 0.1):3.0f}")
        print(f"{PITCHES[r]:6.1f} " + "".join(line))
    sys.exit(0)

if os.environ.get("REAL_GRID_PLOT"):
    s = 20
    img = np.full((int(2 * 40 * s / 2) + 1, int(2 * 40 * s / 2) + 1, 3), 255, np.uint8)
    cx = cy = img.shape[0] // 2
    cv2.rectangle(img, (int(cx - YAW_MAX * s / 2), int(cy - PITCH_UP * s / 2)), (int(cx + YAW_MAX * s / 2), int(cy + PITCH_DOWN * s / 2)), (0, 0, 0), 1)
    colours = [tuple(int(c) for c in np.random.RandomState(t).randint(0, 200, 3)) for t in range(len(takes))]
    for m, (y, p) in zip(anchors, pose):
        cv2.circle(img, (int(cx - y * s / 2), int(cy + p * s / 2)), 3, colours[m["take"]], -1)
    for t, n in enumerate(names):
        cv2.putText(img, n, (5, 15 + 14 * t), cv2.FONT_HERSHEY_SIMPLEX, 0.4, colours[t], 1)
    cv2.imwrite(os.environ["REAL_GRID_PLOT"], img)
    sys.exit(0)

# ---------------------------------------------------------------- load
want = {}
for k, m in enumerate(anchors):
    want.setdefault(m["take"], {})[m["i"]] = k
images = [None] * len(anchors)
for t, path in enumerate(takes):
    if t not in want:
        continue
    for i, img in enumerate(frames(path)):
        if i in want[t]:
            images[want[t][i]] = img.astype(np.float32)
rest = images[0]
cv2.imwrite(os.path.join(work, "rest.png"), rest.astype(np.uint8))

# Veo lets exposure wander a little within a take. The wall either side of
# him never changes, so each anchor is brought back to the rest frame's level
# there, per channel.
wall = np.zeros(rest.shape[:2], bool)
wall[:900, :160] = True
wall[:900, 1000:] = True
for k in range(1, len(images)):
    gain = rest[wall].mean(0) / images[k][wall].mean(0)
    images[k] *= gain

# What moves. Above the jaw: everywhere any pose differs from rest, the
# head's reach, wide enough that turned hair is never sliced. Below it each
# pose takes only its own face and beard and the rest pose's (the landmarks'
# outline, grown downward over the beard), so the T-shirt's neckline and the
# lapels are always the rest frame's, except where his chin covers them.
# Veo redraws the neckline and lets the shoulders drift from take to take;
# taken from the poses, they changed shape as he moved.
FACE_X, JAW_Y = 540, 380
reach = np.zeros(rest.shape[:2], np.float32)
rest_blur = cv2.GaussianBlur(cv2.cvtColor(rest, cv2.COLOR_BGR2GRAY), (0, 0), 3)
for img in images[1:]:
    d = np.abs(cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (0, 0), 3) - rest_blur)
    reach = np.maximum(reach, (d > 10).astype(np.float32))
upper_zone = np.zeros(rest.shape[:2], np.uint8)
upper_zone[:320, FACE_X - 300 : FACE_X + 300] = 1
# Between the ears and the jaw only the face: wider, it took in the tops of
# the blazer's collar.
upper_zone[320:JAW_Y, FACE_X - 110 : FACE_X + 110] = 1
reach *= upper_zone
n, labels, stats, _ = cv2.connectedComponentsWithStats(reach.astype(np.uint8))
keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
reach = (labels == keep).astype(np.uint8)
reach = cv2.morphologyEx(reach, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
# Room for the head placement below to move a head by up to about 25px.
upper = cv2.dilate(reach, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81))) * upper_zone
FEATHER = 24
feather = lambda m: cv2.GaussianBlur(m.astype(np.float32), (0, 0), FEATHER / 2)  # noqa: E731
BEARD = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (57, 97))


def landmarks(img):
    """LivePortrait's 203 face landmarks of a picture at crop size, or None."""
    global _cropper
    if "_cropper" not in globals():
        from src.config.crop_config import CropConfig
        from src.config.inference_config import InferenceConfig
        from src.live_portrait_pipeline import LivePortraitPipeline

        _cropper = LivePortraitPipeline(inference_cfg=InferenceConfig(), crop_cfg=CropConfig()).cropper
    try:
        rgb = cv2.cvtColor(img.clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
        return _cropper.crop_source_image(rgb, _cropper.crop_cfg)["lmk_crop"].astype(np.float32)
    except Exception:
        return None


def face_region(img, grow=True, lmk=None):
    """The face and beard of a picture at crop size, from its landmarks."""
    lmk = landmarks(img) if lmk is None else lmk
    if lmk is None:
        return None
    m = np.zeros(img.shape[:2], np.uint8)
    cv2.fillConvexPoly(m, cv2.convexHull(lmk.astype(np.int32)), 1)
    # Grown most downward, where the beard runs past the jaw landmarks.
    return cv2.dilate(m, BEARD, anchor=(28, 76)) if grow else m


rest_face = face_region(rest)

# Skin tone. Veo exposes each take a little differently, so poses made from
# different takes flickered in brightness as he moved. Each anchor's skin
# (inside its landmarks, above the beard's darkness) is measured, a smooth
# trend over head pose is fitted (turning does change the light on him), and
# each anchor is brought to the trend. The rest frame is the reference and is
# left as it is, so the poster still matches.
skin, anchor_lmk = [], []
for img in images:
    anchor_lmk.append(landmarks(img))
    hull = face_region(img, grow=False, lmk=anchor_lmk[-1])
    if hull is None:
        skin.append(None)
        continue
    px = img[hull > 0]
    luma = px @ np.array([0.114, 0.587, 0.299], np.float32)
    skin.append(np.median(px[luma > np.percentile(luma, 45)], axis=0))
ok = [k for k, v in enumerate(skin) if v is not None]
P = pose[ok]
X = np.c_[P, P**2, P[:, 0] * P[:, 1], np.ones(len(P))]
S = np.array([skin[k] for k in ok])
coef = np.linalg.lstsq(X, S, rcond=None)[0]
trend = lambda q: np.array([q[0], q[1], q[0] ** 2, q[1] ** 2, q[0] * q[1], 1.0]) @ coef  # noqa: E731
lift = skin[0] - trend(np.zeros(2))
tone_shift = []
for k in ok[1:] if ok and ok[0] == 0 else ok:
    gain = np.clip((trend(pose[k]) + lift) / skin[k], 0.9, 1.1).astype(np.float32)
    # Only on him: the wall was already matched to the rest frame, and moving
    # it too drew a faint ring on it where a pose meets the rest frame.
    hsv = cv2.cvtColor(images[k].clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    wall = cv2.GaussianBlur(((hsv[..., 2] > 150) & (hsv[..., 1] < 32)).astype(np.float32), (0, 0), 3)[..., None]
    images[k] *= 1 + (gain - 1) * (1 - wall)
    tone_shift.append(float(np.abs(gain - 1).max()))
print(f"skin tone matched: median {np.median(tone_shift) * 100:.1f}%, largest {max(tone_shift) * 100:.1f}%", flush=True)

# Head placement. Veo's head bobs a little, so two frames at one head angle can
# sit a few pixels apart or at slightly different sizes, and neighbouring
# poses made from them doubled the eyes as the page blended them. Where the
# face sits (the landmarks' centre) and how big it is (their spread) are
# fitted as a smooth trend over head angle, and every pose is moved onto it.
# The rest frame is the reference.
def placement(lmk):
    c = lmk.mean(0)
    return np.array([c[0], c[1], np.sqrt(((lmk - c) ** 2).sum(1).mean())])


okp = [k for k, l in enumerate(anchor_lmk) if l is not None]
Q = np.array([placement(anchor_lmk[k]) for k in okp])
Xp = np.c_[pose[okp], pose[okp] ** 2, pose[okp, 0] * pose[okp, 1], np.ones(len(okp))]
coef_p = np.linalg.lstsq(Xp, Q, rcond=None)[0]
place_trend = lambda q: np.array([q[0], q[1], q[0] ** 2, q[1] ** 2, q[0] * q[1], 1.0]) @ coef_p  # noqa: E731
place_lift = placement(anchor_lmk[0]) - place_trend(np.zeros(2))
resid = Q - (Xp @ coef_p + place_lift)
print(f"head placement: centre off trend by {np.median(np.hypot(resid[:, 0], resid[:, 1])):.1f}px median, {np.hypot(resid[:, 0], resid[:, 1]).max():.1f}px worst; size {np.median(np.abs(resid[:, 2]) / Q[:, 2]) * 100:.1f}% median", flush=True)
# Everything a pose can take, for the region the poses are made in.
lower_zone = np.zeros(rest.shape[:2], np.uint8)
lower_zone[JAW_Y - 60 : 560, FACE_X - 170 : FACE_X + 170] = 1
mask = feather(np.maximum(upper, lower_zone))
ys, xs = np.nonzero(mask > 0.002)
# The region every pose is made in, with room for the flow, on multiples of
# 6 pixels: the plate is the crop at 4/3, so these land on even plate pixels.
x0, y0 = max(0, (xs.min() - 32) // 6 * 6), max(0, (ys.min() - 32) // 6 * 6)
x1, y1 = min(CROP_W, -(-(xs.max() + 32) // 6) * 6), min(CROP_H, -(-(ys.max() + 32) // 6) * 6)
roi = (slice(y0, y1), slice(x0, x1))


def place(img_roi, target):
    """Moves the head in a pose onto the placement trend at its head angle.
    Returns the moved roi and its landmarks (crop coordinates), or the roi as
    it is and None when no face is found."""
    full = rest.copy()
    full[roi] = img_roi
    lmk = landmarks(full)
    if lmk is None:
        return img_roi, None
    have = placement(lmk)
    want = place_trend(target) + place_lift
    s = want[2] / have[2]
    # Similarity about the face centre, in roi coordinates.
    cx, cy = have[0] - x0, have[1] - y0
    M = np.array([[s, 0, want[0] - x0 - s * cx], [0, s, want[1] - y0 - s * cy]], np.float32)
    moved = cv2.warpAffine(img_roi, M, (img_roi.shape[1], img_roi.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    lmk = (lmk - have[:2]) * s + want[:2]
    return moved, lmk


def pose_mask(img_roi, lmk=None):
    """The mask a pose is laid into the rest frame through, over the roi."""
    full = rest.copy()
    full[roi] = img_roi
    face = face_region(full, lmk=lmk)
    lower = rest_face if face is None else np.maximum(face, rest_face)
    lower = lower * (np.arange(CROP_H)[:, None] >= JAW_Y - 60)
    return feather(np.maximum(upper, lower))[roi][..., None]


print(f"head region {x1 - x0}x{y1 - y0} at {x0},{y0}", flush=True)

# ---------------------------------------------------------------- flow
from functools import lru_cache  # noqa: E402

from scipy.spatial import Delaunay  # noqa: E402

dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST)
dis.setFinestScale(0)
dis.setPatchSize(12)
dis.setPatchStride(3)
dis.setGradientDescentIterations(40)
dis.setVariationalRefinementIterations(10)
dis.setVariationalRefinementAlpha(20)
dis.setUseMeanNormalization(True)
dis.setUseSpatialPropagation(True)
greys = [None] * len(images)


def grey_roi(k):
    if greys[k] is None:
        greys[k] = cv2.cvtColor(images[k][roi], cv2.COLOR_BGR2GRAY).clip(0, 255).astype(np.uint8)
    return greys[k]


eye_zones = [None] * len(images)


def eyes(k):
    """1 over anchor k's eyes and lids, 0 elsewhere, over the roi."""
    if eye_zones[k] is None:
        m = np.zeros(rest.shape[:2], np.uint8)
        # Without its own landmarks, an anchor's eyes are taken to sit where
        # the rest frame's do, moved by the placement trend.
        lmk = anchor_lmk[k]
        if lmk is None and anchor_lmk[0] is not None:
            lmk = anchor_lmk[0] + (place_trend(pose[k]) - place_trend(np.zeros(2)))[:2]
        if lmk is not None:
            for lo in (0, 24):
                cv2.fillConvexPoly(m, cv2.convexHull(lmk[lo : lo + 24].astype(np.int32)), 1)
            m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 31)))
        eye_zones[k] = cv2.GaussianBlur(m[roi].astype(np.float32), (0, 0), 6)[..., None]
    return eye_zones[k]


walls = [None] * len(images)


def near_wall(k):
    """1 on and near the plain wall around him in anchor k, 0 on him."""
    if walls[k] is None:
        hsv = cv2.cvtColor(images[k][roi].clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
        wall = ((hsv[..., 2] > 150) & (hsv[..., 1] < 32)).astype(np.uint8)
        wall = cv2.morphologyEx(wall, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        wall = cv2.dilate(wall, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        walls[k] = cv2.GaussianBlur(wall.astype(np.float32), (0, 0), 8)[..., None]
    return walls[k]


H, W = y1 - y0, x1 - x0
gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))


SMOOTH = float(os.environ.get("REAL_GRID_SMOOTH", 14))  # full-resolution pixels
FACE_FINE = os.environ.get("REAL_GRID_FACE_FINE", "1") == "1"


@lru_cache(maxsize=600)
def flow(a, b):
    """Where each pixel of anchor a is in anchor b, at full resolution."""
    f = dis.calc(grey_roi(a), grey_roi(b), None)
    # On his face the flow is kept fine, so irises, lids and lips line up and
    # blend as one; the wall behind him is plain, so there a smooth field that
    # drags a little wall along with the head cannot be seen, where a sharp
    # step at his outline tears hair off onto the wall.
    smooth = cv2.GaussianBlur(f, (0, 0), SMOOTH)
    if not FACE_FINE:
        return smooth
    fine = cv2.GaussianBlur(f, (0, 0), 1.5)
    # The eyes move with the head as a whole: a fine field there half-morphed
    # one lid toward another frame's and left one eye open, one shut.
    w = np.maximum(near_wall(a), eyes(a))
    return fine * (1 - w) + smooth * w


def sample(img, mx, my):
    return cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


# Appearance weights are sharpened so a pose is one frame, moved, except in a
# narrow band between anchors; geometry follows the plain weights, so the
# head still moves continuously.
SHARPEN = float(os.environ.get("REAL_GRID_SHARPEN", 2.0))


def synth(simplex, weights):
    b = int(np.argmax(weights))
    base = simplex[b]
    others = [(simplex[j], weights[j]) for j in range(3) if j != b and weights[j] > 1e-4]
    if not others:
        return images[base][roi]
    disp = np.zeros((H, W, 2), np.float32)
    for k, w in others:
        disp += w * flow(base, k)
    # The target pixel q came from p in the base frame, where p + disp(p) = q.
    px, py = gx.copy(), gy.copy()
    for _ in range(8):
        d = cv2.remap(disp, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        px, py = gx - d[..., 0], gy - d[..., 1]
    acc = sample(images[base][roi], px, py) * (weights[b] ** SHARPEN)
    total = np.full((H, W, 1), weights[b] ** SHARPEN, np.float32)
    for k, w in others:
        f = cv2.remap(flow(base, k), px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        qx, qy = px + f[..., 0], py + f[..., 1]
        back = cv2.remap(flow(k, base), qx, qy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        err = np.hypot(f[..., 0] + back[..., 0], f[..., 1] + back[..., 1])
        # Trust the other frame only where the flow agrees both ways; the
        # trust is smoothed across the face, so both eyes always take the
        # same mix of frames (per-pixel trust left one eye open, one shut).
        trust = cv2.GaussianBlur(np.clip(1.0 - (err - 1.0) / 2.0, 0, 1), (0, 0), 24)
        # His outline comes from the base frame alone: two frames' hair never
        # has quite the same silhouette, and blended they drew wings of hair.
        # The eyes, likewise, are the base frame's: lids from two frames
        # blended into half-shut eyes.
        trust = trust[..., None] * (1 - near_wall(base)) * (1 - eyes(base)) * (w ** SHARPEN)
        acc += sample(images[k][roi], qx, qy) * trust
        total += trust
    return acc / total


ELLIPSE = lambda d: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (d, d))  # noqa: E731


def clean(img):
    """Paints wall over specks of hair a long warp left on the wall.

    A speck is dark, cut off from the head, and ringed by light, colourless
    wall; pupils and eyebrows are ringed by skin, so they stay."""
    u8 = img.clip(0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(u8, cv2.COLOR_BGR2HSV)
    dark = (hsv[..., 2] < 110).astype(np.uint8)
    opened = cv2.morphologyEx(dark, cv2.MORPH_OPEN, ELLIPSE(7))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(opened)
    main = np.isin(labels, 1 + np.nonzero(stats[1:, cv2.CC_STAT_AREA] > 20000)[0]).astype(np.uint8)
    loose = dark & (1 - cv2.dilate(main, ELLIPSE(5)))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(loose)
    wall = (hsv[..., 2] > 150) & (hsv[..., 1] < 32)
    fix = np.zeros_like(dark)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] > 6000:
            continue
        comp = (labels == k).astype(np.uint8)
        grown = cv2.dilate(comp, ELLIPSE(7))
        ring = cv2.dilate(comp, ELLIPSE(21)).astype(bool) & ~grown.astype(bool)
        if wall[ring].mean() > 0.8:
            fix |= grown
    if not fix.any():
        return img, 0
    return cv2.inpaint(u8, fix, 9, cv2.INPAINT_TELEA).astype(np.float32), int(fix.sum())


tri = Delaunay(pose)
hull_pts = pose[np.unique(tri.convex_hull)]
os.makedirs(os.path.join(work, "grid"), exist_ok=True)
cells = [(r, c) for r in range(NY) for c in range(NX)]
# REAL_GRID_ONLY="r,c r,c" makes only those poses and reports their anchors.
only = [tuple(map(int, rc.split(","))) for rc in os.environ.get("REAL_GRID_ONLY", "").split()]
outside = fixed = 0
union = np.zeros((y1 - y0, x1 - x0), np.float32)
for n_cell, (r, c) in enumerate(cells):
    if only and (r, c) not in only:
        continue
    target = np.array([YAWS[c], PITCHES[r]])
    s = int(tri.find_simplex(target))
    if s < 0:
        # Outside what was filmed: the nearest filmed pose, just inside.
        outside += 1
        centroid = pose.mean(0)
        lo, hi = 0.0, 1.0
        for _ in range(30):
            mid = (lo + hi) / 2
            if tri.find_simplex(centroid + (target - centroid) * mid) >= 0:
                lo = mid
            else:
                hi = mid
        target = centroid + (target - centroid) * lo * 0.999
        s = int(tri.find_simplex(target))
    T = tri.transform[s]
    bary = T[:2].dot(target - T[2])
    weights = np.clip(np.append(bary, 1 - bary.sum()), 0, 1)
    weights /= weights.sum()
    img = synth(tri.simplices[s], weights)
    if only:
        print((r, c), [(names[anchors[k]["take"]], anchors[k]["i"], pose[k].round(1).tolist(), round(float(w), 2)) for k, w in zip(tri.simplices[s], weights)])
    if (r, c) != tuple(CENTRE[::-1]):
        img, lmk = place(img, target)
    else:
        lmk = None
    m = pose_mask(img, lmk)
    union = np.maximum(union, m[..., 0])
    out, cleaned = clean(rest[roi] * (1 - m) + img * m)
    if cleaned:
        fixed += 1
    cv2.imwrite(os.path.join(work, "grid", f"{n_cell:04d}.png"), out.clip(0, 255).astype(np.uint8))
    if n_cell % 100 == 0:
        print(f"pose {n_cell} of {len(cells)}", flush=True)

# Everywhere any pose moves, for the head box and the figure mask.
mask = np.zeros(rest.shape[:2], np.float32)
mask[roi] = union
cv2.imwrite(os.path.join(work, "mask.png"), (mask * 255).clip(0, 255).astype(np.uint8))
json.dump(
    dict(
        nx=NX,
        ny=NY,
        centre=CENTRE,
        yaw=[round(float(v), 3) for v in YAWS],
        pitch=[round(float(v), 3) for v in PITCHES],
        roi=[int(x0), int(y0), int(W), int(H)],
        crop=[CROP_X, CROP_W, CROP_H],
        anchors=[dict(take=names[m["take"]], frame=m["i"], yaw=round(float(y), 2), pitch=round(float(p), 2)) for m, (y, p) in zip(anchors, pose)],
    ),
    open(os.path.join(work, "grid.json"), "w"),
    indent=1,
)
print(f"{len(cells)} poses from {len(anchors)} anchors, {outside} outside what was filmed, {fixed} cleaned of specks", flush=True)
