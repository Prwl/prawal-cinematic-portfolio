---
name: Prawal Sharma, cinematic portfolio
description: A career walked through one stone building over one day, developed in daylight.
colors:
  stone: "#d4d1ca"
  stone-light: "#e4e1da"
  stone-shade: "#bfbbb3"
  sand: "#dcd5c9"
  sand-light: "#e9e3d8"
  sand-shade: "#c8c0b2"
  mineral: "#c8d1d6"
  mineral-light: "#dbe2e5"
  mineral-shade: "#b3bdc3"
  pale: "#dfe4e0"
  pale-light: "#eef1ee"
  pale-shade: "#c9d0cb"
  gallery: "#ded8d1"
  gallery-light: "#ece8e2"
  gallery-shade: "#c9c2b9"
  dusk: "#c4cbc5"
  dusk-light: "#d6dbd6"
  dusk-shade: "#adb5ae"
  graphite: "#1f2224"
  graphite-raised: "#2a2d30"
  ink: "#1b1e22"
  ink-2: "#44484c"
  ink-3: "#515458"
  ember: "#b8602e"
  ember-ink: "#873f17"
  pale-ink: "#eae7e2"
  pale-ink-2: "#bab7b0"
  pale-ink-3: "#95928b"
  tungsten: "#eeb97b"
  exposure: "#f4f3f0"
  step-tread: "#e6e2da"
  step-face: "#d9d4ca"
  step-foot: "#cbc5ba"
  pilaster-lit: "#e3e0d9"
  pilaster-face: "#dcd9d2"
  pilaster-return: "#c7c3bb"
  pilaster-edge: "#bdb9b1"
  journey-face-light: "#e9e4da"
  journey-face-shade: "#c4bdae"
  journey-tread-light: "#f0ece4"
  journey-tread-shade: "#dbd4c7"
  journey-return: "#b8b2a6"
  framework-light: "#edf1e9"
  framework-shade: "#c6d0c7"
  framework-connection: "#8b9c8e"
  system-structure: "#89979e"
  system-source: "#9caab1"
  system-route: "#aab6ba"
  system-edge: "#7b8a91"
  system-output: "#687d87"
  taxonomy-edge: "#9aa9ae"
  taxonomy-cell: "#c0cdd1"
  taxonomy-border: "#94a5ad"
  taxonomy-developed: "#e4ebeb"
  taxonomy-edited: "#d0b29a"
  taxonomy-dormant-output: "#b5c2c8"
  archive-face-light: "#e9e4dd"
  archive-face-shade: "#c9c2b8"
  archive-tread: "#eeebe4"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.625rem, 0.4rem + 6vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 125"
  close:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1rem + 5vw, 5.5rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 1.3rem + 3.2vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.022em"
  lede:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.9vw, 1.75rem)"
    fontWeight: 350
    lineHeight: 1.45
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 112"
  micro:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  scene-heading:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 2.8vw, 2.6rem)"
  journey-role:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 3.6rem)"
  system-narrative:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.6vw, 2rem)"
  framework-caption:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.5rem)"
  gallery-caption:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 2.5vw, 2.5rem)"
  archive-subject:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
  voice:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 3.7vw, 3.5rem)"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(1.25rem, 0.6rem + 3vw, 3.5rem)"
  section: "clamp(6rem, 4rem + 9vw, 11rem)"
  rail: "196px"
  threshold: "min(46vh, 26rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stone-light}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ember-ink}"
    textColor: "{colors.stone-light}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-ghost-hover:
    textColor: "{colors.ember-ink}"
---

# Design System: Prawal Sharma, cinematic portfolio

## Overview

**Creative North Star: "Developed in Daylight"**

A career walked through one stone building over one day. Each chapter is a lighting condition in that building (a stone hall, sand-lit rooms, a fog-lit gallery of systems, one graphite colonnade, the brightest room, a warm gallery, dusk). Nothing lamps up out of darkness: content develops, like an architect's diazo print under light, from a pale latent image into graphite ink as the light reaches it. One ember key marks the thing developed now.

The opening is a living portrait. Prawal stands in the stone hall and, on a desktop with a mouse, turns his head toward the visitor's pointer. The close returns to him at dusk in the real photograph. There is one sun, high at upper left: every plane is lit on its left face and every shadow falls right and down by the same ratio.

**Key Characteristics:**
- Mineral grounds lit as environments, never cream paper and never plain white. One graphite passage for the numbers.
- Cool graphite ink taken from the charcoal blazer; one ember accent for what is developed now.
- Archivo across its width axis: expanded caps for the name and figures, standard width for reading.
- Sharp corners, hairlines only where they measure, measured shadows from one sun, no glow.
- Abstractions drawn as geometry (canvas and SVG), always captioned as abstractions.

## Colors

Six light conditions and one dark passage, one ink family, one key.

### Lighting conditions (ground / light / shade)
- **Stone** (#d4d1ca / #e4e1da / #bfbbb3): the hall of the opening. Matched to the graded wall in the living portrait so the plate dissolves into it.
- **Sand** (#dcd5c9 / #e9e3d8 / #c8c0b2): late-morning light for Identity and Evolution.
- **Mineral** (#c8d1d6 / #dbe2e5 / #b3bdc3): fog-blue light for Systems and around the Scale passage.
- **Pale** (#dfe4e0 / #eef1ee / #c9d0cb): the brightest room, sage-tinted, for Intelligence.
- **Gallery** (#ded8d1 / #ece8e2 / #c9c2b9): warm gallery stone for Recognition.
- **Dusk** (#c4cbc5 / #d6dbd6 / #adb5ae): soft mineral evening for the close.
- **Graphite** (#1f2224): the one darker passage (Scale), built into the scene with long feathered thresholds.

### Ink
- **Ink** (#1b1e22): primary text and the primary button fill (10.1 to 13.0:1 across the light grounds).
- **Ink Two** (#44484c): secondary text and standfirsts (5.6 to 7.2:1).
- **Ink Three** (#515458): labels and metadata; the dimmest level allowed for text (4.6 to 5.9:1).
- **Pale inks** (#eae7e2, #bab7b0, #95928b): the same three roles inside the graphite passage (13.0, 8.0, 5.2:1).

### Primary
- **Ember** (#b8602e): the tungsten key re-expressed for daylight. Marks only: the traced path in a diagram, the current tread, the current node, the travelling key on the horizon.
- **Ember Ink** (#873f17): the text weight of the same key (AA on every light ground): the current cue, the current figure's label, "Intelligence." in the arc.
- **Tungsten** (#eeb97b): the key inside the graphite passage, where it can be light again.

### Named Rules
**The Developed-Now Rule.** Ember marks the one thing developed at this moment. If an element would be ember whatever the visitor does, it is the wrong colour.

**The Condition Rule.** Chapters change light, not paint. A chapter's ground comes from the fixed atmosphere as a lighting cue (a registered-colour crossfade over 1.4s), never as a hard band of section colour. The only built-in ground is the graphite passage, and text never sits on its thresholds.

**The One Sun Rule.** Light comes from upper left. Planes are lit on their left face; shadows fall right and down with one offset ratio (about 0.6 across to 1 down). A shadow in any other direction is wrong.

## Typography

**Display Font:** Archivo variable, width axis 62 to 125 (self-hosted woff2, `font-display: swap`)
**Body Font:** Archivo variable at standard width
**Label Font:** Archivo at 112% width, uppercase, tracked 0.1em

**Character:** One grotesque family stretched into two voices: a wide, film-title voice for the name and figures, and a plain reading voice for everything else. Typography carries the drama the dark stage used to supply: scale, rhythm and whitespace, not decoration.

### Hierarchy
- **Display** (600, `clamp(2.625rem, 0.4rem + 6vw, 6rem)`, 0.95, wdth 125, uppercase): the name in the opening and the Scale figures.
- **Close** (500, `clamp(2.5rem, 1rem + 5vw, 5.5rem)`, 1, -0.03em): "Tell me what you're building." only.
- **Headline** (500, `clamp(2.125rem, 1.3rem + 3.2vw, 3.75rem)`, 1.06): one statement per chapter.
- **Title** (500, `clamp(1.75rem, 1.2rem + 2vw, 2.75rem)`, 1.06): case studies, sub-sections, notes.
- **Lede** (350, `clamp(1.375rem, 1.1rem + 0.9vw, 1.75rem)`, 1.45): standfirsts under headlines.
- **Body** (400, 1.0625rem, 1.6): prose at 62ch; supporting prose at 1rem.
- **Label** (600, 0.8125rem, 0.1em, uppercase): metadata beside or below content, and group headings.

### Named Rules
**The No-Kicker Rule.** Labels sit beside or below what they describe, or are the heading itself. Never a small label above a heading.

## Layout

Single continuous page of chapters (Identity, Evolution, Systems, Scale, Intelligence, Recognition, Contact) after a full-viewport opening. Content is capped at 1320px with a fluid gutter; at 1200px and above a 196px cue rail reserves the left edge. Chapters meet at a horizon line rather than a divider (see Signature: The horizon). Composition switches on orientation: landscape screens place the living portrait right of centre with type left; portrait screens put him at the top of the frame with the title on the floor of the hall, below where the plate has dissolved. The primary layer stages one visual event and concise narrative per beat; a shared detail dialog carries complete professional evidence. Native CSS sticky holds scenes while existing ScrollTrigger reports discrete beats through `useStory`; there is no scroll interception. Manual selectors remain available in every scene. Phones have intentionally recomposed geometry and captions; short landscape viewports use normal flow. Reduced motion removes sticky runs and transitions, presents a resolved state, and retains manual inspection of every beat.

## Elevation & Depth

Depth comes from light and one sun. The atmosphere carries daylight from a high window at upper left and a floor falling into shade. Architecture is built as lit planes (pilasters with a lit left face and a darker return, a recess in shade, a floor with a sheared sunpatch). Shadows exist only where a physical object would cast one, always right and down: the stone steps in Evolution (`18px 28px 34px -18px rgb(27 30 34 / .25)`), the award prints on the gallery wall (`18px 26px 32px -16px rgb(27 30 34 / .35)`), the real photograph at dusk (`drop-shadow(18px 8px 22px rgb(27 30 34 / 0.16))`). Controls are never lifted by shadow; they are marked by an inset 1px line.

**The Measured-Shadow Rule.** A shadow is cast by something, in the sun's direction. No glow, no halo, no zero-offset shadow.

## Shapes

All corners are square (0px). Controls are rectangles; lines are 1px; selected states use a 1px ember edge or a 2px ember tread on a horizontal surface.

## Components

### Buttons
- **Shape:** square corners (0px), 48px tall, uppercase label at 112% width.
- **Primary:** ink fill, stone-light label. Hover: ember-ink fill. Press: `scale(0.97)` over 140ms.
- **Ghost:** transparent with an inset 1px ink line at 26%; hover turns label and line ember-ink.

### Navigation
- **Header:** name at wide width left; Work, Résumé, Contact right on desktop; a Menu button under 1200px opening a full-screen cue list on stone (page behind is inert, Escape closes). The header's gradient follows the room's lighting condition; over the solid graphite passage it takes graphite and pale ink.
- **Cue rail:** chapters as numbered cues on a 1px track; the current cue is ink with an ember-ink numeral and an ember edge. It waits unseen during the opening, steps back to numerals while the visitor reads, and wakes on a chapter change, pointer approach or keyboard focus.

### Signature: The living portrait
The opening preserves its approved composition and portrait assets. The source asset is a 627-pose grid; runtime samples only the neutral-pitch row. Horizontal pointer travel controls yaw through a critically damped follow (omega 8); vertical travel contributes a small body/camera response, never head pitch. Four hidden video copies blend into a canvas, with an optional WebGL stage. Breathing is removed: the animation loop sleeps once pose and gain settle, waking on relevant input or decode changes. Tracking starts after the title sequence and fades on scroll-away, tab hide or pointer exit. Touch, phones, upright tablets and reduced motion keep the identical neutral still and never fetch the clip. Asset-production history remains in README.

### Signature: The horizon
One line carries the whole piece. It is the first thing drawn in the opening; on leaving the opening it holds its place while the hall gives way and becomes chapter I's horizon. Every scene begins on it: as a scene rises into view the line draws out from that scene's focal point, daylight comes up on the floor below it, and a short ember key travels along the line from where the last scene was lit to where this one is lit (scroll-driven CSS). Inside the graphite passage it waits at the threshold in pale ink. The close redraws it behind the real photograph once, then the room comes to rest.

### Signature: Development
Any block marked `data-lamp` starts latent and develops once as it enters the view (opacity and a 6px focus pull, 1100ms, strong ease-out, 70ms cue stagger). Visible by default without JavaScript or with reduced motion. States elsewhere follow the same vocabulary: latent (not yet reached), developed (read), developed now (ember).

### Signature: System stories
Three distinct SVG stories occupy the scene: data ingestion and distribution, transaction processing with held transactions, and taxonomy dependencies with edited cells and resolved output. Their stages move from dormant structure through arrival, activation, response and output to impact. Each is explicitly captioned as an abstraction. Phone diagrams recompose their routes and labels. Dormant geometry may recede; explanatory labels remain readable. Taxonomy's dormant output uses a light mineral surface with ink text, switching to ink with pale text when developed.

### Signature: The framework scene
Four architectural pillars assemble around engineering judgment. Connections appear as each principle joins; the complete model resolves at the final beat. Only the active principle's explanation appears in the cinematic layer. The full framework and practice remain in the detail layer, alongside the PDF.

### Signature: Stone steps
Six career stages recede spatially around the current foreground step. Each has a lit tread, shaded face and darker return. The active caption presents role, employer, dates below them, and one defining idea. Complete responsibilities remain in the detail layer.

### Signature: The gallery, voices and archive
Real award photographs move through a directional-light exhibition: one selected print is legible, surrounding prints recede. Controls select each piece without autoplay. One recommendation at a time becomes the dominant typographic composition. Certifications, appearances and publication highlights sit on architectural shelves; exhaustive records remain in the shared detail layer.

### Detail dialog and story controls
A native modal dialog enters the browser top layer with contained keyboard focus, a sticky heading and close control, and an independently scrolling reading surface. Opening locks body scroll; Escape or close restores focus to the initiating control without scrolling the page. Detail links and manual beat selectors are visible, keyboard operable controls, never hover-only access.

**The Material-Shade Rule.** Scene-specific stone, sage and mineral colors in the token layer describe lit faces, returns, inactive routes and developed cells within the established rooms. They are intentional material shades, not new chapter palettes. Directional light washes remain translucent; they are not text colors.

**The Scene-Type Rule.** Scene headings, role captions, system narrative, framework and gallery captions, archive subjects and voices use the named type endpoints above. Their scales follow visual responsibility; they do not introduce another font or a competing global hierarchy.

## Do's and Don'ts

### Do:
- **Do** keep ember (#b8602e) and ember-ink (#873f17) for the one thing developed now.
- **Do** keep the real photograph of Prawal in the film (the close), and judge any generated likeness against it; identity fidelity outranks spectacle.
- **Do** caption every diagram as an abstraction and keep its claims to the published description.
- **Do** give reduced motion a composed state: resolved scenes with manual selectors, no animated sequence or sticky run, and the neutral portrait as a still.
- **Do** end the opening only on an intentional request: Skip intro, the skip link, Escape, a real wheel or trackpad scroll, or a vertical swipe.
- **Do** use strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`) for entrances; never ease-in.

### Don't:
- **Don't** put a label above a heading.
- **Don't** paint a chapter as a flat band of colour; change the light.
- **Don't** use cream paper or pure white as a ground, or glow, glass or neon anywhere.
- **Don't** cast a shadow in any direction but right and down.
- **Don't** crossfade two different generated takes of Prawal; one source drives his face.
- **Don't** count numbers up; figures switch on.
- **Don't** use em or en dashes in copy.
