export function StoryControls({ labels, active, onSelect, label }) {
  return <nav className="story-controls" aria-label={label}>{labels.map((name, i) => <button key={name} type="button" aria-pressed={active === i} onClick={() => onSelect(i)}><span>{name}</span></button>)}</nav>;
}
