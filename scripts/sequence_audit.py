# Hero image-sequence experiment: measures every frame of candidate takes so
# a single take can be judged as the head's only source. Run with
# LivePortrait's own Python; LivePortrait only measures here, it draws nothing.
#   <LivePortrait>/.venv/bin/python scripts/sequence_audit.py <LivePortrait> <out.json> <take.mp4>...
#
# Unlike scripts/atlas_audit.py, which measures against the hero-* takes'
# shared rest frame, everything here is measured against the take's OWN first
# frame, because the take is used alone: camera drift and exposure on the wall
# either side of him, how far the blazer has moved, and per frame head yaw,
# pitch, roll, eye and lip openness, face sharpness and where the face is.
import json
import os
import sys

lp_dir, out_path = sys.argv[1], os.path.abspath(sys.argv[2])
takes = [os.path.abspath(p) for p in sys.argv[3:]]
sys.path.insert(0, lp_dir)
os.chdir(lp_dir)
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from src.config.crop_config import CropConfig  # noqa: E402
from src.config.inference_config import InferenceConfig  # noqa: E402
from src.live_portrait_pipeline import LivePortraitPipeline  # noqa: E402
from src.utils.retargeting_utils import calc_eye_close_ratio, calc_lip_close_ratio  # noqa: E402

# The production crop (scripts/real_grid.py): the figure in 1920x1080.
CROP_X, CROP_W = 705, 1140
# Wall either side of the figure, above the floor line, and the blazer below
# the chin, in the hero framing (as scripts/atlas_audit.py).
WALL = [(slice(60, 880), slice(720, 880)), (slice(60, 880), slice(1700, 1860))]
TORSO = (slice(820, 1080), slice(860, 1700))

pipe = LivePortraitPipeline(inference_cfg=InferenceConfig(), crop_cfg=CropConfig())
wrapper, cropper = pipe.live_portrait_wrapper, pipe.cropper


def frames(path):
    cap = cv2.VideoCapture(path)
    while True:
        ok, bgr = cap.read()
        if not ok:
            return
        if bgr.shape[1] != 1920:
            bgr = cv2.resize(bgr, (1920, 1080), interpolation=cv2.INTER_CUBIC)
        yield bgr


rows = []
for path in takes:
    name = os.path.basename(path)
    ref = None
    for i, img in enumerate(frames(path)):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        if ref is None:
            ref = g
            wall = np.zeros(g.shape, bool)
            for sl in WALL:
                wall[sl] = True
        (dx, dy), _ = cv2.phaseCorrelate(ref[WALL[0]], g[WALL[0]])
        gain = float(ref[wall].mean() / max(1.0, g[wall].mean()))
        torso = float(np.abs(cv2.GaussianBlur(g * gain, (0, 0), 3)[TORSO] - cv2.GaussianBlur(ref, (0, 0), 3)[TORSO]).mean())
        row = dict(take=name, i=i, dx=round(float(dx), 2), dy=round(float(dy), 2), gain=round(gain, 4), torso=round(torso, 2))
        try:
            rgb = cv2.cvtColor(img[:, CROP_X : CROP_X + CROP_W], cv2.COLOR_BGR2RGB)
            crop = cropper.crop_source_image(rgb, cropper.crop_cfg)
            with torch.no_grad():
                kp = wrapper.get_kp_info(wrapper.prepare_source(crop["img_crop_256x256"]))
            lmk = crop["lmk_crop"]
            c = lmk.mean(0)
            # Sharpness of the face at its size in the frame (the landmarks'
            # box), so a closer framing is not flattered by resampling.
            x0, y0 = np.floor(lmk.min(0)).astype(int)
            x1, y1 = np.ceil(lmk.max(0)).astype(int)
            face = cv2.cvtColor(img[:, CROP_X : CROP_X + CROP_W][max(0, y0) : y1, max(0, x0) : x1], cv2.COLOR_BGR2GRAY)
            row.update(
                yaw=round(float(kp["yaw"]), 3),
                pitch=round(float(kp["pitch"]), 3),
                roll=round(float(kp["roll"]), 3),
                eye=round(float(calc_eye_close_ratio(lmk[None]).mean()), 4),
                lip=round(float(calc_lip_close_ratio(lmk[None]).mean()), 4),
                sharp=round(float(cv2.Laplacian(face, cv2.CV_32F).var()), 2),
                cx=round(float(c[0]), 2),
                cy=round(float(c[1]), 2),
                spread=round(float(np.sqrt(((lmk - c) ** 2).sum(1).mean())), 2),
            )
        except Exception:
            pass
        rows.append(row)
    print(f"measured {name}", flush=True)

json.dump(rows, open(out_path, "w"))
print(f"{len(rows)} frames from {len(takes)} takes", flush=True)
