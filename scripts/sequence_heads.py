# Hero image-sequence experiment (?hero=sequence): lays every frame of one
# continuous head turn into that same video's rest frame and cuts out the head
# box the page draws. Called by scripts/prepare-sequence.mjs with
# LivePortrait's own Python; not meant to be run by hand.
#   <LivePortrait>/.venv/bin/python scripts/sequence_heads.py <LivePortrait> <framesDir> <restIndex> <margin> <outDir>
#
# <framesDir> holds the take's frames at plate size (1520x1440, the
# production crop and grade, super-resolved), named by source frame index. All of them
# come from one generation, so nothing here matches tone, placement or detail
# between takes: the camera is locked off (wall drift under 0.03px, exposure
# within 0.1%), and the frames are used as filmed.
#
# LivePortrait measures only (yaw, pitch, roll, eye openness, landmarks); it
# draws nothing. The mask is production's (scripts/real_grid.py), at plate
# scale: above the jaw, everywhere any frame differs from rest; below it, each
# frame's own face and beard. Neck, collar and lapels stay the rest frame's,
# because his shoulders sway a few pixels with the turn and a seam across the
# lapels would show.
#
# Writes <outDir>/heads/<index>.png, <outDir>/still.png (the rest frame),
# <outDir>/reach.png and <outDir>/poses.json, and prints the head box and the
# head's ellipse at rest, in plate pixels, as JSON. Frames may come from
# several takes of one look, named take*1000+frame (prepare-sequence.mjs).
import json
import os
import sys

lp_dir, frames_dir, rest_index, margin, out = sys.argv[1:6]
rest_index, margin = int(rest_index), int(margin)
frames_dir, out = os.path.abspath(frames_dir), os.path.abspath(out)
sys.path.insert(0, lp_dir)
os.chdir(lp_dir)
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from src.config.crop_config import CropConfig  # noqa: E402
from src.config.inference_config import InferenceConfig  # noqa: E402
from src.live_portrait_pipeline import LivePortraitPipeline  # noqa: E402
from src.utils.retargeting_utils import calc_eye_close_ratio  # noqa: E402

# real_grid.py's zones, from its 1140x1080 crop to the 1520x1440 plate (4/3).
K = 4 / 3
FACE_X, JAW_Y = round(540 * K), round(380 * K)
FEATHER = round(24 * K)

names = sorted(f for f in os.listdir(frames_dir) if f.endswith(".png"))
index = [int(n[:-4]) for n in names]
# Optional rigid shifts, plate pixels by frame index (<framesDir>/shifts.json):
# where two runs of one take meet with the head a few pixels apart, one run is
# moved onto the other. The whole frame moves, so the head keeps its own
# place against its own neck; only the head is laid in below.
shift_path = os.path.join(frames_dir, "shifts.json")
shifts = json.load(open(shift_path)) if os.path.exists(shift_path) else {}
# Optional colour gains, B, G, R by frame index (<framesDir>/gains.json): a take
# exposed a little differently is brought to the rest take's skin tone.
gain_path = os.path.join(frames_dir, "gains.json")
gains = json.load(open(gain_path)) if os.path.exists(gain_path) else {}


def load(i, n):
    img = cv2.imread(os.path.join(frames_dir, n)).astype(np.float32)
    if str(i) in gains:
        img *= np.float32(gains[str(i)])
    if str(i) in shifts:
        dx, dy = shifts[str(i)]
        img = cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (img.shape[1], img.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return img


images = [load(i, n) for i, n in zip(index, names)]
rest = images[index.index(rest_index)]
H, W = rest.shape[:2]

pipe = LivePortraitPipeline(inference_cfg=InferenceConfig(), crop_cfg=CropConfig())
wrapper, cropper = pipe.live_portrait_wrapper, pipe.cropper


def measure(img):
    rgb = cv2.cvtColor(img.clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)
    crop = cropper.crop_source_image(rgb, cropper.crop_cfg)
    with torch.no_grad():
        kp = wrapper.get_kp_info(wrapper.prepare_source(crop["img_crop_256x256"]))
    lmk = crop["lmk_crop"].astype(np.float32)
    pose = dict(yaw=float(kp["yaw"]), pitch=float(kp["pitch"]), roll=float(kp["roll"]), eye=float(calc_eye_close_ratio(lmk[None]).mean()))
    return pose, lmk


poses, lmks = [], []
for i, img in zip(index, images):
    p, lmk = measure(img)
    # Where the face is (the landmarks' centre, plate pixels): the page tilts
    # the head about it.
    p.update(fx=float(lmk[:, 0].mean()), fy=float(lmk[:, 1].mean()))
    poses.append(dict(i=i, **{k: round(v, 3) for k, v in p.items()}))
    lmks.append(lmk)

# Placement trend (<framesDir>/trend, when the frames come from several takes
# or far-apart runs of one): Veo places the head a few pixels differently from
# take to take and drifts within a take, so frames at neighbouring poses can
# sit apart. Where the face sits (the landmarks' centre) is fitted as one
# smooth quadratic over head pose, and every frame is moved rigidly onto it,
# as scripts/real_grid.py does for production. The rest frame is the
# reference and does not move.
if os.path.exists(os.path.join(frames_dir, "trend")):
    Q = np.array([[q["yaw"], q["pitch"]] for q in poses])
    X = np.c_[Q, Q**2, Q[:, 0] * Q[:, 1], np.ones(len(Q))]
    C = np.array([[q["fx"], q["fy"]] for q in poses])
    coef = np.linalg.lstsq(X, C, rcond=None)[0]
    k0 = index.index(rest_index)
    lift = C[k0] - X[k0] @ coef
    moves = []
    for k in range(len(images)):
        d = X[k] @ coef + lift - C[k]
        if k == k0:
            d = np.zeros(2)
        images[k] = cv2.warpAffine(images[k], np.float32([[1, 0, d[0]], [0, 1, d[1]]]), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        lmks[k] = lmks[k] + d.astype(np.float32)
        poses[k]["fx"] = round(poses[k]["fx"] + float(d[0]), 3)
        poses[k]["fy"] = round(poses[k]["fy"] + float(d[1]), 3)
        moves.append(float(np.hypot(*d)))
    print(f"placement trend: frames moved {np.median(moves):.1f}px median, {max(moves):.1f}px at most", file=sys.stderr, flush=True)

# Above the jaw: everywhere any frame differs from rest.
upper_zone = np.zeros((H, W), np.uint8)
upper_zone[: round(320 * K), FACE_X - round(300 * K) : FACE_X + round(300 * K)] = 1
upper_zone[round(320 * K) : JAW_Y, FACE_X - round(110 * K) : FACE_X + round(110 * K)] = 1
rest_blur = cv2.GaussianBlur(cv2.cvtColor(rest, cv2.COLOR_BGR2GRAY), (0, 0), 3 * K)
reach = np.zeros((H, W), np.float32)
for img in images:
    d = np.abs(cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (0, 0), 3 * K) - rest_blur)
    reach = np.maximum(reach, (d > 10).astype(np.float32))
reach *= upper_zone
n, labels, stats, _ = cv2.connectedComponentsWithStats(reach.astype(np.uint8))
reach = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
reach = cv2.morphologyEx(reach, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81)))
upper = cv2.dilate(reach, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) * upper_zone
feather = lambda m: cv2.GaussianBlur(m.astype(np.float32), (0, 0), FEATHER / 2)  # noqa: E731

# Below the jaw: the face and beard, from the landmarks, grown downward over
# the beard.
BEARD = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (76, 129))
below = (np.arange(H)[:, None] >= JAW_Y - round(60 * K)).astype(np.uint8)


def face_region(lmk):
    m = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(m, cv2.convexHull(lmk.astype(np.int32)), 1)
    return cv2.dilate(m, BEARD, anchor=(38, 101))


rest_face = face_region(lmks[index.index(rest_index)])
masks = [feather(np.maximum(upper, np.maximum(face_region(l), rest_face) * below)) for l in lmks]
union = np.max(masks, axis=0)

ys, xs = np.nonzero(union > 0.002)
even = lambda v: int(round(v / 2) * 2)  # noqa: E731
bx0, by0 = max(0, even(xs.min() - margin)), max(0, even(ys.min() - margin))
bx1, by1 = min(W, even(xs.max() + margin)), min(H, even(ys.max() + margin))

os.makedirs(os.path.join(out, "heads"), exist_ok=True)
for i, img, m in zip(index, images, masks):
    head = rest * (1 - m[..., None]) + img * m[..., None]
    cv2.imwrite(os.path.join(out, "heads", f"{i:04d}.png"), head[by0:by1, bx0:bx1].clip(0, 255).round().astype(np.uint8))
cv2.imwrite(os.path.join(out, "still.png"), rest.clip(0, 255).round().astype(np.uint8))
cv2.imwrite(os.path.join(out, "reach.png"), (union * 255).clip(0, 255).astype(np.uint8))
json.dump(poses, open(os.path.join(out, "poses.json"), "w"), indent=1)
# The head as the page tilts it (sequenceStage.js): an ellipse centred on the
# face (the landmarks' centre, about the nose), reaching up to the crown
# (where the head reaches) and as far down, past the beard to the neck, and a
# little wider than the face; plate pixels. Centred on the face, the chin has
# depth and moves with the face, so a tilt gives at the neck and hairline as
# a real nod does, instead of stretching the jaw.
rest_lmk = lmks[index.index(rest_index)]
crown = int(np.nonzero(reach.any(1))[0].min())
cy = float(rest_lmk[:, 1].mean())
head = dict(cx=float(rest_lmk[:, 0].mean()), cy=cy, rx=float(np.ptp(rest_lmk[:, 0])) / 2 * 1.1, ry=cy - crown)
print(json.dumps(dict(x=bx0, y=by0, w=bx1 - bx0, h=by1 - by0, head=head)))
