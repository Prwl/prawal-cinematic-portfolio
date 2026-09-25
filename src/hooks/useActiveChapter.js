import { useEffect, useState } from "react";

/**
 * Tracks which chapter currently holds the middle of the viewport.
 * Returns null while the opening (before chapter I) is on stage.
 */
export function useActiveChapter(ids) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.target);
          else visible.delete(entry.target.id);
        }
        const current = ids.find((id) => visible.has(id)) ?? null;
        setActive(current);
      },
      // A thin band across the middle of the viewport decides the cue.
      { rootMargin: "-45% 0px -54% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
