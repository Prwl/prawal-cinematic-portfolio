# Hero image-sequence experiment: judges each measured take
# (scripts/sequence_audit.py) as the head's ONLY source.
#   python3 scripts/sequence_report.py <audit.json> <outDir>
#
# A frame is clean when, against the take's own first frame (its rest):
# - eyes open (at least 80% of rest openness; half, looking down, where lids
#   naturally lower), mouth as at rest
# - head roll within 8 degrees of rest
# - moving under 2.5 degrees a frame (faster, Veo smears)
# - not blurred: face sharpness at least 60% of the median of the 8 frames
#   either side. Sharpness also changes with pose (looking up shows more
#   beard), and Veo's first frame is the uploaded picture, sharper than any
#   frame it renders, so a frame is only judged against its neighbours.
# - camera still (wall drift under 1px)
# - body still (blazer change under 6 grey levels)
#
# Coverage is of production's pose field: yaw to 15.8 degrees each way
# (22 x 0.72), 9.3 up and 6.3 down (useLivingPortrait.js). The field is sampled
# every 1.5 degrees; each sample's distance to the nearest clean frame is a
# hole if over 3 degrees (the next pose would jump that far). Writes
# <outDir>/report.json and a coverage map per take.
import json
import os
import statistics as st
import sys

import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

audit, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
rows = json.load(open(audit))
takes = {}
for r in rows:
    takes.setdefault(r["take"], []).append(r)

YAW, UP, DOWN = 15.84, 9.3, 6.3
targets = [(y, p) for y in np.arange(-YAW, YAW + 0.01, 1.5) for p in np.arange(-UP, DOWN + 0.01, 1.5)]
report = []
for name, rs in takes.items():
    rs.sort(key=lambda r: r["i"])
    posed = [r for r in rs if "yaw" in r]
    rest = posed[0]
    rest_sharp = st.median(r["sharp"] for r in posed[:6])
    rest_eye = st.median(r["eye"] for r in posed[:6])
    rest_lip = st.median(r["lip"] for r in posed[:6])
    by_i = {r["i"]: r for r in posed}
    clean, reasons = [], {}
    for r in posed:
        nb = [by_i[j] for j in (r["i"] - 1, r["i"] + 1) if j in by_i]
        speed = max((np.hypot(r["yaw"] - n["yaw"], r["pitch"] - n["pitch"]) for n in nb), default=0)
        why = []
        if r["eye"] < (0.5 if r["pitch"] > rest["pitch"] else 0.8) * rest_eye:
            why.append("eyes")
        if r["lip"] > rest_lip + 0.05:
            why.append("mouth")
        if abs(r["roll"] - rest["roll"]) > 8:
            why.append("roll")
        if speed > 2.5:
            why.append("speed")
        local = [by_i[j]["sharp"] for j in range(r["i"] - 8, r["i"] + 9) if j in by_i]
        if r["sharp"] < 0.6 * st.median(local):
            why.append("blur")
        if max(abs(r["dx"]), abs(r["dy"])) > 1:
            why.append("camera")
        if r["torso"] > 6:
            why.append("body")
        for w in why:
            reasons[w] = reasons.get(w, 0) + 1
        if not why:
            clean.append(r)
    pose = np.array([[r["yaw"] - rest["yaw"], r["pitch"] - rest["pitch"]] for r in clean]) if clean else np.zeros((0, 2))
    dist = [float(np.min(np.hypot(pose[:, 0] - y, pose[:, 1] - p))) if len(pose) else 99 for y, p in targets]
    within = lambda d: round(100 * sum(v <= d for v in dist) / len(dist), 1)  # noqa: E731

    # Reach along the eight directions, from rest, through clean frames only.
    def reach(u):
        u = np.array(u, float) / np.hypot(*u)
        best = 0.0
        for step in np.arange(0.5, 25, 0.5):
            q = u * step
            if len(pose) and np.min(np.hypot(*(pose - q).T)) <= 2:
                best = step
            else:
                break
        return round(best, 1)

    # Viewer's directions as (yaw, pitch): negative yaw turns him to the
    # viewer's right, negative pitch is up.
    dirs = {"right": (-1, 0), "up-right": (-1, -1), "up": (0, -1), "up-left": (1, -1), "left": (1, 0), "down-left": (1, 1), "down": (0, 1), "down-right": (-1, 1)}
    reaches = {k: reach(u) for k, u in dirs.items()}

    # The two sweeps a take can supply on its own: level (pitch within 4
    # degrees of rest) to each side, and upright (yaw within 4) up and down,
    # each continuous from rest with no gap over 2 degrees.
    def run(vals):
        cur = 0.0
        for v in sorted(v for v in vals if v >= 0):
            if v - cur > 2:
                break
            cur = max(cur, v)
        return round(float(cur), 1)

    level = [(y, p) for y, p in pose if abs(p) <= 4]
    upright = [(y, p) for y, p in pose if abs(y) <= 4]
    sweeps = dict(left=run(y for y, p in level), right=run(-y for y, p in level), up=run(-p for y, p in upright), down=run(p for y, p in upright))
    report.append(
        dict(
            take=name,
            frames=len(rs),
            posed=len(posed),
            clean=len(clean),
            rejected=reasons,
            restSharp=round(rest_sharp, 1),
            medianSharp=round(st.median(r["sharp"] for r in posed), 1),
            covered1_5=within(1.5),
            covered3=within(3),
            worstHole=round(max(dist), 1),
            reach=reaches,
            sweeps=sweeps,
            levelBothSides=bool(sweeps["left"] >= YAW and sweeps["right"] >= YAW),
        )
    )
    if cv2 is not None:
        # The map: production's field (grey box), every measured frame (small
        # grey), clean frames (green), holes over 3 degrees (red).
        S, pad = 14, 40
        W, H = int(2 * 25 * S + 2 * pad), int(2 * 18 * S + 2 * pad)
        img = np.full((H, W, 3), 255, np.uint8)
        to = lambda y, p: (int(pad + (25 - y) * S), int(pad + (18 + p) * S))  # noqa: E731  (viewer's left on the left)
        cv2.rectangle(img, to(YAW, -UP), to(-YAW, DOWN), (200, 200, 200), -1)
        for (y, p), d in zip(targets, dist):
            if d > 3:
                cv2.circle(img, to(y, p), 5, (60, 60, 230), -1)
        for r in posed:
            cv2.circle(img, to(r["yaw"] - rest["yaw"], r["pitch"] - rest["pitch"]), 2, (150, 150, 150), -1)
        for y, p in pose:
            cv2.circle(img, to(y, p), 3, (60, 170, 60), -1)
        cv2.drawMarker(img, to(0, 0), (0, 0, 0), cv2.MARKER_CROSS, 14, 2)
        cv2.putText(img, name[:60], (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        cv2.putText(img, "viewer's left   up is up", (8, H - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
        cv2.imwrite(os.path.join(out, f"map-{len(report):02d}.png"), img)

json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
print(f"{'#':>2} {'take':40s} {'clean':>9s} {'<=3deg':>6s} {'hole':>5s} | level L / R  (need {YAW:.1f}) | up / down (need {UP} / {DOWN}) | sharp  rejected")
for k, r in enumerate(report, 1):
    w = r["sweeps"]
    ok = lambda v, n: "*" if v >= n else " "  # noqa: E731
    print(
        f"{k:2d} {r['take'][:40]:40s} {r['clean']:4d}/{r['posed']:<4d} {r['covered3']:5.1f}% {r['worstHole']:5.1f} | "
        f"{w['left']:5.1f}{ok(w['left'], YAW)} / {w['right']:5.1f}{ok(w['right'], YAW)}          | {w['up']:5.1f}{ok(w['up'], UP)} / {w['down']:5.1f}{ok(w['down'], DOWN)}           | "
        f"{r['medianSharp']:5.0f}  {r['rejected']}"
    )
