# Prawal Sharma, cinematic portfolio

A single-page personal brand experience staged as a black-box theatre: the career is brought into light cue by cue. Built from scratch; the older `prawal-personal-brand` project was used only as a read-only source of facts and original photographs.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve dist/
npm run lint       # ESLint (flat config)
npm test           # Vitest content-integrity tests
npm run assets     # regenerate images and documents from assets-src/
npm run qa:shots   # Playwright captures (see scripts/qa-screenshots.mjs for modes)
```

QA scripts expect a running server and a local Google Chrome:

- `node scripts/qa-screenshots.mjs intro|settled|full|reduced|sections|evidence [url] [outDir]`
- `node scripts/qa-layout.mjs [url]`: overflow, escaping elements, touch targets, alt text at 8 viewports
- `node scripts/qa-functional.mjs [url]`: console and network, anchors, downloads, keyboard focus, mobile menu
- `node scripts/qa-intro.mjs [url]`: the opening ignores ordinary keys, modifiers, shortcuts, pinches and small wheel drift, and ends on Skip intro, the skip link, Escape, a real scroll or a vertical swipe

## Structure

```
src/
  data/          all facts (profile, experience, systems, capabilities, scale, intelligence, recognition, contact, chapters)
  scenes/        one component per chapter: Prologue, Identity, Evolution, Systems, Scale, Intelligence, Recognition, Epilogue
  components/    SiteHeader, CueRail, Portrait
  experience/    CanvasStage host, topology gobo, diagrams (pipeline, transactions, taxonomy)
  motion/        GSAP registration and the title sequence
  hooks/         reduced motion, media queries, lamps, active chapter, cue focus
  lib/           media URL resolution, contact assembly
  styles/        tokens, base, one stylesheet per scene
  assets/media/  generated images (do not edit by hand)
public/          fonts (Archivo variable, OFL), documents (résumé, framework PDFs), favicon, og-image
assets-src/      originals copied from the source portfolio, plus the Vision cutout
scripts/         asset pipeline, cutout, QA
```

## Asset pipeline

1. `swift scripts/cutout.swift assets-src/portrait-source.jpg assets-src/portrait-cutout.png` isolates Prawal with Apple Vision (run once; macOS 14+).
2. `npm run assets` grades the cutout for the stage (edge erosion and defringe, key-light falloff, fade below the waist), writes AVIF and WebP at several widths, resizes the award photographs, and copies the PDFs.
3. `node scripts/og-image.mjs` renders the share image from the live opening.

Rasters carry an embedded origin note (Impeccable provenance). Re-running the pipeline rewrites the files, so re-embed afterwards with `impeccable embed-prompt <file> --prompt "Origin: ..."`.

## Decisions worth knowing

- **Stack:** React 19 + Vite, GSAP ScrollTrigger for the one pinned sequence and the scroll-away, Canvas 2D for the topology and diagrams. No WebGL, no smooth-scroll library.
- **Portrait:** a real photograph only. No AI video or generated likeness; cinematic movement comes from the environment (light, topology, camera dolly, haze).
- **Sound:** none. The piece does not need it, and optional audio would add weight without adding meaning.
- **Reduced motion:** no title sequence, no pin, every cue lit, still diagrams.
- **Content:** every figure is traceable to the source portfolio or résumé; `tests/content.test.js` guards the scale figures and copy rules.

Design system: see `DESIGN.md`. Product context: `PRODUCT.md`.
