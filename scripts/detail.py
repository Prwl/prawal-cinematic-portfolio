# Gives every re-posed head back the fine detail of the original photograph.
# Called by scripts/prepare-video.mjs with LivePortrait's Python (it has
# OpenCV); not meant to be run by hand.
#   python scripts/detail.py <posesDir> <plate.png> <restIndex> <x> <y> <w> <h> <outDir>
#
# LivePortrait redraws the face smoother than the photograph: skin texture,
# beard strands and eyelashes go soft (face sharpness 63 against the
# original's 69 after upscaling, and less away from rest). The detail it lost
# at rest is known exactly: the original's fine texture minus the rest pose's.
# For every pose, dense optical flow says where each pixel of that pose sits
# in the rest pose; that detail is carried along the flow and added back.
# Only fine texture (what a sigma-2.5 Gaussian removes) travels, clamped, and
# faded where the flow disagrees with the picture, because outline
# differences between the photograph and LivePortrait's rest pose otherwise
# arrive as bright or dark lines. Neighbouring poses get neighbouring detail,
# so it cannot shimmer between them.
#
# Reads upscaled poses <posesDir>/0000.png... (whole plates) and writes their
# head box, with the detail, to <outDir>/0000.png...
import os
import sys

import cv2
import numpy as np

poses_dir, plate_path, rest_index, x, y, w, h, out_dir = sys.argv[1:9]
rest_index, x, y, w, h = int(rest_index), int(x), int(y), int(w), int(h)

SIGMA = 2.5
CLAMP = 30.0
# Flow disagreement, in grey levels after a light blur, at which the detail
# has faded to 1/e.
TRUST = 14.0

os.makedirs(out_dir, exist_ok=True)
names = sorted(f for f in os.listdir(poses_dir) if f.endswith(".png"))
box = lambda img: img[y : y + h, x : x + w].astype(np.float32)
fine = lambda a: a - cv2.GaussianBlur(a, (0, 0), SIGMA)
grey = lambda a: cv2.cvtColor(np.clip(a, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)

original = box(cv2.imread(plate_path))
rest = box(cv2.imread(os.path.join(poses_dir, names[rest_index])))
lost = np.clip(fine(original) - fine(rest), -CLAMP, CLAMP)
rest_soft = cv2.GaussianBlur(rest, (0, 0), 1.5)
rest_grey = grey(rest)

flow_solver = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))

for name in names:
    pose = box(cv2.imread(os.path.join(poses_dir, name)))
    flow = flow_solver.calc(grey(pose), rest_grey, None)
    mx, my = gx + flow[..., 0], gy + flow[..., 1]
    carried = cv2.remap(lost, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    back = cv2.remap(rest_soft, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    disagreement = cv2.GaussianBlur(np.abs(cv2.GaussianBlur(pose, (0, 0), 1.5) - back).mean(axis=2), (0, 0), 3)
    trust = np.exp(-((disagreement / TRUST) ** 2))[..., None]
    cv2.imwrite(os.path.join(out_dir, name), np.clip(pose + carried * trust, 0, 255).astype(np.uint8))

print(f"detail: {len(names)} poses, head box {w}x{h}")
