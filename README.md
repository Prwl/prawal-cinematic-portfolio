# Prawal Sharma, cinematic portfolio

A single-page personal brand experience, developed in daylight: a career walked through one stone building over one day, each chapter a new lighting condition. The opening is a living portrait that turns toward the visitor's pointer. Built from scratch; the older `prawal-personal-brand` project was used only as a read-only source of facts and original photographs.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve dist/
npm run lint       # ESLint (flat config)
npm test           # Vitest content-integrity tests
npm run assets     # regenerate images and documents from assets-src/
npm run video      # regenerate the living portrait pose grid and poster from reference-video/hero-*.mp4 (needs ffmpeg, Xcode tools, LivePortrait next to this project for pose measurement; see scripts/prepare-video.mjs)
npm run qa:shots   # Playwright captures (see scripts/qa-screenshots.mjs for modes)
```

QA scripts expect a running server and a local Google Chrome:

- `node scripts/qa-screenshots.mjs intro|settled|full|reduced|sections|evidence [url] [outDir]`
- `node scripts/qa-layout.mjs [url]`: overflow, escaping elements, touch targets, alt text at 8 viewports
- `node scripts/qa-functional.mjs [url]`: console and network, anchors, downloads, keyboard focus, mobile menu
- `node scripts/qa-tracking.mjs [outDir] [url]`: drives a real mouse over the opening and reports the portrait frame per pointer position, follow timing and the return to rest
- `node scripts/qa-portrait.mjs [url]`: which contexts download the clip, go live or keep the still, the blocked-video fallback, and whether the loop sleeps when idle
- `node scripts/qa-intro.mjs [url]`: the opening ignores ordinary keys, modifiers, shortcuts, pinches and small wheel drift, and ends on Skip intro, the skip link, Escape, a real scroll or a vertical swipe

## Structure

```
src/
  data/          all facts (profile, experience, systems, capabilities, scale, intelligence, recognition, contact, chapters)
  scenes/        one component per chapter: Prologue, Identity, Evolution, Systems, Scale, Intelligence, Recognition, Epilogue
  components/    SiteHeader, CueRail, Atmosphere, LivingPortrait, Portrait, DetailLayer, StoryControls, SystemStory
  experience/    CanvasStage host, topology gobo, diagrams (pipeline, transactions, taxonomy)
  motion/        GSAP registration and the title sequence
  hooks/         reduced motion, media queries, lamps, active chapter, cue focus, useStory (discrete beats), useLivingPortrait
  lib/           media URL resolution, contact assembly
  styles/        tokens, base, one stylesheet per scene
  assets/media/  generated images and the living clip (do not edit by hand)
public/          fonts (Archivo variable, OFL), documents (résumé, framework PDFs), favicon, og-image
assets-src/      originals copied from the source portfolio, plus the Vision cutout
reference-video/ the owner-supplied generated videos (originals, never modified); hero-*.mp4 are the living portrait's takes
scripts/         asset pipeline, cutout, QA
```

## Two information layers

The primary scroll is a sequence of architectural scenes: Identity changes focus, Evolution moves through receding career steps, three differentiated SVG Systems stories reveal cause and effect, Scale stages one metric, Intelligence assembles its model, and Recognition moves through real award photographs, single voices and archive shelves. Each state carries brief copy.

Complete roles, project facts, capabilities, credentials, awards and recommendations remain accessible through the shared native `DetailLayer` dialog. It contains keyboard focus, supports Escape and a close button, locks the background scroll, and restores the opener without changing the visitor's place. `useStory` turns native scroll progress into discrete beats through existing ScrollTrigger; it does not hijack scrolling. Every scene has manual controls. Phones receive composed diagram/layout variants, and reduced motion starts resolved with selectors intact.

Additional QA (server required):

- `node scripts/qa-cinematic.mjs [url]`: eight-size scene matrix, detail access and responsive checks.
- `node scripts/qa-detail-content.mjs [url]`: source-derived content assertions across detail dialogs.
- `node scripts/qa-review-fixes.mjs`: Evolution metadata and dormant taxonomy screenshots at normal/reduced motion; uses localhost:5190.
- `node scripts/qa-production.mjs`: production browser measurements and portrait idle checks; inspect the script for its configured preview URL.

The implementation pass verified the eight-size matrix, detail content, build and lint. Production measurements are recorded by the QA scripts; no performance score is inferred from those checks.

## Asset pipeline

1. `swift scripts/cutout.swift assets-src/portrait-source.jpg assets-src/portrait-cutout.png` isolates Prawal with Apple Vision (run once; macOS 14+).
2. `npm run assets` grades the cutout for the dusk close (defringe toward the room's ground, gentle falloff, fade below the waist), writes AVIF and WebP, resizes the award photographs, and copies the PDFs.
3. `npm run video` measures every frame of the `reference-video/hero-*.mp4` takes, builds the pose grid from the best of them (`scripts/real_grid.py`), grades and scales every pose to the plate, lays each into the rest frame and cuts out the head box (`scripts/heads.py`), encodes it, and writes the poster, the body map (`scripts/living-body.mjs`) and `prawal-living.json` (grid layout and head box).
4. `node scripts/og-image.mjs` renders the share image from the live opening.

Rasters carry an embedded origin note (Impeccable provenance). Re-running the pipeline rewrites the files, so re-embed afterwards with `impeccable embed-prompt <file> --prompt "Origin: ..."`.

## Decisions worth knowing

- **Stack:** React 19 + Vite, GSAP ScrollTrigger for discrete story beats and the scroll-away, native CSS sticky for scene staging, SVG for system stories, Canvas 2D for the topology, and an event-driven `requestAnimationFrame` loop with an optional WebGL stage for the living portrait. No smooth-scroll library, Framer or Motion.
- **Light:** the page is light by art direction, not by theme switch. A fixed atmosphere layer holds the room's lighting condition (registered `@property` colours crossfaded on each chapter cue); the one dark passage (Scale) is built into the scene with feathered thresholds so text never sits on a half-lit ground. The header and rail take pale ink only while that passage's solid dark is behind them.
- **Living portrait, source:** real video. Fifteen 1080p Veo generations (`reference-video/hero-*.mp4`), each starting and ending on the same rest image (the frontal pose with eyes to camera), each looking a different way in between: left, right, up, down, the diagonals, an orbit and three fillers for the lower diagonals. Because every take starts on the same picture, the takes agree to the pixel at rest (under 0.2 px apart), and his face, hair and blazer carry through. Veo overshoots what it is asked for (a 20 degree turn came back as a full turn of the body) and closes his eyes looking down, so frames are chosen by measurement, not by take.
- **Why not re-posing one image:** the previous portrait re-posed a single frame with LivePortrait. Likeness was exact by construction, but LivePortrait redraws the face smoother than the photograph, and in motion it read soft and unreal. Real frames keep the video's own detail. LivePortrait is still used, only to measure each frame's yaw, pitch, eye and lip openness.
- **Living portrait, pose grid:** 33 yaws (-22 to +22 degrees, 1.4 apart) by 19 pitches (-15 up to +7 down, about 1.2 apart), 627 poses in the produced asset. The runtime samples the whole grid: horizontal travel sets yaw, vertical travel sets pitch (up to 0.62 of the upward range, 0.9 of the shorter downward range), so diagonals are real poses. `scripts/real_grid.py`:
  - keeps frames that are sharp, not mid-sweep (Veo blurs a head moving over 3.3 degrees a frame), eyes open, mouth closed, body and camera still;
  - fits where the irises sit as one plane over head pose and prefers frames near it (Veo's eyes lead a turn on the way out and lag on the way back);
  - keeps one anchor per 1.6 degree patch of pose space, preferring the take its neighbouring patches use, so the picture changes take in as few places as possible;
  - matches each anchor's skin tone to one smooth trend over head pose (takes are exposed a little differently);
  - makes each grid pose from the triangle of anchors around it: the dominant anchor, moved the last degrees along dense optical flow and blended with the other two. The flow is fine on the face and smooth near the plain wall; his outline and his eyes come from the dominant anchor alone (two frames' hair silhouettes and lids never match, and blended they drew wings of hair and half-shut eyes);
  - moves every pose onto one smooth trend of head placement (where the face sits and how big it is). Veo's head bobs by about 6px between frames at one angle, and neighbouring poses from such frames doubled his eyes as the page blended them;
  - lays each pose into the rest frame through its own mask: the head's reach above the jaw, and below it only this pose's face and beard and the rest pose's. Veo redraws the T-shirt's neckline and lets the shoulders drift, so taken from the poses they changed shape as he moved.

  Down stops at 7 degrees: every take asked to look down dropped his head fast with his eyes shut, so past that the diagonals were barely filmed. Poses built across the widest unfilmed stretches showed hair torn onto the wall and mismatched eyes.
- **Living portrait, resolution:** the crop is 1140x1080 of the 1080p takes, scaled 4/3 to the 1520x1440 plate with Lanczos and nothing else. Apple's on-device super resolution, needed when the source was 720p, over-processes 1080p video (harder contrast, painted skin, halos at the jaw), and an unsharp mask drew light rims along his outline and the T-shirt's neckline, so neither is used.
- **He stands in the page's hall:** the photograph's wall and pillar made the portrait read as a photo rectangle placed on the page, 9 to 35 grey levels off the page's stone. The figure step (`scripts/living-body.mjs`, run by `npm run video`) cuts him out with Vision's person mask, joined with everywhere the head reaches in any pose and grown by a halo for the body move, and grades the photograph's wall inside that halo to `--stone`: light, colourless pixels outside his body everywhere, and below and beside the head box everything past his full-resolution outline (the pillar's dark edge beside his arm). The poster ships with that alpha; the WebGL stage applies the same grade to the moving head and outputs the same cut-out. The wall key is full from 0.7 luma (the wall is 0.72 and up even in the head's shadow; keyed only in part, a shade's difference between pose and poster drew rings on it) and nothing below 0.6 (his hair's highlights stay under 0.5; keyed from 0.55 they turned to stone as he moved). In landscape the floor and its line end before him (`prologue.css`), so no line runs behind his waist.
- **Living portrait, mechanics:** the clip holds only the head box (728x714 at 1520, with a margin), in serpentine order, H.264 CRF 20, converted with the BT.709 matrix and tagged BT.709 / sRGB / limited range, with a keyframe every 8 frames and no B-frames (5.9 MB for 627 poses). Untagged, ffmpeg's default BT.601 conversion decoded warmer than the poster in Chrome (+2.9 red, -1.2 blue on the face), so the head read as a warm patch in a pale frame and flickered as poses changed; tagged, the decoded rest frame matches the poster to 0.1 of a level on average. Seeking: four copies seek in about 7ms (10ms at p95) in Chrome, inside one display frame; a keyframe every 4 frames saved 1ms for a third more size.  It is fetched whole into memory at idle time and sits over the poster, feathered across its margin. Four hidden copies hold the four poses around the visible one and are drawn into one canvas only once all four have landed, at bilinear weights (straight alpha: 1, fx, (1-fx)fy/(1-fx fy), fx fy), so a frame on screen is always a whole blend; drawing the copies directly flashed mismatched poses on fast moves. Where WebGL is available a stage (`src/hooks/livingStage.js`) draws the poster, the blended head and a slight move of the whole figure by a soft body map (Vision person matte of the rest pose, `scripts/living-body.mjs`; zero on the wall, so the wall never moves): the upper body turns up to about 10 CSS px with the head, the waist less; vertical pointer travel supplies only a small body/camera response. Runtime head pitch follows vertical pointer travel across the grid's rows; breathing is removed. Without WebGL the head canvas shows alone over the poster. Dead zone around his face, face-relative ranges to each screen edge, a critically damped 2D follow (omega 8); the grid's columns run against the pointer (negative yaw, in LivePortrait's convention, turns him to the viewer's right), so the pointer is mirrored onto them; a gain envelope that comes up after the title sequence and fades on scroll-away, tab hide or pointer exit, and a loop that sleeps once pose and gain settle, including while the portrait remains visible. Input and completed seeks wake it as needed.
- **Fallbacks:** touch, phones, upright tablets and reduced motion never download the clip and show the rest pose as a still. A fetch or decode failure leaves that still in place. The poster is the rest pose made the same way as the clip, so the head clip lands on the same picture.
- **The close:** the real photograph, graded for dusk. Identity fidelity outranks the rhyme with the opening's charcoal take.
- **Sound:** none.
- **Reduced motion:** no title sequence, sticky story runs, tracking or scene transitions. Scenes start resolved, diagrams remain composed, and manual selectors expose every state.
- **Content:** every figure is traceable to the source portfolio or résumé; `tests/content.test.js` guards the scale figures, copy rules and the portrait's pose table.

Design system: see `DESIGN.md`. Product context: `PRODUCT.md`.
