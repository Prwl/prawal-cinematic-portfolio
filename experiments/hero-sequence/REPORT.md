# Hero single-take image-sequence experiment

Branch `exp/hero-directional-atlas`. Production is untouched: the experiment loads only with **`?hero=sequence`** (desktop, mouse, window ≥ 1024 px, motion allowed). Without the flag the page is production.

**Current state (30 Sep, round 3): real frames in every direction but the lower diagonals.**

`?hero=sequence` now combines four Flow generations of the same look, which render his face alike at matched poses:
- **Clip 2's level sweep** for left and right, unchanged.
- **Two R-up takes and a nod (V-2)** for up, up-left, up-right and straight down.

The page shows, for each cursor position, the nearest real frame, with a small tilt (at most 5° up and 3° down) bridging the gaps. The lower diagonals are that tilt on the level turn: no generation filmed them. Details and numbers are in [NEW-TAKES-AUDIT.md](NEW-TAKES-AUDIT.md), round 3.

| | Production MP4 | **Sequence (now)** |
|---|---|---|
| Face sharpness, median / worst | **61.6 / 50.7** | 51.8 / 34.3 |
| On screen: change per video frame, p95 / max | 17.0 / 32.5 | **14.6 / 25.0** |
| Vertical movement, up / down | **23.4 / 20.2** | 19.4 / 15.4 |
| Skin and face consistency | varies between poses | one face; takes matched to neighbour level |
| Still at rest; returns exactly to rest | yes | yes |
| CPU (renderer + GPU) | 30.9% | 30.1% |
| Memory while active | 602 MB | 682 MB |
| Head download | 5.76 MB | **4.09 MB** |

**Recommendation.** It is now a real candidate: smoother than production on screen, real movement up and across the upper diagonals, one consistent face. It is slightly less crisp, and gentler looking down.

Compare `/` and `/?hero=sequence`. If you prefer it, integration is:
1. Swap the component in `Prologue.jsx`.
2. Move the assets into `src/assets/media`.
3. Drop the 5.76 MB clip.

*Sections 1–6 below record the first version of this experiment, built from the 720p `Man_rotating` take. The two earlier 1080p versions (level only) are summarised in NEW-TAKES-AUDIT.md, rounds 2 and 3.*

## 1. Source: one take, one generation

The atlas audit's per-frame measurements (`artifacts/atlas/metrics.json`) were searched for a take that turns **level** through the rest pose to **both** sides.

| Take | Resolution | Crosses centre | Why not |
|---|---|---|---|
| `hero-upright` | 1080p | yes, −30° → +37° | crosses looking up about 13°, roll swings ±10° |
| `hero-right` | 1080p | yes, −47° → +37° | pitches about 18° down at the crossing, lids half closed |
| `hero-downright-v2` | 1080p | yes, −35° → +52° | crosses looking down, blinks just before |
| **`Man_rotating_head_horizontally…133109`** | **720p** | **yes, +24° → −21°** | **used** |

No 1080p take has a level turn to both sides. The 1080p hero-* takes are separate generations, each rendering the face differently, which is why the atlas failed, so they cannot be mixed in.

**All 19 videos, checked frame by frame.** The requirement does not need one continuous sweep. Any frames from **one** video that cover both sides at level pitch would do (for example an outward leg and a return leg), since one generation has one face.

A frame counts when it is:
- level (pitch within the stated tolerance of that take's rest)
- not rolled
- eyes open
- not smeared

Reach is how far those frames extend from centre to each side with no gap between them.

| Criteria | Videos covering ±15.8° on both sides |
|---|---|
| Strict: pitch ±4°, roll ±6°, ≤ 2.5°/frame, eyes ≥ 80% of rest, gaps ≤ 2° | only `Man_rotating` (720p) |
| Loose: pitch ±7°, roll ±9°, ≤ 4°/frame, eyes ≥ 65%, gaps ≤ 3° | only `Man_rotating` |
| Loosest: pitch ±10°, roll ±12°, any speed, eyes ≥ 50%, gaps ≤ 4° | `Man_rotating`, and `hero-upright` (1080p) |

Near misses:
- `hero-orbit` reaches 24° to one side, 1.3° to the other.
- `hero-yaw` reaches 17° to one side, 6° to the other, and its whole body spins.
- `hero-downright` reaches 11°/14° to one side only.
- Every other take stays within a few degrees of centre when level.

`hero-upright` qualifies only at the loosest setting, and its frames show why:
- Its two sides come from its opening leg (frames 10–15) and its return leg (120–129).
- Toward the edges he looks up 6–7° and tilts 5°.
- On one side the eyes roll upward with a sideways smirk; on the other they half-close (openness 0.27).
- There are only 4–5 frames per side, 2.3–2.7° apart, against about 1° in `Man_rotating`.

It is sharper, but it would read as looking up and away rather than turning.

Frames 96–156 of the chosen take give 61 consecutive frames, and every one is used:
- yaw runs from +20.4° to −19.8°; production's calibration reaches ±15.8°
- pitch stays within 0–3°
- eye openness is 0.31–0.36, with no blink (the take blinks at 24 and 78, outside the span)
- the camera is locked off: wall drift 0.01–0.02 px, exposure within 0.1%
- the rest frame is 131 (yaw 0.0°), which is also the poster

The take is the 720p original of the hero framing. The old 760×720 crop at x=470 aligns with production's plate to about 1 px (ECC 0.957, scale 1.003). It is 1280×720 at 0.87 Mbps, so some of its softness is compression.

## 2. Build: `node scripts/prepare-sequence.mjs`

**Resolution.** Frames are brought to the 1520×1440 plate with Apple's super resolution (`scripts/upscale.swift`, already in the repo) in video mode: each frame is fed its predecessor, so detail holds still. They are graded afterwards, as production grades. Measured on the rest face at plate size:

| | Face detail | Face change per frame while the head holds |
|---|---|---|
| Lanczos 2× | 36.8 | 1.86 |
| **Super resolution** | **138.8** | **2.01** |
| Production poster | 365.0 | n/a |

- The shimmer super resolution adds to static texture (1.56 vs 0.37) is on the blazer, which is never taken from the frames.
- `SEQUENCE_SR=0` builds with Lanczos instead.

**Compositing.** `scripts/sequence_heads.py` lays each frame's head into **the same take's** rest frame using production's mask:
- above the jaw: everywhere the head reaches
- below it: that frame's face and beard, from LivePortrait landmarks (used to measure only)

Neck, collar and lapels stay the rest frame's, because the shoulders sway up to 4.5 px with the turn. The build also records:
- each frame's face centre
- the head's ellipse at rest: centred on the face, crown to below the beard, which is used by the tilt

**Figure.** Poster, body map and figure mask come from that rest frame, via the existing `makeFigure` (which now takes an output directory).

**Encoding.** WebP q94: 61 frames, 514×690, 2.26 MB. The worst frame is 44.5 dB against the lossless composite.

**Calibration.** Isotonic (monotonic) fit of the measured yaw, relative to the rest frame, so a pointer at rest shows exactly the poster frame.

## 3. Runtime

| Piece | Files |
|---|---|
| Component | `src/components/SequencePortrait.jsx` |
| Hook | `src/hooks/useSequencePortrait.js` |
| Stage | `src/hooks/sequenceStage.js` |
| Pure maths, tested | `src/hooks/sequencePose.js`, `tests/sequencePose.test.js` |
| Data (lazy chunk) | `src/lib/sequenceMedia.js` |

- **Frames:** every frame is fetched once at idle and decoded to an `ImageBitmap` (about 30–50 ms for all 61). A pose change uploads one bitmap. There is no video and no seeking, so a reversal is just a different bitmap.
- **Horizontal:** production's calibration unchanged (dead zone, smoothstep, 72% of 22°) to a yaw, then to a frame through the take's measured yaw. Hysteresis of 0.2 frame stops flicker on a boundary.
- **Vertical:** the stage is production's shader copied, plus a head tilt. The head is an ellipsoid, as deep as the face is wide, turned about the top of the neck: up to 10° up and 6° down.
  - Nose and chin move most, the crown drops back, and the neck takes the give.
  - The displacement fades to zero at the head's outline, so collar, lapels and wall never move.
  - Pixels are moved, never redrawn.
  - Past 6° down the forehead visibly stretches, so down is held there; production's real range is 9.3° up and 6.3° down.
  - Shoulders lift and settle by production's amounts.
  - Diagonals are the filmed turn plus the tilt.
- **Smoothing:** production's ω = 10 critically damped spring, solved exactly per frame, on both axes. It gives the same motion at any frame rate and cannot overshoot across a hitch (both unit-tested).
- **Fallback:** phones, upright tablets, touch and reduced motion get production's `LivingPortrait`, which for them is the existing static poster. Verified: no video element and 0 requests to the experiment.
- **Production:** `livingStage.js` is unchanged. The manifest and frame URLs are a separate 10.6 kB chunk that is never requested without the flag. The frames are still emitted into `dist/`.

## 4. Comparison in Chrome

These come from `node scripts/qa-hero-sequence.mjs`: real Chrome, 1440×900 at DPR 2, identical pointer paths, and every head picture caught at `texImage2D` with neither implementation changed. Repeated runs agree within noise. Raw data is in [`compare.json`](compare.json). The side-by-side recording is `artifacts/hero-sequence/side-by-side.mp4` (git-ignored).

| | Production MP4 | Single-take sequence |
|---|---|---|
| **Smoothness**: face change per new picture, median / max (grey levels) | 8.8 / 21.5 | **4.8 / 16.1** |
| New head pictures over all paths (slow sweep alone) | 426 (22) | 556 (44) |
| Pops (> 3.5× the median step) | 0 | 0 |
| **Skin-tone jump** between pictures, worst p95 (luma levels) | 12.1 (mixed takes) | **2.9** |
| **Initial response**: first new picture after a pointer jump | 112–113 ms | **46–60 ms** |
| Last picture after a jump | 510–547 ms | 960–1010 ms (same spring; finer frames keep updating in its tail) |
| **Fast reversals** (3 Hz): shown vs asked yaw swing, lag | 24.8° / 26.5°, 167 ms | 25.9° / 26.5°, 167 ms |
| A→B→A within 150 ms, all paths | 8 | 10 (only at reversal turnarounds) |
| **Neutral**: pictures while still, pixel drift | 0, 0 | 0, 0 |
| **Return to neutral** ends on the rest frame | yes | yes |
| **Vertical response**: face movement, centre to top / bottom (grey levels) | **23.4 / 20.2** (real pitch) | 14.2 / 13.4 (rendered tilt) |
| **Face sharpness**, median / worst held pose (Laplacian variance) | **61.6 / 50.7** | 32.1 / 24.7 (Lanczos build: 16.7 / 12.6) |
| CPU during 58.7 s of paths, renderer + GPU process | 13.9% + 16.2% | 13.4% + 12.9% |
| Main-thread task time | 4.2 s | 4.2 s |
| Memory footprint while active, renderer / GPU | 289 / 322 MB | 348 / 300 MB (+86.5 MB of decoded bitmaps, less decoder) |
| JS heap | 83 MB | 79 MB |
| Download for the head | 5.76 MB | **2.26 MB** + 0.1 MB poster and maps |

Visual evidence:
- [`living-strip.jpg`](living-strip.jpg) and [`sequence-strip.jpg`](sequence-strip.jpg): nine held poses, left to right.
- [`living-nine.jpg`](living-nine.jpg) and [`sequence-nine.jpg`](sequence-nine.jpg): the nine screen positions.
- [`face-1to1.jpg`](face-1to1.jpg): the rest face at device pixels, production left.

## 5. What was inspected

- **Slow left to right, circle, diagonals.** The sequence is smoother: half-size steps, twice the pictures, no tone flicker. Production's steps are larger and its tone shifts where its grid changes take.
- **Fast reversals.** Equal tracking (the spring dominates). Neither stalls. The sequence turns a frame sooner because there is no seek.
- **Centre to edge.** The sequence answers in half the time.
- **Neutral.** Both are perfectly still.
- **Up, down, diagonals.** All nine positions are now distinct poses. The tilt reads as a nod, with proportions held and no stretched jaw. Production's real pitch moves further and also changes gaze and shading, which a tilt cannot.
- **Skin and facial consistency.** The sequence is better: one face, one skin, one hair render in every pose. Production's poses drift between takes: a squint in one, a different render at the far right, painted texture and halos at the extremes.
- **Detail.** Production is crisper, especially the eyes and eyelashes. The super-resolved sequence is acceptable at hero size and more natural, but visibly softer side by side.
- **Memory.** About 60 MB more in total for the decoded frames. That is acceptable on desktop.

## 6. Recommendation

Do not swap automatically. Look at both at full size.

- **If you prefer the sequence's calm, consistent face and smoother motion over production's extra crispness and real pitch,** it is ready to integrate. The steps would be:
  1. Swap `LivingPortrait` for `SequencePortrait` in `Prologue.jsx`.
  2. Move the assets into `src/assets/media`.
  3. Remove the production clip (−5.76 MB).
- **If not, the durable fix is real footage** that removes both limits at once. The runtime, build and QA carry over unchanged. Capture one continuous, locked-off take:
  - **Rig:** charcoal blazer and black tee; plain light stone wall 1.5–2 m behind; large soft key from camera-left; tripod at chest height, about 85 mm equivalent, matching the hero framing.
  - **Format:** at least 4K, 60 fps.
  - **Move:** slow, level turns to about ±20° yaw, then a slow nod about 10° up and 7° down, at roughly 1° per frame, eyes open.

  A filmed nod would replace the rendered tilt with real frames on a second axis. Gate it on `scripts/qa-hero-sequence.mjs`: face sharpness at least production's, tone jumps and steps no worse than this experiment's.

## Reproduce

```bash
node scripts/prepare-sequence.mjs                                  # about 1 min; needs LivePortrait, as prepare-video does
npm run dev -- --port 5190 --host 127.0.0.1
node scripts/qa-hero-sequence.mjs http://127.0.0.1:5190/ artifacts/hero-sequence
```

## Now the production hero (30 Sep)

At the owner's request the image sequence is the default hero (`src/scenes/Prologue.jsx`).
- **Other views:** `?hero=living` brings back the previous MP4 portrait and `?hero=atlas` the atlas experiment. `?hero=sequence` still names the default.
- **Rollback:** a one-line change, `HEROES[heroFlag] ?? SequencePortrait` back to `?? LivingPortrait`.
- **Nothing was removed:** the old portrait, its video and its pipeline are all still in place.

Checked in Chrome against the dev server:
- **Desktop (1440×900):** `data-hero="sequence"`, live, tracks the pointer. It fetches the 129 frames (5.35 MB) and never the old MP4; the only MP4 request is Vite's 462-byte `?import&url` module.
- **Phone (iPhone 13 emulation) and reduced motion:** the static poster through LivingPortrait, with no frames and no video.
- **All cases:** no console errors.
- **Build and tests:** `vite build` passes, with the sequence manifest and code in their own 32 kB chunk. 44 tests pass; lint is clean.

`scripts/qa-hero-sequence.mjs` now compares `/` (sequence) with `/?hero=living`.
