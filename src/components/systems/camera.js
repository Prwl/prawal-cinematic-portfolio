// The camera of a machine scene: a focus point and a scale in the drawing's
// own units, written as one CSS transform on the scene's camera group. The
// transition between beats is the camera move; the last beat pulls back to
// the whole system.
export function camera(w, h, shot) {
  const [fx, fy, s] = shot ?? [w / 2, h / 2, 1];
  return { transform: `translate(${w / 2}px, ${h / 2}px) scale(${s}) translate(${-fx}px, ${-fy}px)` };
}
