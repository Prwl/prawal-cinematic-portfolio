import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// The same two curves the CSS uses, expressed for GSAP.
export const EASE_OUT = "expo.out";
export const EASE_IN_OUT = "power3.inOut";

export { gsap, ScrollTrigger };
