# Lays every upscaled pose of the living portrait into the upscaled rest
# plate and cuts out the head box the page moves. Called by
# scripts/prepare-video.mjs with LivePortrait's own Python; not meant to be
# run by hand.
#   python scripts/heads.py <plate.png> <mask.png> <roi x,y,w,h> <walkedDir> <restIndex> <margin> <outDir>
#
# <plate.png> is the rest frame upscaled to the plate; <mask.png> is where the
# head reaches, at crop resolution (scripts/real_grid.py); the roi is in crop
# pixels; <walkedDir> holds every pose's roi, upscaled, in walk order. Outside
# the mask every pose is the plate to the pixel, and at rest the head is the
# walk's own rest frame, so the poster (<outDir>/still.png, the plate with that
# head) and the clip (<outDir>/heads/NNNN.png) agree exactly at rest. Also
# writes <outDir>/reach.png, where the head reaches at plate size. Prints the
# head box, in plate pixels, as JSON.
import json
import os
import sys

import cv2
import numpy as np

plate_path, mask_path, roi_arg, walked, rest_index, margin, out = sys.argv[1:8]
rest_index, margin = int(rest_index), int(margin)
rx, ry, rw, rh = map(int, roi_arg.split(","))

plate = cv2.imread(plate_path).astype(np.float32)
scale = plate.shape[1] / cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE).shape[1]
mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
mask = cv2.resize(mask, (plate.shape[1], plate.shape[0]), interpolation=cv2.INTER_LINEAR)
X, Y, W, H = (round(v * scale) for v in (rx, ry, rw, rh))

# The head box: everywhere the mask reaches, plus the margin the page feathers
# across (pixels there never change), on even pixels.
ys, xs = np.nonzero(mask > 0.002)
even = lambda v: int(round(v / 2) * 2)  # noqa: E731
bx0, by0 = max(0, even(xs.min() - margin)), max(0, even(ys.min() - margin))
bx1, by1 = min(plate.shape[1], even(xs.max() + margin)), min(plate.shape[0], even(ys.max() + margin))
if bx0 < X or by0 < Y or bx1 > X + W or by1 > Y + H:
    sys.exit(f"head box {bx0},{by0}-{bx1},{by1} leaves the pose region {X},{Y} {W}x{H}")

m = mask[Y : Y + H, X : X + W, None]
base = plate[Y : Y + H, X : X + W]
os.makedirs(os.path.join(out, "heads"), exist_ok=True)
names = sorted(f for f in os.listdir(walked) if f.endswith(".png"))
still = plate.copy()
for n, name in enumerate(names):
    pose = cv2.imread(os.path.join(walked, name)).astype(np.float32)
    if pose.shape[:2] != (H, W):
        pose = cv2.resize(pose, (W, H), interpolation=cv2.INTER_AREA)
    head = base * (1 - m) + pose * m
    if n == rest_index:
        still[Y : Y + H, X : X + W] = head
    full = head[by0 - Y : by1 - Y, bx0 - X : bx1 - X]
    cv2.imwrite(os.path.join(out, "heads", f"{n:04d}.png"), full.clip(0, 255).round().astype(np.uint8))
cv2.imwrite(os.path.join(out, "still.png"), still.clip(0, 255).round().astype(np.uint8))
cv2.imwrite(os.path.join(out, "reach.png"), (mask * 255).clip(0, 255).astype(np.uint8))
print(json.dumps(dict(x=bx0, y=by0, w=bx1 - bx0, h=by1 - by0)))
