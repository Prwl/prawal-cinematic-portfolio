# Re-poses the living portrait's single resting plate into a grid of head
# poses with LivePortrait (https://github.com/KwaiVGI/LivePortrait). Called
# by scripts/prepare-video.mjs with LivePortrait's own Python; not meant to be
# run by hand.
#   <LivePortrait>/.venv/bin/python scripts/pose_grid.py <LivePortrait> <plate.png> <outDir>
#
# Every frame is the same plate with only the head re-posed (yaw, pitch and a
# little eye lead), pasted back through LivePortrait's feathered face mask, so
# likeness, hair, blazer, body and wall are identical in every pose by
# construction. Writes <outDir>/0000.png... in row-major order (rows are
# pitch, up to down; columns are LivePortrait yaw, -15 to +15, which turns
# him from the viewer's right to the viewer's left) and
# <outDir>/grid.json with the grid and the box the head moves within.
import json
import os
import sys

lp_dir, plate_path, out_dir = sys.argv[1:4]
sys.path.insert(0, lp_dir)
os.chdir(lp_dir)
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from src.config.crop_config import CropConfig  # noqa: E402
from src.config.inference_config import InferenceConfig  # noqa: E402
from src.live_portrait_pipeline import LivePortraitPipeline  # noqa: E402
from src.utils.camera import get_rotation_matrix  # noqa: E402
from src.utils.crop import paste_back, prepare_paste_back  # noqa: E402

# Yaw: 31 columns, -15 to 15 degrees (1 degree steps); at 25 degrees, the
# first range tried, LivePortrait's flat-lit face foreshortened by a tenth and
# read as the face shrinking rather than the head turning. Pitch: 32 rows, up
# to -18 degrees in 1.2 degree steps, down to +20 in 1.25 degree steps, with
# the level pose as a row, so the rest pose is an exact frame. The page blends
# neighbouring poses; at 2.5 degrees apart a halfway blend doubled the
# eyebrows, at 1.25 it reads as the head in between.
YAWS = np.linspace(-15, 15, 31)
PITCHES = np.concatenate([np.linspace(-18, 0, 16), np.linspace(0, 20, 17)[1:]])
# Eyes lead the head a little: toward the turn, lowered when looking down,
# barely lifted when looking up (more reads as startled). LivePortrait's own
# eyeball offsets, scaled at the extremes.
EYE_X = 8.0
EYE_DOWN = 15.0
EYE_UP = 4.0


def eyes(delta, ex, ey):
    delta = delta.clone()
    if ex > 0:
        delta[0, 11, 0] += ex * 0.0007
        delta[0, 15, 0] += ex * 0.001
    else:
        delta[0, 11, 0] += ex * 0.001
        delta[0, 15, 0] += ex * 0.0007
    delta[0, 11, 1] += ey * -0.001
    delta[0, 15, 1] += ey * -0.001
    blink = -ey / 2.0
    delta[0, 11, 1] += blink * -0.001
    delta[0, 13, 1] += blink * 0.0003
    delta[0, 15, 1] += blink * -0.001
    return delta


inference_cfg = InferenceConfig()
pipe = LivePortraitPipeline(inference_cfg=inference_cfg, crop_cfg=CropConfig())
wrapper = pipe.live_portrait_wrapper
cropper = pipe.cropper

img = cv2.cvtColor(cv2.imread(plate_path), cv2.COLOR_BGR2RGB)
crop = cropper.crop_source_image(img, cropper.crop_cfg)
source = wrapper.prepare_source(crop["img_crop_256x256"])
info = wrapper.get_kp_info(source)
feature = wrapper.extract_feature_3d(source)
x_s = wrapper.transform_keypoint(info)
mask = prepare_paste_back(inference_cfg.mask_crop, crop["M_c2o"], dsize=(img.shape[1], img.shape[0]))

os.makedirs(out_dir, exist_ok=True)
with torch.no_grad():
    n = 0
    for pitch in PITCHES:
        for yaw in YAWS:
            ex = EYE_X * yaw / YAWS[-1]
            ey = -EYE_DOWN * pitch / PITCHES[-1] if pitch > 0 else EYE_UP * pitch / PITCHES[0]
            R_d = get_rotation_matrix(info["pitch"] + float(pitch), info["yaw"] + float(yaw), info["roll"])
            x_d = info["scale"] * (info["kp"] @ R_d + eyes(info["exp"], ex, ey)) + info["t"]
            x_d = wrapper.stitching(x_s, x_d)
            out = wrapper.parse_output(wrapper.warp_decode(feature, x_s, x_d)["out"])[0]
            full = paste_back(out, crop["M_c2o"], img, mask)
            cv2.imwrite(os.path.join(out_dir, f"{n:04d}.png"), cv2.cvtColor(full, cv2.COLOR_RGB2BGR))
            n += 1

# The box outside which every frame is the plate itself.
ys, xs = np.nonzero(mask[..., 0] > 0.002 if mask.ndim == 3 else mask > 0.002)
box = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
json.dump(
    {
        "nx": len(YAWS),
        "ny": len(PITCHES),
        "yaw": YAWS.tolist(),
        "pitch": PITCHES.tolist(),
        "centre": [int(np.argmin(np.abs(YAWS))), int(np.argmin(np.abs(PITCHES)))],
        "box": box,
    },
    open(os.path.join(out_dir, "grid.json"), "w"),
)
print(f"pose grid: {n} frames, head box {box}")
