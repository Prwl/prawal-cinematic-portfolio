/**
 * The horizon of light that opens the film, carried through the whole piece.
 * Every scene begins on it. As a new scene rises into view the line draws out
 * from its focal point, a cool wash comes up on the floor below it, and a
 * short warm key travels along the line from where the last scene was lit to
 * where this one is lit (the chapter's --from and --focus, set in base.css).
 *
 * Scroll-driven in CSS where supported; everywhere else, and under reduced
 * motion, it rests in its final state: a lit line with a faint wash.
 *
 * variant "handoff": chapter I. The opening's own horizon is carried down to
 * this line by the prologue, so it appears in place rather than drawing out.
 */
export function Horizon({ variant = "scene" }) {
  return (
    <div className={`horizon horizon--${variant}`} aria-hidden="true">
      <span className="horizon__spill" />
      <span className="horizon__line" />
      <span className="horizon__core" />
    </div>
  );
}
