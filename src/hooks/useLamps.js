import { useEffect } from "react";

/**
 * One observer for every [data-lamp] on the page. A lamp comes up once, when
 * it is a little way onto the stage, and stays lit.
 */
export function useLamps() {
  useEffect(() => {
    const lamps = document.querySelectorAll("[data-lamp]:not([data-lit])");
    if (!("IntersectionObserver" in window)) {
      lamps.forEach((el) => el.setAttribute("data-lit", ""));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-lit", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    lamps.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
