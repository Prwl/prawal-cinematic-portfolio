import { useEffect, useRef, useState } from "react";
import { List, X, DownloadSimple } from "@phosphor-icons/react";
import { chapters } from "../data/chapters.js";
import { documents } from "../data/contact.js";
import { profile } from "../data/profile.js";
import "../styles/chrome.css";

export function SiteHeader({ active }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    // Everything behind the menu is inert while it is open, so focus stays in it.
    const behind = [document.querySelector("main"), document.querySelector(".cue-rail"), document.querySelector(".skip-link")];
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("menu-open");
    behind.forEach((el) => el && (el.inert = true));
    menuRef.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
      behind.forEach((el) => el && (el.inert = false));
    };
  }, [open]);

  return (
    <header className="site-header">
      <a className="site-header__mark" href="#top" aria-label={`${profile.name}, back to the opening`}>
        {profile.name}
      </a>
      <nav className="site-header__nav" aria-label="Primary">
        <a className="site-header__link" href="#systems" aria-current={active === "systems" ? "true" : undefined}>
          Work
        </a>
        <a className="site-header__link" href={documents.resume.href} download={documents.resume.filename}>
          {documents.resume.label}
          <DownloadSimple size={14} weight="bold" aria-hidden="true" />
        </a>
        <a className="site-header__link" href="#contact" aria-current={active === "contact" ? "true" : undefined}>
          Contact
        </a>
      </nav>
      <button
        ref={toggleRef}
        type="button"
        className="site-header__toggle"
        aria-expanded={open}
        aria-controls="cue-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
        <span>{open ? "Close" : "Menu"}</span>
      </button>

      <div id="cue-menu" ref={menuRef} className="cue-menu" data-open={open ? "" : undefined} hidden={!open}>
        <ol className="cue-menu__list">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="cue-menu__link"
                aria-current={active === c.id ? "true" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="cue-menu__numeral num" aria-hidden="true">
                  {c.numeral}
                </span>
                {c.title}
              </a>
            </li>
          ))}
        </ol>
        <a className="action cue-menu__resume" href={documents.resume.href} download={documents.resume.filename}>
          Download {documents.resume.label}
          <DownloadSimple size={16} weight="bold" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
