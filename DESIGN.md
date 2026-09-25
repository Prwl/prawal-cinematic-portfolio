---
name: Prawal Sharma, cinematic portfolio
description: A black-box stage where a career is brought into light cue by cue.
colors:
  stage: "#0b0b0c"
  stage-raised: "#111113"
  riser: "#18181b"
  riser-edge: "#232327"
  bone: "#ece9e2"
  bone-2: "#b3afa6"
  bone-3: "#8a867e"
  ghost: "#3a3935"
  tungsten: "#f3b879"
  backlight: "#9fb0bd"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.625rem, 0.4rem + 6vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 125"
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
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 112"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(1.25rem, 0.6rem + 3vw, 3.5rem)"
  section: "clamp(6rem, 4rem + 9vw, 11rem)"
  rail: "196px"
components:
  button-primary:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.stage}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.tungsten}"
    textColor: "{colors.stage}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-ghost-hover:
    textColor: "{colors.tungsten}"
---

# Design System: Prawal Sharma, cinematic portfolio

## Overview

**Creative North Star: "The Lighting Plot"**

The page is a black-box stage. Nothing exists until it is lit, and light is the only accent. A single warm tungsten key marks whatever is lit now; a cool, desaturated backlight lives only in atmosphere (the system topology projected behind him, the backlight on the wall). Everything else is stage black, graphite risers and bone-white type.

Motion is light level and focus, not travel: content comes up like a dimmer with a short focus pull, figures ignite rather than count, the current cue is lit while earlier cues stay up at a lower level. The real photograph of Prawal is the only figurative image; he is cut from his original background, graded for a key light from the typography side, and falls away into darkness below the waist so he stands in a pool of light rather than in a frame.

**Key Characteristics:**
- Stage-black ground, one warm accent, one cool atmospheric light.
- Archivo across its width axis: expanded caps for titles, standard width for reading.
- Sharp corners everywhere; hairlines only where they measure or separate.
- Abstractions drawn as geometry (canvas and SVG), always captioned as abstractions.

## Colors

A neutral near-black stage with bone ink, lit by one tungsten key.

### Primary
- **Tungsten Key** (#f3b879): what is lit now. The current cue in the rail, the current riser tread, the current figure in Scale, the selected capability, a held transaction, button hover. Never decoration, never a static label.

### Neutral
- **Stage Black** (#0b0b0c): the ground of every surface.
- **Raised Stage** (#111113): diagram plates and the patch-sheet panel.
- **Riser Graphite** (#18181b) with **Riser Edge** (#232327): stage risers in Evolution.
- **Bone** (#ece9e2): primary text and the primary button fill (16.2:1 on stage).
- **Bone Two** (#b3afa6): secondary text, standfirsts (9.0:1).
- **Bone Three** (#8a867e): labels and metadata; the dimmest level allowed for text (5.4:1).
- **Ghost** (#3a3935): disabled controls and scrollbars only, never text.
- **Backlight** (#9fb0bd): cool atmospheric light for the topology, rim light and wall glow. Never used in UI.

### Named Rules
**The Lit-Now Rule.** Tungsten marks the one thing that is lit at this moment. If an element would be tungsten whatever the visitor does, it is the wrong colour.

**The Atmosphere Rule.** The cool backlight belongs to the set, never to interface controls or text.

## Typography

**Display Font:** Archivo variable, width axis 62 to 125 (self-hosted woff2, `font-display: swap`)
**Body Font:** Archivo variable at standard width
**Label Font:** Archivo at 112% width, uppercase, tracked 0.1em

**Character:** One grotesque family stretched into two voices: a wide, film-title voice for the name and figures, and a plain reading voice for everything else.

### Hierarchy
- **Display** (600, `clamp(2.625rem, 0.4rem + 6vw, 6rem)`, 0.95, wdth 125, uppercase): the name in the opening and the Scale figures.
- **Headline** (500, `clamp(2.125rem, 1.3rem + 3.2vw, 3.75rem)`, 1.06): one statement per chapter.
- **Title** (500, `clamp(1.75rem, 1.2rem + 2vw, 2.75rem)`, 1.06): case studies, sub-sections, notes.
- **Body** (400, 1.0625rem, 1.6): prose at 62ch.
- **Label** (600, 0.8125rem, 0.1em, uppercase): metadata beside or below content, and group headings. Metadata has to hold its own at desk distance, not merely pass contrast; supporting metadata that sits beside reading text uses 0.875 to 1rem in Bone Two.

### Named Rules
**The No-Kicker Rule.** Labels sit beside or below what they describe, or are the heading itself. Never a small label above a heading.

## Layout

Single continuous page of chapters (Identity, Evolution, Systems, Scale, Intelligence, Recognition, Contact) after a full-viewport opening. Content is capped at 1320px with a fluid gutter; at 1200px and above a 196px cue rail reserves the left edge. Chapters meet at a horizon of light rather than a divider (see Signature: The horizon). Composition switches on orientation as well as width: landscape screens place Prawal right of centre with type left; portrait screens put him at the top of the frame with type in the darkness below him. Evolution pins only on landscape screens of 1024px and wider with at least 620px of height; everywhere else it is a stepped list.

## Elevation & Depth

Flat surfaces with depth from light, not shadow. Depth comes from the layered opening (wall, topology, floor, figure, haze, vignette), from gradients of light (follow spot, pinspot, backlight), and from a single directional rim light on the photograph (`drop-shadow(3px -2px 2px rgb(159 176 189 / 0.16))`). No box shadows are used for elevation; panels are marked by an inset 1px line.

**The Light-Not-Shadow Rule.** If something needs to come forward, light it. Do not lift it with a shadow.

## Shapes

All corners are square (0px). Controls are rectangles; lines are 1px; selected states use a 1px tungsten edge or a 2px tungsten tread on a horizontal surface.

## Components

### Buttons
- **Shape:** square corners (0px), 48px tall, uppercase label at 112% width.
- **Primary:** bone fill, stage-black label. Hover: tungsten fill. Press: `scale(0.97)` over 140ms.
- **Ghost:** transparent with an inset 1px bone line at 20%; hover turns label and line tungsten.

### Navigation
- **Header:** name at wide width left; Work, Résumé, Contact right on desktop; a Menu button under 1200px opening a full-screen cue list (page behind is inert, Escape closes).
- **Cue rail:** chapters as numbered cues on a 1px track; the current cue is bone with a tungsten numeral and a tungsten edge; the rail waits in the dark during the opening. While the visitor reads, it steps back to a column of numerals with only the current cue named, and wakes on a chapter change, pointer approach or keyboard focus (focus reveals it instantly).

### Signature: The horizon
One line of light carries the whole piece. It is the first thing drawn in the opening; on leaving the opening it holds its place on screen while the set recedes and becomes chapter I's horizon. Every scene begins on it: as a scene rises into view the line draws out from that scene's focal point, a cool wash comes up on the floor below it, and a short tungsten key travels along the line from where the last scene was lit to where this one is lit (scroll-driven CSS, `--from` and `--focus` per chapter). The archive inside Recognition begins on one too. The close redraws it behind the portrait once, then the set comes to rest: signals stop, nodes stop breathing, the canvas stops drawing. Under reduced motion, and where scroll-driven animation is unsupported, it rests as a lit line.

### Signature: System stories
Each case-study diagram is dormant until it is on stage, then tells its story once: input, one path lit in tungsten through the stages, then the outcome. The stage being lit is lit in the text beside the diagram at the same moment (its hairline and name warm), and the outcome figures ignite when the path completes. Afterwards the example path stays lit while everyday traffic runs quietly.

### Signature: The framework scene
The AI Engineering Leadership Framework is drawn as the scene: the diagram holds the stage while each concept is read past it. The concept with the light warms its node, the loop draws on to it from the previous pillar, and a line ties it to the fixed centre; its explanation comes up only then. The centre is lit before the first pillar and again when the loop closes.

### Signature: Lamps
Any block marked `data-lamp` starts dark and comes up once as it enters the stage (opacity and a 6px focus pull, 1100ms, strong ease-out, 70ms cue stagger). Visible by default without JavaScript or with reduced motion.

### Signature: Risers
Six stage risers, each a role. Heights rise by step; the current tread carries a 2px tungsten edge and a follow spot; earlier risers stay up in bone-3.

### Signature: Patch sheet
Capabilities are channels; the work they were used in are fixtures. Selecting a channel lights its fixtures with a 1px tungsten edge and announces them in a live region.

## Do's and Don'ts

### Do:
- **Do** keep tungsten (#f3b879) for the one thing lit now.
- **Do** use the real photograph for Prawal; grade it, never replace it with a generated likeness.
- **Do** caption every diagram as an abstraction and keep its claims to the published description.
- **Do** give reduced motion a composed state: every cue lit, no sequence, no pin.
- **Do** end the opening only on an intentional request: Skip intro, the skip link, Escape, a real wheel or trackpad scroll, or a vertical swipe. Never on Tab, modifiers, shortcuts or typing.
- **Do** use strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`) for entrances; never ease-in.

### Don't:
- **Don't** put a label above a heading.
- **Don't** use the cool backlight (#9fb0bd) for text or controls.
- **Don't** round corners or add elevation shadows.
- **Don't** count numbers up; figures ignite.
- **Don't** use em or en dashes in copy.
