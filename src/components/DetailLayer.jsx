import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpRight } from "@phosphor-icons/react";
import "../styles/story.css";

/**
 * The second layer: complete professional detail, opened from a scene.
 * Native top-layer focus containment; closing restores the trigger and
 * scroll. It is a page from the archive, lit from the same window: the
 * chapter's numeral heads it, and plates of real material sit in the text.
 */
export function DetailLayer({ title, label = "Explore the detail", chapter, children }) {
  const ref = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const opener = trigger.current;
    const previous = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);
  return <>
    <button ref={trigger} type="button" className="detail-link" aria-haspopup="dialog" onClick={() => setOpen(true)}>{label}<ArrowUpRight size={18} aria-hidden="true" /></button>
    {open && createPortal(<dialog ref={ref} className="detail-layer" data-keyboard={document.activeElement?.matches(":focus-visible")} aria-labelledby={id} onKeyDown={e => {
      if (e.key !== "Tab") return;
      const stops = [...e.currentTarget.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex="0"]')].filter(el => el.getClientRects().length);
      const first = stops[0], last = stops.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }} onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right) setOpen(false); } }}>
      <header className="detail-layer__head">{chapter && <span className="detail-layer__numeral" aria-hidden="true">{chapter}</span>}<h2 id={id}>{title}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close details"><X size={24} /></button></header>
      <div className="detail-layer__body">{children}</div>
    </dialog>, document.body)}
  </>;
}
