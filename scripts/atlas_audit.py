# Hero atlas experiment, step 1: measures every frame of every archived hero
# take in reference-video/ (all 19, not only hero-*), so the takes can be
# scored and the directional atlas built from the best of them. Run with
# LivePortrait's own Python; LivePortrait only measures here, it draws nothing.
#   <LivePortrait>/.venv/bin/python scripts/atlas_audit.py <LivePortrait> <out.json>
#
# Per frame: head yaw/pitch/roll, eye and lip openness, face sharpness,
# LivePortrait's canonical keypoints (identity geometry, independent of pose
# and expression) and expression deformation, landmark centre and spread,
# camera drift and exposure against the shared rest frame (the wall), and how
# far the blazer has moved from rest.
import glob
import json
import os
import sys

lp_dir, out_path = sys.argv[1], os.path.abspath(sys.argv[2])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
takes = sorted(glob.glob(os.path.join(root, "reference-video", "*.mp4")))
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


def frames(path):
    cap = cv2.VideoCapture(path)
    while True:
        ok, bgr = cap.read()
        if not ok:
            return
        if bgr.shape[1] != 1920:
            bgr = cv2.resize(bgr, (1920, 1080), interpolation=cv2.INTER_CUBIC)
        yield bgr


pipe = LivePortraitPipeline(inference_cfg=InferenceConfig(), crop_cfg=CropConfig())
wrapper, cropper = pipe.live_portrait_wrapper, pipe.cropper

# The shared rest frame: frame 0 of hero-right (every hero-* take starts on it).
ref = next(frames(os.path.join(root, "reference-video", "hero-right.mp4")))
ref_g = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(np.float32)
# Wall either side of the figure, above the floor line.
wall = np.zeros(ref_g.shape, bool)
wall[60:880, 720:880] = True
wall[60:880, 1700:1860] = True
# Blazer, below the chin.
TORSO = (slice(820, 1080), slice(860, 1700))

rows = []
for t, path in enumerate(takes):
    name = os.path.basename(path)
    for i, img in enumerate(frames(path)):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        (dx, dy), resp = cv2.phaseCorrelate(ref_g[60:880, 720:880], g[60:880, 720:880])
        gain = float(ref_g[wall].mean() / max(1.0, g[wall].mean()))
        wall_diff = float(np.abs(cv2.GaussianBlur(g * gain, (0, 0), 2)[wall] - cv2.GaussianBlur(ref_g, (0, 0), 2)[wall]).mean())
        torso = float(np.abs(cv2.GaussianBlur(g * gain, (0, 0), 3)[TORSO] - cv2.GaussianBlur(ref_g, (0, 0), 3)[TORSO]).mean())
        row = dict(take=name, i=i, dx=round(float(dx), 2), dy=round(float(dy), 2), gain=round(gain, 4), wall=round(wall_diff, 2), torso=round(torso, 2))
        try:
            crop_img = img[:, CROP_X : CROP_X + CROP_W]
            rgb = cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)
            crop = cropper.crop_source_image(rgb, cropper.crop_cfg)
            with torch.no_grad():
                kp = wrapper.get_kp_info(wrapper.prepare_source(crop["img_crop_256x256"]))
            lmk = crop["lmk_crop"]
            face = cv2.cvtColor(crop["img_crop"], cv2.COLOR_RGB2GRAY)
            c = lmk.mean(0)
            row.update(
                yaw=round(float(kp["yaw"]), 3),
                pitch=round(float(kp["pitch"]), 3),
                roll=round(float(kp["roll"]), 3),
                eye=round(float(calc_eye_close_ratio(lmk[None]).mean()), 4),
                lip=round(float(calc_lip_close_ratio(lmk[None]).mean()), 4),
                sharp=round(float(cv2.Laplacian(face, cv2.CV_32F).var()), 2),
                kp=np.round(kp["kp"].cpu().numpy().reshape(-1), 4).tolist(),
                exp=np.round(kp["exp"].cpu().numpy().reshape(-1), 4).tolist(),
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
