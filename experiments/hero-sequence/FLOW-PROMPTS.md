# Google Flow prompts: single-take hero source (round 2)

The goal is **one** generation that contains every head direction the cursor needs. Clips cannot be combined, because each Veo generation renders the face differently, even on its first frame. See [REPORT.md](REPORT.md).

Round 2 is revised from the audit of round 1 ([NEW-TAKES-AUDIT.md](NEW-TAKES-AUDIT.md)).

| Round 1 result | Round 2 change |
|---|---|
| Slow, steady speed worked | kept word for word |
| Circles came back about twice the size asked | ask for **half** the size you want |
| No clip ever turned **level** toward the right of the frame | the right-hand turn comes **first**, and "chin at exactly the same height" is repeated |
| "his left / his right" is ambiguous | directions are named by **the edges of the frame** |
| "cursor" made Veo draw cursors | the word is gone |
| Looking down closed the eyes | down is kept very small, and the eyes are named |

## Flow setup (every generation)

- **Mode:** *Frames to Video*, with the **same rest image as first and last frame**. Use the one you used for round 1: those clips start well, facing the lens.
- **Model:** the highest-quality Veo model, 16:9, the longest length offered (round 1 gave 10 s, which is good).
- **Download:** at **1080p**.
- **Where:** put the files in `reference-video/new/`.

## What to generate, in order

| Batch | Prompt | Generations | Why |
|---|---|---|---|
| 1 | **A1** level sweep, right first | 4 | most achievable; a pass replaces the 720p source at 1080p |
| 1 | **A2** level sweep, left first | 4 | the same, mirrored, in case Veo favours one side |
| 2 | **C** small spiral | 8 | the only route to real up, down and diagonals from one clip |

Run batch 1 first (8 clips) and have it audited. If any sweep passes, it goes straight into `?hero=sequence` as a 1080p replacement for the horizontal. Then run batch 2. Veo's success rate on precise movement is low, so 4–8 tries per prompt is the minimum worth auditing.

---

## A1: level sweep, right first

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head turns, on his neck, very slowly and smoothly at one constant speed, like a slow mechanical pan. His chin stays at exactly the same height the whole time and his eyes stay at the same height: he never looks up and never looks down, and his head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–3.5 s: he slowly turns his face toward the right edge of the frame, a small turn, about 10 degrees.
3.5–7 s: without pausing he slowly turns back past the lens and on toward the left edge of the frame, the same small amount.
7–10 s: he slowly turns back to look straight into the lens and holds still.

His eyes stay open, relaxed and steady, never blinking, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

## A2: level sweep, left first

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head turns, on his neck, very slowly and smoothly at one constant speed, like a slow mechanical pan. His chin stays at exactly the same height the whole time and his eyes stay at the same height: he never looks up and never looks down, and his head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–3.5 s: he slowly turns his face toward the left edge of the frame, a small turn, about 10 degrees.
3.5–7 s: without pausing he slowly turns back past the lens and on toward the right edge of the frame, the same small amount.
7–10 s: he slowly turns back to look straight into the lens and holds still.

His eyes stay open, relaxed and steady, never blinking, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

## C: small spiral (all directions)

The spiral is asked at half the wanted size, because round 1's circles came back doubled. It covers the middle as well as the edge.

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head moves, on his neck, very slowly and smoothly at one constant speed. His head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–9 s: his face drifts in a slow, small outward spiral around the lens, circling twice. First a tiny circle: toward the right edge of the frame, up, toward the left edge, down, and back. Then a slightly wider circle the same way, still small, about 7 degrees each way at its widest. When his face is lowest his chin only dips a little and his eyes stay open, looking at the lens.
9–10 s: he returns to look straight into the lens and holds still.

His eyes stay open, relaxed and steady the whole time, never blinking, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

---

## What makes a clip usable

These are the thresholds the audit will apply. A clip that misses them is dropped, not repaired.

**Coverage**
- **A1/A2:** level frames (pitch within 4° of rest) reach **±16° on both sides** with no gap over 2°.
- **C:** the same sweep plus about 9° up and 6° down, and at least 80% of the cursor's pose field within 3° of a clean frame.

**Motion:** frames no more than about 1.5° apart (round 1 already met this).

**Face**
- Eyes open (lowered lids are fine looking down).
- Mouth and expression as at rest.

**Body and camera:** body and camera still.

Audit commands are in [NEW-TAKES-AUDIT.md](NEW-TAKES-AUDIT.md). If a clip passes, it goes through `scripts/prepare-sequence.mjs` and `scripts/qa-hero-sequence.mjs`.

## If Veo still cannot do it

After two rounds without a pass, film it: one continuous take on a tripod at 60 fps, 4K, following A1 then C. Keep the same wardrobe, wall and light.

---

# Round 3: the other directions, as rows (1 Oct)

Round 2 gave a clean level sweep (clip 2), and a new measurement makes it combinable. Faces from different round-2 generations, aligned at the same head angle, differ by **2.5–4.5** in fine detail. Clip 2's own neighbouring frames differ by 2.1–3.6, and its crossfaded join, invisible on the page, by 3.9. So new clips can join clip 2 as seamlessly as that join, **provided they match its pose**.

The plan, therefore, is **rows**: the same level sweep that works, with the chin held slightly up or slightly down.
- **Diagonals** become real frames: the up row turned left is up-left.
- **Up and down** come from the rows plus one nod through centre.

## What to generate

| Prompt | Generations | Gives |
|---|---|---|
| **R-up**: sweep with chin raised | 8 | up, up-left, up-right |
| **R-down**: sweep with chin lowered | 8 | down, down-left, down-right |
| **V**: nod through centre | 4 | straight up and down, and the links between rows |

Setup is as before: *Frames to Video*, the same rest image as first and last frame, highest-quality model, 16:9, 10 s, 1080p. Put the files in `reference-video/new/`.

## R-up

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head moves, on his neck, very slowly and smoothly at one constant speed. His head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–2 s: he slowly raises his chin a little, about 5 degrees, as if looking at something just above the camera, and keeps his chin at exactly that height until 9 s.
2–4.5 s: with his chin still raised, he slowly turns his face toward the right edge of the frame, a small turn, about 10 degrees.
4.5–7.5 s: without pausing he slowly turns back past the centre and on toward the left edge of the frame, the same small amount, chin still raised.
7.5–9 s: he slowly turns back to the centre, chin still raised.
9–10 s: he slowly lowers his chin and looks straight into the lens, still.

His eyes stay open, relaxed and steady, never blinking, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

## R-down

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head moves, on his neck, very slowly and smoothly at one constant speed. His head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–2 s: he slowly lowers his chin very slightly, about 3 degrees, as if looking at something just below the camera, and keeps his chin at exactly that height until 9 s. His eyes stay wide open, eyelids up, looking just below the lens.
2–4.5 s: with his chin still lowered, he slowly turns his face toward the right edge of the frame, a small turn, about 10 degrees.
4.5–7.5 s: without pausing he slowly turns back past the centre and on toward the left edge of the frame, the same small amount, chin still lowered.
7.5–9 s: he slowly turns back to the centre, chin still lowered.
9–10 s: he slowly raises his chin and looks straight into the lens, still.

His eyes stay open, relaxed and steady, never blinking and never closing, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

## V

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer stay square to the camera and never move. Only his head moves, on his neck, very slowly and smoothly at one constant speed. His face stays pointed at the centre of the frame: he never turns left or right, and his head never tilts sideways.

0–1 s: he looks straight into the lens, still.
1–3.5 s: he slowly raises his chin, a small nod upward, about 5 degrees, his eyes following up.
3.5–7 s: without pausing he slowly lowers his chin back past the lens and on a little below it, about 3 degrees, eyes wide open, eyelids up.
7–10 s: he slowly raises his chin back and looks straight into the lens, still.

His eyes stay open, relaxed and steady, never blinking and never closing, and move together with his head. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

## Why the numbers are small

Veo roughly doubles what it is asked for:
- round 2 asked for a 10° turn and got about 30°
- round 1 asked for 15° circles and got 25–35°

"About 5° up" and "about 3° down" should land near the ranges the page needs: about 9° up and 6° down. Down is kept smallest because looking down is where Veo closes the eyes.

## What passes

- **Rows:** a level-to-row sweep, with pitch steady within 3° of the row's own height, reaching ±16° on both sides with no gap over 2°.
- **Faces:** eyes open, expression unchanged, body and camera still.
- **Matching:** faces at matched angles within about 4.5 of clip 2 (aligned fine detail), so they join as cleanly as the live join.
- **V:** clean frames from about 9° up to about 5° down through centre.

---

# Round 4: one clip for up and down (30 Sep)

Only one 10 s generation is possible, so it goes to the weakest direction: a clean nod through centre. If it passes it becomes the only source for straight up and down, joined to clip 2 at rest the way clip 2's own two legs are joined.

What round 3 taught:

| Round 3 result | Change here |
|---|---|
| The nod overshot (5° asked, about 36° up delivered) | No degrees; the size is described physically: "the smallest nod" |
| Eyes closed on the way down | Going down, eye contact with the lens is held, which keeps the eyes open |
| The face drifted up to 10° sideways | The face stays pointed straight at the lens |
| The descent was fast | One slow cycle, about 8 s |
| Veo follows the first move best | Down, the hardest direction, comes first |

Setup as before: *Frames to Video*, the same rest image as first and last frame, highest-quality model, 16:9, 10 s, 1080p. Put the file in `reference-video/new/`.

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer never move. His face stays pointed straight at the camera the whole time: he never turns his head left or right and never tilts it sideways. The only movement is the smallest, slowest nod, his chin moving only a little, like someone quietly agreeing, at one constant, very slow speed.

0–1 s: he looks straight into the lens, still.
1–3.5 s: he very slowly lowers his chin just a little. He keeps looking straight into the lens, holding eye contact, so his eyes stay wide open and his eyelids stay up.
3.5–6.5 s: he very slowly raises his chin, back past level and just a little above it, as if glancing at something just above the camera; his eyes lift gently with his face.
6.5–9 s: he very slowly lowers his chin back to level, looking straight into the lens.
9–10 s: he holds still, looking into the lens.

His eyes stay open, relaxed and steady the whole time, never blinking and never closing. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes the audit if:
- it moves no more than 1° sideways
- it reaches at least 8° up and 5° down through centre, with eyes open
- consecutive frames are under 1° apart
- at matched poses it is within 4.5 (aligned fine detail) of clip 2

---

# Round 5: the right side, up and down (30 Sep)

Round 4's nod (N4) passed in part.
- **Down at centre, with eye contact:** real and clean. It is now the page's straight down.
- **Up-left and down-left, by accident:** it drifted about 5° toward the left edge while nodding, and filmed both.

What is still thin is the viewer's **right** looking up or down: up-right 32% covered, down-right 0%. So the last generation copies N4's accident on purpose: a small turn toward the **right** edge, held, then the same slow nod with eye contact.

Setup as before: *Frames to Video*, the same rest image as first and last frame, highest-quality model, 16:9, 10 s, 1080p. Put the file in `reference-video/new/`.

```
Static locked-off shot on a tripod, exactly the framing, lighting and wardrobe of the reference image. The camera never moves, zooms, pans or refocuses.

The man stands completely still. His shoulders, chest, collar and blazer never move. His head never tilts sideways. Every movement is small and very slow, at one constant speed.

0–1 s: he looks straight into the lens, still.
1–2.5 s: he very slowly turns his face a little toward the right edge of the frame, a small turn, and keeps his face turned exactly that much until 8.5 s.
2.5–4.5 s: keeping that small turn, he very slowly lowers his chin just a little, the smallest nod, still looking into the lens, holding eye contact, so his eyes stay wide open and his eyelids stay up.
4.5–7 s: keeping the same small turn, he very slowly raises his chin, back past level and just a little above it, as if glancing at something just above the camera; his eyes lift gently with his face.
7–8.5 s: keeping the turn, he very slowly lowers his chin back to level.
8.5–10 s: he very slowly turns back to look straight into the lens, and holds still.

His eyes stay open, relaxed and steady the whole time, never blinking and never closing. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. Same charcoal blazer, black t-shirt and light stone wall. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes the audit if, while turned 6–14° toward the viewer's right:
- it reaches about 8° up and 5° down with eyes open
- consecutive frames are under 1° apart
- it drifts no more than 2° in yaw during the nod
- it matches clip 2 at rest (aligned fine detail about 3)

Even a partial pass (say up-right only) fills the largest hole left.

## Round 5, revised: pin the direction with frames

The round-5 prompt came back turned to the viewer's **left**. The words "toward the right edge of the frame" are not reliable on their own (they worked for clip 2, not here).

So the direction is now fixed by images:
- **Start and end frame:** `artifacts/flow/start-and-end-frame-right.png`, both of them. It is frame 26 of clip 2, the page's own left/right source: 1920×1080, turned 9.6° toward the viewer's right, level, eyes open.
- **A start and end already turned right cannot drift left.** The prompt only asks for a nod in place.
- **Starting from clip 2's own frame should also bring the face closer to clip 2.**

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting, wardrobe and head direction of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. His face stays turned exactly as in the start frame for the whole clip: he never turns further, never turns back toward the camera, and never tilts his head sideways. The only movement is the smallest, slowest nod, at one constant, very slow speed.

0–1 s: still, exactly as in the start frame.
1–3.5 s: he very slowly lowers his chin just a little. His eyes stay wide open, eyelids up, still looking the same way as in the start frame.
3.5–6.5 s: he very slowly raises his chin, back past level and just a little above it; his eyes lift gently with his face.
6.5–9 s: he very slowly lowers his chin back to exactly the start frame.
9–10 s: still, exactly as in the start frame.

His eyes stay open, relaxed and steady the whole time, never blinking and never closing. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

## Round 5, second try: result, and the last option

**Result of the frame-pinned try** (`Man_slowly_nodding_head_1080p_20260930172830.mp4`):
- It started and ended turned right as pinned, but in between swung to the viewer's **left** (+22°) and nodded there.
- Looking up, the eyes closed (frames 125–150).
- Nothing on the right side, so it is not used. This is the third time Veo has pulled toward that side.

**Last option: pin the path, not only the direction.** Use two different real frames:
- **Start:** `artifacts/flow/start-and-end-frame-right.png`, clip 2 frame 26: 9.6° right, level.
- **End:** `artifacts/flow/end-frame-up-right.png`, R-up-2 frame 51: 13° right, 11.5° up, eyes open.

The only motion between them is raising the chin while staying turned right, which is the missing up-right column. Down-right has no real source frame to pin, so it stays with the tilt.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Same framing, lighting and wardrobe as the start and end frames.

The man stands completely still. His shoulders, chest, collar and blazer never move. His face stays turned toward the right edge of the frame, as in both frames, for the whole clip: he never turns toward the camera or to the other side, and never tilts his head sideways.

The only movement, taking the full 10 seconds at one constant, very slow speed: he raises his chin smoothly from the start frame to the end frame, as if slowly looking up at something above and to his side. His eyes stay open, relaxed and steady, lifting gently with his face, never blinking and never closing. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

---

# Round 6: straight up, eyes wide (30 Sep)

**Review of the 6:32 PM recording.** Up reads as a squint. The frames the page uses for straight up and up-right have eyes at 73–80% of rest openness (R-up-2, and R5's row): the chin was raised with the lids partly lowered. Down (N4, 101–115%) and up-left (mostly 90–104%) are fine.

Earlier prompts only asked for a raised chin. This one asks for the natural look up: **brows lift and the eyes open wider**. The move is straight up and back only, and both ends are pinned to the page's own rest frame, clip 2 frame 16 (`artifacts/flow/start-and-end-frame-rest.png`, 1920×1080), so framing and face match.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting and wardrobe of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. His face stays pointed straight at the camera the whole time: he never turns his head left or right and never tilts it sideways.

0–1 s: he looks straight into the lens, still.
1–4 s: he very slowly looks up at a point just above the top of the camera: his chin rises only a little, his eyebrows lift slightly and his eyes open wider, the whites of his eyes showing below the irises. His eyelids stay fully open, never narrowing or squinting.
4–6 s: he holds that look upward, still, eyes wide open.
6–9 s: he very slowly lowers his gaze and chin back and looks straight into the lens.
9–10 s: he holds still, looking into the lens.

He never blinks and never closes or narrows his eyes. Calm, open expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes if:
- it reaches at least 8° up within about 3° of centre
- eye openness stays at or above about 95% of rest
- it is slow, with no blink in the working range

It would replace R-up-2 and the R5 row for straight up.

# Round 7 (last clip): up-right, eyes wide (30 Sep)

Round 6 fixed straight up; its wording gave eyes wider than rest. The weakest area left is up-right. Its frames have narrowed, sideways-glancing eyes, and the band from −4° to −12° of yaw has no frames above about −5°. This clip covers that band. Use **Frames to Video** with the start and end frames both `artifacts/flow/start-and-end-frame-right.png`. That is clip 2 frame 26: head turned about 10° to the viewer's right, level, eyes open.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting and wardrobe of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. His head stays turned exactly as in the start frame, slightly to the right of frame, the whole time: it never turns further left or right and never tilts sideways.

0–1 s: he holds still, exactly as in the start frame.
1–4 s: keeping his head turned the same amount, he very slowly looks up and to the right, toward a point just above the top right corner of the frame: his chin rises only a little, his eyebrows lift slightly and his eyes open wider, the whites of his eyes showing below the irises. His eyes look in the same direction his face points, never sideways. His eyelids stay fully open, never narrowing or squinting.
4–6 s: he holds that look upward, still, eyes wide open.
6–9 s: he very slowly lowers his gaze and chin back to the start pose.
9–10 s: he holds still, exactly as in the start frame.

He never blinks and never closes or narrows his eyes. Calm, open expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes if:
- it reaches at least 8° up while the yaw stays between −6° and −13°
- eye openness stays at or above about 90% of rest
- it is slow, with no blink in the working range

It would replace R5 and R-up-2 for up-right and close the up-right gap.

## Round 7 B: both lower diagonals in one clip (the lower arc)

Down-left and down-right were never filmed; today the page shows the level turn tilted 3° down there. One clip can cover both. It starts turned right, lowers the chin, sweeps across low to the left, and rises to level there. Use **Frames to Video** with the start frame `artifacts/flow/start-and-end-frame-right.png` (clip 2 frame 26, about 10° right) and the end frame `artifacts/flow/start-and-end-frame-left.png` (clip 2 frame 184, about 10° left). Round 4's lesson for down applies: the eyes stay on one point and the lids stay up while only the chin lowers.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting and wardrobe of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. Only his head moves, slowly and smoothly, at one constant, very slow speed, and it never tilts sideways.

0–1 s: he holds still, exactly as in the start frame, head turned slightly to the right of frame.
1–3 s: keeping his head turned the same amount, he very slowly lowers his chin just a little, looking at a point on the floor slightly to the right, a couple of metres in front of him.
3–7 s: keeping his chin lowered by that same small amount, he very slowly turns his head across, through the centre, until it is turned slightly to the left of frame, his gaze sweeping along the floor a couple of metres in front of him.
7–9 s: keeping his head turned to the left, he very slowly raises his chin back to level, ending exactly as in the end frame.
9–10 s: he holds still, exactly as in the end frame.

His eyes look where his face points. His upper eyelids stay raised and his irises stay fully visible the whole time; his eyes never narrow, droop or close, and he never blinks. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes if:
- it reaches at least 5° down at yaws beyond ±6°
- eye openness stays at or above about 85% of rest (looking down narrows the eyes a little; what matters is no droop)
- no frame-to-frame step is over 1°, and there is no blink in the working range

Even half of it helps. If only the right half (1–5 s) is clean, that covers down-right.

## Round 7 C and D: the lower diagonals, one each (fallback)

Use these only if Round 7 B turns too fast or closes the eyes. Both ends are pinned to one frame: `start-and-end-frame-right.png` for C (down-right), `start-and-end-frame-left.png` for D (down-left). Change only the word in brackets.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting and wardrobe of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. His head stays turned exactly as in the start frame, slightly to the [right / left] of frame, the whole time: it never turns further left or right and never tilts sideways.

0–1 s: he holds still, exactly as in the start frame.
1–4 s: keeping his head turned the same amount, he very slowly lowers his chin just a little, like the smallest nod, looking at a point on the floor slightly to the [right / left], a couple of metres in front of him. His eyes look where his face points.
4–6 s: he holds that pose, still.
6–9 s: he very slowly raises his chin back to the start pose.
9–10 s: he holds still, exactly as in the start frame.

His upper eyelids stay raised and his irises stay fully visible the whole time; his eyes never narrow, droop or close, and he never blinks. Calm neutral expression, lips gently closed, the expression never changes. Soft even daylight from the left stays constant. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes if:
- it reaches 5–10° down while the yaw stays between ±6° and ±13° (on the requested side)
- eye openness stays at or above about 85% of rest
- it is slow, with no blink in the working range

## Which to generate, in order

1. **Round 7 (up-right).** It is the most visible flaw, and the corner people point at on the way to the nav.
2. **Round 7 B (lower arc).** One clip covers both lower diagonals.
3. **Round 7 C or D.** Only to patch whichever side B misses.

Setup for all: *Frames to Video*, highest-quality model, 16:9, 10 s, 1080p. Put the file in `reference-video/new/`.

## Round 7, second try: up-right, filmed mirrored

**Result of the first try:** he looked up, but not to the right. This is the fourth time Veo has pulled the head back toward the camera or the viewer's left while it moved. Pinning the ends holds only the ends.

So this try works with the pull instead of against it:
- Both ends are pinned to `artifacts/flow/mirrored-start-and-end-frame.png`, clip 2 frame 26 flipped left to right. In it he is turned toward the viewer's **left**.
- The prompt asks for up and to that side, the direction Veo moves easily (R-up-1, the clean up-left row).
- The clip is flipped back before it is audited, which restores his own face (mole, hair parting) and turns the move into up-right.
- The prompt names the direction three ways at once: the picture's left edge, his own right shoulder, and a fixed spot on the wall. The light is described "as in the start frame", because the flip puts it on the right.

```
Static locked-off shot on a tripod. The camera never moves, zooms, pans or refocuses. Keep exactly the framing, lighting and wardrobe of the start frame.

The man stands completely still. His shoulders, chest, collar and blazer never move. His face is turned toward the left edge of the picture, toward his own right shoulder, exactly as in the start frame, and it stays turned at least that much the whole time: it never turns back toward the camera and never tilts sideways.

0–1 s: he holds still, exactly as in the start frame.
1–4 s: keeping his face turned toward the left edge of the picture, he very slowly raises his chin a little and looks up at the top of the tall pillar at the upper left of the picture. His eyebrows lift slightly and his eyes open wider, the whites showing below the irises; his eyes look where his face points. His eyelids stay fully open, never narrowing or squinting.
4–6 s: he holds that look up toward the upper left, still, eyes wide open.
6–9 s: he very slowly lowers his chin back to the start pose, face still turned toward the left edge of the picture.
9–10 s: he holds still, exactly as in the start frame.

He never blinks and never closes or narrows his eyes. Calm, open expression, lips gently closed, the expression never changes. The lighting stays exactly as in the start frame. One continuous shot, no cuts, no hand movement, no speaking.
```

It passes (after the flip back) if:
- it reaches at least 8° up while the yaw stays between −6° and −13°
- eye openness stays at or above about 90% of rest
- at matched poses it is within about 4.5 of clip 2 (aligned fine detail)
