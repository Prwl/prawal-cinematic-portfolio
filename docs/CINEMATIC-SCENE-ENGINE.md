# Cinematic scene engine — implementation and validation

## 1. Interaction root cause

The old `useStory` converted ScrollTrigger progress into array slots. Wheel velocity selected the next state before CSS camera movement and caption confirmation finished. Long 215–300svh runs made the reader operate each scene's timeline. The production baseline was built and captured before implementation; audit images and measurements are in `artifacts/scene-engine/baseline-*`.

## 2. Architecture

`scenePlayback.js` contains a deterministic lifecycle and authored scores. `sceneNavigation.js` coordinates scene entry, a single temporary gate, native navigation and cleanup. `useStory.js` connects them to the existing React compositions and GSAP. Lifecycle: unseen → entering → playing → resolved → released; disposed terminates callbacks. GSAP calls discrete composition changes at authored times. React does not render every animation frame. CSS and SVG execute the visual movement.

## 3. Gating and release

On a desktop with a fine pointer and at least a 700px-high viewport, arriving at an unseen primary scene aligns its full frame and temporarily holds root scrolling. Only the active gate installs a non-passive wheel listener. Residual scroll is clamped to the scene's start. Natural completion removes the gate immediately. A single large input does not skip: at least three forward inputs, 240 capped pixels of intent and 320ms since entry are required. Sustained intent resolves directly rather than speeding an unreadable sequence. Reverse input, Escape, keyboard navigation, anchor selection, opening details/menu and resizing release immediately. Pinch and horizontal gestures pass through.

Completed scenes retain their composition on reverse entry; no backwards playback. Explicit selection cancels the clock and shows the chosen frame. Initial URL fragments are restored after the React targets mount. No momentum replacement, fake scrollbar, permanent wheel interception, dependency or changed scroll speed was added.

## 4. Automatic motion model

Eight primary migrated scenes average **3.60 seconds**, range **3.2–3.9 seconds**, including their final hold. Earliest repeated-wheel skip: **320ms**; keyboard, reverse and touch do not have a minimum hold. The preserved Hero title sequence remains approximately **7.8s**, with its existing skip affordance and immediate keyboard resolution. Archive and voice entrances are **1.2s**; the existing quiet Contact settlement is **1.6s**.

Ambient life remains in Identity (daylight), Data Refinery (slow throughput), Enrollment (three sparse packets over 12s), Taxonomy (one restrained dependency-light cycle), and Intelligence (daylight). Intersection and document visibility pause ambient activity; reduced motion disables it. Recognition, recommendations and Contact remain quiet after their arrivals. Hero retains pointer response rather than an idle loop.

## 5. Chapter changes

| Chapter | Directed behavior |
| --- | --- |
| Hero | Composition, portrait, background, title choreography and pointer response preserved. Keyboard navigation now resolves the intro immediately. |
| Identity | Clarity → Structure → Trust → Judgment, then all four stone principles share the final frame. |
| Evolution | Brief Foundations opening; supporting years pass quickly; leadership arrival and Technology Manager carry the longest beats. Manual years and full career remain accessible. |
| Data Refinery | Live sources → convergence/recipes → clean destinations → complete system; subdued throughput continues. |
| Enrollment | Enrollment → verification/screening → a deliberate held-for-review journey → settlement → full rails. Held journey occurs only at the screening beat. |
| Taxonomy | Edited field → dependency wave → identifier assembly → resolved sheet. |
| Scale | Payments leads; Sources and Onboarding connect quickly; AI delivery holds the final frame. All six figures remain selectable. Graphite art direction retained. |
| Intelligence | Principles progressively lock around judgment, then the ring and full framework resolve. |
| Recognition | Three selected award photographs establish the gallery; all ten awards remain manually explorable and archived. |
| Evidence | Certificate fan settles; Credentials, Events and Publication remain accessible on the archive table. One featured recommendation settles above the complete recommender strip. |
| Contact | Existing automatic real-photo bookend and quiet final CTA retained. |

**No primary chapter story depends on scroll scrubbing.** Hero's existing decorative departure/horizon handoff still uses ScrollTrigger scrubbing; its title story is timed. Contact retains its appropriate lightweight intersection entrance rather than gaining an unnecessary gate.

## 6. Evidence rooms

Widened desktop dialogs to a maximum 1080px, with a 240ms entrance and no keyboard-open animation. Systems lead with the actual conceptual diagram, published outcome figures and context, followed by the complete original narrative and technologies. Career opens with responsibility progression. Leadership opens with the four principles. Framework opens with the relationships around engineering judgment. Scale opens on its published payment metric. Certificates occupy full editorial plates; award/event photos receive 56% of the image/text spread; recommendation portraits and quotes are larger. Toolkit contexts form a distinct relationship column beside the interactive technology choices. No factual data, evidence image, certificate redaction or proprietary screenshot was changed or invented.

## 7. Mobile and reduced motion

No desktop scroll gate on coarse pointers, narrow screens or short windows. Touch remains native; continuing the gesture resolves the current composition. On small screens evidence rooms occupy the viewport, with a persistent close control, visual-first vertical content and safe-area padding. Native dialog focus containment, Tab wrapping, Escape and focus restoration are preserved. Reduced motion resolves all scenes immediately and disables the new transitions/ambient loops. All scene choices and complete archives remain available.

## 8. Performance

No new runtime dependencies. One shared passive navigation observer; active-only wheel interception; cached scene bounds; GSAP cleanup and observer/listener cleanup. Eager award loading is limited to the selected/adjacent pieces while on screen; event/certificate eager loading is limited to the selected visible item. Remaining images use native lazy loading.

Chrome CDP sample (local headless run): 4.1s Data Refinery playback consumed 0.459s of main-thread task time; a subsequent 2s ambient hold consumed 0.180s and recorded **zero layouts**. Playback recorded 130 layouts, so this is not a claim of compositor-only rendering: the retained SVG/CSS camera still incurs browser layout work. These measurements are directional, not a physical-device FPS guarantee. Main application JS increased from 49.51KB to approximately 51.09KB gzip; CSS from 18.38KB to 19.88KB gzip.

## 9. Tests and browser QA

71 tests pass across five suites, including eight new lifecycle tests: normal lifecycle, single aggressive input, sustained skip intent, direction reversal/reentry, reduced-motion/anchor immediate state, disposal, manual choice and score hold duration.

`scripts/qa-scene-engine.mjs` exercises ten scenes and all twelve detail drawers at 1440×900, 1366×768, 1280×720, 1024×768 and 390×844, at DPR2. All reported zero console errors, broken loaded images and horizontal overflow. Checks include timed completion, native release, focus containment/restoration, aggressive repeated wheel input, reverse entry and reduced motion. 110%/125% equivalent layout viewports pass; these are not browser-toolbar zoom automation.

`scripts/qa-scene-edges.mjs` verifies initial deep links, resizing during playback, visibility pause/resume, offscreen ambient shutdown, and a CDP touch swipe (435px native scroll). Visibility events are simulated deterministically, and touch is browser-emulated. Reports and screenshots: `artifacts/scene-engine/qa.json`, `edges.json`, and the viewport PNGs.

## 10. Lint and production build

`npm run lint`, `npm test`, `npm run build`, and `git diff --check` pass. The mechanical design detector identified an Identity layout transition; it was replaced with a bounded transform/opacity arrival. Remaining advisories concern existing material colors/type sizes and a stale design sidecar.

## 11. Source safety

Work performed on `codex/cinematic-scene-engine`. Baseline checkpoint **f720314** preserves the pre-existing final cinematography, Hero and public-asset fixes. The reference project was not written to; its before/after Git status is identical. Hero composition/background assets, all factual data, approved evidence imagery and privacy redactions are unchanged in this pass. No deployment performed.

## 12. Remaining concerns

Physical trackpad momentum and real iOS/Android hardware were not available for testing. Safari/Firefox, actual tab switching and toolbar zoom remain manual checks; the automated equivalents are documented above. The existing SVG cameras still incur layout during playback. Hero's deliberate 7.8s opening is retained as requested and remains skippable. The project design sidecar predates parts of DESIGN.md and can be refreshed separately without changing the established art direction.
