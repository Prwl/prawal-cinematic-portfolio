# Hero atlas experiment, step 2: scores every archived take from the
# per-frame measurements of scripts/atlas_audit.py, and marks every frame
# clean or not (with the reason), for scripts/atlas_build.py.
#   python scripts/atlas_score.py artifacts/atlas/metrics.json artifacts/atlas/audit.json
#
# Scores are 0-10 per take:
# - likeness: how close LivePortrait's canonical keypoints (identity geometry,
#   pose and expression removed) stay to the shared rest frame's
# - eyes: share of frames with the eyes open for the pose (no blinks, no
#   lids dropped shut while looking down)
# - face stability: frame-to-frame jitter of that identity geometry (Veo's
#   "boiling" face) and of the landmark spread (scale pumping)
# - blazer: how far the torso strays from the rest frame
# - background: wall drift and change against the rest frame
# - motion: share of frames slow enough not to smear, steady roll, low jerk
# - usefulness: how much clean pose range the take reaches, and in which
#   direction (the directions it can serve)
import json
import sys
from collections import defaultdict

import numpy as np

src, out = sys.argv[1:3]
rows = json.load(open(src))
by_take = defaultdict(list)
for m in rows:
    by_take[m["take"]].append(m)
for v in by_take.values():
    v.sort(key=lambda m: m["i"])

rest = [m for t, v in by_take.items() if t.startswith("hero-") for m in v[:4] if "yaw" in m]
YAW0 = float(np.median([m["yaw"] for m in rest]))
PITCH0 = float(np.median([m["pitch"] for m in rest]))
ROLL0 = float(np.median([m["roll"] for m in rest]))
KP0 = np.median([m["kp"] for m in rest], axis=0)
SPREAD0 = float(np.median([m["spread"] for m in rest]))

# Frame gates, set from the rest frames' own spread and by eye on the sheets.
EYE_OPEN = 0.2  # level or looking up
EYE_OPEN_DOWN = 0.14  # looking down: lowered lids, but the iris must show
DOWN_PITCH = 6.0
LIP_CLOSED = 0.03
MAX_SPEED = 2.2  # degrees per frame: past it Veo smears the face
MAX_ROLL = 7.0
MAX_TORSO = 7.0  # grey levels, blurred, against rest
MAX_WALL = 4.0
MAX_DRIFT = 2.5  # px


def raw_geometry(m):
    return float(np.linalg.norm(np.array(m["kp"]) - KP0) / np.sqrt(len(KP0)))


# The canonical keypoints are not fully free of pose: they drift the further
# the head turns, in every take alike. So likeness is how far a frame's
# geometry sits from what is typical at its pose, fitted robustly over every
# hero take (a quadratic in yaw and pitch), not from the rest frame's.
def pose_features(m):
    y, p = m["yaw"] - YAW0, m["pitch"] - PITCH0
    return [1.0, y, p, y * y, p * p, y * p, abs(y), abs(p)]


fit_rows = [m for t, v in by_take.items() if t.startswith("hero-") for m in v if "kp" in m and abs(m["yaw"] - YAW0) < 40 and abs(m["pitch"] - PITCH0) < 30]
A = np.array([pose_features(m) for m in fit_rows])
b = np.array([raw_geometry(m) for m in fit_rows])
keep = np.ones(len(b), bool)
for _ in range(3):
    coef = np.linalg.lstsq(A[keep], b[keep], rcond=None)[0]
    res = b - A @ coef
    keep = res < np.percentile(res[keep], 80)
res_all = b - A @ coef
MED = float(np.median(res_all))
MAD = float(np.median(np.abs(res_all - MED)))


def geometry(m):
    return raw_geometry(m) - float(np.array(pose_features(m)) @ coef)


rest_geo = [geometry(m) for m in rest]
# A frame's face has drifted from him when its geometry is well outside the
# spread of all hero frames at their poses.
MAX_LIKENESS = MED + 3.5 * 1.4826 * MAD

frames = {}
takes = {}
for name, v in sorted(by_take.items()):
    posed = [m for m in v if "yaw" in m]
    geo, jit, spread_jit, speeds, jerks = [], [], [], [], []
    clean = 0
    reasons = defaultdict(int)
    reach = defaultdict(float)
    blinks = 0
    prev_open = True
    for k, m in enumerate(v):
        rec = dict(i=m["i"])
        if "yaw" not in m:
            rec.update(ok=False, why=["no face"])
            frames[(name, m["i"])] = rec
            reasons["no face"] += 1
            continue
        y, p = m["yaw"] - YAW0, m["pitch"] - PITCH0
        a = v[k - 1] if k and "yaw" in v[k - 1] else None
        b = v[k + 1] if k + 1 < len(v) and "yaw" in v[k + 1] else None
        sp = max([np.hypot(e["yaw"] - m["yaw"], e["pitch"] - m["pitch"]) for e in (a, b) if e] or [0.0])
        speeds.append(sp)
        if a and b:
            jerks.append(float(np.hypot(b["yaw"] - 2 * m["yaw"] + a["yaw"], b["pitch"] - 2 * m["pitch"] + a["pitch"])))
        g = geometry(m)
        geo.append(g)
        if a:
            jit.append(float(np.linalg.norm(np.array(m["kp"]) - np.array(a["kp"])) / np.sqrt(len(KP0))))
            spread_jit.append(abs(m["spread"] - a["spread"]) / SPREAD0)
        eye_need = EYE_OPEN_DOWN if p > DOWN_PITCH else EYE_OPEN
        is_open = m["eye"] >= eye_need
        if prev_open and not is_open and p <= DOWN_PITCH:
            blinks += 1
        prev_open = is_open
        why = []
        if not is_open:
            why.append("eyes closed" if p <= DOWN_PITCH else "lids down")
        if m["lip"] > LIP_CLOSED:
            why.append("mouth open")
        if sp > MAX_SPEED:
            why.append("motion smear")
        if abs(m["roll"] - ROLL0) > MAX_ROLL:
            why.append("head roll")
        if m["torso"] > MAX_TORSO:
            why.append("body moved")
        if m["wall"] > MAX_WALL or np.hypot(m["dx"], m["dy"]) > MAX_DRIFT:
            why.append("background drift")
        if g > MAX_LIKENESS:
            why.append("likeness drift")
        for w in why:
            reasons[w] += 1
        ok = not why
        clean += ok
        rec.update(ok=ok, why=why, yaw=round(y, 2), pitch=round(p, 2), roll=round(m["roll"] - ROLL0, 2), eye=m["eye"], speed=round(sp, 2), geo=round(g, 4))
        frames[(name, m["i"])] = rec
        if ok:
            # Direction reach: yaw positive = toward the viewer's left.
            for d, val in (("left", y), ("right", -y), ("up", -p), ("down", p)):
                reach[d] = max(reach[d], val)
    n = len(v)
    posed_n = max(1, len(posed))

    def score(val, good, bad):
        return float(np.clip(10 * (bad - val) / (bad - good), 0, 10))

    eye_ok = sum(1 for m in posed if m["eye"] >= (EYE_OPEN_DOWN if m["pitch"] - PITCH0 > DOWN_PITCH else EYE_OPEN)) / posed_n
    wall = float(np.median([m["wall"] for m in v]))
    drift = float(np.median([np.hypot(m["dx"], m["dy"]) for m in v]))
    torso = float(np.median([m["torso"] for m in v]))
    torso90 = float(np.percentile([m["torso"] for m in v], 90))
    roll = float(np.percentile([abs(m["roll"] - ROLL0) for m in posed], 90)) if posed else 99
    slow = float(np.mean([s <= MAX_SPEED for s in speeds])) if speeds else 0
    s = dict(
        likeness=score(float(np.median(geo)) if geo else 1, MED, MED + 3 * (MAX_LIKENESS - MED)),
        eyes=10 * eye_ok * (1 - min(1, blinks / 4) * 0.3),
        face_stability=0.5 * score(float(np.percentile(jit, 75)) if jit else 1, 0.0003, 0.0012) + 0.5 * score(float(np.percentile(spread_jit, 75)) if spread_jit else 1, 0.004, 0.02),
        blazer=0.5 * score(torso, 1.0, MAX_TORSO * 1.5) + 0.5 * score(torso90, 2.0, MAX_TORSO * 2.5),
        background=0.5 * score(wall, 1.0, MAX_WALL * 3) + 0.5 * score(drift, 0.2, MAX_DRIFT * 3),
        motion=0.6 * 10 * slow + 0.2 * score(roll, 1, MAX_ROLL * 2) + 0.2 * score(float(np.median(jerks)) if jerks else 9, 0.15, 1.2),
        usefulness=min(10, sum(min(val, 12) for val in reach.values()) / 2.4),
    )
    takes[name] = dict(
        frames=n,
        clean=clean,
        clean_share=round(clean / n, 3),
        blinks=blinks,
        reach={k: round(v, 1) for k, v in reach.items()},
        rejects=dict(sorted(reasons.items(), key=lambda kv: -kv[1])),
        raw=dict(geo=round(float(np.median(geo)), 4) if geo else None, jitter=round(float(np.percentile(jit, 75)), 5) if jit else None, spread_jitter=round(float(np.percentile(spread_jit, 75)), 4) if spread_jit else None, wall=round(wall, 2), drift=round(drift, 2), torso=round(torso, 2), torso90=round(torso90, 2), roll90=round(roll, 2), slow=round(slow, 3)),
        scores={k: round(v, 1) for k, v in s.items()},
        overall=round(float(np.mean(list(s.values()))), 1),
    )

# Eligible for the atlas: a take has to be composited onto the production
# plate, so it must start on the shared rest frame (same camera, wall, blazer,
# face), keep the background and likeness, and have enough clean frames.
selected, excluded = [], {}
for name, t in takes.items():
    first = by_take[name][0]
    starts_on_rest = first["torso"] < 3 and first["wall"] < 2.5 and "kp" in first and geometry(first) < MAX_LIKENESS
    why = []
    if not starts_on_rest:
        why.append("does not start on the shared rest frame (different generation/set)")
    if t["scores"]["background"] < 6:
        why.append("background inconsistent")
    if t["scores"]["likeness"] < 6.5:
        why.append("likeness drifts from the rest face")
    if t["scores"]["blazer"] < 2:
        why.append("the body turns with the head")
    if t["clean_share"] < 0.2:
        why.append("too few clean frames")
    if why:
        excluded[name] = why
    else:
        selected.append(name)

json.dump(
    dict(
        selected=sorted(selected),
        excluded=excluded,
        rest=dict(yaw=YAW0, pitch=PITCH0, roll=ROLL0, max_likeness=MAX_LIKENESS),
        takes=takes,
        frames={f"{t}#{i}": r for (t, i), r in frames.items()},
    ),
    open(out, "w"),
    indent=1,
)
print(f"{'take':44s} {'ovr':>4s} {'like':>5s} {'eyes':>5s} {'face':>5s} {'blzr':>5s} {'bg':>5s} {'mot':>5s} {'use':>5s} clean  reach(l/r/u/d)")
for name, t in sorted(takes.items(), key=lambda kv: -kv[1]["overall"]):
    sc = t["scores"]
    r = t["reach"]
    print(
        f"{name[:44]:44s} {t['overall']:4.1f} {sc['likeness']:5.1f} {sc['eyes']:5.1f} {sc['face_stability']:5.1f} {sc['blazer']:5.1f} {sc['background']:5.1f} {sc['motion']:5.1f} {sc['usefulness']:5.1f} {t['clean']:3d}/{t['frames']:<3d} "
        f"{r.get('left', 0):4.1f}/{r.get('right', 0):4.1f}/{r.get('up', 0):4.1f}/{r.get('down', 0):4.1f}  {list(t['rejects'].items())[:3]}"
    )
print("eligible:", ", ".join(sorted(selected)))
for k, v in excluded.items():
    print(f"excluded {k}: {'; '.join(v)}")
