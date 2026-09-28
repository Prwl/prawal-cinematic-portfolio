# Hero directional-atlas experiment

Branch `exp/hero-directional-atlas`. Production is untouched: the atlas hero only loads with **`?hero=atlas`**. Without the flag, the page is byte-for-byte the current hero.

**Verdict: the curated atlas is not production-worthy. Stop here and move to a real-photo hero (fallback below).** The runtime works. The source footage is what fails: Veo blinks at the start of nearly every turn, re-renders the face differently in every take, and never cleanly films two of the eight directions. Any bridge between takes either doubles the face (dissolve) or visibly jumps (cut).

All directions below are as the **viewer** sees them. The take names mix subject-left and viewer-left: `hero-upright*` turns toward the viewer's up-*left*.

---

## 1. Audit of all 19 archived takes

Every frame of every take was measured (3,696 frames) with LivePortrait as a measuring tool only (`scripts/atlas_audit.py`). Each take was then scored 0–10 per criterion (`scripts/atlas_score.py`):

| Criterion | How it is measured |
|---|---|
| Likeness | LivePortrait canonical keypoints (identity geometry), compared with what is typical *at that head pose* across all hero takes. The raw keypoints drift with pose, and a first pass that ignored this wrongly rejected every turned frame. |
| Eyes | Eye-open ratio for the pose, plus blink events. |
| Face stability | Frame-to-frame jitter of the identity geometry ("boiling") and of the landmark spread (scale pumping). |
| Blazer | Torso difference from the rest frame. |
| Background | Wall drift (phase correlation) and wall change against the shared rest frame. |
| Motion | Share of frames slow enough not to smear, roll steadiness, and jerk. |
| Usefulness | Clean pose range reached, per direction. |

A frame is **clean** only if all of these hold:
- eyes open for the pose, and mouth closed
- speed ≤ 2.2°/frame
- roll ≤ 7°
- blazer and wall within tolerance
- likeness within 3.5 σ

[`audit-table.md`](audit-table.md) has the full table, and [`audit-summary.json`](audit-summary.json) has the raw values. In short:

| Take | Overall | Verdict |
|---|---|---|
| hero-upright-v2 | 9.1 | **used: up-left** |
| hero-orbit | 8.9 | **used: left** |
| hero-up-v2 | 8.7 | eligible, not needed |
| hero-upright | 8.7 | **used: up-right** |
| hero-down-v2 | 8.6 | eligible, not needed (lids down in 83 frames) |
| hero-down | 8.5 | eligible, not needed |
| Man_rotating_head_horizontally | 8.4 | **excluded**: different generation, does not start on the shared rest frame |
| hero-pitch | 8.3 | eligible, not needed |
| hero-up | 8.3 | **used: up, down** (closest face to the production rest head) |
| hero-downright | 8.0 | **used: down-right** |
| Man_tilting_head_up_down | 7.8 | **excluded**: likeness drifts (5.7), Gemini watermark |
| hero-downright-v2 | 7.8 | eligible, not needed |
| hero-fill-downleft | 7.5 | eligible, not needed (arm gesture, lids down) |
| hero-fill-downright | 7.5 | **used: right** |
| hero-right | 7.5 | eligible, not needed (only 49 clean frames) |
| hero-fill-down | 6.6 | eligible, not needed |
| Man_performing_vertical_head | 5.7 | **excluded**: different wall, framing and body |
| Vertical_head_motion_technical | 5.7 | **excluded**: different (sandstone) set |
| hero-yaw | 5.7 | **excluded**: the whole body spins, not the head |

### What the audit found

1. **Veo blinks as it starts almost every turn.** Examples: `hero-right` frames 17–20 (eye ratio 0.03), `hero-fill-downright` 19–21, `hero-orbit` 21–23. People do blink when turning, but here it lands on exactly the frames a pointer-driven head needs most (the first 2–7° of every direction).
2. **Veo moves fast through the mid-range**, about 3.5°/frame, so there are only 1–2 frames per 1.5° band between rest and the extreme. Even ignoring every quality gate, the archive has one or zero frames per band for up-right, right and down-left.
3. **"Looking down" and "eyes open" hardly overlap.** Real downward gaze lowers the lids. The "down" takes have 60–85 frames each rejected for lids down. What survives reads as chin down with the eyes still on the camera.
4. **The takes do not share one face.** They start from the same rest image, but Veo re-renders it. The rest frames differ from the production rest head by 2.3 (`hero-up`) to 4.6 grey levels of *detail*, not exposure: skin texture, a mole that comes and goes, hair volume. Every take change is a small likeness change.

## 2. Selected subset and why

Of 19 takes, **14 are eligible** and **6 are used**, one per direction. For each direction the builder searched every eligible take's outward and return legs. It chose the leg that:
- reaches furthest with clean, on-axis frames
- stays closest to the direction's axis
- has the fewest blink frames in passing

| Direction | Take, frames | Clean stops | Blink frames passed | Notes |
|---|---|---|---|---|
| right | fill-downright 18–26 | 4 | 3 | the only clean right leg in the archive |
| up-right | upright 8–18 | 3 | 0 | 16° off axis: really "right and a little up"; gap from 0.23 to full reach |
| up | up 22–29 | 4 | 0 | best direction |
| up-left | upright-v2 7–21 | 4 | 0 | best direction |
| left | orbit 21–28 | 4 | 3 | reaches only 70% (10.6°) |
| **down-left** | — | — | — | **not filmed cleanly anywhere** (reach 0.11): served by left/down |
| down | up 178→163 | 4 | 0 | chin down, eyes on camera |
| down-right | downright 136→119 | 4 | 0 | chin down, eyes on camera |

So the 9-point strategy delivers **8 of 9 points**.

## 3. The prototype

The pieces:
- `scripts/atlas_build.py` builds the atlas.
- `src/hooks/useAtlasPortrait.js` and `src/hooks/atlasPose.js` are the runtime, with unit tests in `tests/atlasPose.test.js`.
- `src/components/AtlasPortrait.jsx` is the component, and `src/lib/atlasMedia.js` holds the flag.

**Normalisation.** Every frame goes through the production crop (1140×1080 at x=705), grade and 4/3 Lanczos scale, using the same ffmpeg filters as `prepare-video.mjs`. On top of that:
- camera drift is undone sub-pixel against the wall
- exposure is matched on the wall, then per take on the face to the production rest head
- each frame is laid into the production rest head through one feathered head mask

The collar, lapels and wall are therefore the poster's own pixels in every picture. The atlas reuses production's poster, body map, alpha, WebGL stage, typography and composition unchanged.

**Assets.** 69 real frames:
- the centre plus 28 clean "stops" at full resolution (500×584)
- 40 passing frames at 0.55 scale

That is 1.05 MB of WebP (production's clip is 5.76 MB). Everything is decoded once up front as ImageBitmaps, so a pose is a `drawImage` and never a video seek.

**Motion model: committed turns.**
- The pointer picks a direction (8 sectors with hysteresis) and a **stop**: a frame that passed every check.
- The take's own consecutive frames play to that stop at about their filmed cadence (26 atlas frames per second).
- The head **only ever comes to rest on a stop**. It measured 0 rests on a non-stop frame across all runs.
- Consecutive frames of one take may be mixed for a frame in a narrow band while moving. Frames of different takes are never mixed.
- A neighbouring direction hands over at the same turn. Anything further looks back through rest first.
- Blink runs are skipped, not played.
- The body follows the pose on screen, not the pointer.

**Bridging between takes.**
- **Dissolve** (`?atlasBridge=dissolve`): fails. There is a doubled face for its whole length ([`atlas-dissolve-right-to-upright.jpg`](atlas-dissolve-right-to-upright.jpg) and [`atlas-dissolve-right-to-left.jpg`](atlas-dissolve-right-to-left.jpg) show two head outlines for about 130 ms). Two takes differ in both pose and facial render, so no alignment-free blend is clean.
- **Cut** (default): no ghosting ever, but a visible jump at the take change.

## 4. Comparison with the current hero

These come from `node scripts/qa-atlas-compare.mjs`: headless Chrome, 1440×900 at DPR 2, identical pointer paths for both. Every head picture either implementation uploads to its WebGL stage is fingerprinted, with no changes to either implementation. Raw data is in [`compare.json`](compare.json); the nine held poses are in [`nine-side-by-side.jpg`](nine-side-by-side.jpg) (current left, atlas right).

| | Current (pose-grid clip) | Atlas (cut bridges) |
|---|---|---|
| **Perceived smoothness**: face change per new picture, median / p95 / max (grey levels) | 9.9 / 15.7 / 21.7: large but *uniform* steps, no pops | 5.5 / 22.9 / **38.2**: finer steps, but **5 pops** per sweep (take cuts) |
| New head pictures during a 6 s circular sweep | 86 (~7/s, limited by video seeks) | 107 (~9/s) |
| **Directional responsiveness**: first new picture after a pointer jump | 48 ms | 49 ms |
| Time to settle on the final pose | 432 ms | 316 ms |
| **Facial consistency** | one synthesized face everywhere, but flow-warped (softness at extremes) | real frames, but **6 differently rendered faces**; a visible likeness shift between directions |
| Face sharpness at the nine held poses, median / worst (Laplacian variance) | 57.5 / **24.2** (down-left is soft, lids down) | 63.2 / 46.2 |
| **Neutral-state stability**: drift over 1.5 s still, head updates while still | 0 / 0 | 0 / 0 (centre is the production rest head exactly) |
| **Visual artefacts** | warp softness and eye smear at the extremes | turn-onset squint on left; heavy lids passing on some frames; pose jump at take changes; no ghosting |
| **Runtime cost**: script / task ms during the sweep | 215 / 970 | 334 / 1076 |
| JS heap | 61.7 MB | 62.7 MB (plus about 47 MB of decoded bitmaps in GPU/raster memory) |
| Download for the head | 5.76 MB | **1.05 MB** |

The frame-by-frame filmstrips (`*-rest-to-right.jpg`, `atlas-right-to-left.jpg`, `atlas-right-to-upright.jpg`) show what the numbers summarize:
- The current hero moves more slowly and more uniformly, with no blink.
- The atlas turns crisply and lands on sharper, cleaner stills. But on the way it can pass a squint, and it changes face when it changes take.

## 5. Recommendation

**The atlas holds poses better:**
- sharper worst pose
- only real frames, never warped
- 5.5× smaller download
- faster settle

**It moves worse:**
- it pops at take changes
- faces shift between directions
- one direction is missing
- "down" doesn't read as down

The user's eye lands on motion, not holds, so on balance it is **not better than the current hero, and not production-worthy.** Stacking more AI video on it (regenerating takes, adding flow warps between them) would bring back the synthesized-warp problems the current hero already has. Per the brief, the experiment stops here.

What *is* worth keeping is the runtime:
- decoded frames, never seeks
- committed turns that only rest on clean stops
- no cross-take blending

It is source-agnostic. Its failures all trace back to Veo footage.

## 6. Fallback: premium real-photo 2.5D hero

The only real photo in the repo (`assets-src/portrait-source.jpg`) is a different look: cream blazer, smiling, off-camera, busy floor. To keep the current art direction, the fallback needs one short shoot.

**Step 1: shoot (half a day, one person with a camera).** Match the current plate:
- charcoal blazer, black tee
- plain light stone wall 1.5–2 m behind
- soft, large key light from camera-left, as in the Veo plate
- locked-off tripod at chest height, about 85 mm equivalent, same framing as the 1140×1080 crop

Capture:
- **(a)** 6–8 RAW stills at rest: neutral, relaxed mouth, eyes to lens
- **(b)** a 60 fps (ideally 4K) clip of slow, deliberate head turns from rest to 8 marked targets around the lens (about ±15° yaw, 10° up, 7° down), holding each for a second, and eyes open on the way

**Step 2: 2.5D hero from the best still. Ship this first; no AI imagery.**
- Cut-out and depth: Apple Vision cut-out (existing `scripts/cutout.swift`) plus a monocular depth map (Depth Anything V2 or Apple Depth Pro), cleaned by hand at the hairline and ears.
- Render in the existing WebGL stage as a depth-displaced mesh or 3 layers (wall, body, head/hair):
  - the pointer drives a restrained virtual camera, ±1.5° orbit and ±1% dolly, spring-damped as today
  - the existing body map adds breath, plus a slow light sweep
- Nothing moves that a camera would not: no eyes, no mouth, no re-posing. So no likeness or artefact risk.
- Cost: one texture plus a depth map (under 400 KB), a few ms of GPU, and it works on touch too (tilt or idle drift).

**Step 3 (optional, later): real directional motion.**
- Feed clip (b) through `scripts/atlas_build.py`. The audit, stops, committed-turn runtime and QA scripts carry over unchanged.
- With a real person you can control:
  - blinks: ask for eyes open, and re-take
  - one consistent face across all takes: same take, same skin
  - slow turns: 60 fps, about 1°/frame, so dense stops and no cuts
- Gate it on the same `qa-atlas-compare.mjs` numbers: zero pops, no likeness change between directions, worst pose sharpness ≥ the 2.5D still.

## Reproduce

```bash
# measure (about 12 min, LivePortrait env), score, build
../LivePortrait/.venv/bin/python scripts/atlas_audit.py ../LivePortrait artifacts/atlas/metrics.json
../LivePortrait/.venv/bin/python scripts/atlas_score.py artifacts/atlas/metrics.json artifacts/atlas/audit.json
../LivePortrait/.venv/bin/python scripts/atlas_build.py artifacts/atlas/audit.json /tmp/atlas-work
# compare against production (dev server on :5190)
node scripts/qa-atlas-compare.mjs http://127.0.0.1:5190/ artifacts/atlas/compare
node scripts/qa-atlas-filmstrip.mjs http://127.0.0.1:5190/ artifacts/atlas/compare
```

To view it, open `/?hero=atlas` (desktop, mouse, window ≥ 1024 px wide) and compare with `/`. Add `&atlasBridge=dissolve` to see the dissolve variant.
