import { useEffect } from "react";

// Which lighting condition each chapter plays in. The opening is the stone
// hall; Scale keeps a light atmosphere because its dark passage is built in
// the scene itself (a graphite colonnade with long feathered edges), so text
// never sits on a ground that is halfway between two conditions.
const LIGHT = {
  identity: "sand",
  evolution: "sand",
  systems: "mineral",
  scale: "mineral",
  intelligence: "pale",
  recognition: "gallery",
  contact: "dusk"
};

/**
 * The light of the building. One fixed layer behind everything: the ground
 * colour, daylight falling from a high window at upper left, and the floor
 * going into shade. A chapter change is a lighting cue: the condition
 * crossfades over 1.4s rather than cutting to a new band of colour.
 */
export function Atmosphere({ active }) {
  const light = LIGHT[active] ?? "stone";

  useEffect(() => {
    document.documentElement.dataset.light = light;
  }, [light]);

  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="atmosphere__window" />
    </div>
  );
}
